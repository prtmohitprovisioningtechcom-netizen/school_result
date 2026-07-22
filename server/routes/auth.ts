import { Router } from 'express';
import { login, registerAdmin } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
// This is a bootstrap route, usually you'd protect this or remove it after the first admin is created.
router.post('/register-admin', registerAdmin); 

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

export default router;
