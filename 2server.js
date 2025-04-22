// server.js – финална, проверена версия
require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const rateLimit= require('express-rate-limit');
const session  = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt   = require('bcrypt');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------- База данни (SQLite по подразбиране, Postgres ако има DATABASE_URL) ---------- */
let db;
if (process.env.DATABASE_URL) {
  const { Client } = require('pg');
  db = new Client({ connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false } });
  db.connect();
} else {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(path.join(__dirname, 'mydb.db'));
}

/* ------------------- Middleware ------------------- */
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 60*60*1000 }
}));
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

/* ------------------- API ------------------- */
// Регистрация
app.post('/api/register', authLimiter, [
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { username, email, password } = req.body;
  const findSql = 'SELECT id FROM users WHERE username = ? OR email = ?';
  const insertSql = 'INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)';

  const insert = hash => {
    const p = [username, email, hash, 'user'];
    if (db.run) db.run(insertSql, p, err => err ? res.status(500).json({ error: err.message })
                                               : res.json({ success: true }));
    else db.query(insertSql, p).then(() => res.json({ success: true }))
                               .catch(err => res.status(500).json({ error: err.message }));
  };

  const afterFind = (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'User/email already exists' });
    bcrypt.hash(password, 12).then(insert);
  };

  if (db.get) db.get(findSql, [username, email], afterFind);
  else db.query(findSql, [username, email]).then(r => afterFind(null, r.rows[0]))
                                           .catch(afterFind);
});

// Логин
app.post('/api/login', authLimiter, [
  body('username').notEmpty(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';

  const handle = (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    bcrypt.compare(password, user.password).then(match => {
      if (!match) return res.status(400).json({ error: 'Invalid credentials' });
      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.json({ success: true });
    });
  };

  if (db.get) db.get(sql, [username], handle);
  else db.query(sql, [username]).then(r => handle(null, r.rows[0])).catch(handle);
});

/* ----------- Статични файлове / SPA fallback ----------- */
app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log('Listening on ' + PORT));
