# 🚀 Guía de Despliegue: Vercel + Oracle Cloud + Cloudflare

## 📋 Requisitos Previos
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Cuenta en [Oracle Cloud](https://cloud.oracle.com) (gratis - Always Free Tier)
- Cuenta en [Cloudflare](https://cloudflare.com) (gratis o de pago)
- Dominio propio (para Cloudflare)

---

## 🗄️ PASO 1: Configurar Oracle Cloud (Base de Datos Gratis)

### 1.1 Crear cuenta Oracle Cloud
1. Ve a [cloud.oracle.com](https://cloud.oracle.com)
2. Crea una cuenta gratuita (necesitas tarjeta de crédito, pero NO te cobran)
3. Espera la activación (puede tardar unas horas)

### 1.2 Crear Autonomous Database (Gratis)
1. En la consola de Oracle Cloud, busca **"Autonomous Database"**
2. Click en **"Create Autonomous Database"**
3. Configura:
   - **Workload type**: Transaction Processing (ATP)
   - **Database name**: `CARBONESARIZONA`
   - **Always Free**: ✅ Activar
   - **ADMIN password**: Crea una contraseña segura (guárdala)
4. Click en **Create**
5. Espera ~5 minutos a que se cree

### 1.3 Descargar Wallet (Credenciales)
1. En tu Autonomous Database, click en **"Database connection"**
2. Click en **"Download wallet"**
3. Crea una contraseña para el wallet
4. Descarga el archivo `.zip` (ej: `Wallet_CARBONESARIZONA.zip`)
5. Extrae el contenido en una carpeta segura

### 1.4 Obtener Connection String
1. En el wallet descargado, abre `tnsnames.ora`
2. Copia el valor de `carbonesarizona_high` o `carbonesarizona_medium`
3. Ejemplo:
   ```
   carbonesarizona_high = (description= (retry_count=20)(retry_delay=3)...)
   ```

### 1.5 Importar tus datos a Oracle Cloud
Usa SQL Developer o SQLcl para conectarte y ejecutar tus scripts de `BASE DE DATOS/export.sql`

---

## 🔷 PASO 2: Desplegar en Vercel

### 2.1 Preparar repositorio Git
```bash
# En tu proyecto, inicializa git si no existe
git init
git add .
git commit -m "Preparar para Vercel"

# Sube a GitHub
# Crea un repo en github.com y luego:
git remote add origin https://github.com/TU-USUARIO/carbones-arizona.git
git push -u origin main
```

### 2.2 Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión con GitHub
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. **IMPORTANTE**: Configura las variables de entorno antes de desplegar:

### 2.3 Variables de Entorno en Vercel
En la configuración del proyecto, añade estas variables:

| Variable | Valor |
|----------|-------|
| `DB_USER` | `ADMIN` |
| `DB_PASSWORD` | `Tu contraseña de Oracle Cloud` |
| `DB_CONNECT` | `(description= (retry_count=20)...)` (el connection string) |
| `JWT_SECRET` | `una-clave-muy-larga-y-segura-123!@#` |
| `JWT_TTL` | `8h` |
| `NODE_ENV` | `production` |

### 2.4 Configurar Wallet para Vercel
Para Oracle Cloud Autonomous DB necesitas el wallet. Opciones:

**Opción A: Base64 en variable de entorno**
```bash
# Convierte el wallet a base64
base64 -i Wallet_CARBONESARIZONA.zip > wallet.txt
# Copia el contenido a una variable ORACLE_WALLET_BASE64 en Vercel
```

**Opción B: Usar conexión sin wallet (mTLS deshabilitado)**
1. En Oracle Cloud, ve a tu Autonomous Database
2. Ve a **"Mutual TLS (mTLS) Authentication"** 
3. Edita y desactiva "Require mutual TLS"
4. Ahora puedes conectarte solo con usuario/contraseña

### 2.5 Desplegar
1. Click en **"Deploy"**
2. Vercel construirá y desplegará automáticamente
3. Obtendrás una URL como: `https://carbones-arizona.vercel.app`

---

## ☁️ PASO 3: Configurar Cloudflare

### 3.1 Agregar tu dominio a Cloudflare
1. Ve a [cloudflare.com](https://cloudflare.com) e inicia sesión
2. Click en **"Add a Site"**
3. Ingresa tu dominio (ej: `carbonesarizona.com`)
4. Selecciona plan (Free está bien para empezar)
5. Cloudflare escaneará tus DNS actuales

### 3.2 Cambiar nameservers
1. Cloudflare te dará 2 nameservers (ej: `ada.ns.cloudflare.com`)
2. Ve a tu registrador de dominio (GoDaddy, Namecheap, etc.)
3. Cambia los nameservers por los de Cloudflare
4. Espera propagación (puede tardar 24-48 horas)

### 3.3 Configurar DNS para Vercel
En Cloudflare DNS, añade estos registros:

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | ✅ Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | ✅ Proxied |

### 3.4 Configurar dominio en Vercel
1. En tu proyecto de Vercel, ve a **Settings > Domains**
2. Añade tu dominio: `carbonesarizona.com`
3. Vercel verificará automáticamente

### 3.5 Configurar SSL/TLS en Cloudflare
1. Ve a **SSL/TLS** en tu dashboard de Cloudflare
2. Selecciona modo **"Full (strict)"**
3. Activa **"Always Use HTTPS"**

### 3.6 Configuraciones de seguridad recomendadas
En Cloudflare, configura:

**Firewall Rules:**
- Bloquear países no deseados
- Rate limiting para prevenir ataques

**Page Rules:**
- `*carbonesarizona.com/*` → Always Use HTTPS
- Caché para archivos estáticos

**Security:**
- Bot Fight Mode: ON
- Browser Integrity Check: ON

---

## 💰 COSTOS ESTIMADOS

### Gratis:
- ✅ **Vercel** - Plan Hobby (gratis para proyectos personales)
- ✅ **Oracle Cloud** - Always Free Tier (20GB, gratis siempre)
- ✅ **Cloudflare** - Plan Free (suficiente para empezar)

### Si necesitas escalar:
- **Vercel Pro**: $20/mes - Más ancho de banda y funciones
- **Cloudflare Pro**: $20/mes - WAF avanzado, analytics
- **Oracle Cloud**: Pay-as-you-go si excedes el free tier

### Dominio (único costo obligatorio):
- `.com`: ~$10-15/año
- `.co`: ~$25-30/año
- `.xyz`: ~$3-5/año

---

## 🔧 Estructura de archivos para Vercel

```
proyecto/
├── api/                    # Serverless functions
│   ├── _db.js             # Conexión a Oracle
│   ├── auth/
│   │   └── login.js       # POST /api/auth/login
│   ├── empleados/
│   │   └── index.js       # GET/POST /api/empleados
│   ├── areas/
│   │   └── index.js       # GET /api/areas
│   ├── departamentos/
│   │   └── index.js       # GET /api/departamentos
│   └── estadisticas/
│       └── index.js       # GET /api/estadisticas
├── public/                 # Archivos estáticos (frontend)
│   ├── index.html
│   ├── Inicio.html
│   ├── style.css
│   └── ...
├── vercel.json            # Configuración de Vercel
└── package.json
```

---

## ⚠️ IMPORTANTE: Limitaciones

### Vercel Serverless:
- Timeout máximo: 10 segundos (hobby) / 60 segundos (pro)
- Cold starts pueden añadir latencia
- No soporta WebSockets en el plan gratuito

### Oracle Cloud Free:
- 20GB almacenamiento
- 2 OCPUs compartidas
- Puede ser lento en horarios pico

### Alternativas si hay problemas:
1. **Base de datos**: Migrar a PostgreSQL (Supabase/Neon - también gratis)
2. **Backend**: Railway.app o Render.com si Vercel no funciona bien con Oracle

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel: Dashboard > Functions > Logs
2. Verifica variables de entorno
3. Prueba la conexión a Oracle localmente primero
4. Revisa la documentación de cada servicio

---

¡Listo! Sigue estos pasos y tendrás tu aplicación en producción. 🎉
