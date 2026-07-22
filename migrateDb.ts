import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_result',
    multipleStatements: true
  });

  try {
    console.log('Migrating school_result schema...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        father_name VARCHAR(100),
        mother_name VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        guardian_name VARCHAR(100),
        guardian_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exam_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        min_percentage DECIMAL(5,2) NOT NULL,
        max_percentage DECIMAL(5,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        session_id INT NOT NULL,
        exam_type_id INT NOT NULL,
        total_max_marks DECIMAL(8,2) DEFAULT 0,
        total_marks_obtained DECIMAL(8,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        grade VARCHAR(20),
        pass_fail VARCHAR(20),
        \`rank\` INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_result (student_id, session_id, exam_type_id)
      );
    `);

    // Drop incompatible exam/marks tables (old structure)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS marks');
    await connection.query('DROP TABLE IF EXISTS exam_schedules');
    await connection.query('DROP TABLE IF EXISTS exams');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.query(`
      CREATE TABLE exams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_type_id INT NOT NULL,
        session_id INT NOT NULL,
        class_id INT NOT NULL,
        subject_id INT NOT NULL,
        exam_date DATE,
        max_marks DECIMAL(5,2) DEFAULT 100,
        passing_marks DECIMAL(5,2) DEFAULT 33,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_type_id) REFERENCES exam_types(id) ON DELETE RESTRICT,
        FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE RESTRICT,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_exam (exam_type_id, session_id, class_id, subject_id)
      );

      CREATE TABLE marks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT NOT NULL,
        student_id INT NOT NULL,
        marks_obtained DECIMAL(5,2) DEFAULT 0,
        grace_marks DECIMAL(5,2) DEFAULT 0,
        is_absent TINYINT(1) DEFAULT 0,
        remarks VARCHAR(255),
        entry_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_marks (exam_id, student_id)
      );
    `);

    // Alter students to match controllers (ignore if already present)
    const studentAlters = [
      "ALTER TABLE students MODIFY last_name VARCHAR(100) NULL",
      "ALTER TABLE students ADD COLUMN roll_number VARCHAR(50) NULL AFTER admission_number",
      "ALTER TABLE students ADD COLUMN photo_url VARCHAR(255) NULL AFTER gender",
      "ALTER TABLE students ADD COLUMN parent_id INT NULL AFTER photo_url",
      "ALTER TABLE students ADD COLUMN current_session_id INT NULL AFTER section_id",
      "ALTER TABLE students ADD CONSTRAINT fk_students_parent FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL",
      "ALTER TABLE students ADD CONSTRAINT fk_students_session FOREIGN KEY (current_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL"
    ];

    for (const sql of studentAlters) {
      try {
        await connection.query(sql);
        console.log('OK:', sql.slice(0, 80));
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.code === 'ER_FK_DUP_NAME') {
          console.log('Skip (exists):', sql.slice(0, 60));
        } else {
          console.log('Warn:', e.code || e.message, '-', sql.slice(0, 60));
        }
      }
    }

    // school_settings.exam_types column
    try {
      await connection.query(`ALTER TABLE school_settings ADD COLUMN exam_types VARCHAR(255) DEFAULT 'Half-Yearly, Annual'`);
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.log('settings alter:', e.code || e.message);
    }

    // Sync exam types from settings into exam_types table
    const [settings]: any = await connection.query('SELECT exam_types FROM school_settings LIMIT 1');
    const typesStr = settings[0]?.exam_types || 'Half-Yearly, Annual';
    for (const name of typesStr.split(',').map((t: string) => t.trim()).filter(Boolean)) {
      await connection.query('INSERT IGNORE INTO exam_types (name) VALUES (?)', [name]);
    }

    // Default grade scale if empty (system config, not demo data)
    const [gradeCount]: any = await connection.query('SELECT COUNT(*) AS c FROM grades');
    if (gradeCount[0].c === 0) {
      await connection.query(`
        INSERT INTO grades (name, min_percentage, max_percentage) VALUES
        ('A+', 90, 100),
        ('A', 80, 89.99),
        ('B+', 70, 79.99),
        ('B', 60, 69.99),
        ('C', 50, 59.99),
        ('D', 33, 49.99),
        ('F', 0, 32.99)
      `);
    }

    // activity_logs optional columns used by middleware
    const logAlters = [
      "ALTER TABLE activity_logs ADD COLUMN entity VARCHAR(100) NULL",
      "ALTER TABLE activity_logs ADD COLUMN ip_address VARCHAR(50) NULL",
      "ALTER TABLE activity_logs ADD COLUMN user_name VARCHAR(100) NULL",
      "ALTER TABLE activity_logs ADD COLUMN type VARCHAR(50) NULL"
    ];
    for (const sql of logAlters) {
      try {
        await connection.query(sql);
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('log alter warn:', e.code || e.message);
      }
    }

    await connection.query(`INSERT IGNORE INTO roles (name) VALUES ('Admin'), ('Teacher'), ('Student')`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

migrate();
