// server.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // временно за Supabase self-signed certs

const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const path       = require('path');

const app  = express();
const port = process.env.PORT || 3000;

// Инициализирай Sequelize с Postgres или (fallback) SQLite
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

// Дефинирай моделите
const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER,  primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING,   unique: true, allowNull: false },
  email:    { type: DataTypes.STRING,   unique: true, allowNull: false },
  password: { type: DataTypes.STRING,   allowNull: false },
  points:   { type: DataTypes.INTEGER,  defaultValue: 0 },
}, { tableName: 'users', timestamps: false });

// ... тук добавяш Question, Author, QuestionOption и асоциациите, както преди ...

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
}));
// CORS за разработка
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Рутове
app.get('/api/texts', async (req, res) => {
  // … ако имаш Text модел, ползвай sequelize to fetch …
  res.status(501).json({ error: 'Not implemented' });
});

app.get('/api/questions', async (req, res) => {
  // … твоят code с Question.findAll() …
});

// Регистрация
app.post('/register', async (req, res) => {
  // … bcrypt.hash + User.create() …
});

// Вход
app.post('/login', async (req, res) => {
  // … bcrypt.compare + session …
});

// Точки
app.post('/api/points', async (req, res) => {
  // … User.findByPk + update points …
});

// Текущ потребител
app.get('/api/me', (req, res) => {
  // … res.json(req.session.user) …
});

// Админ таблица
app.get('/admin/table', async (req, res) => {
  // … User.findAll({ raw: true }) + генерирай HTML …
});

// Стартиране: първо sync, после listen
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
