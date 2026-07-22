import { Request, Response } from 'express';
import { query, execute, withTransaction } from '../utils/dbHelper';
import * as xlsx from 'xlsx';
import fs from 'fs';

// =======================
// CREATE STUDENT (With Parent)
// =======================
export const createStudent = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.admission_number || !data.first_name || !data.class_id || !data.section_id) {
      return res.status(400).json({ message: 'admission_number, first_name, class_id and section_id are required' });
    }

    let sessionId = data.current_session_id;
    if (!sessionId) {
      const current: any = await query('SELECT id FROM academic_sessions WHERE is_current = 1 LIMIT 1');
      sessionId = current[0]?.id || null;
    }
    
    // Perform insertions inside a transaction
    await withTransaction(async (connection) => {
      // 1. Insert Parent
      const [parentResult] = await connection.execute(
        `INSERT INTO parents (father_name, mother_name, phone, email, address, guardian_name, guardian_phone) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.father_name || null,
          data.mother_name || null,
          data.parent_phone || null,
          data.parent_email || null,
          data.address || null,
          data.guardian_name || null,
          data.guardian_phone || null
        ]
      );
      
      const parentId = (parentResult as any).insertId;

      // 2. Insert Student
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
      
      await connection.execute(
        `INSERT INTO students (
          admission_number, roll_number, first_name, last_name, dob, 
          gender, photo_url, parent_id, class_id, section_id, current_session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.admission_number,
          data.roll_number || null,
          data.first_name,
          data.last_name || null,
          data.dob || null,
          data.gender || null,
          photoUrl,
          parentId,
          data.class_id,
          data.section_id,
          sessionId
        ]
      );
    });

    res.status(201).json({ message: 'Student and Parent created successfully' });
  } catch (error: any) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Error creating student', details: error.message });
  }
};

// =======================
// GET ALL STUDENTS (With Filters)
// =======================
export const getStudents = async (req: Request, res: Response) => {
  try {
    const { class_id, section_id, session_id, search } = req.query;
    
    let sql = `
      SELECT s.*, c.name as class_name, sec.name as section_name,
             p.father_name, p.mother_name, p.phone, p.email as parent_email, p.address as parent_address
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (class_id) {
      sql += ' AND s.class_id = ?';
      params.push(class_id);
    }
    if (section_id) {
      sql += ' AND s.section_id = ?';
      params.push(section_id);
    }
    if (session_id) {
      sql += ' AND s.current_session_id = ?';
      params.push(session_id);
    }
    if (search) {
      sql += ' AND (s.first_name LIKE ? OR s.admission_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.first_name ASC LIMIT 500'; // Hard limit for safety

    const students = await query(sql, params);
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching students' });
  }
};

// =======================
// BULK IMPORT EXCEL
// =======================
export const bulkImportStudents = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failCount = 0;
    let errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      try {
        await withTransaction(async (connection) => {
          const [parentResult] = await connection.execute(
            `INSERT INTO parents (father_name, mother_name, phone) VALUES (?, ?, ?)`,
            [row.FatherName || null, row.MotherName || null, row.Phone || null]
          );
          
          const parentId = (parentResult as any).insertId;

          await connection.execute(
            `INSERT INTO students (
              admission_number, roll_number, first_name, last_name, gender, parent_id, class_id, section_id, current_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.AdmissionNumber,
              row.RollNumber || null,
              row.FirstName,
              row.LastName || null,
              row.Gender || null,
              parentId,
              row.ClassId || null,
              row.SectionId || null,
              row.SessionId || null
            ]
          );
        });
        successCount++;
      } catch (err: any) {
        failCount++;
        errors.push({ row: i + 2, error: err.message });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Bulk import completed',
      successCount,
      failCount,
      errors
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ message: 'Internal server error during import', details: error.message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // By foreign key cascade, this might also delete dependent records. Wait, parent shouldn't be deleted if multiple siblings.
    // It's safer to just set status = 'Inactive' or just delete student.
    await execute('DELETE FROM students WHERE id = ?', [id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student' });
  }
}

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // First verify student exists and get parent_id
    const students: any = await query('SELECT parent_id, photo_url, current_session_id FROM students WHERE id = ?', [id]);
    if (students.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const parentId = students[0].parent_id;
    let sessionId = data.current_session_id || students[0].current_session_id;
    if (!sessionId) {
      const current: any = await query('SELECT id FROM academic_sessions WHERE is_current = 1 LIMIT 1');
      sessionId = current[0]?.id || null;
    }

    await withTransaction(async (connection) => {
      // 1. Update Parent
      if (parentId) {
        await connection.execute(
          `UPDATE parents SET father_name=?, mother_name=?, phone=?, email=?, address=?, guardian_name=?, guardian_phone=? WHERE id=?`,
          [
            data.father_name || null,
            data.mother_name || null,
            data.parent_phone || null,
            data.parent_email || null,
            data.address || null,
            data.guardian_name || null,
            data.guardian_phone || null,
            parentId
          ]
        );
      }

      // 2. Update Student
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : (data.existing_photo_url || students[0].photo_url || null);
      
      await connection.execute(
        `UPDATE students SET 
          admission_number=?, roll_number=?, first_name=?, last_name=?, dob=?, 
          gender=?, photo_url=?, class_id=?, section_id=?, current_session_id=?
         WHERE id=?`,
        [
          data.admission_number,
          data.roll_number || null,
          data.first_name,
          data.last_name || null,
          data.dob || null,
          data.gender || null,
          photoUrl,
          data.class_id,
          data.section_id,
          sessionId,
          id
        ]
      );
    });

    res.json({ message: 'Student updated successfully' });
  } catch (error: any) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Error updating student', details: error.message });
  }
};
