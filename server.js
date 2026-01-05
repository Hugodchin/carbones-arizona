// server.js
const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

const dbConfig = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'BASEDEDATOSARIZONA2025',
  connectString: process.env.DB_CONNECT || 'localhost:1521/XEPDB1',
};
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: Validación de datos del empleado
function validateEmployeeData(req, res, next) {
  const { cedula, nombre, fechaIngreso, exameningresoper, telefono, correo, fechaper, estadoCivil, nivelRiesgo, nacionalidad, sexo, contrato } = req.body;

  console.log('Datos recibidos:', req.body);

  // Validar que todos los campos estén presentes
  if (!cedula || !nombre || !fechaIngreso || !exameningresoper || !telefono || !correo || !fechaper || !estadoCivil || !nivelRiesgo || !nacionalidad || !sexo || !contrato) {
    return res.status(400).json({
      message: 'Faltan datos: cedula, nombre, fechaIngreso, exameningresoper, telefono, correo, fechaper, estadoCivil, nivelRiesgo, nacionalidad, sexo, contrato',
    });
  }

  // Validar formato de fechas
  if (isNaN(new Date(fechaIngreso).getTime())) {
    return res.status(400).json({ message: 'Fecha de ingreso no válida' });
  }
  if (isNaN(new Date(exameningresoper).getTime())) {
    return res.status(400).json({ message: 'Fecha de examen de ingreso no válida' });
  }
  if (isNaN(new Date(fechaper).getTime())) {
    return res.status(400).json({ message: 'Fecha de nacimiento no válida' });
  }

  // Validar que la fecha de nacimiento no esté en el futuro
  const today = new Date();
  if (new Date(fechaper) > today) {
    return res.status(400).json({ message: 'Fecha de nacimiento no puede estar en el futuro' });
  }

  // Validar que la cédula sea un número
  if (isNaN(cedula)) {
    return res.status(400).json({ message: 'La cédula debe ser un número válido' });
  }

  next();
}

let nvrData = []; // Variable global para almacenar los datos de NVR

// Función para cargar los datos de NVR
async function loadNvrData() {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(`SELECT * FROM NVR`);
    nvrData = result.rows; // Almacena los datos en la variable global
    // console.log('Datos de NVR cargados:', nvrData); // Eliminado el mensaje de consola innecesario
  } catch (err) {
    console.error('Error al cargar los datos de NVR:', err);
  } finally {
    if (conn) await conn.close();
  }
}

// Llama a la función para cargar los datos de NVR al iniciar el servidor
loadNvrData();

