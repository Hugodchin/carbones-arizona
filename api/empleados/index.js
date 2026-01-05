const jwt = require('jsonwebtoken');
const { getConnection } = require('../_db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Middleware de autenticación
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar autenticación
  const payload = verifyToken(req.headers.authorization);
  if (!payload) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  let conn;
  try {
    conn = await getConnection();

    // GET /api/empleados - Listar todos
    if (req.method === 'GET') {
      const sql = `
        SELECT 
          p.CEDULAPER AS CEDULA,
          p.NOMBREPER AS NOMBRE,
          TO_CHAR(p.FECHAINGRESOPER,'YYYY-MM-DD') AS FECHAINGRESO,
          TO_CHAR(p.EXAMENINGRESOPER,'YYYY-MM-DD') AS EXAMENINGRESO,
          p.TELEFONOPER AS TELEFONO,
          p.CORREOPER AS CORREO,
          TO_CHAR(p.FECHAPER,'YYYY-MM-DD') AS FECHANACIMIENTO,
          p.EDADPER AS EDAD,
          p.ESTADOCIVIL_CODIGOEC,
          ec.NOMBREEC AS ESTADOCIVIL,
          p.NVR_CODIGONR,
          nvr.NIVEL AS NIVELRIESGO,
          p.NAC_CODIGONAC,
          nac.NOMBRENAC AS NACIONALIDAD,
          p.SEXOPER AS SEXO,
          p.CONTRATO20PER AS CONTRATO,
          p.FP_CODIGOFP,
          fp.NOMBREFP AS FONDOPENSION,
          p.CT_CODIGOCT,
          ct.NOMBRECT AS CENTROTRABAJO,
          p.CARGO_CODIGOCARGO,
          c.NOMBRE AS CARGO,
          p.EPS_CODEPS,
          eps.NOMBREEPS AS EPS,
          p.AREAS_CODIGOAREAS,
          a.NOMBRE AS AREA
        FROM SYSTEM.PERSONA p
        LEFT JOIN SYSTEM.ESTADOCIVIL ec ON ec.CODIGOEC = p.ESTADOCIVIL_CODIGOEC
        LEFT JOIN SYSTEM.NVR nvr ON nvr.CODIGONR = p.NVR_CODIGONR
        LEFT JOIN SYSTEM.NAC nac ON nac.CODIGONAC = p.NAC_CODIGONAC
        LEFT JOIN SYSTEM.FP fp ON fp.CODIGOFP = p.FP_CODIGOFP
        LEFT JOIN SYSTEM.CT ct ON ct.CODIGOCT = p.CT_CODIGOCT
        LEFT JOIN SYSTEM.CARGO c ON c.CODIGOCARGO = p.CARGO_CODIGOCARGO
        LEFT JOIN SYSTEM.EPS eps ON eps.CODEPS = p.EPS_CODEPS
        LEFT JOIN SYSTEM.AREAS a ON a.CODIGOAREAS = p.AREAS_CODIGOAREAS
        ORDER BY p.NOMBREPER`;
      
      const result = await conn.execute(sql);
      return res.status(200).json(result.rows || []);
    }

    // POST /api/empleados - Crear nuevo
    if (req.method === 'POST') {
      if (payload.role !== 'rrhh' && payload.role !== 'gerente') {
        return res.status(403).json({ message: 'No tienes permisos para crear empleados' });
      }

      const { cedula, nombre, fechaIngreso } = req.body || {};
      if (!cedula || !nombre || !fechaIngreso) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
      }

      const sql = `INSERT INTO SYSTEM.PERSONA (CEDULAPER, NOMBREPER, FECHAINGRESOPER) VALUES (:cedula, :nombre, TO_DATE(:fechaIngreso, 'YYYY-MM-DD'))`;
      await conn.execute(sql, { cedula, nombre, fechaIngreso }, { autoCommit: true });
      return res.status(201).json({ success: true, message: 'Empleado creado' });
    }

    return res.status(405).json({ message: 'Método no permitido' });

  } catch (err) {
    console.error('API empleados error:', err);
    return res.status(500).json({ message: 'Error del servidor' });
  } finally {
    if (conn) try { await conn.close(); } catch {}
  }
};
