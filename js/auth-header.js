// auth-header.js - Componente reutilizable para el header con autenticación
// Incluir este script en todas las páginas HTML

(function() {
    'use strict';

    // Usar la instancia compartida de Supabase
    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.warn(' Supabase client no disponible. Asegúrate de cargar supabase primero.');
        return;
    }

    // Función para verificar sesión
    async function checkAuthSession() {
        if (!supabaseClient) {
            console.warn('Supabase no está disponible');
            return null;
        }

        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Error verificando sesión:', error);
            return null;
        }
    }

    // Función para cerrar sesión
    async function logout() {
        try {
            // Primero verificar si hay sesión
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            if (session) {
                // Solo intentar signOut si hay sesión activa
                await supabaseClient.auth.signOut();
            }
            
        } catch (error) {
            console.log('Sesión ya cerrada o expirada:', error.message);
        } finally {
            // SIEMPRE limpiar el storage y actualizar UI
            localStorage.removeItem('supabase.auth.token');
            
            // Limpiar todas las claves de supabase
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });
            
            sessionStorage.clear();
            updateAuthUI(null);
            
            // Mostrar mensaje
            const alertDiv = document.createElement('div');
            alertDiv.className = 'auth-alert success';
            alertDiv.textContent = '✅ Sesión cerrada correctamente';
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
                // Redirigir si está en dashboard
                if (window.location.pathname.includes('dashboard')) {
                    window.location.href = 'index.html';
                }
            }, 1500);
        }
    }

    // Función para actualizar la UI del header
    function updateAuthUI(session) {
        const authContainer = document.getElementById('auth-container');
        
        if (!authContainer) {
            console.warn('No se encontró #auth-container en el header');
            return;
        }

        if (session) {
            // Usuario autenticado
            authContainer.innerHTML = `
                <a href="dashboard.html" class="nav-btn auth-btn">
                    Panel de Control
                </a>
                <button class="nav-btn auth-btn logout-btn" onclick="window.authHeader.logout()">
                    Cerrar Sesión
                </button>
            `;
        } else {
            // Usuario no autenticado
            authContainer.innerHTML = `
                <a href="login.html" class="nav-btn auth-btn">
                    Iniciar Sesión
                </a>
            `;
        }
    }

    // Función de inicialización
    async function initAuthHeader() {
        const session = await checkAuthSession();
        updateAuthUI(session);

        // Escuchar cambios de autenticación
        if (supabaseClient) {
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                updateAuthUI(session);
            });
        }
    }

    // Exponer funciones globalmente
    window.authHeader = {
        init: initAuthHeader,
        logout: logout,
        checkSession: checkAuthSession
    };

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthHeader);
    } else {
        initAuthHeader();
    }

})();