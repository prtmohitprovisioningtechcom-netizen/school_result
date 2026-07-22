import { Request, Response } from 'express';
import { query, execute } from '../utils/dbHelper';
import bcrypt from 'bcryptjs';

// =======================
// TEACHERS (Users with Role = Teacher)
// =======================
export const getTeachers = async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT u.id, u.name, u.email, u.is_active, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Teacher'
      ORDER BY u.name ASC
    `;
    const teachers = await query(sql);
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teachers' });
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    // Find teacher role
    const roles: any = await query('SELECT id FROM roles WHERE name = ?', ['Teacher']);
    if (roles.length === 0) {
      return res.status(500).json({ message: 'Teacher role not found in DB' });
    }
    const roleId = roles[0].id;

    // Check email
    const existing: any = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await execute(
      'INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
      [name, email, hashedPassword, roleId]
    );

    res.status(201).json({ id: result.insertId, message: 'Teacher created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating teacher' });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting teacher' });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, is_active } = req.body;
    
    // Check if email belongs to another teacher
    const existing: any = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    await execute(
      'UPDATE users SET name=?, email=?, is_active=? WHERE id=?',
      [name, email, is_active ? 1 : 0, id]
    );

    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'Error updating teacher' });
  }
};
