import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from '@/server/utils/dbHelper';
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

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const sql = `
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `;
    
    const user = await queryOne<UserRow>(sql, [email]);

    if (!user || !user.is_active) {
      return NextResponse.json({ message: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, email: user.email },
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
    );

    // Remove password from response
    delete user.password;

    return NextResponse.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error.message || error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
}
