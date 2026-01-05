document.addEventListener('DOMContentLoaded', () => {
    // === AUTENTICACIÓN SEGURA - SOLO CORREOS AUTORIZADOS ===
    
    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 10000;
            max-width: 300px;
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)';
        }
        
        document.body.appendChild(notification);
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // LOGIN PRINCIPAL
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Resetear estilos
            emailInput.classList.remove('input-error', 'input-success');
            passwordInput.classList.remove('input-error', 'input-success');

            // Validaciones
            if (!email || !password) {
                if (!email) emailInput.classList.add('input-error');
                if (!password) passwordInput.classList.add('input-error');
                showNotification('Por favor completa todos los campos', 'error');
                return;
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailInput.classList.add('input-error');
                showNotification('Por favor ingresa un correo válido', 'error');
                return;
            }

            // Mostrar indicador de carga
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'VALIDANDO...';
            submitBtn.style.opacity = '0.7';

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Guardar datos de sesión
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('userEmail', data.email);
                    localStorage.setItem('userName', data.name);
                    localStorage.setItem('usuarioActivo', JSON.stringify({
                        email: data.email,
                        role: data.role,
                        name: data.name
                    }));

                    emailInput.classList.add('input-success');
                    passwordInput.classList.add('input-success');
                    showNotification(`Bienvenido ${data.name}`, 'success');

                    setTimeout(() => {
                        window.location.href = 'Inicio.html';
                    }, 1000);
                } else {
                    emailInput.classList.add('input-error');
                    passwordInput.classList.add('input-error');
                    loginForm.classList.add('shake');
                    setTimeout(() => loginForm.classList.remove('shake'), 500);
                    showNotification(data.message || 'Credenciales inválidas', 'error');
                }
            } catch (error) {
                console.error('Error en login:', error);
                emailInput.classList.add('input-error');
                passwordInput.classList.add('input-error');
                showNotification('Error de conexión con el servidor', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
            }
        });
    }

    // LOGIN COMO INVITADO - Funciona sin API (solo frontend)
    const guestLoginBtn = document.getElementById('guest-login-btn');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', function() {
            guestLoginBtn.disabled = true;
            const originalHTML = guestLoginBtn.innerHTML;
            guestLoginBtn.innerHTML = 'ACCEDIENDO...';
            guestLoginBtn.style.opacity = '0.7';

            // Login directo sin API - Guardar en localStorage
            const guestData = {
                email: 'invitado@carbonesarizona.com',
                role: 'invitado',
                name: 'Visitante'
            };

            localStorage.setItem('authToken', 'guest-token-' + Date.now());
            localStorage.setItem('userRole', 'invitado');
            localStorage.setItem('userEmail', guestData.email);
            localStorage.setItem('userName', guestData.name);
            localStorage.setItem('usuarioActivo', JSON.stringify(guestData));

            showNotification('Acceso como invitado concedido', 'success');
            
            setTimeout(() => {
                window.location.href = 'Inicio.html';
            }, 1000);
        });
    }

    // Limpiar localStorage al cargar index (logout)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('usuarioActivo');
    }

    // ===== SISTEMA DE DESCARGAS MEJORADO =====
    const downloadCards = document.querySelectorAll('.download-card');
    
    downloadCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Prevenir múltiples clicks
            if (this.classList.contains('downloading')) {
                e.preventDefault();
                showNotification('Descarga en progreso...', 'info');
                return;
            }

            // Agregar clase de descarga
            this.classList.add('downloading');
            
            // Obtener tipo de descarga
            const isInstaller = this.id === 'download-installer';
            const downloadType = isInstaller ? 'Instalador' : 'Portable';
            
            // Mostrar notificación
            showNotification(`Iniciando descarga: ${downloadType}`, 'success');
            
            // Simular progreso visual
            const progressBar = this.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }

            // Quitar estado de descarga después de un tiempo
            setTimeout(() => {
                this.classList.remove('downloading');
                if (progressBar) {
                    progressBar.style.width = '0%';
                }
            }, 3000);
        });

        // Verificar disponibilidad de descargas al cargar
        checkDownloadAvailability(card);
    });

    // Función para verificar si las descargas están disponibles
    async function checkDownloadAvailability(card) {
        const url = card.getAttribute('href');
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok) {
                // No marcar como no disponible, el servidor genera al vuelo
            }
        } catch (error) {
            // Silenciosamente fallar - el servidor generará al vuelo
        }
    }
});
