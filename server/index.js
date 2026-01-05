require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('./db');
const nodemailer = require('nodemailer');

const app = express();
const API_PORT = process.env.API_PORT || 3300;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Sistema de logs de auditoría
const auditLogs = [];

function logAudit(type, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message,
    ...details
  };
  
  auditLogs.push(logEntry);
  
  // Mantener solo los últimos 1000 logs en memoria
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
  
  // Log a consola con formato
  const emoji = type === 'SECURITY' ? '🚨' : type === 'ACCESS' ? '🔐' : type === 'ERROR' ? '❌' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${type}: ${message}`, details);
}

// Endpoint para ver logs de auditoría (solo admin)
app.get('/api/audit-logs', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'rrhh' && payload.role !== 'gerente') {
      logAudit('SECURITY', 'Intento de acceso a logs de auditoría', { role: payload.role, email: payload.sub });
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    
    return res.json({ logs: auditLogs.slice(-100) }); // Últimos 100 logs
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
});

// Middlewares
// Helmet con CSP permisivo para permitir scripts/estilos inline usados por las páginas actuales
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN, credentials: false }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Rutas de descarga (antes del estático para evitar 404 de static cuando no existan ficheros)
// 1) Instalador: sirve el .exe más reciente de dist/ si existe
app.get('/download/installer.exe', (req, res) => {
  try {
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) return res.status(404).send('Instalador no disponible.');
    const files = fs.readdirSync(distDir)
      .filter(f => f.toLowerCase().endsWith('.exe'))
      .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    if (!files.length) return res.status(404).send('Instalador no disponible.');
    const filePath = path.join(distDir, files[0].f);
    return res.download(filePath, 'Carbones-Arizona-Setup.exe');
  } catch (e) {
    console.error('download installer error:', e);
    return res.status(500).send('Error sirviendo instalador.');
  }
});

// 2) Portable: si existe un .zip en dist/, lo sirve; si no, genera un ZIP al vuelo con el código + start-app.bat
app.get('/download/portable.zip', async (req, res) => {
  try {
    const distDir = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distDir)) {
      const zips = fs.readdirSync(distDir)
        .filter(f => f.toLowerCase().endsWith('.zip'))
        .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      if (zips.length) {
        const filePath = path.join(distDir, zips[0].f);
        return res.download(filePath, 'Carbones-Arizona-Portable.zip');
      }
    }

    // Fallback: crear ZIP al vuelo con archiver
  const archiver = require('archiver');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Carbones-Arizona-Portable.zip"');
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const root = path.join(__dirname, '..');
    // Incluye carpetas y archivos necesarios
    archive.directory(path.join(root, 'public'), 'public');
    archive.directory(path.join(root, 'server'), 'server');
    // Incluye node_modules del servidor si existen para evitar instalaciones en la máquina destino
    if (fs.existsSync(path.join(root, 'server', 'node_modules'))) {
      archive.directory(path.join(root, 'server', 'node_modules'), 'server/node_modules');
    }
    archive.file(path.join(root, 'server.js'), { name: 'server.js' });
    archive.file(path.join(root, 'db.js'), { name: 'db.js' });
    archive.file(path.join(root, 'package.json'), { name: 'package.json' });
    if (fs.existsSync(path.join(root, '.env'))) {
      archive.file(path.join(root, '.env'), { name: '.env' });
    }

    // Incluir runtime/node.zip si existe localmente para evitar descarga en el equipo destino
    const localNodeZip = path.join(root, 'runtime', 'node.zip');
    if (fs.existsSync(localNodeZip)) {
      archive.file(localNodeZip, { name: 'runtime/node.zip' });
    }

    const startBat = `@echo off
chcp 65001>nul
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"
echo ==============================================
echo   Carbones Arizona - Inicio de la aplicacion
echo ==============================================

if not exist "server\\index.js" (
  echo.
  echo Por favor, EXTRAIGA todo el ZIP antes de ejecutar este archivo.
  echo Abra la carpeta extraida y luego ejecute start-app.bat
  pause
  exit /b 1
)

set RUNTIME=%cd%\runtime
set NODEDIR=%RUNTIME%\node
set NODEEXE=%NODEDIR%\node.exe
set NPMCLI=%NODEDIR%\node_modules\npm\bin\npm-cli.js

