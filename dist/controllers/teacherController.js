"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTeacher = exports.deleteTeacher = exports.createTeacher = exports.getTeachers = void 0;
const dbHelper_1 = require("../utils/dbHelper");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// =======================
// TEACHERS (Users with Role = Teacher)
// =======================
const getTeachers = async (req, res) => {
    try {
        const sql = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Teacher'
      ORDER BY u.name ASC
    `;
        const teachers = await (0, dbHelper_1.query)(sql);
        res.json(teachers);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};
exports.getTeachers = getTeachers;
const createTeacher = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Find teacher role
        const roles = await (0, dbHelper_1.query)('SELECT id FROM roles WHERE name = ?', ['Teacher']);
        if (roles.length === 0) {
            return res.status(500).json({ message: 'Teacher role not found in DB' });
        }
        const roleId = roles[0].id;
        // Check email
        const existing = await (0, dbHelper_1.query)('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const result = await (0, dbHelper_1.execute)('INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, 1)', [name, email, hashedPassword, roleId]);
        res.status(201).json({ id: result.insertId, message: 'Teacher created successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating teacher' });
    }
};
exports.createTeacher = createTeacher;
const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Teacher deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting teacher' });
    }
};
exports.deleteTeacher = deleteTeacher;
const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, is_active } = req.body;
        // Check if email belongs to another teacher
        const existing = await (0, dbHelper_1.query)('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        await (0, dbHelper_1.execute)('UPDATE users SET name=?, email=?, is_active=? WHERE id=?', [name, email, is_active ? 1 : 0, id]);
        res.json({ message: 'Teacher updated successfully' });
    }
    catch (error) {
        console.error('Error updating teacher:', error);
        res.status(500).json({ message: 'Error updating teacher' });
    }
};
exports.updateTeacher = updateTeacher;
