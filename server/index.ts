import express, { Request, Response } from 'express';
import next from 'next';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import academicRoutes from './routes/academic';
import studentRoutes from './routes/student';
import examRoutes from './routes/exam';
import resultRoutes from './routes/result';
import teacherRoutes from './routes/teacher';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import { logActivity } from './middlewares/activityLogger';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  // Middlewares
  server.use(cors());
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Activity Logging Middleware
  server.use('/api', logActivity);

  // API Routes
  server.use('/api/auth', authRoutes);
  server.use('/api/academic', academicRoutes);
  server.use('/api/students', studentRoutes);
  server.use('/api/exams', examRoutes);
  server.use('/api/results', resultRoutes);
  server.use('/api/teachers', teacherRoutes);
  server.use('/api/settings', settingsRoutes);
  server.use('/api/dashboard', dashboardRoutes);

  server.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'School ERP API is running' });
  });

  // Handle all other requests with Next.js
  server.all('*', (req: Request, res: Response) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
