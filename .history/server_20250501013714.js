require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const bcrypt = require('bcrypt');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// Environment flag
const isProd = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

// Database pool and session store
let pool;
let sessionStore;

if (isProd && process.env.DATABASE_URL) {
  // Production: PostgreSQL + sessions in Postgres
  const { Pool } = require('pg');
  const PgSession = require('connect-pg-simple')(session);
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  sessionStore = new PgSession({ pool, tableName: 'session' });
} else {
  // Development: SQLite fallback, in-memory sessions
  const db = new sqlite3.Database('./mydb.db');
  pool = {
    query: (text, params = []) => new Promise((resolve, reject) => {
      const sql = text.trim();
      // Treat DDL and DML as run: INSERT, UPDATE, DELETE, ALTER, CREATE
      if (/^(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)/i.test(sql)) {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [], lastID: this.lastID });
        });
      } else {
        // SELECT queries
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      }
    })
  };
  sessionStore = null;
}

// Helper query function
async function query(text, params = []) {
  return await pool.query(text, params);
}

// Create tables if not exist and auto-migrate last_seen
(async () => {
  try {
    // users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY${isProd ? '' : ' AUTOINCREMENT'},
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // auto-add last_seen if missing
    try {
      await query(`ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP;`);
    } catch(e) {
      // ignore if exists
    }

    // texts table
    await query(`
      CREATE TABLE IF NOT EXISTS texts (
        id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY${isProd ? '' : ' AUTOINCREMENT'},
        title TEXT,
        content TEXT
      );
    `);
  } catch (err) {
    console.error('Error creating/migrating tables:', err);
  }
})();

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const sessionConfig = { secret: SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { maxAge: 30*24*60*60*1000 } };
if (sessionStore) sessionConfig.store = sessionStore;
app.use(session(sessionConfig));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers','Origin,X-Requested-With,Content-Type,Accept');
  next();
});

// Update last_seen per request
app.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      await query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [req.session.user.id]);
    } catch {};
  }
  next();
});

// Static files and Adminer
app.use(express.static('public'));
app.use('/adminer', express.static(path.join(__dirname,'adminer')), serveIndex(path.join(__dirname,'adminer'),{icons:true}));

// Routes

// Get text by id
app.get('/api/texts', async (req, res) => {
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const result = await query('SELECT content FROM texts WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Text not found' });
    res.json({ content: result.rows[0].content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get questions
app.get('/api/questions', async (req, res) => {
  let sql, params;
  if (!req.query.author) {
    sql = `
      SELECT q.id AS question_id, q.question, q.explanation, q.type, q.text_id,
             qo.label, qo.option_text, qo.is_correct, qo.matching_key
      FROM questions q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      ORDER BY q.id, qo.id`;
    params = [];
  } else {
    sql = `
      SELECT q.id AS question_id, q.question, q.explanation, q.type, q.text_id,
             qo.label, qo.option_text, qo.is_correct, qo.matching_key
      FROM questions q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE LOWER(a.name) = $1
      ORDER BY q.id, qo.id`;
    params = [req.query.author.toLowerCase()];
  }
  try {
    const result = await query(sql, params);
    const map = {};
    result.rows.forEach(r => {
      if (!map[r.question_id]) map[r.question_id] = { id: r.question_id, question: r.question, explanation: r.explanation, type: r.type, textId: r.text_id, options: [] };
      if (r.label || r.option_text) map[r.question_id].options.push({ label: r.label, option_text: r.option_text, is_correct: r.is_correct, matching_key: r.matching_key });
    });
    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).send('Моля, попълнете всички полета.');
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hash]);
    res.send('Регистрацията е успешна!');
  } catch (err) {
    res.status(500).send('Грешка при регистрация.');
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Моля, попълнете всички полета.');
  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
