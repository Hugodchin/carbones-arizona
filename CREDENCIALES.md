# 🔐 SISTEMA DE AUTENTICACIÓN - CARBONES ARIZONA

## ✅ CREDENCIALES AUTORIZADAS

### 1️⃣ Recursos Humanos (Acceso Completo)
- **Correo**: `rrhh@carbonesarizona.com`
- **Contraseña**: `RRHH2025!Seguro`
- **Permisos**: Acceso total a empleados, departamentos, áreas, estadísticas, PQRS, notificaciones

### 2️⃣ Gerente General (Acceso Completo)
- **Correo**: `gerente@carbonesarizona.com`
- **Contraseña**: `Gerente2025!Seguro`
- **Permisos**: Acceso total a empleados, departamentos, áreas, estadísticas, PQRS, notificaciones

### 3️⃣ Invitado (Acceso Limitado)
- **Correo**: `invitado@carbonesarizona.com`
- **Contraseña**: `Invitado2025`
- **Permisos**: Solo puede ver:
  - Inicio
  - Soporte  
  - Contáctanos

## 🚫 RESTRICCIONES

- **Solo estos 3 correos** pueden acceder al sistema
- Cualquier otro correo será rechazado
- Los invitados NO pueden acceder a:
  - Empleados
  - Gerente
  - Departamentos
  - Áreas
  - Notificaciones
  - Estadísticas
  - PQRS

## 📝 NOTAS IMPORTANTES

1. Las contraseñas son sensibles a mayúsculas/minúsculas
2. El sistema valida los correos y contraseñas contra una lista autorizada
3. Los menús se ocultan automáticamente según el rol del usuario
4. Si un invitado intenta acceder a una página restringida, será redirigido al inicio

## 🔧 ARCHIVOS MODIFICADOS

- `server/auth.js` - Autenticación backend
- `public/script.js` - Lógica de login
- `public/auth-guard.js` - Protección de páginas
- `public/index.html` - Formulario de login actualizado
- `public/Inicio.html` - Incluye sistema de protección

## 📌 PRÓXIMOS PASOS

Para agregar el sistema de protección a todas las páginas HTML, agregar esta línea en el `<head>`:

```html
<script src="auth-guard.js"></script>
```

Páginas que necesitan protección:
- Empleados.html
- Gerente.html
- Departamentos.html
- Areas.html
- notificaciones.html
- estadisticas.html
- PQRS.html
- soporte.html
- contacto.html
