"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const academicController_1 = require("../controllers/academicController");
const router = (0, express_1.Router)();
// Protect all routes
router.use(authMiddleware_1.authenticateToken);
// For now, assuming any authenticated user can read, but only Admin (role 1) can create
// If roles have dynamic permissions, we'd check against the permissions table
router.get('/sessions', academicController_1.getSessions);
router.post('/sessions', (0, authMiddleware_1.requireRole)([1]), academicController_1.createSession);
router.put('/sessions/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.updateSession);
router.delete('/sessions/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.deleteSession);
router.get('/classes', academicController_1.getClasses);
router.post('/classes', (0, authMiddleware_1.requireRole)([1]), academicController_1.createClass);
router.put('/classes/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.updateClass);
router.delete('/classes/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.deleteClass);
router.get('/sections', academicController_1.getSections);
router.post('/sections', (0, authMiddleware_1.requireRole)([1]), academicController_1.createSection);
router.put('/sections/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.updateSection);
router.delete('/sections/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.deleteSection);
router.get('/subjects', academicController_1.getSubjects);
router.post('/subjects', (0, authMiddleware_1.requireRole)([1]), academicController_1.createSubject);
router.put('/subjects/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.updateSubject);
router.delete('/subjects/:id', (0, authMiddleware_1.requireRole)([1]), academicController_1.deleteSubject);
exports.default = router;
