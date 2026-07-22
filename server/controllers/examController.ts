import { Request, Response } from 'express';
import { query, execute, withTransaction } from '../utils/dbHelper';
import * as xlsx from 'xlsx';
import fs from 'fs';

// =======================
// EXAM TYPES
// =======================
export const getExamTypes = async (req: Request, res: Response) => {
  try {
    const examTypes = await query('SELECT * FROM exam_types ORDER BY created_at DESC');
    res.json(examTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exam types' });
  }
};

export const createExamType = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const result = await execute('INSERT INTO exam_types (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ id: result.insertId, message: 'Exam type created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating exam type' });
  }
};

// =======================
// EXAMS / SCHEDULE
// =======================
export const getExams = async (req: Request, res: Response) => {
  try {
    const { session_id, class_id, exam_type_id } = req.query;
    let sql = `
      SELECT e.*, et.name as exam_type_name, c.name as class_name, s.name as subject_name
      FROM exams e
      JOIN exam_types et ON e.exam_type_id = et.id
      JOIN classes c ON e.class_id = c.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (session_id) { sql += ' AND e.session_id = ?'; params.push(session_id); }
    if (class_id) { sql += ' AND e.class_id = ?'; params.push(class_id); }
    if (exam_type_id) { sql += ' AND e.exam_type_id = ?'; params.push(exam_type_id); }
    
    sql += ' ORDER BY e.exam_date ASC, s.name ASC';

    const exams = await query(sql, params);
    res.json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching exams' });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const { exam_type_id, session_id, class_id, subject_id, exam_date, max_marks, passing_marks } = req.body;

    if (!exam_type_id || !session_id || !class_id || !subject_id) {
      return res.status(400).json({ message: 'exam_type_id, session_id, class_id and subject_id are required' });
    }
    
    const result = await execute(
      `INSERT INTO exams (exam_type_id, session_id, class_id, subject_id, exam_date, max_marks, passing_marks) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE exam_date = VALUES(exam_date), max_marks = VALUES(max_marks), passing_marks = VALUES(passing_marks)`,
      [exam_type_id, session_id, class_id, subject_id, exam_date || null, max_marks || 100, passing_marks || 33]
    );
    res.status(201).json({ id: result.insertId, message: 'Exam scheduled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error scheduling exam', details: error.message });
  }
};

export const findOrCreateExam = async (req: Request, res: Response) => {
  try {
    const { session_id, class_id, exam_type_id, subject_id, max_marks } = req.body;
    if (!session_id || !class_id || !exam_type_id || !subject_id) {
      return res.status(400).json({ message: 'session_id, class_id, exam_type_id and subject_id are required' });
    }

    const existing: any = await query(
      'SELECT id FROM exams WHERE session_id = ? AND class_id = ? AND exam_type_id = ? AND subject_id = ? LIMIT 1',
      [session_id, class_id, exam_type_id, subject_id]
    );

    if (existing.length > 0) {
      return res.json({ id: existing[0].id, message: 'Existing exam found' });
    }

    const result = await execute(
      'INSERT INTO exams (session_id, class_id, exam_type_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)',
      [session_id, class_id, exam_type_id, subject_id, max_marks || 100, (max_marks || 100) * 0.33]
    );
    res.json({ id: result.insertId, message: 'New exam created' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error in findOrCreateExam', details: error.message });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM exams WHERE id = ?', [id]);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting exam', details: error.message });
  }
};

export const getMarksForExam = async (req: Request, res: Response) => {
  try {
    const { exam_id } = req.query;
    if (!exam_id) {
      return res.status(400).json({ message: 'exam_id is required' });
    }

    const examRows: any = await query(
      `SELECT e.*, c.name as class_name, s.name as subject_name
       FROM exams e
       JOIN classes c ON e.class_id = c.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = ?`,
      [exam_id]
    );

    if (!examRows.length) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const exam = examRows[0];
    const students = await query(
      `SELECT st.id as student_id, st.admission_number, st.roll_number, st.first_name, st.last_name,
              m.marks_ist, m.marks_iind, m.marks_obtained, m.grace_marks, m.is_absent, m.remarks
       FROM students st
       LEFT JOIN marks m ON m.student_id = st.id AND m.exam_id = ?
       WHERE st.class_id = ?
       ORDER BY CAST(st.roll_number AS UNSIGNED), st.first_name`,
      [exam_id, exam.class_id]
    );

    res.json({ exam, students });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching marks', details: error.message });
  }
};

// =======================
// MARKS ENTRY
// =======================
export const saveMarks = async (req: Request, res: Response) => {
  try {
    const { exam_id, marks_data } = req.body;
    const entry_by = (req as any).user.id;

    await withTransaction(async (connection) => {
      for (const entry of marks_data) {
        const ist = parseFloat(entry.marks_ist ?? 0) || 0;
        const iind = parseFloat(entry.marks_iind ?? 0) || 0;
        const obtained =
          ist + iind > 0
            ? ist + iind
            : parseFloat(entry.marks_obtained ?? 0) || 0;

        await connection.execute(
          `INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, is_absent, remarks, entry_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           marks_ist = VALUES(marks_ist),
           marks_iind = VALUES(marks_iind),
           marks_obtained = VALUES(marks_obtained),
           is_absent = VALUES(is_absent),
           remarks = VALUES(remarks),
           entry_by = VALUES(entry_by)`,
          [exam_id, entry.student_id, ist, iind, obtained, entry.is_absent || 0, entry.remarks || '', entry_by]
        );
      }
    });

    res.json({ message: 'Marks saved successfully' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error saving marks', details: error.message });
  }
};

// =======================
// BULK MARKS IMPORT EXCEL
// =======================
export const bulkImportMarks = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }
    const { exam_id } = req.body;
    if (!exam_id) {
      return res.status(400).json({ message: 'exam_id is required in form-data' });
    }

    const entry_by = (req as any).user.id;
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successCount = 0;
    let failCount = 0;
    let errors: any[] = [];

    await withTransaction(async (connection) => {
      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        try {
          if (!row.AdmissionNumber) throw new Error("AdmissionNumber is missing");
          
          // Find student by admission number
          const [students]: any = await connection.execute(
            'SELECT id FROM students WHERE admission_number = ?', [row.AdmissionNumber]
          );
          
          if (!students || students.length === 0) {
            throw new Error(`Student not found for admission number ${row.AdmissionNumber}`);
          }
          
          const studentId = students[0].id;
          const ist = parseFloat(row.MarksIst || row.Ist || 0) || 0;
          const iind = parseFloat(row.MarksIInd || row.IInd || 0) || 0;
          const marks = ist + iind > 0 ? ist + iind : (parseFloat(row.MarksObtained) || 0);
          const isAbsent = row.IsAbsent === 'Yes' || row.IsAbsent === 'Y' ? 1 : 0;
          
          await connection.execute(
            `INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, is_absent, remarks, entry_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             marks_ist = VALUES(marks_ist),
             marks_iind = VALUES(marks_iind),
             marks_obtained = VALUES(marks_obtained), 
             is_absent = VALUES(is_absent), 
             remarks = VALUES(remarks),
             entry_by = VALUES(entry_by)`,
            [exam_id, studentId, ist, iind, marks, isAbsent, row.Remarks || '', entry_by]
          );
          successCount++;
        } catch (err: any) {
          failCount++;
          errors.push({ row: i + 2, error: err.message });
        }
      }
    });

    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Bulk marks import completed',
      successCount,
      failCount,
      errors
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error during marks import', details: error.message });
  }
};


// =======================
// STUDENT-WISE MARKS ENTRY
// =======================
export const getStudentMarks = async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, class_id } = req.query;
    if (!student_id || !session_id || !class_id) {
      return res.status(400).json({ message: 'student_id, session_id, class_id are required' });
    }

    const students: any = await query(
      `SELECT s.*, c.name AS class_name, c.level AS class_level, sec.name AS section_name,
              p.father_name, p.mother_name, sess.name AS session_name
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN academic_sessions sess ON sess.id = ?
       WHERE s.id = ?`,
      [session_id, student_id]
    );
    if (!students.length) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subjects: any = await query('SELECT id, name FROM subjects ORDER BY name ASC');
    const examTypes: any = await query('SELECT id, name FROM exam_types ORDER BY id ASC');

    const existingExams: any = await query(
      'SELECT id, subject_id, exam_type_id, max_marks FROM exams WHERE session_id = ? AND class_id = ?',
      [session_id, class_id]
    );

    const existingMarks: any = await query(
      `SELECT m.*, e.subject_id, e.exam_type_id, e.max_marks
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       WHERE m.student_id = ? AND e.session_id = ?`,
      [student_id, session_id]
    );

    const defaultMax = (typeName: string) => {
      const n = (typeName || '').toLowerCase();
      if (n.includes('annual') || n.includes('final')) return 100;
      return 50;
    };

    const matrix = subjects.map((sub: any) => {
      const subjectRow: any = { subject_id: sub.id, subject_name: sub.name, marks: {} };

      examTypes.forEach((type: any) => {
        const exam = existingExams.find((e: any) => e.subject_id === sub.id && e.exam_type_id === type.id);
        const mark = exam ? existingMarks.find((m: any) => m.exam_id === exam.id) : null;
        const maxDefault = defaultMax(type.name);

        subjectRow.marks[type.id] = {
          exam_id: exam ? exam.id : null,
          marks_ist: mark && mark.marks_ist != null ? String(mark.marks_ist) : '',
          marks_iind: mark && mark.marks_iind != null ? String(mark.marks_iind) : '',
          max_marks: exam ? exam.max_marks : maxDefault,
          exam_type_name: type.name,
        };
      });
      return subjectRow;
    });

    // Stable order: Terminal, Half-Yearly, Annual
    const orderedTypes = [...examTypes].sort((a: any, b: any) => {
      const rank = (n: string) => {
        const x = (n || '').toLowerCase();
        if (x.includes('terminal') || x.includes('unit')) return 1;
        if (x.includes('half')) return 2;
        if (x.includes('annual') || x.includes('final')) return 3;
        return 9;
      };
      return rank(a.name) - rank(b.name);
    });

    res.json({ student: students[0], subjects: matrix, examTypes: orderedTypes });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching student marks', details: error.message });
  }
};

export const saveStudentMarks = async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, class_id, marks_data } = req.body;
    const entry_by = (req as any).user.id;

    if (!student_id || !session_id || !class_id || !Array.isArray(marks_data)) {
      return res.status(400).json({ message: 'student_id, session_id, class_id and marks_data required' });
    }

    const examTypes: any = await query('SELECT id, name FROM exam_types');
    const typeNameById: Record<number, string> = {};
    examTypes.forEach((t: any) => { typeNameById[t.id] = t.name; });

    const defaultMax = (typeName: string) => {
      const n = (typeName || '').toLowerCase();
      if (n.includes('annual') || n.includes('final')) return 100;
      return 50;
    };

    await withTransaction(async (connection) => {
      for (const row of marks_data) {
        const subject_id = row.subject_id;

        for (const typeId of Object.keys(row.marks || {})) {
          const typeData = row.marks[typeId];
          const type_id = Number(typeId);

          const istRaw = typeData.marks_ist;
          const iindRaw = typeData.marks_iind;
          const ist = istRaw === '' || istRaw == null ? null : parseFloat(istRaw);
          const iind = iindRaw === '' || iindRaw == null ? null : parseFloat(iindRaw);

          if (ist === null && iind === null) continue;

          let examId = typeData.exam_id;
          const max_marks = parseFloat(typeData.max_marks) || defaultMax(typeNameById[type_id] || '');

          if (!examId) {
            const [existingExam]: any = await connection.execute(
              'SELECT id FROM exams WHERE session_id = ? AND class_id = ? AND exam_type_id = ? AND subject_id = ? LIMIT 1',
              [session_id, class_id, type_id, subject_id]
            );

            if (existingExam.length > 0) {
              examId = existingExam[0].id;
            } else {
              const [newExam]: any = await connection.execute(
                'INSERT INTO exams (session_id, class_id, exam_type_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)',
                [session_id, class_id, type_id, subject_id, max_marks, max_marks * 0.33]
              );
              examId = newExam.insertId;
            }
          } else if (typeData.max_marks) {
            await connection.execute('UPDATE exams SET max_marks = ? WHERE id = ?', [max_marks, examId]);
          }

          const obtained = (ist || 0) + (iind || 0);

          await connection.execute(
            `INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, entry_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             marks_ist = VALUES(marks_ist),
             marks_iind = VALUES(marks_iind),
             marks_obtained = VALUES(marks_obtained),
             entry_by = VALUES(entry_by)`,
            [examId, student_id, ist || 0, iind || 0, obtained, entry_by]
          );
        }
      }
    });

    res.json({ message: 'Marksheet marks saved successfully' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error saving student marks', details: error.message });
  }
};
