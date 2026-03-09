import Database from 'better-sqlite3';

const db = new Database('khural.db');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS prayers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL,
    username TEXT,
    prayer_id INTEGER,
    names TEXT NOT NULL,
    donation_amount REAL,
    status TEXT DEFAULT 'pending', -- pending, verified, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prayer_id) REFERENCES prayers(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    telegram_id TEXT PRIMARY KEY,
    role TEXT DEFAULT 'lama'
  );

  -- Migration for existing admins table
  try {
    db.exec("ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'lama'");
  } catch (e) {
    // Ignore if column already exists
  }

  -- Seed initial prayers if empty
  INSERT OR IGNORE INTO prayers (id, name, description) VALUES 
  (1, 'Намсарай Сахюусан', 'За материальное и духовное благосостояние'),
  (2, 'Юм Нити', 'Устранение болезней, страданий и препятствий'),
  (3, 'Манай Баатруудад', 'Для защиты и удачи участников СВО'),
  (4, 'Юм Чун', 'Устранение преград'),
  (5, 'Доржо Жодбо', 'Защита, благополучие'),
  (6, 'Даши Зэгба', 'Исправление негативных проявлений'),
  (7, 'Найман Гэгээн', 'Устранение препятствий и благополучие'),
  (8, '21 Дара Эхын Магтаал', 'Устранение препятствий и защита'),
  (9, 'Сагаан Дара Эхын Тарни 108', 'За удачу в делах и долголетие'),
  (10, 'Табан Харюулга', 'Защита от негативного, устранение препятствий'),
  (11, 'Цедо', 'Накопление добродетели'),
  (12, 'Заһалай найман ном', 'Устранение препятствий'),
  (13, 'Согто Зандан', 'Устранение препятствий и семейный достаток'),
  (14, 'Сунды', 'Собрание сутр за благоденствие'),
  (15, 'Отошо хурал', 'За здоровье'),
  (16, 'Насны гурбан судар', 'Насны гурбан судар'),
  (17, 'Алтан Гэрэл', 'Устранение препятствий и семейный достаток'),
  (18, 'Зурган Юроол', 'Шесть благих пожеланий');
`);

export default db;
