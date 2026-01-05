require('dotenv').config();
const oracledb = require('oracledb');

(async () => {
  try {
    const connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'BASEDEDATOSARIZONA2025',
      connectString: process.env.DB_CONNECT || 'localhost:1521/XEPDB1'
    });
    const result = await connection.execute("SELECT 'OK' AS STATUS FROM dual");
    console.log('Conectado. Resultado:', result.rows);
    await connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Fallo de conexión:', err);
    process.exit(1);
  }
})();
