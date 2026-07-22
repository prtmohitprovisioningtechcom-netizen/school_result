import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { getStudents, createStudent, deleteStudent, bulkImportStudents, updateStudent } from '../controllers/studentController';
import { upload } from '../utils/upload';

const router = Router();

router.use(authenticateToken);

router.get('/', getStudents);
// Photo upload for single student creation
router.post('/', requireRole([1]), upload.single('photo'), createStudent);
router.put('/:id', requireRole([1]), upload.single('photo'), updateStudent);
router.delete('/:id', requireRole([1]), deleteStudent);

// Bulk upload route
router.post('/bulk', requireRole([1]), upload.single('excel'), bulkImportStudents);

export default router;