// Ruta POST: Insertar un nuevo empleado
app.post('/empleado', validateEmployeeData, async (req, res) => {
  const { cedula, nombre, fechaIngreso, exameningresoper, telefono, correo, fechaper, estadoCivil, nivelRiesgo, nacionalidad, sexo, contrato, fondoPension, centroTrabajo, cargo, eps, area } = req.body;

  console.log('Datos recibidos en el servidor:', req.body);

  if (!eps) {
    return res.status(400).json({ message: 'El campo EPS es obligatorio' });
  }

  if (!fondoPension) {
    return res.status(400).json({ message: 'El campo fondoPension es obligatorio' });
  }

  if (!cargo) {
    return res.status(400).json({ message: 'El campo cargo es obligatorio' });
  }

  if (!area) {
    return res.status(400).json({ message: 'El campo área es obligatorio' });
  }

  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);

    // Validar que la cédula no exista antes de insertar (comparación estricta y robusta)
    let cedulaNum = Number(cedula);
    if (isNaN(cedulaNum)) {
      return res.status(400).json({ message: 'La cédula debe ser un número válido.' });
    }

    // DEBUG extra: imprime todas las cédulas existentes antes de chequear duplicados
    const allCedulas = await conn.execute(`SELECT CEDULAPER FROM PERSONA`);
    console.log('Cédulas existentes en PERSONA:', allCedulas.rows);

    const cedulaCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM PERSONA WHERE CEDULAPER = :cedula`,
      { cedula: cedulaNum }
    );
    console.log('Resultado de búsqueda de cédula:', cedulaNum, cedulaCheck.rows[0].COUNT);

    if (cedulaCheck.rows[0].COUNT > 0) {
      return res.status(400).json({ message: 'Ya existe un empleado con esa cédula exacta. No se permiten duplicados.' });
    }

    // Validar que el cargo exista en la tabla CARGO
    const cargoTrimmed = cargo.toString().trim();
    console.log('Validando cargo:', cargoTrimmed);

    const cargoCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.CARGO WHERE TRIM(CODIGOCARGO) = :cargo`,
      { cargo: cargoTrimmed }
    );

    if (cargoCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: `El cargo especificado (${cargoTrimmed}) no existe en la tabla CARGO` });
    }

    // Validar que el nivel de riesgo exista en la tabla `NVR`
    const nivelRiesgoStr = nivelRiesgo.toString().trim();
    const nivelRiesgoCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM NVR WHERE TRIM(CODIGONR) = :nivelRiesgo`,
      { nivelRiesgo: nivelRiesgoStr }
    );

    if (nivelRiesgoCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: 'El nivel de riesgo especificado no existe en la tabla NVR' });
    }

    // Validar que el fondo de pensión exista en la tabla FP
    const fondoPensionStr = fondoPension.toString().trim();
    const fondoPensionCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.FP WHERE CODIGOFP = :fondoPension`,
      { fondoPension: fondoPensionStr }
    );

    if (fondoPensionCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: 'El fondo de pensión especificado no existe en la tabla FP' });
    }

    // Validar que el estado civil exista in la tabla ESTADOCIVIL
    const estadoCivilStr = estadoCivil.toString().trim();
    const estadoCivilCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.ESTADOCIVIL WHERE CODIGOEC = :estadoCivil`,
      { estadoCivil: estadoCivilStr }
    );

    if (estadoCivilCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: 'El estado civil especificado no existe en la tabla ESTADOCIVIL' });
    }

    // Validar que el centro de trabajo exista en la tabla CT
    const centroTrabajoCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.CT WHERE CODIGOCT = :centroTrabajo`,
      { centroTrabajo }
    );

    if (centroTrabajoCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: 'El centro de trabajo especificado no existe en la tabla CT' });
    }

    // Validar que la EPS exista en la tabla EPS
    const epsTrimmed = eps.toString().trim();
    console.log('Validando EPS:', epsTrimmed);

    const epsCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.EPS WHERE TRIM(CODEPS) = :eps`,
      { eps: epsTrimmed }
    );

    if (epsCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: `La EPS especificada (${epsTrimmed}) no existe en la tabla EPS` });
    }

    // Validar que el área exista en la tabla AREAS
    const areaTrimmed = area.toString().trim();
    console.log('Validando área:', areaTrimmed);

    const areaCheck = await conn.execute(
      `SELECT COUNT(*) AS count FROM SYSTEM.AREAS WHERE TRIM(CODIGOAREAS) = :area`,
      { area: areaTrimmed }
    );

    if (areaCheck.rows[0].COUNT === 0) {
      return res.status(400).json({ message: `El área especificada (${areaTrimmed}) no existe en la tabla AREAS` });
    }

    // Calcular la edad basado en `fechaper`
    const birthDate = new Date(fechaper);
    const today = new Date();
    const edad = today.getFullYear() - birthDate.getFullYear();
    const isBirthdayPassed = (today.getMonth() > birthDate.getMonth()) || 
                             (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
    const edadPer = isBirthdayPassed ? edad : edad - 1;

    // Insertar el empleado
    await conn.execute(
      `INSERT INTO PERSONA (
         CEDULAPER, NOMBREPER, FECHAPER, EDADPER, FECHAINGRESOPER, TELEFONOPER, SEXOPER, CONTRATO20PER, CORREOPER, EXAMENINGRESOPER, 
         ESTADOCIVIL_CODIGOEC, CARGO_CODIGOCARGO, CT_CODIGOCT, NVR_CODIGONR, FP_CODIGOFP, NAC_CODIGONAC, EPS_CODEPS, AREAS_CODIGOAREAS
       ) VALUES (
         :cedula, :nombre, TO_DATE(:fechaper, 'YYYY-MM-DD'), :edadPer, TO_DATE(:fechaIngreso, 'YYYY-MM-DD'), :telefono, :sexo, :contrato, :correo, TO_DATE(:exameningresoper, 'YYYY-MM-DD'),
         :estadoCivil, :cargo, :centroTrabajo, :nivelRiesgo, :fondoPension, :nacionalidad, :eps, :area
       )`,
      {
        cedula: cedulaNum,
        nombre,
        fechaper,
        edadPer, // Edad calculada
        fechaIngreso,
        telefono,
        sexo,
        contrato,
        correo,
        exameningresoper,
        estadoCivil: estadoCivilStr,
        cargo: cargoTrimmed,
        centroTrabajo,
        nivelRiesgo,
        fondoPension: fondoPensionStr,
        nacionalidad,
        eps: epsTrimmed, // Incluye EPS en la inserción
        area: areaTrimmed,
      },
      { autoCommit: true }
    );

    // Devolver los datos completos del empleado
    res.status(200).json({
      message: 'Empleado agregado correctamente',
      empleado: {
        cedula,
        nombre,
        fechaIngreso,
        exameningresoper,
        telefono,
        correo,
        fechaper,
        estadoCivil,
        nivelRiesgo,
        nacionalidad,
        sexo,
        contrato,
        centroTrabajo,
        fondoPension,
        edad: edadPer,
        cargo,
        eps, // Incluye EPS en la respuesta
        area,
      },
    });
  } catch (err) {
    // Manejo específico para restricción única violada
    if (err && (err.errorNum === 1 || (err.message && err.message.includes('ORA-00001')))) {
      // ORA-00001: restricción única violada
      res.status(400).json({ message: 'Ya existe un empleado con esa cédula. No se permiten duplicados.' });
    } else {
      res.status(500).json({ message: 'Error al agregar empleado', error: err.message });
    }
  } finally {
    if (conn) await conn.close();
  }
});

// Ruta GET: Obtener todas las EPS
app.get('/eps', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(`SELECT CODEPS, NOMBREEPS FROM SYSTEM.EPS ORDER BY NOMBREEPS`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en GET /eps:', err);
        res.status(500).json({ message: 'Error al obtener EPS', error: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Ruta GET: Obtener todas las áreas
app.get('/areas', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const result = await conn.execute(`SELECT CODIGOAREAS, NOMBRE FROM SYSTEM.AREAS ORDER BY NOMBRE`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en GET /areas:', err);
        res.status(500).json({ message: 'Error al obtener áreas', error: err.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Ruta GET: Obtener todos los departamentos (mostrar exactamente los datos de la tabla DEPTO)
app.get('/departamentos', async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);

        // Debug: Verifica si la tabla existe antes de consultar
        const tableCheck = await conn.execute(`
            SELECT COUNT(*) AS EXISTE FROM user_tables WHERE table_name = 'DEPTO'
        `);
        if (tableCheck.rows[0].EXISTE === 0) {
            console.error('Tabla DEPTO no existe en el esquema del usuario conectado.');
            return res.status(500).json({ message: 'La tabla DEPTO no existe en el esquema del usuario conectado.' });
        }

        // Debug: Verifica si las columnas existen
        const columnsCheck = await conn.execute(`
            SELECT column_name FROM user_tab_columns WHERE table_name = 'DEPTO'
        `);
        const columns = columnsCheck.rows.map(r => r.COLUMN_NAME);
        const requiredColumns = ['CODIGODPTO', 'NOMBRE', 'Adm-Ing', 'AREAS_CODIGOAREAS'];
        const missing = requiredColumns.filter(col => !columns.includes(col));
        if (missing.length > 0) {
            console.error('Faltan columnas en DEPTO:', missing);
            return res.status(500).json({ message: 'Faltan columnas en DEPTO: ' + missing.join(', ') });
        }

        // Consulta principal
        const result = await conn.execute(`
            SELECT 
                CODIGODPTO, 
                NOMBRE, 
                "Adm-Ing", 
                AREAS_CODIGOAREAS 
            FROM SYSTEM.DEPTO
            ORDER BY NOMBRE
        `);
        res.json(result.rows);
    } catch (err) {
        // Imprime información extra para depuración
        console.error('Error en GET /departamentos:', err);
        if (err && err.message) {
            console.error('Mensaje de error:', err.message);
        }
        res.status(500).json({ message: 'Error al obtener departamentos', error: err.message, stack: err.stack });
    } finally {
        if (conn) await conn.close();
    }
});

// Ruta GET: Obtener todos los empleados con todos los campos y nombres descriptivos
app.get('/empleados', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT 
         p.CEDULAPER   AS CEDULA,
         p.NOMBREPER   AS NOMBRE,
         TO_CHAR(p.FECHAINGRESOPER,'YYYY-MM-DD') AS FECHAINGRESO,
         TO_CHAR(p.EXAMENINGRESOPER,'YYYY-MM-DD') AS EXAMENINGRESO,
         p.TELEFONOPER AS TELEFONO,
         NVL(p.CORREOPER, 'sincorreo@empresa.com') AS CORREO,
         TO_CHAR(p.FECHAPER,'YYYY-MM-DD') AS FECHANACIMIENTO,
         p.EDADPER     AS EDAD,
         ec.NOMBREEC   AS ESTADOCIVIL,
         nvr.NIVEL     AS NIVELRIESGO,
         nac.NOMBRENAC AS NACIONALIDAD,
         p.SEXOPER     AS SEXO,
         p.CONTRATO20PER AS CONTRATO,
         fp.NOMBREFP   AS FONDOPENSION,
         ct.NOMBRECT   AS CENTROTRABAJO,
         c.NOMBRE      AS CARGO,
         eps.NOMBREEPS AS EPS,
         a.NOMBRE      AS AREA,
         p.ESTADOCIVIL_CODIGOEC,
         p.NVR_CODIGONR,
         p.NAC_CODIGONAC,
         p.FP_CODIGOFP,
         p.CT_CODIGOCT,
         p.CARGO_CODIGOCARGO,
         p.EPS_CODEPS,
         p.AREAS_CODIGOAREAS
       FROM SYSTEM.PERSONA p
       LEFT JOIN SYSTEM.ESTADOCIVIL ec ON p.ESTADOCIVIL_CODIGOEC = ec.CODIGOEC
       LEFT JOIN SYSTEM.NVR nvr ON p.NVR_CODIGONR = nvr.CODIGONR
       LEFT JOIN SYSTEM.NAC nac ON p.NAC_CODIGONAC = nac.CODIGONAC
       LEFT JOIN SYSTEM.FP fp ON p.FP_CODIGOFP = fp.CODIGOFP
       LEFT JOIN SYSTEM.CT ct ON p.CT_CODIGOCT = ct.CODIGOCT
       LEFT JOIN SYSTEM.CARGO c ON p.CARGO_CODIGOCARGO = c.CODIGOCARGO
       LEFT JOIN SYSTEM.EPS eps ON p.EPS_CODEPS = eps.CODEPS
       LEFT JOIN SYSTEM.AREAS a ON p.AREAS_CODIGOAREAS = a.CODIGOAREAS
       WHERE p.CEDULAPER IS NOT NULL
       ORDER BY p.NOMBREPER`
    );
    // Mapeo para asegurar que los campos siempre existan y sean string
    const empleados = result.rows.map(emp => ({
      CEDULA: emp.CEDULA ? String(emp.CEDULA) : '',
      NOMBRE: emp.NOMBRE || '',
      FECHAINGRESO: emp.FECHAINGRESO || '',
      EXAMENINGRESO: emp.EXAMENINGRESO || '',
      TELEFONO: emp.TELEFONO || '',
      CORREO: emp.CORREO || '',
      FECHANACIMIENTO: emp.FECHANACIMIENTO || '',
      EDAD: emp.EDAD || '',
      ESTADOCIVIL: emp.ESTADOCIVIL || '',
      NIVELRIESGO: emp.NIVELRIESGO || '',
      NACIONALIDAD: emp.NACIONALIDAD || '',
      SEXO: emp.SEXO || '',
      CONTRATO: emp.CONTRATO || '',
      FONDOPENSION: emp.FONDOPENSION || '',
      CENTROTRABAJO: emp.CENTROTRABAJO || '',
      CARGO: emp.CARGO || '',
      EPS: emp.EPS || '',
      AREA: emp.AREA || '',
      ESTADOCIVIL_CODIGOEC: emp.ESTADOCIVIL_CODIGOEC || '',
      NVR_CODIGONR: emp.NVR_CODIGONR || '',
      NAC_CODIGONAC: emp.NAC_CODIGONAC || '',
      FP_CODIGOFP: emp.FP_CODIGOFP || '',
      CT_CODIGOCT: emp.CT_CODIGOCT || '',
      CARGO_CODIGOCARGO: emp.CARGO_CODIGOCARGO || '',
      EPS_CODEPS: emp.EPS_CODEPS || '',
      AREAS_CODIGOAREAS: emp.AREAS_CODIGOAREAS || ''
    }));
    res.json(empleados);
  } catch (err) {
    console.error('Error en GET /empleados:', err);
    res.status(500).json({ message: 'Error al obtener empleados', error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Ruta DELETE: Eliminar un empleado por cédula
app.delete('/empleado/:cedula', async (req, res) => {
  let conn;
  try {
    const { cedula } = req.params;

    // Validar que la cédula sea un número
    if (isNaN(cedula)) {
      return res.status(400).json({ message: 'Cédula no válida' });
    }

    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `DELETE FROM PERSONA WHERE CEDULAPER = :cedula`,
      { cedula },
      { autoCommit: true }
    );

    if (result.rowsAffected > 0) {
      res.json({ message: 'Empleado eliminado correctamente' });
    } else {
      res.status(404).json({ message: 'Empleado no encontrado' });
    }
  } catch (err) {
    console.error('Error en DELETE /empleado/:cedula:', err);
    res.status(500).json({ message: 'Error al eliminar empleado', error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Ruta para contacto (envío de correo)
app.post('/api/contacto', async (req, res) => {
    const { nombre, email, asunto, mensaje } = req.body;
    if (!nombre || !email || !asunto || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'srd4rkyt@gmail.com',
                pass: 'assjkbntwxobcljg'
            }
        });

        await transporter.sendMail({
            from: `"${nombre}" <srd4rkyt@gmail.com>`,
            replyTo: email,
            to: 'srd4rkyt@gmail.com',
            subject: `[Contacto] ${asunto} (de: ${email})`,
            text: 
`Has recibido un nuevo mensaje desde el formulario de contacto:

Nombre: ${nombre}
Correo: ${email}
Asunto: ${asunto}

Mensaje:
${mensaje}
`
        });

        res.json({ message: '✅ Mensaje enviado correctamente.' });
    } catch (err) {
        console.error('Error enviando correo:', err);
        res.status(500).json({ message: '❌ Error al enviar el mensaje.' });
    }
});

// Ruta para recuperación de contraseña
app.post('/api/recuperar', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Correo y nueva contraseña son obligatorios.' });
    }
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        // Cambia USUARIOS, CORREO, CONTRASENA por los nombres reales de tu tabla y campos
        const result = await conn.execute(
            `UPDATE USUARIOS SET CONTRASENA = :password WHERE CORREO = :email`,
            { password, email },
            { autoCommit: true }
        );
        if (result.rowsAffected > 0) {
            res.json({ message: '✅ Contraseña actualizada correctamente.' });
        } else {
            res.status(404).json({ message: '❌ Correo no encontrado.' });
        }
    } catch (err) {
        console.error('Error en recuperación de contraseña:', err);
        res.status(500).json({ message: 'Error al actualizar la contraseña.' });
    } finally {
        if (conn) await conn.close();
    }
});

// Ruta para estadísticas: empleados por departamento
app.get('/estadisticas/empleados-por-departamento', async (req, res) => {
    console.log('GET /estadisticas/empleados-por-departamento');
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        // Usar LEFT JOIN para incluir empleados sin departamento y mostrar "Sin departamento" si es necesario
        const sql = `
            SELECT 
                NVL(d.NOMBRE, 'Sin departamento') AS DEPARTAMENTO, 
                COUNT(*) AS CANTIDAD
            FROM SYSTEM.PERSONA p
            LEFT JOIN SYSTEM.DEPTO d ON p.CT_CODIGOCT = d.CODIGODPTO
            GROUP BY d.NOMBRE
            ORDER BY CANTIDAD DESC
        `;
        const result = await conn.execute(sql);
        console.log('Datos enviados (departamento):', JSON.stringify(result.rows, null, 2));
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /estadisticas/empleados-por-departamento:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (cerr) { console.error('Error cerrando la conexión:', cerr); }
        }
    }
});

