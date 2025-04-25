const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { Sequelize, DataTypes } = require('sequelize');

// Настройка на базата данни (SQLite или Postgres според среда)
const isProd = !!process.env.DATABASE_URL;
const sequelize = isProd
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'mydb.db')
    });

// Импорт на SQL скрипт (само в продукция)
async function init() {
  if (process.env.DATABASE_URL) {
    console.log('⚙️  Стартирам импорт на mysql.sql…');
    const sql = fs.readFileSync(path.join(__dirname, 'mysql.sql'), 'utf8');
    const stmts = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
    for (const s of stmts) {
      await sequelize.query(s);
    }
    console.log(`✅ Импортирани ${stmts.length} statements.`);
  }
}

// Дефиниция на модели
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,   unique: true,    allowNull: false },
  email:    { type: DataTypes.STRING,   unique: true,    allowNull: false },
  password: { type: DataTypes.STRING,   allowNull: false },
  points:   { type: DataTypes.INTEGER,  defaultValue: 0 },
}, { tableName: 'users', timestamps: false });

const Question = sequelize.define('Question', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  question:    { type: DataTypes.TEXT },
  explanation: { type: DataTypes.TEXT },
  type:        { type: DataTypes.STRING },
  text_id:     { type: DataTypes.INTEGER }
}, { tableName: 'questions', timestamps: false });

const Author = sequelize.define('Author', {
  id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING
}, { tableName: 'authors', timestamps: false });

const QuestionOption = sequelize.define('QuestionOption', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  question_id:  DataTypes.INTEGER,
  label:        DataTypes.STRING,
  option_text:  DataTypes.TEXT,
  is_correct:   DataTypes.BOOLEAN,
  matching_key: DataTypes.STRING
}, { tableName: 'question_options', timestamps: false });

// Ассоциации
Question.belongsTo(Author, { foreignKey: 'author_id' });
Question.hasMany(QuestionOption, { foreignKey: 'question_id' });

// Express приложение
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));
// CORS (за разработка)
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

// Рутове
app.get('/api/texts', (req, res) => {
  const textId = req.query.id;
  // Тук трябва да имаш db връзка (SQLite) ако използваш Text model
  // Примерно: Text.findByPk(textId)...
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/questions', async (req, res) => {
  const authorName = req.query.author || 'all';
  const where = authorName === 'all' ? {} : { name: authorName };

  const questionsRaw = await Question.findAll({
    include: [
      { model: Author, where, attributes: [] },
      { model: QuestionOption, attributes: ['label', 'option_text', 'is_correct', 'matching_key'] }
    ],
    order: [['id', 'ASC']]
  });

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

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).send('Моля, попълнете всички полета.');
  }
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await User.create({ username, email, password: hash });
    res.status(200).send('Регистрацията е успешна!');
  } catch (err) {
    console.error('Грешка при регистрация:', err);
    res.status(500).send('Възникна грешка при регистрирането.');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Моля, попълнете всички полета.');
  }
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(400).send('Потребителското име не съществува.');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).send('Невалидна парола.');

    req.session.user = { id: user.id, username: user.username, email: user.email, points: user.points };
    res.status(200).send('Входът е успешен!');
  } catch (err) {
    console.error('Грешка при вход:', err);
    res.status(500).send('Грешка при проверка на паролата.');
  }
});

app.post('/api/points', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Няма активна сесия.');
  const { points } = req.body;
  try {
    const user = await User.findByPk(req.session.user.id);
    user.points += Number(points);
    await user.save();
    req.session.user.points = user.points;
    res.json({ points: user.points });
  } catch (err) {
    console.error('Грешка при update на точки:', err);
    res.status(500).send('Неуспешно обновяване на точките.');
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).send();
  res.json({ username: req.session.user.username, points: req.session.user.points });
});

app.get('/admin/table', async (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== 'demo123') {
    return res.status(401).send('<h2>🚫 Неоторизиран достъп</h2>');
  }

  const users = await User.findAll({ raw: true, order: [['id', 'ASC']] });
  let html = `
  <html>
    <head>
      <meta charset="utf-8">
      <title>Потребители</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; }
        th { background: #eee; }
        code { font-size: 12px; }
      </style>
    </head>
    <body>
      <h2>📋 Регистрирани потребители</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Потребител</th><th>Email</th><th>Парола (bcrypt)</th><th>Точки</th>
          </tr>
        </thead>
        <tbody>
`; 
  users.forEach(user => {
    html += `
      <tr>
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td><code>${user.password}</code></td>
        <td>${user.points}</td>
      </tr>
    `;
  });
  html += `
        </tbody>
      </table>
    </body>
  </html>
`;
  res.send(html);
});

// Старт на сървъра след инициализация и sync
async function startServer() {
  try {
    await init();
    await sequelize.sync();
    app.listen(port, () => console.log(`🚀 Server is running on port ${port}`));
  } catch (err) {
    console.error('❌ Грешка при стартиране на сървъра:', err);
    process.exit(1);
  }
}
startServer();
