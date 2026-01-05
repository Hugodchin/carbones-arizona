const oracledb = require('oracledb');
require('dotenv').config();

async function getConnection() {
  const user = process.env.DB_USER || 'system';
  const password = process.env.DB_PASSWORD || 'BASEDEDATOSARIZONA2025';
  const connectString = process.env.DB_CONNECT || 'localhost:1521/XEPDB1'; // Servicio por defecto en Oracle XE

  try {
    const connection = await oracledb.getConnection({
      user,
      password,
      connectString
    });
    return connection;
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err);
    throw err;
  }
}

module.exports = { getConnection };
