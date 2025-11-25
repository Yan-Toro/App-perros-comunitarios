// auth-header.js - Componente reutilizable para el header con autenticación

(function() {
    'use strict';

    // Configuración de Supabase (ya debería estar cargada en la página)
    const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU';

    let supabaseClient;

    // Inicializar Supabase si no está ya inicializado
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
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
            await supabaseClient.auth.signOut();
            updateAuthUI(null);
            
            // Mostrar mensaje
            const alertDiv = document.createElement('div');
            alertDiv.className = 'auth-alert success';
            alertDiv.textContent = '✅ Sesión cerrada correctamente';
            document.body.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
            
        } catch (error) {
            console.error('Error cerrando sesión:', error);
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
                    ⚙️ Dashboard Admin
                </a>
                <button class="nav-btn auth-btn logout-btn" onclick="window.authHeader.logout()">
                    🚪 Cerrar Sesión
                </button>
            `;
        } else {
            // Usuario no autenticado
            authContainer.innerHTML = `
                <a href="login.html" class="nav-btn auth-btn">
                    🔐 Iniciar Sesión
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