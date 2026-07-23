"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.deleteSection = exports.updateSection = exports.deleteClass = exports.updateClass = exports.deleteSession = exports.updateSession = exports.createSubject = exports.getSubjects = exports.createSection = exports.getSections = exports.createClass = exports.getClasses = exports.createSession = exports.getSessions = void 0;
const dbHelper_1 = require("../utils/dbHelper");
// =======================
// ACADEMIC SESSIONS
// =======================
const getSessions = async (req, res) => {
    try {
        const sessions = await (0, dbHelper_1.query)('SELECT * FROM academic_sessions ORDER BY start_date DESC');
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sessions' });
    }
};
exports.getSessions = getSessions;
const createSession = async (req, res) => {
    try {
        const { name, start_date, end_date, is_current } = req.body;
        if (is_current) {
            await (0, dbHelper_1.execute)('UPDATE academic_sessions SET is_current = FALSE');
        }
        const result = await (0, dbHelper_1.execute)('INSERT INTO academic_sessions (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)', [name, start_date, end_date, is_current ? 1 : 0]);
        res.status(201).json({ id: result.insertId, message: 'Session created successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating session' });
    }
};
exports.createSession = createSession;
// =======================
// CLASSES
// =======================
const getClasses = async (req, res) => {
    try {
        const classes = await (0, dbHelper_1.query)('SELECT * FROM classes ORDER BY level ASC, name ASC');
        res.json(classes);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching classes' });
    }
};
exports.getClasses = getClasses;
const createClass = async (req, res) => {
    try {
        const { name, level } = req.body;
        if (level === undefined || level === null || level === '') {
            return res.status(400).json({ message: 'Class level required (e.g. 1 for Class 1)' });
        }
        const className = (name && String(name).trim() && String(name).trim().toLowerCase() !== 'class')
            ? String(name).trim()
            : `Class ${level}`;
        const result = await (0, dbHelper_1.execute)('INSERT INTO classes (name, level) VALUES (?, ?)', [className, level]);
        res.status(201).json({ id: result.insertId, message: 'Class created successfully', name: className });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating class' });
    }
};
exports.createClass = createClass;
// =======================
// SECTIONS
// =======================
const getSections = async (req, res) => {
    try {
        const { class_id } = req.query;
        let sql = `
      SELECT s.*, c.name as class_name 
      FROM sections s 
      JOIN classes c ON s.class_id = c.id
    `;
        const params = [];
        if (class_id) {
            sql += ' WHERE s.class_id = ?';
            params.push(class_id);
        }
        sql += ' ORDER BY c.level ASC, s.name ASC';
        const sections = await (0, dbHelper_1.query)(sql, params);
        res.json(sections);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sections' });
    }
};
exports.getSections = getSections;
const createSection = async (req, res) => {
    try {
        const { class_id, name } = req.body;
        const result = await (0, dbHelper_1.execute)('INSERT INTO sections (class_id, name) VALUES (?, ?)', [class_id, name]);
        res.status(201).json({ id: result.insertId, message: 'Section created successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating section' });
    }
};
exports.createSection = createSection;
// =======================
// SUBJECTS
// =======================
const getSubjects = async (req, res) => {
    try {
        const subjects = await (0, dbHelper_1.query)('SELECT * FROM subjects ORDER BY name ASC');
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching subjects' });
    }
};
exports.getSubjects = getSubjects;
const createSubject = async (req, res) => {
    try {
        const { name, code, type } = req.body;
        const result = await (0, dbHelper_1.execute)('INSERT INTO subjects (name, code, type) VALUES (?, ?, ?)', [name, code, type || 'Theory']);
        res.status(201).json({ id: result.insertId, message: 'Subject created successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating subject' });
    }
};
exports.createSubject = createSubject;
// =======================
// UPDATE & DELETE ROUTES
// =======================
// Sessions
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, start_date, end_date, is_current } = req.body;
        if (is_current) {
            await (0, dbHelper_1.execute)('UPDATE academic_sessions SET is_current = FALSE');
        }
        await (0, dbHelper_1.execute)('UPDATE academic_sessions SET name=?, start_date=?, end_date=?, is_current=? WHERE id=?', [name, start_date, end_date, is_current ? 1 : 0, id]);
        res.json({ message: 'Session updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating session' });
    }
};
exports.updateSession = updateSession;
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM academic_sessions WHERE id=?', [id]);
        res.json({ message: 'Session deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting session' });
    }
};
exports.deleteSession = deleteSession;
// Classes
const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level } = req.body;
        const className = (name && String(name).trim() && String(name).trim().toLowerCase() !== 'class')
            ? String(name).trim()
            : `Class ${level}`;
        await (0, dbHelper_1.execute)('UPDATE classes SET name=?, level=? WHERE id=?', [className, level, id]);
        res.json({ message: 'Class updated successfully', name: className });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating class' });
    }
};
exports.updateClass = updateClass;
const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM classes WHERE id=?', [id]);
        res.json({ message: 'Class deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting class' });
    }
};
exports.deleteClass = deleteClass;
// Sections
const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, class_id } = req.body;
        await (0, dbHelper_1.execute)('UPDATE sections SET name=?, class_id=? WHERE id=?', [name, class_id, id]);
        res.json({ message: 'Section updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating section' });
    }
};
exports.updateSection = updateSection;
const deleteSection = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM sections WHERE id=?', [id]);
        res.json({ message: 'Section deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting section' });
    }
};
exports.deleteSection = deleteSection;
// Subjects
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, type } = req.body;
        await (0, dbHelper_1.execute)('UPDATE subjects SET name=?, code=?, type=? WHERE id=?', [name, code, type, id]);
        res.json({ message: 'Subject updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating subject' });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, dbHelper_1.execute)('DELETE FROM subjects WHERE id=?', [id]);
        res.json({ message: 'Subject deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting subject' });
    }
};
exports.deleteSubject = deleteSubject;
