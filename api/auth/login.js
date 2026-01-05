// API de Login simplificada - Solo credenciales estáticas (sin BD)

const AUTHORIZED_USERS = {
  'rrhh@carbonesarizona.com': {
    password: 'RRHH2025!Seguro',
    role: 'rrhh',
    name: 'Recursos Humanos'
  },
  'gerente@carbonesarizona.com': {
    password: 'Gerente2025!Seguro',
    role: 'gerente',
    name: 'Gerente General'
  },
  'invitado@carbonesarizona.com': {
    password: 'Invitado2025',
    role: 'invitado',
    name: 'Visitante'
  }
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Correo y contraseña son requeridos'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const authorizedUser = AUTHORIZED_USERS[normalizedEmail];

  if (!authorizedUser) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Este correo no está autorizado.'
    });
  }

  if (password !== authorizedUser.password) {
    return res.status(401).json({
      success: false,
      message: 'Contraseña incorrecta'
    });
  }

  // Token simple (sin JWT para simplificar - no hay BD)
  const token = Buffer.from(`${normalizedEmail}:${authorizedUser.role}:${Date.now()}`).toString('base64');

  return res.status(200).json({
    success: true,
    token,
    role: authorizedUser.role,
    name: authorizedUser.name,
    email: normalizedEmail
  });
};
