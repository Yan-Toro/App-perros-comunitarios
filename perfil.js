// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY0Mjc0MDYsImV4cCI6MTkxMTk0MzQwNn0.D1jv5n1bXq4Hkq7bX3jT8KXg1y8K3mJz8nUO3yZ5vXU';

// ✅ CORRECCIÓN: Forma correcta de crear el cliente de Supabase
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === VARIABLES GLOBALES ===
let profileMap = null;
let profileMarker = null;

// === INICIALIZAR MAPA DE PERFIL ===
function initProfileMap(lat, lng, nombre) {
    if (profileMap) {
        profileMap.remove();
    }
    
    profileMap = L.map('profile-map').setView([lat, lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(profileMap);
    
    profileMarker = L.marker([lat, lng]).addTo(profileMap);
    profileMarker.bindPopup(nombre).openPopup();
}

// === OBTENER PERRO POR ID ===
async function obtenerPerroPorId(id) {
    try {
        const { data, error } = await supabaseClient
            .from('perros_comunitarios')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error al obtener perro:', error);
        throw error;
    }
}

// === CARGAR PERFIL ===
async function cargarPerfil() {
    const urlParams = new URLSearchParams(window.location.search);
    const dogId = urlParams.get('id');
    
    if (!dogId) {
        document.getElementById('perfil-section').innerHTML = 
            '<div class="error">❌ ID de perro no proporcionado</div>';
        return;
    }
    
    try {
        const perro = await obtenerPerroPorId(dogId);
        
        if (perro) {
            // Extraer coordenadas
            const coordsMatch = perro.ubicacion.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
            if (coordsMatch) {
                const lng = parseFloat(coordsMatch[1]);
                const lat = parseFloat(coordsMatch[2]);
                
                // Mostrar datos del perro
                document.getElementById('profile-nombre').textContent = perro.nombre;
                document.getElementById('profile-edad').textContent = perro.edad || 'Desconocida';
                document.getElementById('profile-zona').textContent = perro.zona || 'Sin zona';
                document.getElementById('profile-descripcion').textContent = perro.descripcion || 'Sin descripción';
                
                // Mostrar foto si existe
                if (perro.foto_url) {
                    document.getElementById('profile-photo').src = perro.foto_url;
                }
                
                // Inicializar mapa del perfil
                initProfileMap(lat, lng, perro.nombre);
            }
        } else {
            document.getElementById('perfil-section').innerHTML = 
                '<div class="error">❌ Perro no encontrado</div>';
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        document.getElementById('perfil-section').innerHTML = 
            '<div class="error">❌ Error al cargar la información del perro</div>';
    }
}

// === INICIALIZAR APLICACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    cargarPerfil();
});