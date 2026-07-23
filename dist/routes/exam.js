"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const examController_1 = require("../controllers/examController");
const upload_1 = require("../utils/upload");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Exam Types
router.get('/types', examController_1.getExamTypes);
router.post('/types', (0, authMiddleware_1.requireRole)([1]), examController_1.createExamType);
// Marks Entry (before /:id)
router.get('/student-marks', (0, authMiddleware_1.requireRole)([1, 2]), examController_1.getStudentMarks);
router.post('/student-marks', (0, authMiddleware_1.requireRole)([1, 2]), examController_1.saveStudentMarks);
router.get('/marks', (0, authMiddleware_1.requireRole)([1, 2]), examController_1.getMarksForExam);
router.post('/marks', (0, authMiddleware_1.requireRole)([1, 2]), examController_1.saveMarks);
router.post('/marks/bulk', (0, authMiddleware_1.requireRole)([1, 2]), upload_1.upload.single('excel'), examController_1.bulkImportMarks);
// Exams (Schedule)
router.get('/', examController_1.getExams);
router.post('/', (0, authMiddleware_1.requireRole)([1]), examController_1.createExam);
router.post('/find-or-create', (0, authMiddleware_1.requireRole)([1, 2]), examController_1.findOrCreateExam);
router.delete('/:id', (0, authMiddleware_1.requireRole)([1]), examController_1.deleteExam);
exports.default = router;
