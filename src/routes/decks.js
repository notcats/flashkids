const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/decks — generate words + images, no auth, no DB
router.post('/', async (req, res) => {
  const { topic, language = 'en', card_count = 6 } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const count = Math.min(Math.max(parseInt(card_count) || 6, 3), 12);

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

  const cards = await Promise.all(words.map(async (word) => {
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
    return { word, image_url, language, seen: 0, correct: 0 };
  }));

  res.json({ cards });
});

module.exports = router;
