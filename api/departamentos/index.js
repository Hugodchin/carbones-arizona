const jwt = require('jsonwebtoken');
const { getConnection } = require('../_db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });

  const payload = verifyToken(req.headers.authorization);
  if (!payload) return res.status(401).json({ message: 'No autorizado' });

  let conn;
  try {
    conn = await getConnection();
    const sql = `SELECT CODIGODEPTO, NOMBREDEPTO, AREAS_CODIGOAREAS FROM SYSTEM.DEPARTAMENTO ORDER BY NOMBREDEPTO`;
    const result = await conn.execute(sql);
    return res.status(200).json(result.rows || []);
  } catch (err) {
    console.error('API departamentos error:', err);
    return res.status(500).json({ message: 'Error consultando departamentos' });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};
