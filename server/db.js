const oracledb = require('oracledb');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const cfg = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'BASEDEDATOSARIZONA2025',
  connectString: process.env.DB_CONNECT || 'localhost:1521/XEPDB1'
};

async function getConnection() {
  return await oracledb.getConnection(cfg);
}

module.exports = { getConnection };
