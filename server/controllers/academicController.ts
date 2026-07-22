import { Request, Response } from 'express';
import { query, execute } from '../utils/dbHelper';
import { RowDataPacket } from 'mysql2/promise';

// =======================
// ACADEMIC SESSIONS
// =======================
export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await query('SELECT * FROM academic_sessions ORDER BY start_date DESC');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { name, start_date, end_date, is_current } = req.body;
    
    if (is_current) {
      await execute('UPDATE academic_sessions SET is_current = FALSE');
    }
    
    const result = await execute(
      'INSERT INTO academic_sessions (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
      [name, start_date, end_date, is_current ? 1 : 0]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Session created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating session' });
  }
};

// =======================
// CLASSES
// =======================
export const getClasses = async (req: Request, res: Response) => {
  try {
    const classes = await query('SELECT * FROM classes ORDER BY level ASC, name ASC');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching classes' });
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, level } = req.body;
    if (level === undefined || level === null || level === '') {
      return res.status(400).json({ message: 'Class level required (e.g. 1 for Class 1)' });
    }
    const className = (name && String(name).trim() && String(name).trim().toLowerCase() !== 'class')
      ? String(name).trim()
      : `Class ${level}`;
    const result = await execute('INSERT INTO classes (name, level) VALUES (?, ?)', [className, level]);
    res.status(201).json({ id: result.insertId, message: 'Class created successfully', name: className });
  } catch (error) {
    res.status(500).json({ message: 'Error creating class' });
  }
};

// =======================
// SECTIONS
// =======================
export const getSections = async (req: Request, res: Response) => {
  try {
    const { class_id } = req.query;
    let sql = `
      SELECT s.*, c.name as class_name 
      FROM sections s 
      JOIN classes c ON s.class_id = c.id
    `;
    const params: any[] = [];
    
    if (class_id) {
      sql += ' WHERE s.class_id = ?';
      params.push(class_id);
    }
    
    sql += ' ORDER BY c.level ASC, s.name ASC';
    
    const sections = await query(sql, params);
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sections' });
  }
};

export const createSection = async (req: Request, res: Response) => {
  try {
    const { class_id, name } = req.body;
    const result = await execute('INSERT INTO sections (class_id, name) VALUES (?, ?)', [class_id, name]);
    res.status(201).json({ id: result.insertId, message: 'Section created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating section' });
  }
};

// =======================
// SUBJECTS
// =======================
export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await query('SELECT * FROM subjects ORDER BY name ASC');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, type } = req.body;
    const result = await execute(
      'INSERT INTO subjects (name, code, type) VALUES (?, ?, ?)',
      [name, code, type || 'Theory']
    );
    res.status(201).json({ id: result.insertId, message: 'Subject created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject' });
  }
};

// =======================
// UPDATE & DELETE ROUTES
// =======================

// Sessions
export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date, is_current } = req.body;
    
    if (is_current) {
      await execute('UPDATE academic_sessions SET is_current = FALSE');
    }
    
    await execute(
      'UPDATE academic_sessions SET name=?, start_date=?, end_date=?, is_current=? WHERE id=?',
      [name, start_date, end_date, is_current ? 1 : 0, id]
    );
    res.json({ message: 'Session updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating session' });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM academic_sessions WHERE id=?', [id]);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting session' });
  }
};

// Classes
export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, level } = req.body;
    const className = (name && String(name).trim() && String(name).trim().toLowerCase() !== 'class')
      ? String(name).trim()
      : `Class ${level}`;
    await execute('UPDATE classes SET name=?, level=? WHERE id=?', [className, level, id]);
    res.json({ message: 'Class updated successfully', name: className });
  } catch (error) {
    res.status(500).json({ message: 'Error updating class' });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM classes WHERE id=?', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting class' });
  }
};

// Sections
export const updateSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, class_id } = req.body;
    await execute('UPDATE sections SET name=?, class_id=? WHERE id=?', [name, class_id, id]);
    res.json({ message: 'Section updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating section' });
  }
};

export const deleteSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM sections WHERE id=?', [id]);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting section' });
  }
};

// Subjects
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, type } = req.body;
    await execute('UPDATE subjects SET name=?, code=?, type=? WHERE id=?', [name, code, type, id]);
    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject' });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM subjects WHERE id=?', [id]);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject' });
  }
};
