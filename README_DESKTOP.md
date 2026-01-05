# Carbones Arizona — App de escritorio (Electron) + API Node/Express

Este proyecto empaqueta tu web (public/) y expone una API local con Node/Express para acceder a Oracle. Puedes usar la misma API en un servidor y consumirla desde web.

## Requisitos
- Node.js 18+
- Oracle XE 21c en local (o acceso a una BD remota)

## Configuración
1. Copia `.env.example` a `.env` y ajusta:
```
DB_USER=system
DB_PASSWORD=BASEDEDATOSARIZONA2025
DB_CONNECT=localhost:1521/XEPDB1
API_PORT=3300
JWT_SECRET=cambia-esto
CORS_ORIGIN=http://localhost:3300
```

2. Instala dependencias en raíz
```
npm install
```

## Correr API localmente
```
npm run start:api
# API en http://localhost:3300
```

## Correr Electron en desarrollo
```
# Arranca API y Electron
npm run start:dev
```

## Empaquetar para Windows (.exe)
```
npm run build:electron
# Instalable en dist/Carbones-Arizona-Setup-*.exe
```

## Endpoints clave (JWT)
- POST /auth/login { email, password } → { token, role }
- GET /empleados (guest/admin)
- GET /empleados/:id (guest/admin)
- POST /empleados/create (admin)
- PUT /empleados/update/:id (admin)
- DELETE /empleados/delete/:id (admin)

Incluye cabecera: `Authorization: Bearer <token>` para rutas protegidas.

## Seguridad y despliegue remoto
- No expongas el puerto de Oracle en Internet. Usa SIEMPRE la API como capa intermedia.
- Habilita HTTPS en el servidor (Nginx/Apache reverse proxy) y fuerza JWT_SECRET seguro.
- Usa consultas preparadas (ya se usan) y valida entradas.
- Rate-limiting básico está habilitado.
- Para Linux/Windows server, ejecuta la API con PM2 o como servicio del sistema.

## BD Remota
- Si tu Oracle está en la nube, configura:
  - `DB_CONNECT` con el host:puerto/servicio remoto.
  - Red segura: VPN/SSH tunnel o límites de IP + TLS.

## Integración front
- Tu front (public/) se sirve desde la API local (Electron) o desde un servidor. Para llamadas, utiliza `fetch('/auth/login')`, `fetch('/empleados')`, etc.

