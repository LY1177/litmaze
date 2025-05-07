const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const bcrypt = require('bcrypt');
require('dotenv').config();                // зареждаме .env
const isProd = process.env.NODE_ENV === 'production';
const sqlite3 = require('sqlite3').verbose();
let pool;                                  // тук го декларираме, без стойност

const { Pool } = require('pg');
const PgSession = require('connect-pg-simple')(session);

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
require('dotenv').config();         // зареждаме .env

if (process.env.DATABASE_URL) {
  // в Render.com или ако имаш Postgres локално
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProd
      ? { rejectUnauthorized: false }  // SSL само в продакшън
      : false
  });
} else {
  // Нямаш DATABASE_URL? fallback на SQLite (за да не чупи регистрациите)
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./mydb.db');
  // Преработи query() да ползва db.run/db.get когато pool не е дефиниран
  pool = {
    query: (text, params) => new Promise((resolve, reject) => {
      // ако INSERT/UPDATE/DELETE
      if (/^(INSERT|UPDATE|DELETE)/i.test(text)) {
        db.run(text, params, function(err) {
          if (err) reject(err);
          else resolve({ rows: [], lastID: this.lastID });
        });
      } else {
        // SELECT
        db.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      }
    })
  };
}

// PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function for queries
async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

// Create necessary tables if they don't exist
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS texts (
        id SERIAL PRIMARY KEY,
        title TEXT,
        content TEXT
      );
    `);
  } catch (err) {
    console.error('Error creating tables', err);
  }
})();

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session'
  }),
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Update last_seen for online tracking
app.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      await query('UPDATE users SET last_seen = NOW() WHERE id = $1', [req.session.user.id]);
    } catch (err) {
      console.error('Error updating last_seen', err);
    }
  }
  next();
});

// Static files
app.use(express.static('public'));
app.use('/adminer',
  express.static(path.join(__dirname, 'adminer')),
  serveIndex(path.join(__dirname, 'adminer'), { icons: true })
);

// API: get text by id
app.get('/api/texts', async (req, res) => {
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const result = await query('SELECT content FROM texts WHERE id = $1', [id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Text not found' });
    res.json({ content: row.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: get questions
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
      if (!map[r.question_id]) {
        map[r.question_id] = {
          id: r.question_id,
          question: r.question,
          explanation: r.explanation,
          type: r.type,
          textId: r.text_id,
          options: []
        };
      }
      if (r.label || r.option_text) {
        map[r.question_id].options.push({
          label: r.label,
          option_text: r.option_text,
          is_correct: r.is_correct,
          matching_key: r.matching_key
        });
      }
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
    if (!user) return res.status(400).send('Невалидно потребителско име.');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Невалидна парола.');
    req.session.user = { id: user.id, username: user.username, points: user.points }; 
    res.send('Успешен вход!');
  } catch (err) {
    res.status(500).send('Грешка при проверка.');
  }
});

// Update points
app.post('/api/points', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Няма активна сесия.');
  const pts = Number(req.body.points) || 0;
  try {
    await query('UPDATE users SET points = points + $1 WHERE id = $2', [pts, req.session.user.id]);
    const result = await query('SELECT points FROM users WHERE id = $1', [req.session.user.id]);
    const row = result.rows[0];
    req.session.user.points = row.points;
    res.json({ points: row.points });
  } catch (err) {
    res.status(500).send('Грешка при update на точки.');
  }
});

// Current user
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).end();
  res.json(req.session.user);
});

// Online users (last 5 minutes)
app.get('/api/online-users', async (req, res) => {
  try {
    const result = await query(`
      SELECT username, points
      FROM users
      WHERE last_seen > NOW() - INTERVAL '5 minutes'
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin table
app.get('/admin/table', async (req, res) => {
  if (req.query.key !== 'demo123') return res.status(401).send('<h2>🚫 Неоторизиран достъп</h2>');
  try {
    const result = await query('SELECT id, username, email, password, points FROM users');
    let html = `
      <html><head><title>Потребители</title>
      <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#eee}code{font-size:12px}</style>
      </head><body><h2>📋 Регистрирани потребители</h2><table>
      <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола</th><th>Точки</th></tr>`;
    result.rows.forEach(r => {
      html += `<tr><td>${r.id}</td><td>${r.username}</td><td>${r.email}</td><td><code>${r.password}</code></td><td>${r.points}</td></tr>`;
    });
    html += '</table></body></html>';
    res.send(html);
  } catch (err) {
    res.status(500).send('Грешка при зареждане.');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