// Ruta para estadísticas: empleados por área
app.get('/estadisticas/empleados-por-area', async (req, res) => {
    console.log('GET /estadisticas/empleados-por-area');
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        console.log('Conexión a Oracle establecida');
        const sql = `
            SELECT a.NOMBRE AS AREA, COUNT(*) AS CANTIDAD
            FROM SYSTEM.PERSONA p
            LEFT JOIN SYSTEM.AREAS a ON p.AREAS_CODIGOAREAS = a.CODIGOAREAS
            GROUP BY a.NOMBRE
            ORDER BY CANTIDAD DESC
        `;
        console.log('Ejecutando SQL:', sql);
        const result = await conn.execute(sql);
        console.log('Filas devueltas:', result.rows.length);
        console.log('Datos enviados (área):', JSON.stringify(result.rows, null, 2));
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /estadisticas/empleados-por-area:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message, stack: err.stack });
    } finally {
        if (conn) {
            try {
                await conn.close();
                console.log('Conexión a Oracle cerrada');
            } catch (cerr) {
                console.error('Error cerrando la conexión:', cerr);
            }
        }
    }
});

// Ruta para estadísticas: empleados por sexo
app.get('/estadisticas/empleados-por-sexo', async (req, res) => {
    console.log('GET /estadisticas/empleados-por-sexo');
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT p.SEXOPER AS SEXO, COUNT(*) AS CANTIDAD
            FROM SYSTEM.PERSONA p
            GROUP BY p.SEXOPER
            ORDER BY CANTIDAD DESC
        `;
        const result = await conn.execute(sql);
        console.log('Datos enviados (sexo):', JSON.stringify(result.rows, null, 2));
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /estadisticas/empleados-por-sexo:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message, stack: err.stack });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (cerr) { console.error('Error cerrando la conexión:', cerr); }
        }
    }
});

// Ruta para estadísticas: empleados por estado civil
app.get('/estadisticas/empleados-por-estado-civil', async (req, res) => {
    console.log('GET /estadisticas/empleados-por-estado-civil');
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT ec.NOMBREEC AS ESTADOCIVIL, COUNT(*) AS CANTIDAD
            FROM SYSTEM.PERSONA p
            LEFT JOIN SYSTEM.ESTADOCIVIL ec ON p.ESTADOCIVIL_CODIGOEC = ec.CODIGOEC
            GROUP BY ec.NOMBREEC
            ORDER BY CANTIDAD DESC
        `;
        const result = await conn.execute(sql);
        console.log('Datos enviados (estado civil):', JSON.stringify(result.rows, null, 2));
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /estadisticas/empleados-por-estado-civil:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message, stack: err.stack });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (cerr) { console.error('Error cerrando la conexión:', cerr); }
        }
    }
});

// Ruta para estadísticas: empleados por cargo
app.get('/estadisticas/empleados-por-cargo', async (req, res) => {
    console.log('GET /estadisticas/empleados-por-cargo');
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        const sql = `
            SELECT c.NOMBRE AS CARGO, COUNT(*) AS CANTIDAD
            FROM SYSTEM.PERSONA p
            LEFT JOIN SYSTEM.CARGO c ON p.CARGO_CODIGOCARGO = c.CODIGOCARGO
            GROUP BY c.NOMBRE
            ORDER BY CANTIDAD DESC
        `;
        const result = await conn.execute(sql);
        console.log('Datos enviados (cargo):', JSON.stringify(result.rows, null, 2));
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /estadisticas/empleados-por-cargo:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: err.message, stack: err.stack });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (cerr) { console.error('Error cerrando la conexión:', cerr); }
        }
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));