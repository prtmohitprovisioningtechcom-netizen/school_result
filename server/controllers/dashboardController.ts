import { Request, Response } from 'express';
import { queryOne, query } from '../utils/dbHelper';
import { RowDataPacket } from 'mysql2/promise';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const studentsResult = await queryOne<RowDataPacket>('SELECT COUNT(*) as count FROM students');
    const classesResult = await queryOne<RowDataPacket>('SELECT COUNT(*) as count FROM classes');

    // Teachers are stored as users with Teacher role (not teachers table)
    const teachersResult = await queryOne<RowDataPacket>(
      `SELECT COUNT(*) as count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Teacher' AND u.is_active = 1`
    );

    const recentActivitiesResult = await query<RowDataPacket>(
      'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      stats: {
        totalStudents: studentsResult?.count || 0,
        totalClasses: classesResult?.count || 0,
        totalTeachers: teachersResult?.count || 0
      },
      recentActivities: recentActivitiesResult
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};
