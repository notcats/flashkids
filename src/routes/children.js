const express = require('express');
const db = require('../db');
const authMw = require('../middleware/auth');

const router = express.Router();
router.use(authMw);

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];

// GET /api/children
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM children WHERE user_id = $1 ORDER BY created_at',
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/children
router.post('/', async (req, res) => {
  const { name, age, avatar } = req.body;
  if (!name || age == null)
    return res.status(400).json({ error: 'name and age are required' });
  if (age < 1 || age > 4)
    return res.status(400).json({ error: 'age must be between 1 and 4' });

  const { rows } = await db.query(
    'INSERT INTO children (user_id, name, age, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, name.trim(), age, avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)]]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/children/:id
router.patch('/:id', async (req, res) => {
  const { name, age, avatar } = req.body;
  const { rows: existing } = await db.query(
    'SELECT * FROM children WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing[0]) return res.status(404).json({ error: 'Child not found' });

  const updated = {
    name: name?.trim() ?? existing[0].name,
    age: age ?? existing[0].age,
    avatar: avatar ?? existing[0].avatar,
  };
  if (updated.age < 1 || updated.age > 4)
    return res.status(400).json({ error: 'age must be between 1 and 4' });

  const { rows } = await db.query(
    'UPDATE children SET name=$1, age=$2, avatar=$3 WHERE id=$4 RETURNING *',
    [updated.name, updated.age, updated.avatar, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/children/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM children WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Child not found' });
  res.status(204).end();
});

module.exports = router;
