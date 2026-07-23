"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const resultController_1 = require("../controllers/resultController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Generate Results & Ranks
router.post('/generate', (0, authMiddleware_1.requireRole)([1]), resultController_1.generateResults);
// Generate PDF Admit Cards
router.post('/admit-cards/bulk', (0, authMiddleware_1.requireRole)([1]), resultController_1.downloadAdmitCards);
// Generate PDF Marksheets
router.post('/marksheets/bulk', (0, authMiddleware_1.requireRole)([1]), resultController_1.downloadMarksheets);
exports.default = router;
