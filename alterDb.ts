import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function alterTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_result'
  });

  try {
    await connection.query(`ALTER TABLE school_settings ADD COLUMN exam_types VARCHAR(255) DEFAULT 'Half-Yearly, Annual';`);
    console.log('Added exam_types column successfully.');
  } catch(e) {
    console.error(e);
  }
  await connection.end();
}
alterTable();
