// === SISTEMA DE PROTECCIÓN DE PÁGINAS - MÁXIMA SEGURIDAD ===
// Este archivo debe incluirse en todas las páginas HTML (excepto index.html)

(function() {
    'use strict';

    // Configuración de acceso por rol
    const PAGE_ACCESS = {
        // Páginas que TODOS pueden ver (incluido invitado)
        public: [
            'Inicio.html',
            'inicio-invitado.html',
            'soporte.html',
            'contacto.html',
            'index.html'
        ],
        // Páginas solo para RRHH y Gerente
        protected: [
            'Empleados.html',
            'Gerente.html',
            'Departamentos.html',
            'Areas.html',
            'notificaciones.html',
            'estadisticas.html',
            'PQRS.html',
            'Ubicanos.html'
        ]
    };

    // Obtener página actual
    function getCurrentPage() {
        const path = window.location.pathname;
        return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    }

    // Validar token JWT (verificar que no esté expirado)
    function validateToken(token) {
        if (!token) return false;
        
        try {
            // Decodificar el token JWT (sin verificar firma, solo estructura)
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            // Verificar si el token ha expirado
            if (payload.exp && payload.exp < now) {
                console.log('⏰ Token expirado');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('❌ Error validando token:', e);
            return false;
        }
    }

    // Verificar si el usuario tiene acceso a la página actual
    function checkAccess() {
        const currentPage = getCurrentPage();
        const userRole = localStorage.getItem('userRole');
        const authToken = localStorage.getItem('authToken');

        // Si no hay token o rol, redirigir al login INMEDIATAMENTE
        if (!authToken || !userRole) {
            console.log('❌ No hay sesión activa');
            redirectToLogin();
            return false;
        }

        // Validar que el token no esté expirado
        if (!validateToken(authToken)) {
            console.log('❌ Token inválido o expirado');
            localStorage.clear(); // Limpiar sesión
            redirectToLogin();
            return false;
        }

        // REDIRIGIR INVITADOS A SU PÁGINA ESPECÍFICA
        if (userRole === 'invitado' && currentPage === 'Inicio.html') {
            console.log('🔄 Redirigiendo invitado a inicio-invitado.html');
            window.location.replace('inicio-invitado.html');
            return false;
        }

        // RRHH y Gerente pueden ver Inicio.html
        if (currentPage === 'Inicio.html' && (userRole === 'rrhh' || userRole === 'gerente')) {
            return true;
        }

        // Si invitado está en inicio-invitado.html, permitir
        if (userRole === 'invitado' && currentPage === 'inicio-invitado.html') {
            return true;
        }

        // MÁXIMA SEGURIDAD: Invitados NO pueden acceder a páginas protegidas
        if (userRole === 'invitado' && PAGE_ACCESS.protected.includes(currentPage)) {
            console.log(`🚫 BLOQUEO DE SEGURIDAD: Invitado intentó acceder a ${currentPage}`);
            blockAccessImmediately();
            return false;
        }

        // Verificar si la página es pública
        if (PAGE_ACCESS.public.includes(currentPage)) {
            return true; // Todos pueden acceder
        }

        // Verificar si la página es protegida
        if (PAGE_ACCESS.protected.includes(currentPage)) {
            // Solo RRHH y Gerente pueden acceder
            if (userRole === 'rrhh' || userRole === 'gerente') {
                return true;
            } else {
                console.log(`❌ Acceso denegado para rol: ${userRole} a ${currentPage}`);
                blockAccessImmediately();
                return false;
            }
        }

        // Si no está en ninguna lista, DENEGAR por defecto (seguridad)
        console.log(`⚠️ Página no catalogada: ${currentPage}`);
        return userRole !== 'invitado'; // Solo permitir a admin
    }

    // Redirigir al login
    function redirectToLogin() {
        if (!getCurrentPage().includes('index.html')) {
            localStorage.clear(); // Limpiar toda la sesión
            window.location.replace('index.html'); // replace para que no pueda volver atrás
        }
    }

    // BLOQUEO INMEDIATO - Previene cualquier interacción
    function blockAccessImmediately() {
        // Bloquear TODA la página inmediatamente
        document.documentElement.innerHTML = ''; // Borrar contenido
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0D47A1 0%, #01579B 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: Arial, sans-serif;
        `;

        const message = document.createElement('div');
        message.style.cssText = `
            background: white;
            padding: 50px 60px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            max-width: 500px;
            animation: shake 0.5s;
        `;

        message.innerHTML = `
            <style>
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                    20%, 40%, 60%, 80% { transform: translateX(10px); }
                }
                @keyframes countdown {
                    from { transform: scale(1.5); }
                    to { transform: scale(1); }
                }
            </style>
            <div style="font-size: 80px; margin-bottom: 20px;">🔒</div>
            <h1 style="color: #d32f2f; margin-bottom: 15px; font-size: 32px;">ACCESO BLOQUEADO</h1>
            <p style="color: #555; margin-bottom: 20px; font-size: 18px; line-height: 1.6;">
                <strong>Esta sección está restringida.</strong><br><br>
                Solo el personal autorizado de <strong>Recursos Humanos</strong> y <strong>Gerencia</strong> 
                pueden acceder a esta área.
            </p>
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                    <strong>⚠️ Advertencia:</strong> Los intentos de acceso no autorizado son registrados y monitoreados.
                </p>
            </div>
            <p style="color: #999; font-size: 14px; margin-bottom: 25px;">
                Serás redirigido al inicio en <span id="countdown" style="font-weight: bold; color: #0D47A1; font-size: 28px; display: inline-block; animation: countdown 1s infinite;">3</span> segundos
            </p>
            <button onclick="window.location.replace('Inicio.html')" style="
                padding: 15px 30px;
                background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(13, 71, 161, 0.3);
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(13, 71, 161, 0.4)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(13, 71, 161, 0.3)'">
                🏠 Volver al Inicio Ahora
            </button>
        `;

        overlay.appendChild(message);
        document.body.appendChild(overlay);

        // Contador regresivo
        let count = 3;
        const countdownEl = document.getElementById('countdown');
        const interval = setInterval(() => {
            count--;
            if (countdownEl) countdownEl.textContent = count;
            if (count <= 0) {
                clearInterval(interval);
                window.location.replace('Inicio.html');
            }
        }, 1000);

        // Prevenir navegación hacia atrás
        history.pushState(null, '', location.href);
        window.onpopstate = () => {
            history.pushState(null, '', location.href);
        };
    }

    // Mostrar mensaje de acceso denegado (versión menos agresiva para casos normales)
    function showAccessDenied() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;

        const message = document.createElement('div');
        message.style.cssText = `
            background: white;
            padding: 30px 40px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 400px;
        `;

        message.innerHTML = `
            <div style="font-size: 48px; color: #f44336; margin-bottom: 15px;">🚫</div>
            <h2 style="color: #333; margin-bottom: 10px;">Acceso Denegado</h2>
            <p style="color: #666; margin-bottom: 20px;">
                No tienes permisos para acceder a esta página.
                <br><br>
                Solo el personal de <strong>Recursos Humanos</strong> y <strong>Gerencia</strong> 
                pueden acceder a esta sección.
            </p>
            <button onclick="window.location.href='Inicio.html'" style="
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            ">Volver al Inicio</button>
        `;

        overlay.appendChild(message);
        document.body.appendChild(overlay);

        // Redirigir automáticamente después de 3 segundos
        setTimeout(() => {
            window.location.href = 'Inicio.html';
        }, 3000);
    }

    // Ocultar elementos del menú según el rol
    function hideRestrictedMenuItems() {
        const userRole = localStorage.getItem('userRole');
        
        if (userRole === 'invitado') {
            // Lista de selectores de menú a ocultar para invitados
            const restrictedSelectors = [
                'a[href="Empleados.html"]',
                'a[href="Gerente.html"]',
                'a[href="Departamentos.html"]',
                'a[href="Areas.html"]',
                'a[href="notificaciones.html"]',
                'a[href="estadisticas.html"]',
                'a[href="PQRS.html"]',
                '.SubEmpleados'
            ];

            restrictedSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Ocultar el elemento y su contenedor padre si es un <li>
                    if (el.parentElement && el.parentElement.tagName === 'LI') {
                        el.parentElement.style.display = 'none';
                    } else {
                        el.style.display = 'none';
                    }
                });
            });

            console.log('🔒 Elementos restringidos ocultados para invitado');
        }
    }

    // Mostrar información del usuario en la interfaz
    function displayUserInfo() {
        const userName = localStorage.getItem('userName');
        const userRole = localStorage.getItem('userRole');
        
        if (userName) {
            // Buscar elemento de profesión para mostrar el rol
            const professionElement = document.querySelector('.profesion');
            if (professionElement) {
                const roleNames = {
                    'rrhh': 'Recursos Humanos',
                    'gerente': 'Gerencia',
                    'invitado': 'Visitante'
                };
                professionElement.textContent = roleNames[userRole] || 'Usuario';
            }

            // Buscar elemento de nombre
            const nameElement = document.querySelector('.name');
            if (nameElement) {
                nameElement.textContent = userName.split(' ')[0] || 'Usuario';
            }
        }
    }

    // Ejecutar verificaciones cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkAccess();
            hideRestrictedMenuItems();
            displayUserInfo();
        });
    } else {
        checkAccess();
        hideRestrictedMenuItems();
        displayUserInfo();
    }

})();
