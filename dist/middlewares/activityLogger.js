"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const dbHelper_1 = require("../utils/dbHelper");
const logActivity = (req, res, next) => {
    // We only want to log after the request finishes so we hook into res.on('finish')
    res.on('finish', () => {
        var _a;
        // Only log state-changing requests or specific important GET requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            const user_id = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
            let action = 'UNKNOWN';
            if (req.method === 'POST')
                action = 'CREATE';
            if (req.method === 'PUT' || req.method === 'PATCH')
                action = 'UPDATE';
            if (req.method === 'DELETE')
                action = 'DELETE';
            const entity = req.originalUrl.split('/')[2] || 'System'; // /api/students -> students
            const details = `${req.method} ${req.originalUrl} - Status: ${res.statusCode}`;
            const ip_address = req.ip || req.socket.remoteAddress;
            (0, dbHelper_1.execute)('INSERT INTO activity_logs (user_id, action, entity, details, ip_address) VALUES (?, ?, ?, ?, ?)', [user_id, action, entity, details, ip_address]).catch(err => console.error('Error logging activity:', err));
        }
    });
    next();
};
exports.logActivity = logActivity;
