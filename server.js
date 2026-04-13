require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth',     require('./src/routes/auth'));
app.use('/api/children', require('./src/routes/children'));
app.use('/api/decks',    require('./src/routes/decks'));
app.use('/api/cards',    require('./src/routes/cards'));

// Fallback — serve SPA for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FlashKids running on http://localhost:${PORT}`));
