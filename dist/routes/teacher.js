"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const teacherController_1 = require("../controllers/teacherController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', teacherController_1.getTeachers);
router.post('/', (0, authMiddleware_1.requireRole)([1]), teacherController_1.createTeacher); // Admin only
router.put('/:id', (0, authMiddleware_1.requireRole)([1]), teacherController_1.updateTeacher); // Admin only
router.delete('/:id', (0, authMiddleware_1.requireRole)([1]), teacherController_1.deleteTeacher); // Admin only
exports.default = router;
