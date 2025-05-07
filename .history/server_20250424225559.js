// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const session = require('express-session');

const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Отваряне на SQLite базата данни (mydb.db)
const db = new sqlite3.Database(path.join(__dirname, 'mydb.db'), (err) => {
  if (err) {
    console.error('Не може да се отвори базата данни:', err.message);
  } else {
    console.log('SQLite базата данни е успешно отворена.');
  }
});
const { Sequelize, DataTypes } = require('sequelize');
const isProd = !!process.env.DATABASE_URL;

// Избираме dialect според това дали сме в продукция или локално
const sequelize = isProd
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'mydb.db')
    });

// Дефинираме User модела
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,   unique: true,    allowNull: false },
  email:    { type: DataTypes.STRING,   unique: true,    allowNull: false },
  password: { type: DataTypes.STRING,   allowNull: false },
  points:   { type: DataTypes.INTEGER,  defaultValue: 0 },
}, {
  tableName: 'users',
  timestamps: true
});

// Синхронизация: в SQLite създава users в mydb.db, в Postgres – в съответната база
sequelize.sync({ alter: true })
  .then(() => console.log("✅ Sequelize synchronized (only missing columns added)."))
  .catch(err => console.error("❌ Sync failed:", err));






app.get('/api/texts', (req, res) => {
  const textId = req.query.id;
  db.get("SELECT content FROM texts WHERE id = ?", [textId], (err, row) => {
    if (err) {
      console.error("Грешка при извличане на текста:", err);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Текстът не е намерен." });
    }
    res.json(row);
  });
});
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));

// CORS заглавки (за разработка)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // За разработка
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


/* ---------------------- API Endpoint за въпроси ---------------------- */
app.get('/api/questions', (req, res) => {
  let authorName = req.query.author;
  console.log("Получена заявка за въпроси за автор:", authorName);
  let sql, params;
  if (!authorName || authorName.trim().toLowerCase() === 'all' ||
    authorName.trim().toLowerCase() === 'obobshtenie' ||
    authorName.trim().toLowerCase() === 'обобщение') {
  sql = `
    SELECT q.id AS question_id,
           q.question,
           q.explanation,
           q.type,
           q.text_id,
           COALESCE(qo.label, '') AS label,
           COALESCE(qo.option_text, '') AS option_text,
           COALESCE(qo.is_correct, 0) AS is_correct,
           COALESCE(qo.matching_key, '') AS matching_key
    FROM questions q
    INNER JOIN authors a ON q.author_id = a.id
    LEFT JOIN question_options qo ON q.id = qo.question_id
    WHERE LOWER(a.name) NOT IN ('nvo2022', 'nvo2023', 'nvo2024')
    ORDER BY q.id, qo.id
  `;
  params = [];
} else {
  sql = `
    SELECT q.id AS question_id,
           q.question,
           q.explanation,
           q.type,
           q.text_id,
           COALESCE(qo.label, '') AS label,
           COALESCE(qo.option_text, '') AS option_text,
           COALESCE(qo.is_correct, 0) AS is_correct,
           COALESCE(qo.matching_key, '') AS matching_key
    FROM questions q
    INNER JOIN authors a ON q.author_id = a.id
    LEFT JOIN question_options qo ON q.id = qo.question_id
    WHERE a.name = ?
    ORDER BY q.id, qo.id
  `;
  params = [authorName];
}
    
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching questions:", err);
      return res.status(500).json({ error: err.message });
    }
    const questionsMap = {};

    rows.forEach(row => {
      if (!questionsMap[row.question_id]) {
        questionsMap[row.question_id] = {
          id: row.question_id,
          question: row.question,
          explanation: row.explanation,
          type: row.type,
          textId: row.text_id, // <-- Записваме text_id в обекта
          options: []
        };
      }
      // опции (label, option_text, matching_key)
      if (row.label !== '' || row.option_text !== '' || row.matching_key !== '') {
        questionsMap[row.question_id].options.push({
          label: row.label,
          option_text: row.option_text,
          matching_key: row.matching_key,
          is_correct: row.is_correct == 1
        });
      }
    });
    
    let questions = Object.values(questionsMap);
    console.log("Намерени въпроси:", questions);
    res.json(questions);
  });
});


/* ---------------------- API Endpoint за регистрация ---------------------- */
/* ---------------------- API Endpoint за регистрация ---------------------- */
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).send("Моля, попълнете всички полета.");
  }

  try {
    // 1) Хеширане
    const hash = await bcrypt.hash(password, saltRounds);
    // 2) Създаване на запис в базата (Sequelize + PostgreSQL)
    await User.create({ username, email, password: hash });
    // 3) Успешен отговор
    res.status(200).send("Регистрацията е успешна!");
  } catch(err) {
    console.error("Грешка при регистрация:", err.message);
    res.status(500).send("Възникна грешка при регистрирането.");
  }
});




/* ---------------------- API Endpoint за вход ---------------------- */
/* ---------------------- API Endpoint за вход ---------------------- */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send("Моля, попълнете всички полета.");
  }

  try {
    // 1) Намираме user
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(400).send("Потребителското име не съществува.");

    // 2) Сравняваме паролата
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).send("Невалидна парола.");

    // 3) Слагаме данни в сесия
    req.session.user = { id: user.id, username: user.username, email: user.email, points: user.points };
    res.status(200).send("Входът е успешен!");
  } catch(err) {
    console.error("Грешка при вход:", err.message);
    res.status(500).send("Грешка при проверка на паролата.");
  }
});
/* ---------------------- API Endpoint за актуализиране на точки ---------------------- */
app.post('/api/points', async (req, res) => {
  // Въвеждаме JSON { points: 10 } например
  const { points } = req.body;
  if (!req.session.user) {
    return res.status(401).send("Няма активна сесия.");
  }
  try {
    // 1) Намираме текущия user по id от сесията
    const user = await User.findByPk(req.session.user.id);
    if (!user) throw new Error("Потребителят не е намерен.");

    // 2) Увеличаваме точките
    user.points += Number(points);
    await user.save();

    // 3) Връщаме новия брой точки
    res.json({ points: user.points });
  } catch(err) {
    console.error("Грешка при update на точки:", err.message);
    res.status(500).send("Неуспешно обновяване на точките.");
  }
});


// Сервиране на статични файлове от папката public (HTML, CSS, JS, аудио, изображения и т.н.)
app.use(express.static('public'));
app.get('/admin/table', (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== 'demo123') {
    return res.status(401).send("<h2>🚫 Неоторизиран достъп</h2>");
  }

  db.all("SELECT id, username, email, password FROM users", (err, rows) => {
    if (err) {
      console.error("Грешка при извличане на потребители:", err.message);
      return res.status(500).send("Грешка при зареждане.");
    }

    let html = `
      <html><head><title>Потребители</title>
      <style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ccc; padding: 8px; }
      th { background: #eee; } code { font-size: 12px; }</style></head><body>
      <h2>📋 Регистрирани потребители</h2>
      <table><tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола (bcrypt)</th></tr>
    `;

    rows.forEach(row => {
      html += `<tr>
        <td>${row.id}</td>
        <td>${row.username}</td>
        <td>${row.email}</td>
        <td><code>${row.password}</code></td>
      </tr>`;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

