import mysql from 'mysql2/promise';

let connection: mysql.Connection | null = null;

export async function getConnection() {
  if (connection === null) {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306', 10),
    });
  } else {
    try {
      await connection.ping();
    } catch (error) {
      // If ping fails, the connection is likely dead, so re-create it
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306', 10),
      });
    }
  }
  return connection;
}
