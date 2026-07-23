"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const next_1 = __importDefault(require("next"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const academic_1 = __importDefault(require("./routes/academic"));
const student_1 = __importDefault(require("./routes/student"));
const exam_1 = __importDefault(require("./routes/exam"));
const result_1 = __importDefault(require("./routes/result"));
const teacher_1 = __importDefault(require("./routes/teacher"));
const settings_1 = __importDefault(require("./routes/settings"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const activityLogger_1 = require("./middlewares/activityLogger");
dotenv_1.default.config();
const dev = process.env.NODE_ENV !== 'production';
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;
app.prepare().then(() => {
    const server = (0, express_1.default)();
    // Middlewares
    server.use((0, cors_1.default)());
    server.use(express_1.default.json());
    server.use(express_1.default.urlencoded({ extended: true }));
    server.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
    // Activity Logging Middleware
    server.use('/api', activityLogger_1.logActivity);
    // API Routes
    server.use('/api/auth', auth_1.default);
    server.use('/api/academic', academic_1.default);
    server.use('/api/students', student_1.default);
    server.use('/api/exams', exam_1.default);
    server.use('/api/results', result_1.default);
    server.use('/api/teachers', teacher_1.default);
    server.use('/api/settings', settings_1.default);
    server.use('/api/dashboard', dashboard_1.default);
    server.get('/api/health', (req, res) => {
        res.json({ status: 'ok', message: 'School ERP API is running' });
    });
    // Handle all other requests with Next.js
    server.all('*', (req, res) => {
        return handle(req, res);
    });
    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});
