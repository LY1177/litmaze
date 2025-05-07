const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// Отваряне (или създаване) на базата данни
const db = new sqlite3.Database(path.join(__dirname, 'mydb.db'), err => {
  if (err) console.error('Не може да се отвори БД:', err.message);
  else console.log('Свързахме се със SQLite базата.');
});

// Създаване на таблица users, ако не съществува
db.run(
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE,
     email TEXT NOT NULL UNIQUE,
     password TEXT NOT NULL,
     points INTEGER DEFAULT 0,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )`, err => {
    if (err) console.error('Грешка при създаване на users:', err.message);
  }
);
// Създаваме таблицата за текстове, ако не съществува
db.run(
  `CREATE TABLE IF NOT EXISTS texts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     title TEXT,
     content TEXT
   )`, err => {
    if (err) console.error('Грешка при създаване на texts:', err.message);
  }
);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));
// CORS заглавки
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Статични файлове
app.use(express.static('public'));
app.use('/adminer',
  express.static(path.join(__dirname, 'adminer')),
  serveIndex(path.join(__dirname, 'adminer'), { icons: true })
);

// API: текстове (не е имплементирано)
app.get('/api/texts', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
// Зареждане на текст по id
app.get('/api/texts', (req, res) => {
  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });
  db.get(`SELECT content FROM texts WHERE id = ?`, [id], (err, row) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!row)  return res.status(404).json({ error: 'Text not found' });
    res.json({ content: row.content });
  });
});

// API: въпроси
app.get('/api/questions', (req, res) => {
  const authorName = (req.query.author || 'all').toLowerCase();
  let sql, params;
  if (authorName === 'all') {
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
      WHERE LOWER(a.name) = ?
      ORDER BY q.id, qo.id`;
    params = [req.query.author];
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const map = {};
    rows.forEach(r => {
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
          is_correct: !!r.is_correct,
          matching_key: r.matching_key
        });
      }
    });
    res.json(Object.values(map));
  });
});

// Регистрация
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).send('Моля, попълнете всички полета.');
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).send('Грешка при криптиране.');
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?,?,?)',
      [username, email, hash],
      function(err) {
        if (err) return res.status(500).send('Грешка при регистрация.');
        res.send('Регистрацията е успешна!');
      }
    );
  });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Моля, попълнете всички полета.');
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).send('Грешка при проверка.');
    if (!user) return res.status(400).send('Невалидно потребителско име.');
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) return res.status(400).send('Невалидна парола.');
      req.session.user = { id: user.id, username: user.username, points: user.points };
      res.send('Успешен вход!');
    });
  });
});

// Актуализиране на точки
app.post('/api/points', (req, res) => {
  if (!req.session.user) return res.status(401).send('Няма активна сесия.');
  const pts = Number(req.body.points) || 0;
  db.run(
    'UPDATE users SET points = points + ? WHERE id = ?',
    [pts, req.session.user.id],
    function(err) {
      if (err) return res.status(500).send('Грешка при update на точки.');
      db.get('SELECT points FROM users WHERE id = ?', [req.session.user.id], (err, row) => {
        if (err) return res.status(500).send('Грешка при вземане на точки.');
        req.session.user.points = row.points;
        res.json({ points: row.points });
      });
    }
  );
});

// Текущ потребител
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).end();
  res.json(req.session.user);
});

// Админ таблица
app.get('/admin/table', (req, res) => {
  if (req.query.key !== 'demo123') return res.status(401).send('<h2>🚫 Неоторизиран достъп</h2>');
  db.all('SELECT id, username, email, password, points FROM users', (err, rows) => {
    if (err) return res.status(500).send('Грешка при зареждане.');
    let html = `
      <html><head><title>Потребители</title>
      <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#eee}code{font-size:12px}</style>
      </head><body><h2>📋 Регистрирани потребители</h2><table>
      <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола</th><th>Точки</th></tr>`;
    rows.forEach(r => { html += `<tr><td>${r.id}</td><td>${r.username}</td><td>${r.email}</td><td><code>${r.password}</code></td><td>${r.points}</td></tr>`; });
    html += '</table></body></html>';
    res.send(html);
  });
});

// Стартиране на сървъра
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
