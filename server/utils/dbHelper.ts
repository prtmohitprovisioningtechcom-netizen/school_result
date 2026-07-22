import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Executes a raw SQL SELECT query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns Array of records
 */
export const query = async <T extends RowDataPacket>(sql: string, params?: any[]): Promise<T[]> => {
  const [rows] = await pool.execute<T[]>(sql, params);
  return rows;
};

/**
 * Executes a single row raw SQL SELECT query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns A single record or null
 */
export const queryOne = async <T extends RowDataPacket>(sql: string, params?: any[]): Promise<T | null> => {
  const [rows] = await pool.execute<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Executes a raw SQL INSERT/UPDATE/DELETE query.
 * @param sql The SQL query string
 * @param params Array of parameters for the query
 * @returns ResultSetHeader containing insertId, affectedRows, etc.
 */
export const execute = async (sql: string, params?: any[]): Promise<ResultSetHeader> => {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
};

/**
 * Executes a callback within a transaction.
 * Automatically commits on success and rolls back on error.
 * @param callback Function to execute within the transaction, receives the connection object.
 */
export const withTransaction = async <T>(callback: (connection: any) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
