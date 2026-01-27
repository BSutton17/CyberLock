import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV = process.env.NODE_ENV || 'development';
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let db = null;

// Initialize SQLite Database
const initSQLite = async () => {
  const dbPath = path.join(__dirname, '../data/database.db');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✓ Connected to SQLite database');
        resolve(database);
      }
    });
  });
};

// Initialize MySQL Database (we will use this in prod)
const initMySQL = async () => {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'capstone',
  });

  console.log('✓ Connected to MySQL database');
  return connection;
};

// Create tables for SQLite
const createSQLiteTables = async (database) => {
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Users table
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          auth_type TEXT DEFAULT 'local',
          google_id TEXT UNIQUE,
          outlook_id TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });

      // Sessions table
      database.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          refresh_token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

// Create tables for MySQL (used in prod)
const createMySQLTables = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      auth_type VARCHAR(50) DEFAULT 'local',
      google_id VARCHAR(255) UNIQUE,
      outlook_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      refresh_token VARCHAR(255) UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✓ Database tables created/verified');
};

// Initialize Database
export const initializeDatabase = async () => {
  try {
    if (DB_TYPE === 'sqlite') {
      db = await initSQLite();
      await createSQLiteTables(db);
    } else if (DB_TYPE === 'mysql') {
      db = await initMySQL();
      await createMySQLTables(db);
    }
    return db;
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  }
};

// Database Query Functions
export const query = (sql, params = []) => {
  if (DB_TYPE === 'sqlite') {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  } else if (DB_TYPE === 'mysql') {
    return db.query(sql, params);
  }
};

export const queryOne = (sql, params = []) => {
  if (DB_TYPE === 'sqlite') {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  } else if (DB_TYPE === 'mysql') {
    return db.query(sql, params).then((result) => result[0][0]);
  }
};

export const execute = (sql, params = []) => {
  if (DB_TYPE === 'sqlite') {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  } else if (DB_TYPE === 'mysql') {
    return db.query(sql, params).then((result) => ({
      id: result[0].insertId,
      changes: result[0].affectedRows,
    }));
  }
};

export const getDatabase = () => db;
