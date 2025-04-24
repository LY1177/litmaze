// server.js
const fs   = require('fs');
const path = require('path');

const express = require('express');
// const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const serveIndex = require('serve-index');
// Отваряне на SQLite базата данни (mydb.db)
// const db = new sqlite3.Database(path.join(__dirname, 'mydb.db'), (err) => {
//   if (err) {
//     console.error('Не може да се отвори базата данни:', err.message);
//   } else {
//     console.log('SQLite базата данни е успешно отворена.');
//   }
// });
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
    async function init() {
      // 1) Импорт на mysql.sql само в production
      if (isProd) {
        try {
          const sql = fs.readFileSync(path.join(__dirname, 'mysql.sql'), 'utf8');
          const stmts = sql.split(';').map(s=>s.trim()).filter(s=>s);
          console.log(`Импортирам ${stmts.length} SQL statements…`);
          for (let stmt of stmts) {
            await sequelize.query(stmt);
          }
          console.log('✅ Данните от mysql.sql са импортирани успешно.');
        } catch (err) {
          console.error('❌ Грешка при автоматично импортиране на SQL:', err);
        }
      }
// Дефинираме User модела
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,   unique: true,    allowNull: false },
  email:    { type: DataTypes.STRING,   unique: true,    allowNull: false },
  password: { type: DataTypes.STRING,   allowNull: false },
  points:   { type: DataTypes.INTEGER,  defaultValue: 0 },
}, {
  tableName: 'users',
  timestamps: false, 
  
});
const Question = sequelize.define('Question', {
  id:    { type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  question: { type: DataTypes.TEXT },
  explanation: { type: DataTypes.TEXT },
  type: { type: DataTypes.STRING },
  text_id: { type: DataTypes.INTEGER }
}, { tableName:'questions', timestamps:false });

const Author = sequelize.define('Author', {
  id:   { type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  name: DataTypes.STRING
}, { tableName:'authors', timestamps:false });

const QuestionOption = sequelize.define('QuestionOption', {
  id:           { type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
  question_id:  DataTypes.INTEGER,
  label:        DataTypes.STRING,
  option_text:  DataTypes.TEXT,
  is_correct:   DataTypes.BOOLEAN,
  matching_key: DataTypes.STRING
}, { tableName:'question_options', timestamps:false });

// Връзки
Question.belongsTo(Author, { foreignKey:'author_id' });
Question.hasMany(QuestionOption, { foreignKey:'question_id' });

// Синхронизация: в SQLite създава users в mydb.db, в Postgres – в съответната база
sequelize.sync({ alter: true })
  .then(() => console.log("✅ Sequelize synchronized."))
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
app.get('/api/questions', async (req,res) => {
  const authorName = req.query.author || 'all';
  const where = authorName==='all'
    ? {}
    : { name: authorName };

  const questionsRaw = await Question.findAll({
    include: [
      { model: Author, where, attributes:[] },
      { model: QuestionOption, attributes:['label','option_text','is_correct','matching_key'] }
    ],
    order:[['id','ASC']]
  });

  // Превръщаш в желания JSON формат
  const questions = questionsRaw.map(q => ({
    id: q.id,
    question: q.question,
    explanation: q.explanation,
    type: q.type,
    textId: q.text_id,
    options: q.QuestionOptions.map(o => ({
      label: o.label,
      option_text: o.option_text,
      is_correct: o.is_correct,
      matching_key: o.matching_key
    }))
  }));

  res.json(questions);
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
// Веднага след app.post('/api/points', …)
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).send();
  // В сесията съхранихме user.id и user.points
  return res.json({ username: req.session.user.username,
                    points: req.session.user.points });
});


// Сервиране на статични файлове от папката public (HTML, CSS, JS, аудио, изображения и т.н.)
app.use(express.static('public'));
app.get('/admin/table', async (req, res) => {
  if (req.query.key !== 'demo123') 
    return res.status(401).send("<h2>🚫 Неоторизиран достъп</h2>");

  // Взимаме всичко от Postgres
  const users = await User.findAll({ raw: true, order: [['id','ASC']] });

  let html = `
    <html><head><meta charset="utf-8"><title>Потребители</title>
      <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#eee}code{font-size:12px}</style>
    </head><body>
    <h2>📋 Регистрирани потребители</h2>
    <table>
      <thead>
        <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола (bcrypt)</th><th>Точки</th></tr>
      </thead><tbody>
  `;

  users.forEach(u => {
    html += `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td><code>${u.password}</code></td>
        <td>${u.points}</td>
      </tr>
    `;
  });

  html += `</tbody></table></body></html>`;
  res.send(html);
});

app.use('/adminer',
  express.static(path.join(__dirname,'adminer')),
  serveIndex(path.join(__dirname,'adminer'), { icons: true })
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

