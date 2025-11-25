const supabaseClient = window.supabaseClient;
        // ELEMENTOS DEL DOM
        // ============================================
        const loading = document.getElementById('loading');
        const loginCard = document.getElementById('loginCard');
        const authForm = document.getElementById('authForm');
        const alertBox = document.getElementById('alert');
        const loginBtn = document.getElementById('loginBtn');

        // ============================================
        // FUNCIONES DE UTILIDAD
        // ============================================
        function showAlert(message, type = 'error') {
            alertBox.textContent = message;
            alertBox.className = `alert ${type} show`;
            setTimeout(() => {
                alertBox.className = 'alert';
            }, 5000);
        }

        function showLoading(show = true) {
            loading.style.display = show ? 'block' : 'none';
        }

        function showLogin(show = true) {
            loginCard.style.display = show ? 'block' : 'none';
        }

        // ============================================
        // VERIFICACIÓN DE SESIÓN
        // ============================================
        async function checkSession() {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                
                showLoading(false);
                
                if (error) throw error;
                
                if (session) {
                    // Usuario ya tiene sesión activa, redirigir al dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // No hay sesión, mostrar login
                    showLogin(true);
                }
            } catch (error) {
                console.error('Error verificando sesión:', error);
                showLoading(false);
                showLogin(true);
                showAlert('Error al verificar la sesión', 'error');
            }
        }

        // ============================================
        // MANEJO DE LOGIN
        // ============================================
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                showAlert('¡Bienvenido administrador!', 'success');
                
                setTimeout(() => {
                    // Redirigir al dashboard después del login exitoso
                    window.location.href = 'dashboard.html';
                }, 1000);
                
            } catch (error) {
                console.error('Error en login:', error);
                
                if (error.message.includes('Invalid login credentials')) {
                    showAlert('Credenciales incorrectas. Verifica tu email y contraseña.', 'error');
                } else if (error.message.includes('Email not confirmed')) {
                    showAlert('Debes confirmar tu email antes de iniciar sesión.', 'error');
                } else {
                    showAlert('Error al iniciar sesión: ' + error.message, 'error');
                }
                
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar Sesión';
            }
        });

        // ============================================
        // LISTENER DE CAMBIOS DE AUTENTICACIÓN
        // ============================================
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            
            if (event === 'SIGNED_IN' && session) {
                // Redirigir al dashboard
                window.location.href = 'dashboard.html';
            }
        });

        // ============================================
        // INICIALIZACIÓN
        // ============================================
        checkSession();