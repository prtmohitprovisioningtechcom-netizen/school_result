"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveStudentMarks = exports.getStudentMarks = exports.bulkImportMarks = exports.saveMarks = exports.getMarksForExam = exports.deleteExam = exports.findOrCreateExam = exports.createExam = exports.getExams = exports.createExamType = exports.getExamTypes = void 0;
const dbHelper_1 = require("../utils/dbHelper");
const xlsx = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
// =======================
// EXAM TYPES
// =======================
const getExamTypes = async (req, res) => {
    try {
        const examTypes = await (0, dbHelper_1.query)('SELECT * FROM exam_types ORDER BY created_at DESC');
        res.json(examTypes);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching exam types' });
    }
};
exports.getExamTypes = getExamTypes;
const createExamType = async (req, res) => {
    try {
        const { name, description } = req.body;
        const result = await (0, dbHelper_1.execute)('INSERT INTO exam_types (name, description) VALUES (?, ?)', [name, description]);
        res.status(201).json({ id: result.insertId, message: 'Exam type created successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating exam type' });
    }
};
exports.createExamType = createExamType;
// =======================
// EXAMS / SCHEDULE
// =======================
const getExams = async (req, res) => {
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
        const params = [];
        if (session_id) {
            sql += ' AND e.session_id = ?';
            params.push(session_id);
        }
        if (class_id) {
            sql += ' AND e.class_id = ?';
            params.push(class_id);
        }
        if (exam_type_id) {
            sql += ' AND e.exam_type_id = ?';
            params.push(exam_type_id);
        }
        sql += ' ORDER BY e.exam_date ASC, s.name ASC';
        const exams = await (0, dbHelper_1.query)(sql, params);
        res.json(exams);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching exams' });
    }
};
exports.getExams = getExams;
const createExam = async (req, res) => {
    try {
        const { exam_type_id, session_id, class_id, subject_id, exam_date, max_marks, passing_marks } = req.body;
        if (!exam_type_id || !session_id || !class_id || !subject_id) {
            return res.status(400).json({ message: 'exam_type_id, session_id, class_id and subject_id are required' });
        }
        const result = await (0, dbHelper_1.execute)(`INSERT INTO exams (exam_type_id, session_id, class_id, subject_id, exam_date, max_marks, passing_marks) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE exam_date = VALUES(exam_date), max_marks = VALUES(max_marks), passing_marks = VALUES(passing_marks)`, [exam_type_id, session_id, class_id, subject_id, exam_date || null, max_marks || 100, passing_marks || 33]);
        res.status(201).json({ id: result.insertId, message: 'Exam scheduled successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error scheduling exam', details: error.message });
    }
};
exports.createExam = createExam;
const findOrCreateExam = async (req, res) => {
    try {
        const { session_id, class_id, exam_type_id, subject_id, max_marks } = req.body;
        if (!session_id || !class_id || !exam_type_id || !subject_id) {
            return res.status(400).json({ message: 'session_id, class_id, exam_type_id and subject_id are required' });
        }
        const existing = await (0, dbHelper_1.query)('SELECT id FROM exams WHERE session_id = ? AND class_id = ? AND exam_type_id = ? AND subject_id = ? LIMIT 1', [session_id, class_id, exam_type_id, subject_id]);
        if (existing.length > 0) {
            return res.json({ id: existing[0].id, message: 'Existing exam found' });
        }
        const result = await (0, dbHelper_1.execute)('INSERT INTO exams (session_id, class_id, exam_type_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)', [session_id, class_id, exam_type_id, subject_id, max_marks || 100, (max_marks || 100) * 0.33]);
        res.json({ id: result.insertId, message: 'New exam created' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error in findOrCreateExam', details: error.message });
    }
};
exports.findOrCreateExam = findOrCreateExam;
const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM exams WHERE id = ?', [id]);
        res.json({ message: 'Exam deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting exam', details: error.message });
    }
};
exports.deleteExam = deleteExam;
const getMarksForExam = async (req, res) => {
    try {
        const { exam_id } = req.query;
        if (!exam_id) {
            return res.status(400).json({ message: 'exam_id is required' });
        }
        const examRows = await (0, dbHelper_1.query)(`SELECT e.*, c.name as class_name, s.name as subject_name
       FROM exams e
       JOIN classes c ON e.class_id = c.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = ?`, [exam_id]);
        if (!examRows.length) {
            return res.status(404).json({ message: 'Exam not found' });
        }
        const exam = examRows[0];
        const students = await (0, dbHelper_1.query)(`SELECT st.id as student_id, st.admission_number, st.roll_number, st.first_name, st.last_name,
              m.marks_ist, m.marks_iind, m.marks_obtained, m.grace_marks, m.is_absent, m.remarks
       FROM students st
       LEFT JOIN marks m ON m.student_id = st.id AND m.exam_id = ?
       WHERE st.class_id = ?
       ORDER BY CAST(st.roll_number AS UNSIGNED), st.first_name`, [exam_id, exam.class_id]);
        res.json({ exam, students });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching marks', details: error.message });
    }
};
exports.getMarksForExam = getMarksForExam;
// =======================
// MARKS ENTRY
// =======================
const saveMarks = async (req, res) => {
    try {
        const { exam_id, marks_data } = req.body;
        const entry_by = req.user.id;
        await (0, dbHelper_1.withTransaction)(async (connection) => {
            var _a, _b, _c;
            for (const entry of marks_data) {
                const ist = parseFloat((_a = entry.marks_ist) !== null && _a !== void 0 ? _a : 0) || 0;
                const iind = parseFloat((_b = entry.marks_iind) !== null && _b !== void 0 ? _b : 0) || 0;
                const obtained = ist + iind > 0
                    ? ist + iind
                    : parseFloat((_c = entry.marks_obtained) !== null && _c !== void 0 ? _c : 0) || 0;
                await connection.execute(`INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, is_absent, remarks, entry_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           marks_ist = VALUES(marks_ist),
           marks_iind = VALUES(marks_iind),
           marks_obtained = VALUES(marks_obtained),
           is_absent = VALUES(is_absent),
           remarks = VALUES(remarks),
           entry_by = VALUES(entry_by)`, [exam_id, entry.student_id, ist, iind, obtained, entry.is_absent || 0, entry.remarks || '', entry_by]);
            }
        });
        res.json({ message: 'Marks saved successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving marks', details: error.message });
    }
};
exports.saveMarks = saveMarks;
// =======================
// BULK MARKS IMPORT EXCEL
// =======================
const bulkImportMarks = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Excel file is required' });
        }
        const { exam_id } = req.body;
        if (!exam_id) {
            return res.status(400).json({ message: 'exam_id is required in form-data' });
        }
        const entry_by = req.user.id;
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        let successCount = 0;
        let failCount = 0;
        let errors = [];
        await (0, dbHelper_1.withTransaction)(async (connection) => {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                try {
                    if (!row.AdmissionNumber)
                        throw new Error("AdmissionNumber is missing");
                    // Find student by admission number
                    const [students] = await connection.execute('SELECT id FROM students WHERE admission_number = ?', [row.AdmissionNumber]);
                    if (!students || students.length === 0) {
                        throw new Error(`Student not found for admission number ${row.AdmissionNumber}`);
                    }
                    const studentId = students[0].id;
                    const ist = parseFloat(row.MarksIst || row.Ist || 0) || 0;
                    const iind = parseFloat(row.MarksIInd || row.IInd || 0) || 0;
                    const marks = ist + iind > 0 ? ist + iind : (parseFloat(row.MarksObtained) || 0);
                    const isAbsent = row.IsAbsent === 'Yes' || row.IsAbsent === 'Y' ? 1 : 0;
                    await connection.execute(`INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, is_absent, remarks, entry_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             marks_ist = VALUES(marks_ist),
             marks_iind = VALUES(marks_iind),
             marks_obtained = VALUES(marks_obtained), 
             is_absent = VALUES(is_absent), 
             remarks = VALUES(remarks),
             entry_by = VALUES(entry_by)`, [exam_id, studentId, ist, iind, marks, isAbsent, row.Remarks || '', entry_by]);
                    successCount++;
                }
                catch (err) {
                    failCount++;
                    errors.push({ row: i + 2, error: err.message });
                }
            }
        });
        fs_1.default.unlinkSync(req.file.path);
        res.json({
            message: 'Bulk marks import completed',
            successCount,
            failCount,
            errors
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error during marks import', details: error.message });
    }
};
exports.bulkImportMarks = bulkImportMarks;
// =======================
// STUDENT-WISE MARKS ENTRY
// =======================
const getStudentMarks = async (req, res) => {
    try {
        const { student_id, session_id, class_id } = req.query;
        if (!student_id || !session_id || !class_id) {
            return res.status(400).json({ message: 'student_id, session_id, class_id are required' });
        }
        const students = await (0, dbHelper_1.query)(`SELECT s.*, c.name AS class_name, c.level AS class_level, sec.name AS section_name,
              p.father_name, p.mother_name, sess.name AS session_name
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       LEFT JOIN academic_sessions sess ON sess.id = ?
       WHERE s.id = ?`, [session_id, student_id]);
        if (!students.length) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const subjects = await (0, dbHelper_1.query)('SELECT id, name FROM subjects ORDER BY name ASC');
        const examTypes = await (0, dbHelper_1.query)('SELECT id, name FROM exam_types ORDER BY id ASC');
        const existingExams = await (0, dbHelper_1.query)('SELECT id, subject_id, exam_type_id, max_marks FROM exams WHERE session_id = ? AND class_id = ?', [session_id, class_id]);
        const existingMarks = await (0, dbHelper_1.query)(`SELECT m.*, e.subject_id, e.exam_type_id, e.max_marks
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       WHERE m.student_id = ? AND e.session_id = ?`, [student_id, session_id]);
        const defaultMax = (typeName) => {
            const n = (typeName || '').toLowerCase();
            if (n.includes('annual') || n.includes('final'))
                return 100;
            return 50;
        };
        const matrix = subjects.map((sub) => {
            const subjectRow = { subject_id: sub.id, subject_name: sub.name, marks: {} };
            examTypes.forEach((type) => {
                const exam = existingExams.find((e) => e.subject_id === sub.id && e.exam_type_id === type.id);
                const mark = exam ? existingMarks.find((m) => m.exam_id === exam.id) : null;
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
        const orderedTypes = [...examTypes].sort((a, b) => {
            const rank = (n) => {
                const x = (n || '').toLowerCase();
                if (x.includes('terminal') || x.includes('unit'))
                    return 1;
                if (x.includes('half'))
                    return 2;
                if (x.includes('annual') || x.includes('final'))
                    return 3;
                return 9;
            };
            return rank(a.name) - rank(b.name);
        });
        res.json({ student: students[0], subjects: matrix, examTypes: orderedTypes });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching student marks', details: error.message });
    }
};
exports.getStudentMarks = getStudentMarks;
const saveStudentMarks = async (req, res) => {
    try {
        const { student_id, session_id, class_id, marks_data } = req.body;
        const entry_by = req.user.id;
        if (!student_id || !session_id || !class_id || !Array.isArray(marks_data)) {
            return res.status(400).json({ message: 'student_id, session_id, class_id and marks_data required' });
        }
        const examTypes = await (0, dbHelper_1.query)('SELECT id, name FROM exam_types');
        const typeNameById = {};
        examTypes.forEach((t) => { typeNameById[t.id] = t.name; });
        const defaultMax = (typeName) => {
            const n = (typeName || '').toLowerCase();
            if (n.includes('annual') || n.includes('final'))
                return 100;
            return 50;
        };
        await (0, dbHelper_1.withTransaction)(async (connection) => {
            for (const row of marks_data) {
                const subject_id = row.subject_id;
                for (const typeId of Object.keys(row.marks || {})) {
                    const typeData = row.marks[typeId];
                    const type_id = Number(typeId);
                    const istRaw = typeData.marks_ist;
                    const iindRaw = typeData.marks_iind;
                    const ist = istRaw === '' || istRaw == null ? null : parseFloat(istRaw);
                    const iind = iindRaw === '' || iindRaw == null ? null : parseFloat(iindRaw);
                    if (ist === null && iind === null)
                        continue;
                    let examId = typeData.exam_id;
                    const max_marks = parseFloat(typeData.max_marks) || defaultMax(typeNameById[type_id] || '');
                    if (!examId) {
                        const [existingExam] = await connection.execute('SELECT id FROM exams WHERE session_id = ? AND class_id = ? AND exam_type_id = ? AND subject_id = ? LIMIT 1', [session_id, class_id, type_id, subject_id]);
                        if (existingExam.length > 0) {
                            examId = existingExam[0].id;
                        }
                        else {
                            const [newExam] = await connection.execute('INSERT INTO exams (session_id, class_id, exam_type_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)', [session_id, class_id, type_id, subject_id, max_marks, max_marks * 0.33]);
                            examId = newExam.insertId;
                        }
                    }
                    else if (typeData.max_marks) {
                        await connection.execute('UPDATE exams SET max_marks = ? WHERE id = ?', [max_marks, examId]);
                    }
                    const obtained = (ist || 0) + (iind || 0);
                    await connection.execute(`INSERT INTO marks (exam_id, student_id, marks_ist, marks_iind, marks_obtained, entry_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             marks_ist = VALUES(marks_ist),
             marks_iind = VALUES(marks_iind),
             marks_obtained = VALUES(marks_obtained),
             entry_by = VALUES(entry_by)`, [examId, student_id, ist || 0, iind || 0, obtained, entry_by]);
                }
            }
        });
        res.json({ message: 'Marksheet marks saved successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving student marks', details: error.message });
    }
};
exports.saveStudentMarks = saveStudentMarks;
