const fs = require('fs');

// 1. Update Route
const routePath = 'server/routes/exam.ts';
let routeContent = fs.readFileSync(routePath, 'utf8');

if (!routeContent.includes('getStudentMarks')) {
  routeContent = routeContent.replace(
    `saveMarks, bulkImportMarks, getMarksForExam`,
    `saveMarks, bulkImportMarks, getMarksForExam, getStudentMarks, saveStudentMarks`
  );
  
  routeContent = routeContent.replace(
    `router.get('/marks', requireRole([1, 2]), getMarksForExam);`,
    `router.get('/student-marks', requireRole([1, 2]), getStudentMarks);\nrouter.post('/student-marks', requireRole([1, 2]), saveStudentMarks);\nrouter.get('/marks', requireRole([1, 2]), getMarksForExam);`
  );
  fs.writeFileSync(routePath, routeContent);
  console.log('Routes updated.');
}

// 2. Update Controller
const controllerPath = 'server/controllers/examController.ts';
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

if (!controllerContent.includes('getStudentMarks')) {
  const newControllerFunctions = `
// =======================
// STUDENT-WISE MARKS ENTRY
// =======================
export const getStudentMarks = async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, class_id } = req.query;
    if (!student_id || !session_id || !class_id) {
      return res.status(400).json({ message: 'student_id, session_id, class_id are required' });
    }

    // 1. Get all subjects
    const subjects: any = await query('SELECT id, name FROM subjects ORDER BY name ASC');
    
    // 2. Get all exam types
    const examTypes: any = await query('SELECT id, name FROM exam_types ORDER BY id ASC');
    
    // 3. Get existing exams for this session/class (auto-create placeholders in memory if not exist)
    const existingExams: any = await query(
      'SELECT id, subject_id, exam_type_id FROM exams WHERE session_id = ? AND class_id = ?',
      [session_id, class_id]
    );

    // 4. Get existing marks for this student
    const existingMarks: any = await query(
      'SELECT m.*, e.subject_id, e.exam_type_id FROM marks m JOIN exams e ON m.exam_id = e.id WHERE m.student_id = ? AND e.session_id = ?',
      [student_id, session_id]
    );

    // Build response matrix
    const matrix = subjects.map((sub: any) => {
      const subjectRow: any = { subject_id: sub.id, subject_name: sub.name, marks: {} };
      
      examTypes.forEach((type: any) => {
        const exam = existingExams.find((e: any) => e.subject_id === sub.id && e.exam_type_id === type.id);
        const mark = exam ? existingMarks.find((m: any) => m.exam_id === exam.id) : null;
        
        subjectRow.marks[type.id] = {
          exam_id: exam ? exam.id : null,
          marks_ist: mark ? mark.marks_ist : '',
          marks_iind: mark ? mark.marks_iind : '',
        };
      });
      return subjectRow;
    });

    res.json({ subjects: matrix, examTypes });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching student marks', details: error.message });
  }
};

export const saveStudentMarks = async (req: Request, res: Response) => {
  try {
    const { student_id, session_id, class_id, marks_data } = req.body;
    const entry_by = (req as any).user.id;

    await withTransaction(async (connection) => {
      for (const row of marks_data) {
        const subject_id = row.subject_id;
        
        for (const typeId of Object.keys(row.marks)) {
          const typeData = row.marks[typeId];
          const type_id = Number(typeId);
          
          const ist = typeData.marks_ist === '' ? null : parseFloat(typeData.marks_ist);
          const iind = typeData.marks_iind === '' ? null : parseFloat(typeData.marks_iind);
          
          if (ist === null && iind === null) continue; // Skip empty
          
          let examId = typeData.exam_id;
          
          // Auto-create exam if it doesn't exist yet
          if (!examId) {
            const [existingExam]: any = await connection.execute(
              'SELECT id FROM exams WHERE session_id = ? AND class_id = ? AND exam_type_id = ? AND subject_id = ? LIMIT 1',
              [session_id, class_id, type_id, subject_id]
            );
            
            if (existingExam.length > 0) {
              examId = existingExam[0].id;
            } else {
              const max_marks = type_id === 3 ? 100 : 50; // Annual is 100, others 50 based on physical marksheet
              const [newExam]: any = await connection.execute(
                'INSERT INTO exams (session_id, class_id, exam_type_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)',
                [session_id, class_id, type_id, subject_id, max_marks, max_marks * 0.33]
              );
              examId = newExam.insertId;
            }
          }

          const obtained = (ist || 0) + (iind || 0);

          await connection.execute(
            \`INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, entry_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             marks_ist = VALUES(marks_ist),
             marks_iind = VALUES(marks_iind),
             marks_obtained = VALUES(marks_obtained),
             entry_by = VALUES(entry_by)\`,
            [examId, student_id, ist || 0, iind || 0, obtained, entry_by]
          );
        }
      }
    });

    res.json({ message: 'Marks saved successfully' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Error saving student marks', details: error.message });
  }
};
`;

  controllerContent = controllerContent + '\n' + newControllerFunctions;
  fs.writeFileSync(controllerPath, controllerContent);
  console.log('Controller updated.');
}
