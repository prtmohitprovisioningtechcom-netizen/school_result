"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post('/login', authController_1.login);
// This is a bootstrap route, usually you'd protect this or remove it after the first admin is created.
router.post('/register-admin', authController_1.registerAdmin);
router.get('/me', authMiddleware_1.authenticateToken, (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
