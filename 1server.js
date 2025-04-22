require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// const csurf = require('csurf'); // Uncomment if using CSRF
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// ---- СТАРТ на заместващия код ----
const path = require('path');
// let db;

// Ако има DATABASE_URL, използваме Postgres, иначе – SQLite
if (process.env.DATABASE_URL) {
  const { Client } = require('pg');
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  db.connect(err => {
    if (err) console.error('Не може да се свърже с Postgres:', err.stack);
    else console.log('Свързахме се успешно към Postgres базата.');
  });
} else {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(
    path.join(__dirname, 'mydb.db'),
    err => {
      if (err) console.error('Не може да се отвори SQLite базата:', err.message);
      else console.log('SQLite базата данни е успешно отворена.');
    }
  );
}
// ---- КРАЙ на заместващия код ----

// Open SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'mydb.db'), (err) => {
  if (err) console.error('Не може да се отвори базата данни:', err.message);
  else console.log('SQLite базата данни е успешно отворена.');
});

// Middleware
app.use(helmet());
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // limit each IP to 10 requests per windowMs
  message: 'Твърде много опити – пробвай пак след 15 минути.'
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));

// CORS headers (development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Authentication middleware
function ensureLoggedIn(req, res, next) {
  if (!req.session.user) return res.status(401).send('Моля, влезте в системата.');
  next();
}
function ensureAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.status(403).send('Нямате достъп.');
  next();
}

// Routes

// Fetch text content (authenticated)
app.get('/api/texts', ensureLoggedIn, (req, res) => {
  const textId = req.query.id;
  db.get('SELECT content FROM texts WHERE id = ?', [textId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Текстът не е намерен.' });
    res.json(row);
  });
});

// Fetch questions
app.get('/api/questions', (req, res) => {
  const authorName = req.query.author;
  let sql, params;
  if (!authorName || ['all', 'obobshtenie', 'обобщение'].includes(authorName.trim().toLowerCase())) {
    sql = `SELECT q.id AS question_id, q.question, q.explanation, q.type, q.text_id,
      COALESCE(qo.label, '') AS label, COALESCE(qo.option_text, '') AS option_text,
      COALESCE(qo.is_correct, 0) AS is_correct, COALESCE(qo.matching_key, '') AS matching_key
      FROM questions q
      INNER JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE LOWER(a.name) NOT IN ('nvo2022','nvo2023','nvo2024')
      ORDER BY q.id, qo.id`;
    params = [];
  } else {
    sql = `SELECT q.id AS question_id, q.question, q.explanation, q.type, q.text_id,
      COALESCE(qo.label, '') AS label, COALESCE(qo.option_text, '') AS option_text,
      COALESCE(qo.is_correct, 0) AS is_correct, COALESCE(qo.matching_key, '') AS matching_key
      FROM questions q
      INNER JOIN authors a ON q.author_id = a.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE a.name = ?
      ORDER BY q.id, qo.id`;
    params = [authorName];
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const questionsMap = {};
    rows.forEach(row => {
      if (!questionsMap[row.question_id]) {
        questionsMap[row.question_id] = {
          id: row.question_id,
          question: row.question,
          explanation: row.explanation,
          type: row.type,
          textId: row.text_id,
          options: []
        };
      }
      if (row.label || row.option_text || row.matching_key) {
        questionsMap[row.question_id].options.push({
          label: row.label,
          option_text: row.option_text,
          matching_key: row.matching_key,
          is_correct: row.is_correct === 1
        });
      }
    });
    res.json(Object.values(questionsMap));
  });
});

// Registration endpoint
app.post(
  '/register',
  authLimiter,
  [
    body('username').isLength({ min: 3 }).withMessage('Минимум 3 символа').trim().escape(),
    body('email').isEmail().withMessage('Невалиден e-mail').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Паролата трябва да е поне 6 символа')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
      (err, row) => {
        if (err) return res.status(500).send('Вътрешна грешка.');
        if (row) return res.status(400).send('Потребител или e-mail вече съществува.');

        bcrypt.hash(password, 12)
          .then(hash => {
            db.run(
              'INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)',
              [username, email, hash, 'user'],
              function(err) {
                if (err) return res.status(500).send('Грешка при регистрация.');
                res.send('Регистрацията е успешна!');
              }
            );
          })
          .catch(() => res.status(500).send('Грешка при криптиране.'));
      }
    );
  }
);

// Login endpoint
app.post(
  '/login',
  authLimiter,
  [
    body('username').notEmpty().withMessage('Въведи потребителско име'),
    body('password').notEmpty().withMessage('Въведи парола')
  ],
  (req, res) => {
    console.log('🔍 /login BODY:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) return res.status(500).send('Вътрешна грешка.');
      if (!user) return res.status(400).send('Няма такъв потребител.');

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).send('Грешна парола.');

      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.send('Успешен вход!');
    });
  }
);

// Serve static files
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
