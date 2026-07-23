"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const studentController_1 = require("../controllers/studentController");
const upload_1 = require("../utils/upload");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
router.get('/', studentController_1.getStudents);
// Photo upload for single student creation
router.post('/', (0, authMiddleware_1.requireRole)([1]), upload_1.upload.single('photo'), studentController_1.createStudent);
router.put('/:id', (0, authMiddleware_1.requireRole)([1]), upload_1.upload.single('photo'), studentController_1.updateStudent);
router.delete('/:id', (0, authMiddleware_1.requireRole)([1]), studentController_1.deleteStudent);
// Bulk upload route
router.post('/bulk', (0, authMiddleware_1.requireRole)([1]), upload_1.upload.single('excel'), studentController_1.bulkImportStudents);
exports.default = router;
