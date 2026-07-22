import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { getTeachers, createTeacher, deleteTeacher, updateTeacher } from '../controllers/teacherController';

const router = Router();

router.use(authenticateToken);

router.get('/', getTeachers);
router.post('/', requireRole([1]), createTeacher); // Admin only
router.put('/:id', requireRole([1]), updateTeacher); // Admin only
router.delete('/:id', requireRole([1]), deleteTeacher); // Admin only

export default router;
