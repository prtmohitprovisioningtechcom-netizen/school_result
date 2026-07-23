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
exports.updateStudent = exports.deleteStudent = exports.bulkImportStudents = exports.getStudents = exports.createStudent = void 0;
const dbHelper_1 = require("../utils/dbHelper");
const xlsx = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
// =======================
// CREATE STUDENT (With Parent)
// =======================
const createStudent = async (req, res) => {
    var _a;
    try {
        const data = req.body;
        if (!data.admission_number || !data.first_name || !data.class_id || !data.section_id) {
            return res.status(400).json({ message: 'admission_number, first_name, class_id and section_id are required' });
        }
        let sessionId = data.current_session_id;
        if (!sessionId) {
            const current = await (0, dbHelper_1.query)('SELECT id FROM academic_sessions WHERE is_current = 1 LIMIT 1');
            sessionId = ((_a = current[0]) === null || _a === void 0 ? void 0 : _a.id) || null;
        }
        // Perform insertions inside a transaction
        await (0, dbHelper_1.withTransaction)(async (connection) => {
            // 1. Insert Parent
            const [parentResult] = await connection.execute(`INSERT INTO parents (father_name, mother_name, phone, email, address, guardian_name, guardian_phone) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                data.father_name || null,
                data.mother_name || null,
                data.parent_phone || null,
                data.parent_email || null,
                data.address || null,
                data.guardian_name || null,
                data.guardian_phone || null
            ]);
            const parentId = parentResult.insertId;
            // 2. Insert Student
            const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
            await connection.execute(`INSERT INTO students (
          admission_number, roll_number, first_name, last_name, dob, 
          gender, photo_url, parent_id, class_id, section_id, current_session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
            ]);
        });
        res.status(201).json({ message: 'Student and Parent created successfully' });
    }
    catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ message: 'Error creating student', details: error.message });
    }
};
exports.createStudent = createStudent;
// =======================
// GET ALL STUDENTS (With Filters)
// =======================
const getStudents = async (req, res) => {
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
        const params = [];
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
        const students = await (0, dbHelper_1.query)(sql, params);
        res.json(students);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching students' });
    }
};
exports.getStudents = getStudents;
// =======================
// BULK IMPORT EXCEL
// =======================
const bulkImportStudents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Excel file is required' });
        }
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        let successCount = 0;
        let failCount = 0;
        let errors = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                await (0, dbHelper_1.withTransaction)(async (connection) => {
                    const [parentResult] = await connection.execute(`INSERT INTO parents (father_name, mother_name, phone) VALUES (?, ?, ?)`, [row.FatherName || null, row.MotherName || null, row.Phone || null]);
                    const parentId = parentResult.insertId;
                    await connection.execute(`INSERT INTO students (
              admission_number, roll_number, first_name, last_name, gender, parent_id, class_id, section_id, current_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        row.AdmissionNumber,
                        row.RollNumber || null,
                        row.FirstName,
                        row.LastName || null,
                        row.Gender || null,
                        parentId,
                        row.ClassId || null,
                        row.SectionId || null,
                        row.SessionId || null
                    ]);
                });
                successCount++;
            }
            catch (err) {
                failCount++;
                errors.push({ row: i + 2, error: err.message });
            }
        }
        // Clean up uploaded file
        fs_1.default.unlinkSync(req.file.path);
        res.json({
            message: 'Bulk import completed',
            successCount,
            failCount,
            errors
        });
    }
    catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ message: 'Internal server error during import', details: error.message });
    }
};
exports.bulkImportStudents = bulkImportStudents;
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        // By foreign key cascade, this might also delete dependent records. Wait, parent shouldn't be deleted if multiple siblings.
        // It's safer to just set status = 'Inactive' or just delete student.
        await (0, dbHelper_1.execute)('DELETE FROM students WHERE id = ?', [id]);
        res.json({ message: 'Student deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting student' });
    }
};
exports.deleteStudent = deleteStudent;
const updateStudent = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const data = req.body;
        // First verify student exists and get parent_id
        const students = await (0, dbHelper_1.query)('SELECT parent_id, photo_url, current_session_id FROM students WHERE id = ?', [id]);
        if (students.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const parentId = students[0].parent_id;
        let sessionId = data.current_session_id || students[0].current_session_id;
        if (!sessionId) {
            const current = await (0, dbHelper_1.query)('SELECT id FROM academic_sessions WHERE is_current = 1 LIMIT 1');
            sessionId = ((_a = current[0]) === null || _a === void 0 ? void 0 : _a.id) || null;
        }
        await (0, dbHelper_1.withTransaction)(async (connection) => {
            // 1. Update Parent
            if (parentId) {
                await connection.execute(`UPDATE parents SET father_name=?, mother_name=?, phone=?, email=?, address=?, guardian_name=?, guardian_phone=? WHERE id=?`, [
                    data.father_name || null,
                    data.mother_name || null,
                    data.parent_phone || null,
                    data.parent_email || null,
                    data.address || null,
                    data.guardian_name || null,
                    data.guardian_phone || null,
                    parentId
                ]);
            }
            // 2. Update Student
            const photoUrl = req.file ? `/uploads/${req.file.filename}` : (data.existing_photo_url || students[0].photo_url || null);
            await connection.execute(`UPDATE students SET 
          admission_number=?, roll_number=?, first_name=?, last_name=?, dob=?, 
          gender=?, photo_url=?, class_id=?, section_id=?, current_session_id=?
         WHERE id=?`, [
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
            ]);
        });
        res.json({ message: 'Student updated successfully' });
    }
    catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Error updating student', details: error.message });
    }
};
exports.updateStudent = updateStudent;
