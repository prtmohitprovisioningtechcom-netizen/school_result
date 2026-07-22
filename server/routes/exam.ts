import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { 
  getExamTypes, createExamType, 
  getExams, createExam, deleteExam, findOrCreateExam,
  saveMarks, bulkImportMarks, getMarksForExam, getStudentMarks, saveStudentMarks
} from '../controllers/examController';
import { upload } from '../utils/upload';

const router = Router();

router.use(authenticateToken);

// Exam Types
router.get('/types', getExamTypes);
router.post('/types', requireRole([1]), createExamType);

// Marks Entry (before /:id)
router.get('/student-marks', requireRole([1, 2]), getStudentMarks);
router.post('/student-marks', requireRole([1, 2]), saveStudentMarks);
router.get('/marks', requireRole([1, 2]), getMarksForExam);
router.post('/marks', requireRole([1, 2]), saveMarks);
router.post('/marks/bulk', requireRole([1, 2]), upload.single('excel'), bulkImportMarks);

// Exams (Schedule)
router.get('/', getExams);
router.post('/', requireRole([1]), createExam);
router.post('/find-or-create', requireRole([1, 2]), findOrCreateExam);
router.delete('/:id', requireRole([1]), deleteExam);

export default router;
