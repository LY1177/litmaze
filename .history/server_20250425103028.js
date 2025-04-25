process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignore self-signed certs for Postgres pooler

const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const path       = require('path');
const serveIndex = require('serve-index');
const bcrypt     = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');

const app  = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// Инициализация на Sequelize: Postgres при зададен DATABASE_URL, иначе SQLite
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'mydb.db')
    });

// Модели
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,  unique: true, allowNull: false },
  email:    { type: DataTypes.STRING,  unique: true, allowNull: false },
  password: { type: DataTypes.STRING,  allowNull: false },
  points:   { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'users', timestamps: false });

const Author = sequelize.define('Author', {
  id:   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING
}, { tableName: 'authors', timestamps: false });

const Question = sequelize.define('Question', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  question:    DataTypes.TEXT,
  explanation: DataTypes.TEXT,
  type:        DataTypes.STRING,
  text_id:     DataTypes.INTEGER
}, { tableName: 'questions', timestamps: false });

const QuestionOption = sequelize.define('QuestionOption', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  question_id:  DataTypes.INTEGER,
  label:        DataTypes.STRING,
  option_text:  DataTypes.TEXT,
  is_correct:   DataTypes.BOOLEAN,
  matching_key: DataTypes.STRING
}, { tableName: 'question_options', timestamps: false });

// Асоциации
Question.belongsTo(Author, { foreignKey: 'author_id' });
Author.hasMany(Question, { foreignKey: 'author_id' });
Question.hasMany(QuestionOption, { foreignKey: 'question_id' });
QuestionOption.belongsTo(Question, { foreignKey: 'question_id' });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: false }));
// CORS за разработка
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Статични файлове
app.use(express.static('public'));
app.use('/adminer', express.static(path.join(__dirname, 'adminer')), serveIndex(path.join(__dirname, 'adminer'), { icons: true }));

// Рутове
app.get('/api/texts', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/questions', async (req, res) => {
  const authorName = (req.query.author || 'all').toLowerCase();
  const where = authorName === 'all' ? {} : { name: req.query.author };
  const questionsRaw = await Question.findAll({
    include: [
      { model: Author, where, attributes: [] },
      { model: QuestionOption, attributes: ['label','option_text','is_correct','matching_key'] }
    ],
    order: [['id','ASC']]
  });
  const questions = questionsRaw.map(q => ({
    id: q.id,
    question: q.question,
    explanation: q.explanation,
    type: q.type,
    textId: q.text_id,
    options: q.QuestionOptions.map(o => ({ label: o.label, option_text: o.option_text, is_correct: o.is_correct, matching_key: o.matching_key }))
  }));
  res.json(questions);
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).send('Попълнете всички полета.');
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    await User.create({ username, email, password: hash });
    res.send('Регистрация успешна!');
  } catch (e) {
    console.error(e);
    res.status(500).send('Грешка при регистрация.');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Попълнете всички полета.');
  try {
    const user = await User.findOne({ where: { username }});
    if (!user) return res.status(400).send('Невалидно потребителско име.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).send('Невалидна парола.');
    req.session.user = { id: user.id, username: user.username, points: user.points };
    res.send('Успешен вход!');
  } catch (e) {
    console.error(e);
    res.status(500).send('Грешка при вход.');
  }
});

app.post('/api/points', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Не сте влезли.');
  const pts = Number(req.body.points) || 0;
  try {
    const user = await User.findByPk(req.session.user.id);
    user.points += pts;
    await user.save();
    req.session.user.points = user.points;
    res.json({ points: user.points });
  } catch (e) {
    console.error(e);
    res.status(500).send('Грешка при update на точки.');
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).end();
  res.json(req.session.user);
});

app.get('/admin/table', async (req, res) => {
  if (req.query.key !== 'demo123') return res.status(401).send('<h2>🚫 Неоторизиран достъп</h2>');
  const users = await User.findAll({ raw: true, order: [['id','ASC']] });
  let html = `
    <html><head><title>Потребители</title>
    <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid#ccc;padding:8px}th{background:#eee}</style>
    </head><body><h2>📋 Регистрирани потребители</h2><table>
    <tr><th>ID</th><th>Потребител</th><th>Email</th><th>Парола</th><th>Точки</th></tr>`;
  users.forEach(u => {
    html += `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.email}</td><td><code>${u.password}</code></td><td>${u.points}</td></tr>`;
  });
  html += `</table></body></html>`;
  res.send(html);
});

// Стартиране след sync
(async () => {
  try {
    await sequelize.sync();
    console.log('✅ Таблиците са създадени/актуализирани');
    app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
  } catch (e) {
    console.error('❌ Грешка при стартиране на сървъра:', e);
    process.exit(1);
  }
})();
