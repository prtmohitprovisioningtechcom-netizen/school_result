"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdmin = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dbHelper_1 = require("../utils/dbHelper");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const sql = `
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `;
        const user = await (0, dbHelper_1.queryOne)(sql, [email]);
        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'Invalid credentials or inactive account' });
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password || '');
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user.id, role_id: user.role_id, email: user.email }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here', { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') });
        // Remove password from response
        delete user.password;
        res.json({
            message: 'Login successful',
            token,
            user
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        // Check if user exists
        const existingUser = await (0, dbHelper_1.queryOne)('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        // Find Admin role ID
        const adminRole = await (0, dbHelper_1.queryOne)('SELECT id FROM roles WHERE name = ?', ['Admin']);
        let roleId = adminRole === null || adminRole === void 0 ? void 0 : adminRole.id;
        if (!roleId) {
            const roleResult = await (0, dbHelper_1.execute)('INSERT INTO roles (name) VALUES (?)', ['Admin']);
            roleId = roleResult.insertId;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const result = await (0, dbHelper_1.execute)('INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, 1)', [name, email, hashedPassword, roleId]);
        res.status(201).json({
            message: 'Admin registered successfully',
            userId: result.insertId
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.registerAdmin = registerAdmin;
