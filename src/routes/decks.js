const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const db = require('../db');
const authMw = require('../middleware/auth');

const router = express.Router();
router.use(authMw);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Verify the child belongs to the current user
async function ownedChild(childId, userId) {
  const { rows } = await db.query(
    'SELECT id FROM children WHERE id = $1 AND user_id = $2',
    [childId, userId]
  );
  return rows[0] || null;
}

// GET /api/decks?child_id=
router.get('/', async (req, res) => {
  const { child_id } = req.query;
  if (!child_id) return res.status(400).json({ error: 'child_id query param required' });
  if (!(await ownedChild(child_id, req.user.id)))
    return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await db.query(
    'SELECT * FROM decks WHERE child_id = $1 ORDER BY created_at DESC',
    [child_id]
  );
  res.json(rows);
});

// POST /api/decks  — generate a new deck via Claude + DALL-E 3
router.post('/', async (req, res) => {
  const { child_id, topic, language = 'en', card_count = 6 } = req.body;
  if (!child_id || !topic)
    return res.status(400).json({ error: 'child_id and topic are required' });

  const child = await ownedChild(child_id, req.user.id);
  if (!child) return res.status(403).json({ error: 'Forbidden' });

  const count = Math.min(Math.max(parseInt(card_count) || 6, 3), 12);

  // 1. Ask Claude for words on the topic
  const claudeRes = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    system: 'You are a helpful assistant for a children flashcard app. Return ONLY a JSON array of simple, concrete nouns suitable for toddlers aged 1-4. No explanations.',
    messages: [{
      role: 'user',
      content: `Give me ${count} simple English nouns on the topic "${topic}". Reply with a JSON array of strings only, e.g. ["cat","dog"].`,
    }],
  });

  let words;
  try {
    const text = claudeRes.content[0].text.trim();
    words = JSON.parse(text.match(/\[.*\]/s)[0]);
  } catch {
    return res.status(502).json({ error: 'Failed to parse Claude response' });
  }

  // 2. Create deck record
  const { rows: deckRows } = await db.query(
    'INSERT INTO decks (child_id, title, language, topic) VALUES ($1, $2, $3, $4) RETURNING *',
    [child_id, topic, language, topic]
  );
  const deck = deckRows[0];

  // 3. Generate images with DALL-E 3 and insert cards (parallel)
  const cardPromises = words.map(async (word) => {
    let image_url = null;
    try {
      const imgRes = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `A cute, simple, colorful cartoon illustration of a ${word} for a toddler flashcard. White background, friendly style, no text.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });
      image_url = imgRes.data[0].url;
    } catch (err) {
      console.error(`DALL-E failed for "${word}":`, err.message);
    }

    const { rows } = await db.query(
      'INSERT INTO cards (deck_id, word, image_url, language) VALUES ($1, $2, $3, $4) RETURNING *',
      [deck.id, word, image_url, language]
    );
    return rows[0];
  });

  const cards = await Promise.all(cardPromises);
  res.status(201).json({ deck, cards });
});

// DELETE /api/decks/:id
router.delete('/:id', async (req, res) => {
  // Verify ownership through children join
  const { rowCount } = await db.query(
    `DELETE FROM decks
     WHERE id = $1
       AND child_id IN (SELECT id FROM children WHERE user_id = $2)`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Deck not found' });
  res.status(204).end();
});

module.exports = router;
