import { Request, Response, NextFunction } from 'express';
import { execute } from '../utils/dbHelper';

export const logActivity = (req: Request, res: Response, next: NextFunction) => {
  // We only want to log after the request finishes so we hook into res.on('finish')
  res.on('finish', () => {
    // Only log state-changing requests or specific important GET requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const user_id = (req as any).user?.id || null;
      let action = 'UNKNOWN';
      
      if (req.method === 'POST') action = 'CREATE';
      if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
      if (req.method === 'DELETE') action = 'DELETE';

      const entity = req.originalUrl.split('/')[2] || 'System'; // /api/students -> students
      const details = `${req.method} ${req.originalUrl} - Status: ${res.statusCode}`;
      const ip_address = req.ip || req.socket.remoteAddress;

      execute(
        'INSERT INTO activity_logs (user_id, action, entity, details, ip_address) VALUES (?, ?, ?, ?, ?)',
        [user_id, action, entity, details, ip_address]
      ).catch(err => console.error('Error logging activity:', err));
    }
  });

  next();
};
