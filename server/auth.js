const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = process.env.JWT_TTL || '8h';

// Helper: crear token con rol
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// USUARIOS AUTORIZADOS - Solo estos 3 correos pueden acceder
const AUTHORIZED_USERS = {
  // Recursos Humanos - Acceso completo
  'rrhh@carbonesarizona.com': {
    password: 'RRHH2025!Seguro',
    role: 'rrhh',
    name: 'Recursos Humanos'
  },
  // Gerente - Acceso completo
  'gerente@carbonesarizona.com': {
    password: 'Gerente2025!Seguro',
    role: 'gerente',
    name: 'Gerente General'
  },
  // Invitado - Solo puede ver Inicio, Soporte y Contáctanos
  'invitado@carbonesarizona.com': {
    password: 'Invitado2025',
    role: 'invitado',
    name: 'Visitante'
  }
};

// POST /auth/login { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Correo y contraseña son requeridos' 
    });
  }

  // Normalizar email (minúsculas y trim)
  const normalizedEmail = email.trim().toLowerCase();

  // Verificar si el usuario está autorizado
  const authorizedUser = AUTHORIZED_USERS[normalizedEmail];

  if (!authorizedUser) {
    console.log(`❌ [SECURITY] Intento de acceso NO AUTORIZADO: ${normalizedEmail} desde IP: ${req.ip}`);
    return res.status(401).json({ 
      success: false,
      message: 'Acceso denegado. Este correo no está autorizado para acceder al sistema.' 
    });
  }

  // Verificar contraseña
  if (password !== authorizedUser.password) {
    console.log(`❌ [SECURITY] Contraseña incorrecta para: ${normalizedEmail} desde IP: ${req.ip}`);
    return res.status(401).json({ 
      success: false,
      message: 'Contraseña incorrecta' 
    });
  }

  // Login exitoso
  console.log(`✅ [LOGIN] Login exitoso: ${normalizedEmail} (${authorizedUser.role}) desde IP: ${req.ip}`);

  const token = signToken({ 
    sub: normalizedEmail, 
    role: authorizedUser.role,
    name: authorizedUser.name
  });

  return res.json({ 
    success: true,
    token, 
    role: authorizedUser.role,
    name: authorizedUser.name,
    email: normalizedEmail
  });
});

// POST /auth/verify - Verificar token válido
router.post('/verify', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ valid: false, message: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ 
      valid: true, 
      role: payload.role,
      email: payload.sub,
      name: payload.name
    });
  } catch (e) {
    return res.status(401).json({ valid: false, message: 'Token inválido o expirado' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada' });
});

module.exports = router;
