require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const bcrypt     = require('bcrypt');
const path       = require('path');
const sqlite3    = require('sqlite3').verbose();

const app        = express();
const port       = process.env.PORT || 3000;
const saltRounds = 10;

const isProd         = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

let pool;
let sessionStore;

// --- Настройка на базата данни и сесиите ---
if (isProd && process.env.DATABASE_URL) {
  // Production: PostgreSQL + сесии в Postgres
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const PgSession = require('connect-pg-simple')(session);
  sessionStore = new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  });
} else {
  // Development: SQLite fallback + in-memory сесии
  const db = new sqlite3.Database('./mydb.db');
  pool = {
    query: (text, params = []) =>
      new Promise((resolve, reject) => {
        const sql = text.trim();
        if (/^(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)/i.test(sql)) {
          db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ rows: [], lastID: this.lastID });
          });
        } else {
          db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        }
      }),
  };
  sessionStore = new session.MemoryStore();
}

const sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дни
    sameSite: 'lax',
    secure: false,
    httpOnly: true,
  },
};
if (sessionStore) sessionConfig.store = sessionStore;
app.use(session(sessionConfig));

// --- Универсална query функция ---
async function query(text, params = []) {
  return pool.query(text, params);
}

// --- Миграции: създаване на таблици и добавяне на колони ---
(async () => {
  try {
    // Таблица users
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
    // Добавя колона last_seen, ако липсва
    try {
      await query(`ALTER TABLE users ADD COLUMN last_seen TIMESTAMP;`);
      await query(`UPDATE users SET last_seen = CURRENT_TIMESTAMP;`);
    } catch (_) {}
    // Таблица texts
    await query(`
      CREATE TABLE IF NOT EXISTS texts (
        id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY${isProd ? '' : ' AUTOINCREMENT'},
        title TEXT,
        content TEXT
      );
    `);
    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  '/adminer',
  express.static(path.join(__dirname, 'adminer')),
  serveIndex(path.join(__dirname, 'adminer'), { icons: true })
);

// --- Routes ---
// alias /api/questions → /api/texts, за да не се налага да сменяш fetch-овете
app.get('/api/questions', (req, res, next) => {
  // взимаме query string-а (?author=… или ?id=…)
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  // променяме пътя и пускаме през същия router
  req.url = '/api/texts' + qs;
  app._router.handle(req, res, next);
});

// 1) Текст по id или автор
app.get('/api/texts', async (req, res) => {
  let sql, params;
  if (req.query.id) {
    sql = `SELECT * FROM texts WHERE id = $1;`;
    params = [req.query.id];
  } else if (req.query.author) {
    sql = `
      SELECT q.id AS question_id, q.question, q.explanation, q.type, q.text_id,
             qo.label, qo.option_text, qo.is_correct, qo.matching_key
      FROM questions q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE LOWER(a.name) = $1
      ORDER BY q.id, qo.id;
    `;
    params = [req.query.author.toLowerCase()];
  } else {
    return res.status(400).json({ error: 'Missing id or author' });
  }
  try {
    const result = await query(sql, params);
    const map = {};
    result.rows.forEach(r => {
      if (!map[r.question_id]) {
        map[r.question_id] = {
          id: r.question_id,
          question:    r.question,
          explanation: r.explanation,
          type:        r.type,
          textId:      r.text_id,
          options:     []
        };
      }
      if (r.label || r.option_text) {
        map[r.question_id].options.push({
          label:        r.label,
          option_text:  r.option_text,
          is_correct:   r.is_correct,
          matching_key: r.matching_key
        });
      }
    });
    res.json(Object.values(map));
  } catch (err) {
    console.error('/api/texts error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2) Регистрация
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).send('Попълнете всички полета.');
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await query(
      `INSERT INTO users (username, email, password) VALUES ($1, $2, $3);`,
      [username, email, hash]
    );
    res.send('Регистрация успешна!');
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Грешка при регистрация.');
  }
});

// 3) Вход
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).send('Попълнете всички полета.');
  try {
    const result = await query(`SELECT * FROM users WHERE username = $1;`, [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).send('Невалидно потребителско име.');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Невалидна парола.');
    req.session.user = { id: user.id, username: user.username, points: user.points };
    res.send('Успешен вход!');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Грешка при проверка.');
  }
});

// 4) Добавяне на точки
app.post('/api/points', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Няма активна сесия.');
  const pts = Number(req.body.points) || 0;
  try {
    await query(`UPDATE users SET points = points + $1 WHERE id = $2;`, [
      pts,
      req.session.user.id
    ]);
    const result = await query(`SELECT points FROM users WHERE id = $1;`, [
      req.session.user.id
    ]);
    req.session.user.points = result.rows[0].points;
    res.json({ points: req.session.user.points });
  } catch (err) {
    console.error('Points update error:', err);
    res.status(500).send('Грешка при update на точки.');
  }
});

// 5) Текущ потребител
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).end();
  res.json(req.session.user);
});

// 6) Онлайн потребители (последните 5 минути)
app.get('/api/online-users', async (req, res) => {
  try {
    let result;
    if (isProd) {
      result = await query(`
        SELECT username, points FROM users
        WHERE last_seen > CURRENT_TIMESTAMP - INTERVAL '5 minutes';`);
    } else {
      result = await query(`
        SELECT username, points FROM users
        WHERE last_seen > datetime('now','-5 minutes');`);
    }
    res.json(result.rows);
  } catch (err) {
    console.error('/api/online-users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7) Админ табличка
app.get('/admin/table', async (req, res) => {
  if (!req.session.user || req.session.user.username !== 'admin')
    return res.status(403).send('<h2>🚫 Forbidden</h2>');
  try {
    const result = await query(
      `SELECT id, username, email, password, points FROM users;`
    );
    let html = `<html><head><title>Потребители</title>
      <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#eee}</style>
      </head><body><h2>📋 Регистрирани потребители</h2><table>
      <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола (хеш)</th><th>Точки</th></tr>`;
    result.rows.forEach(r => {
      html += `<tr>
        <td>${r.id}</td>
        <td>${r.username}</td>
        <td>${r.email}</td>
        <td><code>${r.password}</code></td>
        <td>${r.points}</td>
      </tr>`;
    });
    html += `</table></body></html>`;
    res.send(html);
  } catch (err) {
    console.error('Admin table error:', err);
    res.status(500).send('Грешка при зареждане.');
  }
});

// --- Стартиране на сървъра ---
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