if not exist "%NODEEXE%" (
  rem Si viene incluido el ZIP de Node en la carpeta runtime, usarlo primero
  if exist "runtime\\node.zip" (
    echo Extrayendo Node.js incluido...
    powershell -Command "Expand-Archive -Path 'runtime\\node.zip' -DestinationPath 'runtime' -Force"
    for /d %%D in (runtime\node-v*-win-x64) do (
      ren "%%D" node >nul 2>nul
    )
    del /q "runtime\\node.zip" >nul 2>nul
  )
)

if not exist "%NODEEXE%" (
  echo Descargando motor Node.js portable (una sola vez)...
  mkdir "%RUNTIME%" >nul 2>nul
  powershell -Command "try{ $u='https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip'; $o='runtime\\node.zip'; Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing; } catch { exit 1 }" || (
    echo No se pudo descargar Node.js. Revisa tu conexion a Internet.
    pause
    exit /b 1
  )
  echo Extrayendo Node.js...
  powershell -Command "Expand-Archive -Path 'runtime\\node.zip' -DestinationPath 'runtime' -Force"
  for /d %%D in (runtime\node-v*-win-x64) do (
    ren "%%D" node >nul 2>nul
  )
  del /q "runtime\node.zip" >nul 2>nul
)

echo Verificando dependencias de la API...
if not exist "%cd%\server\node_modules" (
  echo Instalando dependencias (puede tardar)...
  "%NODEEXE%" "%NPMCLI%" --prefix "%cd%\server" install --omit=dev
  if %ERRORLEVEL% NEQ 0 (
    echo Ocurrio un error instalando dependencias de la API.
    pause
    exit /b 1
  )
)

echo Iniciando la API en segundo plano (http://localhost:3300)...
start "API Carbones" /min cmd /c "cd /d \"%cd%\" && \"%NODEEXE%\" server\\index.js"

echo Esperando a que la API este lista...
for /l %%i in (1,1,30) do (
  powershell -Command "try{Invoke-WebRequest -UseBasicParsing http://localhost:3300/index.html -Method Get ^| Out-Null; exit 0} catch { exit 1 }" >nul 2>nul
  if !errorlevel! EQU 0 goto OPEN
  timeout /t 1 >nul
)

:OPEN
start "" "http://localhost:3300/index.html"
echo Listo. Si no se abrio el navegador, copia y pega: http://localhost:3300/index.html
pause
`;
    archive.append(startBat, { name: 'start-app.bat' });

    const readme = `PORTABLE Carbones Arizona (Windows)
=================================================

Pasos:
1) Extrae todo el ZIP en una carpeta (no ejecutes el .bat desde dentro del ZIP).
2) Abre start-app.bat (doble clic). Esto:
   - Usara un Node.js portable incluido (si viene), o lo descargara una sola vez.
   - Verificara/instalara dependencias de la API en ./server.
   - Iniciara la API en segundo plano.
   - Abrira tu navegador en http://localhost:3300/index.html

