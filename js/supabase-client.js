//instancia de Supabase para toda la aplicación
(function() {
    'use strict';

    // Configuración
    const SUPABASE_URL = 'https://wkeqbvgqbdvcewcodday.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU';

    // Verificar si ya existe una instancia
    if (window.supabaseClient) {
        console.log('✅ Usando instancia existente de Supabase');
        return;
    }

    // Verificar que la librería de Supabase esté cargada
    if (typeof supabase === 'undefined') {
        console.error('❌ Error: La librería de Supabase no está cargada. Asegúrate de incluir el script antes de supabase-client.js');
        return;
    }

    // Crear la instancia única
    const { createClient } = supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    

})();