-- FlashKids Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL,          -- bcrypt hash
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Children profiles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  age         SMALLINT    NOT NULL CHECK (age BETWEEN 1 AND 4),
  avatar      TEXT,                          -- emoji or URL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- ─────────────────────────────────────────────
-- Decks  (collection of cards on a topic)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id    UUID        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,          -- e.g. "Animals", "Fruit"
  language    TEXT        NOT NULL DEFAULT 'en',  -- BCP-47 language tag
  topic       TEXT        NOT NULL,          -- prompt topic sent to Claude
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decks_child_id ON decks(child_id);

-- ─────────────────────────────────────────────
-- Cards
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID        NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  word        TEXT        NOT NULL,          -- e.g. "cat"
  image_url   TEXT,                          -- DALL-E 3 generated image URL
  language    TEXT        NOT NULL DEFAULT 'en',
  seen        INT         NOT NULL DEFAULT 0,
  correct     INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);

-- ─────────────────────────────────────────────
-- Helper: auto-update updated_at on users
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
