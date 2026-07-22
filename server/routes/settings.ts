import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import { getSettings, updateSettings, getPublicBranding } from '../controllers/settingsController';
import { upload } from '../utils/upload';

const router = Router();

// Public branding for login/register (no auth)
router.get('/public', getPublicBranding);

router.use(authenticateToken);

router.get('/', getSettings);
router.post('/', requireRole([1]), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), updateSettings);

export default router;
