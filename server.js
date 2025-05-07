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

// Създаваме таблица за потребители
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  
)`, (err) => {
  if (err) console.error('Грешка при създаване на таблицата за потребители:', err.message);
  else console.log('Таблицата за потребители е готова.');
});
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
app.get('/api/score', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Не сте влезли" });
  db.get(
    "SELECT points FROM users WHERE id = ?",
    [req.session.user.id],
    (err, row) => {
      if (err) {
        console.error("DB грешка в /api/score:", err.message);
        return res.status(500).json({ error: "Вътрешна грешка" });
      }
      if (!row) {
        // няма такъв потребител
        return res.status(404).json({ error: "Потребителят не е намерен" });
      }
      res.json({ points: row.points });
    }
  );
});



/* ---------------------- API Endpoint за регистрация ---------------------- */
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).send("Моля, попълнете всички полета.");
  }
  
  bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("Грешка при хеширане:", err.message);
    return res.status(500).send("Грешка при криптиране на паролата.");
  }

  db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hash], function(err) {
    if (err) {
      console.error("Грешка при регистрирането:", err.message);
      return res.status(500).send("Възникна грешка при регистрирането.");
    }
    res.status(200).send("Регистрацията е успешна!");
  });
});

});

/* ---------------------- API Endpoint за вход ---------------------- */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Моля, попълнете всички полета.");
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error("Грешка при проверка на потребителските данни:", err.message);
      return res.status(500).send("Възникна грешка при проверка.");
    }

    if (!user) {
      return res.status(400).send("Потребителското име не съществува.");
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error("Грешка при сравнение на пароли:", err.message);
        return res.status(500).send("Грешка при проверка на паролата.");
      }
  
      if (!result) {
        return res.status(400).send("Невалидна парола.");
      }

      // Премахнати са ъпдейтите на точките от тук!
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      // Връщаме успешен вход
      return res.status(200).send("Входът е успешен!");
    });
  });
});

app.get('/api/users', (req, res) => {
  if (req.query.key !== 'demo123') return res.status(401).send();
  db.all(
    "SELECT id, username, email, password FROM users",
    (err, rows) => {
      if (err) return res.status(500).send();
      res.json(rows);
    }
  );
});

// Връща текущите точки
app.get('/api/score', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Не сте влезли" });
  db.get(
    "SELECT points FROM users WHERE id = ?",
    [req.session.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: "DB грешка" });
      res.json({ points: row.points });
    }
  );
});

// Инкремент на точки
app.post('/api/score', express.json(), (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Не сте влезли" });
  const { delta } = req.body;
  // защита — да не вкараш отрицателни или твърде големи стойности
  const inc = Math.max(0, Math.min(delta, 1000));
  db.run(
    "UPDATE users SET points = points + ? WHERE id = ?",
    [inc, req.session.user.id],
    err => {
      if (err) return res.status(500).json({ error: "DB грешка при ъпдейт" });
      // връщаме новата стойност
      db.get(
        "SELECT points FROM users WHERE id = ?",
        [req.session.user.id],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: "DB грешка" });
          res.json({ points: row.points });
        }
      );
    }
  );
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

