const express      = require('express');
const session      = require('express-session');
const bodyParser   = require('body-parser');
const serveIndex   = require('serve-index');
const bcrypt       = require('bcrypt');
const path         = require('path');
const sqlite3      = require('sqlite3').verbose();

const app          = express();
const port         = process.env.PORT || 3000;
const saltRounds   = 10;

const isProd       = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

let pool;
let sessionStore;

// Функция за query, използвана както от PostgreSQL pool, така и от SQLite wrapper
async function query(text, params) {
  return pool.query(text, params);
}

// --- Настройки на базата и сесиите ---
if (isProd && process.env.DATABASE_URL) {
  // Production: PostgreSQL + сесии в Postgres
  const { Pool } = require('pg');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const sessionLib = require('express-session');
  const PgSession = require('connect-pg-simple')(sessionLib);

  sessionStore = new PgSession({
    pool,                    // твоят pg Pool
    tableName: 'session',    // име на сесия таблица
    createTableIfMissing: true  // <— тази опция създава таблицата автоматично
  });

  app.use(sessionLib({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 дни
  }));

} else {
  // Development: SQLite fallback + вграден MemoryStore за сесии
  const db = new sqlite3.Database('./mydb.db');
  pool = {
    query: (text, params = []) => new Promise((resolve, reject) => {
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
    })
  };
  sessionStore = new session.MemoryStore();
  app.use(session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
  }));
}

// --- Среден софтуер ---
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', serveIndex(path.join(__dirname, 'public')));

// --- Миграции: създаване на таблици и липсващи колони ---
(async () => {
  try {
    // Създава таблица users, ако липсва
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id ${isProd ? 'SERIAL' : 'INTEGER'} PRIMARY KEY${isProd ? '' : ' AUTOINCREMENT'},
        username TEXT NOT NULL UNIQUE,
        email    TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        points   INTEGER DEFAULT 0,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Създава таблицата за сесии, ако ползваш SQLite
    if (!isProd) {
      await query(`
        CREATE TABLE IF NOT EXISTS session (
          sid TEXT PRIMARY KEY,
          sess TEXT NOT NULL,
          expire TIMESTAMP NOT NULL
        );
      `);
    }

    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();

// --- Основни маршрути ---
app.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users ORDER BY points DESC');
    let html = `
      <html><body>
      <h1>Потребители</h1>
      <table border="1">
        <tr><th>ID</th><th>Username</th><th>Email</th><th>Password</th><th>Points</th></tr>
    `;
    result.rows.forEach(r => {
      html += `<tr>
        <td>${r.id}</td>
        <td>${r.username}</td>
        <td>${r.email}</td>
        <td><code>${r.password}</code></td>
        <td>${r.points}</td>
      </tr>`;
    });
    html += '</table></body></html>';
    res.send(html);
  } catch {
    res.status(500).send('Грешка при зареждане.');
  }
});

// --- Затваряща скоба за if (isProd && process.env.DATABASE_URL) ---
}  // closing if (isProd && process.env.DATABASE_URL)

// --- Стартиране на сървъра ---
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
