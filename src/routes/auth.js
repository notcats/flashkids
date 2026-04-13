const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMw = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: 'email, password and name are required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email.toLowerCase().trim(), hash, name.trim()]
    );
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  const { rows } = await db.query(
    'SELECT id, email, name, password FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const { password: _pw, ...safe } = user;
  res.json({ token: signToken(safe), user: safe });
});

// GET /api/auth/me
router.get('/me', authMw, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
