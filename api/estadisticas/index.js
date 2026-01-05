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

  // Obtener tipo de estadística desde query string
  const { tipo } = req.query;

  let conn;
  try {
    conn = await getConnection();
    let sql, result;

    switch (tipo) {
      case 'empleados-por-departamento':
        sql = `
          SELECT d.NOMBREDEPTO AS NOMBRE, COUNT(p.CEDULAPER) AS CANTIDAD
          FROM SYSTEM.DEPARTAMENTO d
          LEFT JOIN SYSTEM.PERSONA p ON p.DEPTO_CODIGODEPTO = d.CODIGODEPTO
          GROUP BY d.NOMBREDEPTO
          ORDER BY CANTIDAD DESC`;
        break;

      case 'empleados-por-area':
        sql = `
          SELECT a.NOMBRE, COUNT(p.CEDULAPER) AS CANTIDAD
          FROM SYSTEM.AREAS a
          LEFT JOIN SYSTEM.PERSONA p ON p.AREAS_CODIGOAREAS = a.CODIGOAREAS
          GROUP BY a.NOMBRE
          ORDER BY CANTIDAD DESC`;
        break;

      case 'empleados-por-sexo':
        sql = `
          SELECT SEXOPER AS SEXO, COUNT(*) AS CANTIDAD
          FROM SYSTEM.PERSONA
          GROUP BY SEXOPER`;
        break;

      case 'empleados-por-estado-civil':
        sql = `
          SELECT ec.NOMBREEC AS ESTADOCIVIL, COUNT(p.CEDULAPER) AS CANTIDAD
          FROM SYSTEM.ESTADOCIVIL ec
          LEFT JOIN SYSTEM.PERSONA p ON p.ESTADOCIVIL_CODIGOEC = ec.CODIGOEC
          GROUP BY ec.NOMBREEC
          ORDER BY CANTIDAD DESC`;
        break;

      case 'empleados-por-cargo':
        sql = `
          SELECT c.NOMBRE AS CARGO, COUNT(p.CEDULAPER) AS CANTIDAD
          FROM SYSTEM.CARGO c
          LEFT JOIN SYSTEM.PERSONA p ON p.CARGO_CODIGOCARGO = c.CODIGOCARGO
          GROUP BY c.NOMBRE
          ORDER BY CANTIDAD DESC`;
        break;

      case 'resumen':
      default:
        // Resumen general
        const total = await conn.execute('SELECT COUNT(*) AS TOTAL FROM SYSTEM.PERSONA');
        const areas = await conn.execute('SELECT COUNT(*) AS TOTAL FROM SYSTEM.AREAS');
        const deptos = await conn.execute('SELECT COUNT(*) AS TOTAL FROM SYSTEM.DEPARTAMENTO');
        
        return res.status(200).json({
          totalEmpleados: total.rows[0]?.TOTAL || 0,
          totalAreas: areas.rows[0]?.TOTAL || 0,
          totalDepartamentos: deptos.rows[0]?.TOTAL || 0
        });
    }

    result = await conn.execute(sql);
    return res.status(200).json(result.rows || []);

  } catch (err) {
    console.error('API estadisticas error:', err);
    return res.status(500).json({ message: 'Error consultando estadísticas' });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};
