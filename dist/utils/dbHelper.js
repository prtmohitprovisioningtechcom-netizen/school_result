"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = exports.execute = exports.queryOne = exports.query = void 0;
const db_1 = __importDefault(require("../config/db"));
/**
 * Executes a raw SQL SELECT query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns Array of records
 */
const query = async (sql, params) => {
    const [rows] = await db_1.default.execute(sql, params);
    return rows;
};
exports.query = query;
/**
 * Executes a single row raw SQL SELECT query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns A single record or null
 */
const queryOne = async (sql, params) => {
    const [rows] = await db_1.default.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
};
exports.queryOne = queryOne;
/**
 * Executes a raw SQL INSERT/UPDATE/DELETE query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns ResultSetHeader containing insertId, affectedRows, etc.
 */
const execute = async (sql, params) => {
    const [result] = await db_1.default.execute(sql, params);
    return result;
};
exports.execute = execute;
/**
 * Executes a callback within a transaction.
 * Automatically commits on success and rolls back on error.
 * @param callback Function to execute within the transaction, receives the connection object.
 */
const withTransaction = async (callback) => {
    const connection = await db_1.default.getConnection();
    await connection.beginTransaction();
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
};
exports.withTransaction = withTransaction;
