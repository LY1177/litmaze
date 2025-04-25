// server.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
// const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const port = process.env.PORT || 3000;

// Отваряне (или създаване) на базата данни
// const db = new sqlite3.Database(path.join(__dirname, 'mydb.db'), err => {
//   if (err) console.error('Не може да се отвори БД:', err.message);
//   else console.log('Свързахме се със SQLite базата.');
// });
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});


// Дефиниция на модел User (пример)
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,   unique: true,    allowNull: false },
  email:    { type: DataTypes.STRING,   unique: true,    allowNull: false },
  password: { type: DataTypes.STRING,   allowNull: false },
  points:   { type: DataTypes.INTEGER,  defaultValue: 0 },
}, { tableName: 'users', timestamps: false });
// Уверяваме се, че таблицата users има колона points
// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT NOT NULL UNIQUE,
//       email TEXT NOT NULL UNIQUE,
//       password TEXT NOT NULL,
//       points INTEGER DEFAULT 0,
//       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
//     )
//   `, err => {
//     if (err) console.error('Грешка при създаване на users:', err.message);
//   });
// });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));
// CORS заглавки (само за разработка)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.static('public'));
app.use('/adminer',
  express.static(path.join(__dirname, 'adminer')),
  require('serve-index')(path.join(__dirname, 'adminer'), { icons: true })
);

// API: текстове
app.get('/api/texts', (req, res) => {
  const textId = req.query.id;
  db.get("SELECT content FROM texts WHERE id = ?", [textId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Текстът не е намерен.' });
    res.json(row);
  });
});

// API: въпроси
app.get('/api/questions', (req, res) => {
  const authorName = (req.query.author || 'all').toLowerCase();
  let sql, params;
  if (authorName === 'all' || ['all','обобщение','obobshtenie'].includes(authorName)) {
    sql = `
      SELECT q.id AS question_id,
             q.question, q.explanation, q.type, q.text_id,
             qo.label, qo.option_text, qo.is_correct, qo.matching_key
      FROM questions q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE LOWER(a.name) NOT IN ('nvo2022','nvo2023','nvo2024')
      ORDER BY q.id, qo.id
    `;
    params = [];
  } else {
    sql = `
      SELECT q.id AS question_id,
             q.question, q.explanation, q.type, q.text_id,
             qo.label, qo.option_text, qo.is_correct, qo.matching_key
      FROM questions q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE a.name = ?
      ORDER BY q.id, qo.id
    `;
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
      if (r.label || r.option_text || r.matching_key) {
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
      "INSERT INTO users (username, email, password) VALUES (?,?,?)",
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
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).send('Грешка при проверка.');
    if (!user) return res.status(400).send('Невалидно потребителско име.');
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) return res.status(400).send('Невалидна парола.');
      // Запазваме id, username и точки в сесията
      req.session.user = { id: user.id, username: user.username, points: user.points };
      res.send('Входът е успешен!');
    });
  });
});

// Update точки
app.post('/api/points', (req, res) => {
  if (!req.session.user) return res.status(401).send('Няма активна сесия.');
  const pts = Number(req.body.points) || 0;
  const uid = req.session.user.id;
  db.run(
    "UPDATE users SET points = points + ? WHERE id = ?",
    [pts, uid],
    function(err) {
      if (err) return res.status(500).send('Грешка при update на точки.');
      db.get("SELECT points FROM users WHERE id = ?", [uid], (err, row) => {
        if (err) return res.status(500).send('Грешка при вземане на точки.');
        req.session.user.points = row.points;
        res.json({ points: row.points });
      });
    }
  );
});

// Вземане на текущ потребител
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).send();
  res.json(req.session.user);
});

// Админ табличка
app.get('/admin/table', (req, res) => {
  if (req.query.key !== 'demo123') return res.status(401).send('<h2>🚫 Неоторизиран достъп</h2>');
  db.all("SELECT id, username, email, password, points FROM users", (err, rows) => {
    if (err) return res.status(500).send('Грешка при зареждане.');
    let html = `
      <html><head><title>Потребители</title>
      <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#eee}code{font-size:12px}</style>
      </head><body><h2>📋 Регистрирани потребители</h2><table>
      <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола</th><th>Точки</th></tr>
    `;
    rows.forEach(r => {
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
  });
});

// Стартиране
// app.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });
// Стартиране след sync
// …всички ваши imports и дефиниции на модели…

// Middleware и рутове…
// (register, login, /api/questions и т.н.)

// Заместете остатъчния `app.listen(...)` с това:
async function startServer() {
  try {
    // Синхронизация на моделите (Postgres или SQLite)
    await sequelize.sync();
    console.log('✅ Таблиците са създадени/актуализирани');
    // Стартиране на Express
    app.listen(port, () => {
      console.log(`🚀 Server listening on port ${port}`);
    });
  } catch (err) {
    console.error('❌ Грешка при стартиране на сървъра:', err);
    process.exit(1);
  }
}

startServer();
