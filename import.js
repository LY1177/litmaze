// import.js
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Чете DATABASE_URL от ENV
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ Не е зададена ENV променлива DATABASE_URL");
  process.exit(1);
}

// Създаваме нов Sequelize инстанс за Postgres
const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  dialectOptions: { ssl: { rejectUnauthorized: false } }
});

(async () => {
  try {
    // Прочитаме целия mysql.sql
    const sqlFile = path.join(__dirname, 'mysql.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Разделяме на отделни SQL команди по ";"
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length);

    console.log(`Ще изпълня ${statements.length} SQL statements…`);
    for (let stmt of statements) {
      await sequelize.query(stmt);
    }
    console.log("✅ Всички statements изпълнени успешно!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Грешка при import:", err);
    process.exit(1);
  }
})();
