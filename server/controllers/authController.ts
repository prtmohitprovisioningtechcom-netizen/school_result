import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, execute, query } from '../utils/dbHelper';
import { RowDataPacket } from 'mysql2/promise';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password?: string;
  role_id: number;
  role_name?: string;
  is_active: number;
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const sql = `
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `;
    
    const user = await queryOne<UserRow>(sql, [email]);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, email: user.email },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
    );

    // Remove password from response
    delete user.password;

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Find Admin role ID
    const adminRole = await queryOne<RowDataPacket>('SELECT id FROM roles WHERE name = ?', ['Admin']);
    let roleId = adminRole?.id;

    if (!roleId) {
       const roleResult = await execute('INSERT INTO roles (name) VALUES (?)', ['Admin']);
       roleId = roleResult.insertId;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await execute(
      'INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
      [name, email, hashedPassword, roleId]
    );

    res.status(201).json({
      message: 'Admin registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