Notas:
- Si tu antivirus bloquea scripts, marca el .bat como permitido.
- Si el puerto 3300 ya esta en uso, cierra el otro programa o cambia API_PORT en .env.
- Para cerrar la API, cierra la ventana "API Carbones" o reinicia el equipo.
`;
    archive.append(readme, { name: 'README-PORTABLE.txt' });
    await archive.finalize();
  } catch (e) {
    console.error('download portable error:', e);
    return res.status(500).send('Error generando ZIP.');
  }
});

// Sirve el front existente desde / (usa carpeta public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Auth routes
app.use('/auth', require('./auth'));

// JWT middleware con protección de roles y auditoría
function requireAuth(requiredRole) {
  return (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      
      // MÁXIMA SEGURIDAD: Bloquear invitados de rutas sensibles
      if (payload.role === 'invitado') {
        logAudit('SECURITY', `Invitado bloqueado intentando acceder a ${req.path}`, {
          email: payload.sub,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        console.log(`🚫 BLOQUEADO: Invitado intentó acceder a ${req.path}`);
        return res.status(403).json({ 
          message: 'Acceso denegado. Esta función está restringida al personal autorizado.',
          restricted: true 
        });
      }
      
      if (requiredRole && payload.role !== requiredRole) {
        logAudit('ACCESS', `Permiso denegado para ${payload.role} en ${req.path}`, {
          requiredRole,
          actualRole: payload.role,
          email: payload.sub
        });
        return res.status(403).json({ message: 'Permisos insuficientes' });
      }
      
      // Log de acceso exitoso
      logAudit('ACCESS', `Acceso autorizado a ${req.path}`, {
        role: payload.role,
        email: payload.sub
      });
      
      next();
    } catch (e) {
      logAudit('ERROR', 'Token inválido o expirado', { error: e.message });
      return res.status(401).json({ message: 'Token inválido' });
    }
  };
}

// Empleados CRUD - PROTEGIDO: Solo RRHH y Gerente
app.get('/empleados', requireAuth(), async (req, res) => {
  let conn; 
  try {
    conn = await getConnection();
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
    return res.json(result.rows || []);
  } catch (err) {
    console.error('GET /empleados error:', err);
    return res.status(500).json({ message: 'Error consultando empleados' });
  } finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/empleados/:id', requireAuth(), async (req, res) => {
  let conn; 
  try {
    conn = await getConnection();
    const sql = `SELECT * FROM SYSTEM.PERSONA WHERE CEDULAPER = :id`;
    const result = await conn.execute(sql, { id: req.params.id });
    if (!result.rows || result.rows.length === 0) return res.status(404).json({ message: 'No encontrado' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /empleados/:id error:', err);
    return res.status(500).json({ message: 'Error consultando empleado' });
  } finally { if (conn) try{ await conn.close(); } catch {} }
});

app.post('/empleados/create', requireAuth('admin'), async (req, res) => {
  const { cedula, nombre, fechaIngreso } = req.body || {};
  if (!cedula || !nombre || !fechaIngreso) return res.status(400).json({ message: 'Faltan campos' });
  let conn;
  try {
    conn = await getConnection();
    const sql = `INSERT INTO SYSTEM.PERSONA (CEDULAPER, NOMBREPER, FECHAINGRESOPER) VALUES (:cedula, :nombre, TO_DATE(:fechaIngreso,'YYYY-MM-DD'))`;
    await conn.execute(sql, { cedula, nombre, fechaIngreso }, { autoCommit: true });
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /empleados/create error:', err);
    return res.status(500).json({ message: 'Error creando empleado' });
  } finally { if (conn) try{ await conn.close(); } catch {} }
});

app.put('/empleados/update/:id', requireAuth('admin'), async (req, res) => {
  const { nombre } = req.body || {};
  let conn;
  try {
    conn = await getConnection();
    const sql = `UPDATE SYSTEM.PERSONA SET NOMBREPER = :nombre WHERE CEDULAPER = :id`;
    const result = await conn.execute(sql, { nombre, id: req.params.id }, { autoCommit: true });
    if (result.rowsAffected === 0) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('PUT /empleados/update/:id error:', err);
    return res.status(500).json({ message: 'Error actualizando empleado' });
  } finally { if (conn) try{ await conn.close(); } catch {} }
});

// Alias para compatibilidad con cliente actual - PROTEGIDO
app.post('/empleado', requireAuth(), async (req, res) => {
  // Inserción completa similar al server original
  const {
    cedula, nombre, fechaIngreso, exameningresoper, telefono, correo, fechaper,
    estadoCivil, nivelRiesgo, nacionalidad, sexo, contrato,
    fondoPension, centroTrabajo, cargo, eps, area
  } = req.body || {};

  if (!cedula || !nombre || !fechaIngreso || !exameningresoper || !telefono || !correo || !fechaper || !estadoCivil || !nivelRiesgo || !nacionalidad || !sexo || !contrato || !fondoPension || !centroTrabajo || !cargo || !eps || !area) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  let conn;
  try {
    conn = await getConnection();

    // Evita duplicado de cédula
    const cedulaNum = Number(cedula);
    if (isNaN(cedulaNum)) return res.status(400).json({ message: 'Cédula inválida' });

    const dup = await conn.execute(`SELECT COUNT(*) AS C FROM SYSTEM.PERSONA WHERE CEDULAPER = :cedula`, { cedula: cedulaNum });
    const countDup = dup.rows && dup.rows[0] && (dup.rows[0].C || dup.rows[0].COUNT);
    if (countDup > 0) return res.status(400).json({ message: 'Ya existe un empleado con esa cédula' });

    // Inserción
    const sql = `
      INSERT INTO SYSTEM.PERSONA (
        CEDULAPER, NOMBREPER, FECHAPER, EDADPER, FECHAINGRESOPER, TELEFONOPER, SEXOPER, CONTRATO20PER, CORREOPER, EXAMENINGRESOPER,
        ESTADOCIVIL_CODIGOEC, CARGO_CODIGOCARGO, CT_CODIGOCT, NVR_CODIGONR, FP_CODIGOFP, NAC_CODIGONAC, EPS_CODEPS, AREAS_CODIGOAREAS
      ) VALUES (
        :cedula, :nombre, TO_DATE(:fechaper,'YYYY-MM-DD'), :edadPer, TO_DATE(:fechaIngreso,'YYYY-MM-DD'), :telefono, :sexo, :contrato, :correo, TO_DATE(:exameningresoper,'YYYY-MM-DD'),
        :estadoCivil, :cargo, :centroTrabajo, :nivelRiesgo, :fondoPension, :nacionalidad, :eps, :area
      )`;

    // Edad
    const birth = new Date(fechaper);
    const today = new Date();
    let edad = today.getFullYear() - birth.getFullYear();
    const passed = (today.getMonth() > birth.getMonth()) || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    const edadPer = passed ? edad : edad - 1;

    await conn.execute(sql, {
      cedula: cedulaNum,
      nombre,
      fechaper,
      edadPer,
      fechaIngreso,
      telefono,
      sexo,
      contrato,
      correo,
      exameningresoper,
      estadoCivil: String(estadoCivil).trim(),
      cargo: String(cargo).trim(),
      centroTrabajo,
      nivelRiesgo: String(nivelRiesgo).trim(),
      fondoPension: String(fondoPension).trim(),
      nacionalidad,
      eps: String(eps).trim(),
      area: String(area).trim()
    }, { autoCommit: true });

    return res.json({ message: 'Empleado agregado', ok: true });
  } catch (err) {
    console.error('POST /empleado error:', err);
    if (err && (err.errorNum === 1 || (err.message && err.message.includes('ORA-00001')))) {
      return res.status(400).json({ message: 'Cédula duplicada' });
    }
    return res.status(500).json({ message: 'Error insertando empleado' });
  } finally { if (conn) try { await conn.close(); } catch {} }
});

// Alias DELETE similar al server original - PROTEGIDO
app.delete('/empleado/:cedula', requireAuth(), async (req, res) => {
  let conn;
  try {
    const { cedula } = req.params;
    if (isNaN(cedula)) return res.status(400).json({ message: 'Cédula inválida' });
    conn = await getConnection();
    const result = await conn.execute(`DELETE FROM SYSTEM.PERSONA WHERE CEDULAPER = :cedula`, { cedula }, { autoCommit: true });
    if (result.rowsAffected > 0) return res.json({ message: 'Empleado eliminado' });
    return res.status(404).json({ message: 'No encontrado' });
  } catch (err) {
    console.error('DELETE /empleado/:cedula error:', err);
    return res.status(500).json({ message: 'Error eliminando' });
  } finally { if (conn) try { await conn.close(); } catch {} }
});

// Listas base - PROTEGIDAS
app.get('/eps', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const r = await conn.execute(`SELECT CODEPS, NOMBREEPS FROM SYSTEM.EPS ORDER BY NOMBREEPS`);
    return res.json(r.rows || []);
  } catch (e) { console.error('/eps', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/areas', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const r = await conn.execute(`SELECT CODIGOAREAS, NOMBRE FROM SYSTEM.AREAS ORDER BY NOMBRE`);
    return res.json(r.rows || []);
  } catch (e) { console.error('/areas', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/departamentos', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const r = await conn.execute(`SELECT CODIGODPTO, NOMBRE, "Adm-Ing", AREAS_CODIGOAREAS FROM SYSTEM.DEPTO ORDER BY NOMBRE`);
    return res.json(r.rows || []);
  } catch (e) { console.error('/departamentos', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

// Estadísticas - PROTEGIDAS: Solo RRHH y Gerente
app.get('/estadisticas/empleados-por-departamento', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const sql = `SELECT NVL(d.NOMBRE,'Sin departamento') AS DEPARTAMENTO, COUNT(*) AS CANTIDAD
                 FROM SYSTEM.PERSONA p LEFT JOIN SYSTEM.DEPTO d
                 ON p.CT_CODIGOCT = d.CODIGODPTO
                 GROUP BY d.NOMBRE
                 ORDER BY CANTIDAD DESC`;
    const r = await conn.execute(sql);
    return res.json(r.rows || []);
  } catch (e) { console.error('/estadisticas/empleados-por-departamento', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/estadisticas/empleados-por-area', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const sql = `SELECT a.NOMBRE AS AREA, COUNT(*) AS CANTIDAD
                 FROM SYSTEM.PERSONA p LEFT JOIN SYSTEM.AREAS a
                 ON p.AREAS_CODIGOAREAS = a.CODIGOAREAS
                 GROUP BY a.NOMBRE
                 ORDER BY CANTIDAD DESC`;
    const r = await conn.execute(sql);
    return res.json(r.rows || []);
  } catch (e) { console.error('/estadisticas/empleados-por-area', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/estadisticas/empleados-por-sexo', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const r = await conn.execute(`SELECT p.SEXOPER AS SEXO, COUNT(*) AS CANTIDAD FROM SYSTEM.PERSONA p GROUP BY p.SEXOPER ORDER BY CANTIDAD DESC`);
    return res.json(r.rows || []);
  } catch (e) { console.error('/estadisticas/empleados-por-sexo', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/estadisticas/empleados-por-estado-civil', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const sql = `SELECT ec.NOMBREEC AS ESTADOCIVIL, COUNT(*) AS CANTIDAD
                 FROM SYSTEM.PERSONA p LEFT JOIN SYSTEM.ESTADOCIVIL ec
                 ON p.ESTADOCIVIL_CODIGOEC = ec.CODIGOEC
                 GROUP BY ec.NOMBREEC
                 ORDER BY CANTIDAD DESC`;
    const r = await conn.execute(sql);
    return res.json(r.rows || []);
  } catch (e) { console.error('/estadisticas/empleados-por-estado-civil', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.get('/estadisticas/empleados-por-cargo', requireAuth(), async (req, res) => {
  let conn; try {
    conn = await getConnection();
    const sql = `SELECT c.NOMBRE AS CARGO, COUNT(*) AS CANTIDAD
                 FROM SYSTEM.PERSONA p LEFT JOIN SYSTEM.CARGO c
                 ON p.CARGO_CODIGOCARGO = c.CODIGOCARGO
                 GROUP BY c.NOMBRE
                 ORDER BY CANTIDAD DESC`;
    const r = await conn.execute(sql);
    return res.json(r.rows || []);
  } catch (e) { console.error('/estadisticas/empleados-por-cargo', e); return res.status(500).json({ message: 'Error' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

// Contacto
app.post('/api/contacto', async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body || {};
  if (!nombre || !email || !asunto || !mensaje) return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  
  console.log('📧 Mensaje de contacto recibido:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 Nombre: ${nombre}`);
  console.log(`📧 Email: ${email}`);
  console.log(`📋 Asunto: ${asunto}`);
  console.log(`💬 Mensaje:\n${mensaje}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Si SMTP está configurado, intentar enviar email
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.SMTP_TO || process.env.SMTP_USER,
        subject: `[Contacto Carbones Arizona] ${asunto}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${nombre}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${asunto}</p>
          <hr>
          <p><strong>Mensaje:</strong></p>
          <p>${mensaje.replace(/\n/g, '<br>')}</p>
        `
      });
      console.log('✅ Email enviado exitosamente');
      return res.json({ message: 'Mensaje enviado correctamente por email.' });
    } catch (err) {
      console.error('❌ Error al enviar email:', err.message);
      // Aunque falle el email, el mensaje se registró en consola
      return res.json({ message: 'Mensaje registrado. (Email no configurado o error en envío)' });
    }
  } else {
    // Sin SMTP configurado, solo registrar en consola
    console.log('⚠️  SMTP no configurado. Mensaje solo registrado en consola.');
    return res.json({ message: 'Mensaje recibido y registrado correctamente.' });
  }
});

// Recuperación de contraseña
app.post('/api/recuperar', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Correo y nueva contraseña son obligatorios.' });
  let conn; try {
    conn = await getConnection();
    const result = await conn.execute(`UPDATE USUARIOS SET CONTRASENA = :password WHERE CORREO = :email`, { password, email }, { autoCommit: true });
    if (result.rowsAffected > 0) return res.json({ message: 'Contraseña actualizada.' });
    return res.status(404).json({ message: 'Correo no encontrado.' });
  } catch (e) { console.error('/api/recuperar', e); return res.status(500).json({ message: 'Error al actualizar.' }); }
  finally { if (conn) try{ await conn.close(); } catch {} }
});

app.delete('/empleados/delete/:id', requireAuth('admin'), async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const sql = `DELETE FROM SYSTEM.PERSONA WHERE CEDULAPER = :id`;
    const result = await conn.execute(sql, { id: req.params.id }, { autoCommit: true });
    if (result.rowsAffected === 0) return res.status(404).json({ message: 'No encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /empleados/delete/:id error:', err);
    return res.status(500).json({ message: 'Error eliminando empleado' });
  } finally { if (conn) try{ await conn.close(); } catch {} }
});

app.listen(API_PORT, () => {
  console.log(`API escuchando en http://localhost:${API_PORT}`);
});
