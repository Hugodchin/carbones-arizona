const oracledb = require('oracledb');

// Configuración para Oracle Cloud (Autonomous Database)
// Vercel serverless functions
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool = null;

const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT,
  poolMin: 1,
  poolMax: 4,
  poolIncrement: 1
};

// Para Oracle Cloud Autonomous DB, configura Wallet
if (process.env.ORACLE_WALLET_LOCATION) {
  oracledb.initOracleClient({
    configDir: process.env.ORACLE_WALLET_LOCATION
  });
}

async function getConnection() {
  try {
    if (!pool) {
      pool = await oracledb.createPool(poolConfig);
    }
    return await pool.getConnection();
  } catch (error) {
    console.error('Error conectando a Oracle:', error);
    throw error;
  }
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = { getConnection, closePool };
