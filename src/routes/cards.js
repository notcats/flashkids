const express = require('express');
const db = require('../db');
const authMw = require('../middleware/auth');

const router = express.Router();
router.use(authMw);

// Verify card belongs to current user (through deck → child → user)
async function ownedCard(cardId, userId) {
  const { rows } = await db.query(
    `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     JOIN children ch ON ch.id = d.child_id
     WHERE c.id = $1 AND ch.user_id = $2`,
    [cardId, userId]
  );
  return rows[0] || null;
}

// GET /api/cards?deck_id=
router.get('/', async (req, res) => {
  const { deck_id } = req.query;
  if (!deck_id) return res.status(400).json({ error: 'deck_id query param required' });

  // Verify deck ownership
  const { rows: deck } = await db.query(
    `SELECT d.id FROM decks d
     JOIN children ch ON ch.id = d.child_id
     WHERE d.id = $1 AND ch.user_id = $2`,
    [deck_id, req.user.id]
  );
  if (!deck[0]) return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await db.query(
    'SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at',
    [deck_id]
  );
  res.json(rows);
});

// PATCH /api/cards/:id/result  — record seen/correct after a flip
router.patch('/:id/result', async (req, res) => {
  const { correct } = req.body;
  if (correct == null) return res.status(400).json({ error: 'correct (boolean) is required' });

  if (!(await ownedCard(req.params.id, req.user.id)))
    return res.status(404).json({ error: 'Card not found' });

  const { rows } = await db.query(
    `UPDATE cards
     SET seen    = seen + 1,
         correct = correct + $1
     WHERE id = $2
     RETURNING *`,
    [correct ? 1 : 0, req.params.id]
  );
  res.json(rows[0]);
});

module.exports = router;
