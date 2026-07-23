"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const settingsController_1 = require("../controllers/settingsController");
const upload_1 = require("../utils/upload");
const router = (0, express_1.Router)();
// Public branding for login/register (no auth)
router.get('/public', settingsController_1.getPublicBranding);
router.use(authMiddleware_1.authenticateToken);
router.get('/', settingsController_1.getSettings);
router.post('/', (0, authMiddleware_1.requireRole)([1]), upload_1.upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), settingsController_1.updateSettings);
exports.default = router;
