import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { generateResults, downloadAdmitCards, downloadMarksheets } from '../controllers/resultController';

const router = Router();

router.use(authenticateToken);

// Generate Results & Ranks
router.post('/generate', requireRole([1]), generateResults);

// Generate PDF Admit Cards
router.post('/admit-cards/bulk', requireRole([1]), downloadAdmitCards);

// Generate PDF Marksheets
router.post('/marksheets/bulk', requireRole([1]), downloadMarksheets);

export default router;
