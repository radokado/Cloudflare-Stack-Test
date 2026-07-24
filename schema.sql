-- Cloudflare D1 Database Schema for Cloudflare Stack Test App

-- 1. Tabuľka používateľov (Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabuľka poznámok (Notes - D1 Test)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabuľka obrázkov / súborov (R2 Metadata in D1)
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabuľka histórie Gemini AI chatu (AI History)
CREATE TABLE IF NOT EXISTS ai_history (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vloženie základných testovacích dát
INSERT OR IGNORE INTO users (id, email, name, role) VALUES 
('usr_demo_1', 'admin@cloudflare-stack.test', 'Cloudflare Admin', 'admin');

INSERT OR IGNORE INTO notes (id, title, content, category) VALUES 
('note_init_1', 'Cloudflare D1 Je Aktívne! 🚀', 'Tento záznam pochádza z databázy Cloudflare D1 (SQLite na okraji siete).', 'system');
