import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import {
  getSessions, createSession, updateSession, deleteSession,
  getClasses, createClass, updateClass, deleteClass,
  getSections, createSection, updateSection, deleteSection,
  getSubjects, createSubject, updateSubject, deleteSubject
} from '../controllers/academicController';

const router = Router();

// Protect all routes
router.use(authenticateToken);

// For now, assuming any authenticated user can read, but only Admin (role 1) can create
// If roles have dynamic permissions, we'd check against the permissions table

router.get('/sessions', getSessions);
router.post('/sessions', requireRole([1]), createSession);
router.put('/sessions/:id', requireRole([1]), updateSession);
router.delete('/sessions/:id', requireRole([1]), deleteSession);

router.get('/classes', getClasses);
router.post('/classes', requireRole([1]), createClass);
router.put('/classes/:id', requireRole([1]), updateClass);
router.delete('/classes/:id', requireRole([1]), deleteClass);

router.get('/sections', getSections);
router.post('/sections', requireRole([1]), createSection);
router.put('/sections/:id', requireRole([1]), updateSection);
router.delete('/sections/:id', requireRole([1]), deleteSection);

router.get('/subjects', getSubjects);
router.post('/subjects', requireRole([1]), createSubject);
router.put('/subjects/:id', requireRole([1]), updateSubject);
router.delete('/subjects/:id', requireRole([1]), deleteSubject);

export default router;
