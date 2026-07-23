"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const dbHelper_1 = require("../utils/dbHelper");
const getDashboardStats = async (req, res) => {
    try {
        const studentsResult = await (0, dbHelper_1.queryOne)('SELECT COUNT(*) as count FROM students');
        const classesResult = await (0, dbHelper_1.queryOne)('SELECT COUNT(*) as count FROM classes');
        // Teachers are stored as users with Teacher role (not teachers table)
        const teachersResult = await (0, dbHelper_1.queryOne)(`SELECT COUNT(*) as count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Teacher' AND u.is_active = 1`);
        const recentActivitiesResult = await (0, dbHelper_1.query)('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5');
        res.json({
            stats: {
                totalStudents: (studentsResult === null || studentsResult === void 0 ? void 0 : studentsResult.count) || 0,
                totalClasses: (classesResult === null || classesResult === void 0 ? void 0 : classesResult.count) || 0,
                totalTeachers: (teachersResult === null || teachersResult === void 0 ? void 0 : teachersResult.count) || 0
            },
            recentActivities: recentActivitiesResult
        });
    }
    catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
};
exports.getDashboardStats = getDashboardStats;
