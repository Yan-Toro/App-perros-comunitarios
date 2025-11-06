// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU'; // reemplaza por tu anon key
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === VARIABLES GLOBALES ===
let map = null;
let marker = null;

// === INICIALIZAR MAPA ===
function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('#map no encontrado');
        return;
    }

    map = L.map('map').setView([-29.9027, -71.2520], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function(e) {
        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
        marker.bindPopup("Ubicación del perro").openPopup();
    });
}

// === SUBIR FOTO (Storage) ===
async function subirFoto(file) {
    if (!file) return null;

    
    const BUCKET = 'mapegados_img'; // <- cambia si tu bucket se llama distinto
    const fileName = `perros/${Date.now()}_${file.name}`;

    // Subir archivo
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error('Error al subir foto:', uploadError);
        throw uploadError;
    }

    // Obtener URL pública
    const { data: publicData, error: publicError } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

    if (publicError) {
        console.error('Error al obtener publicUrl:', publicError);
        throw publicError;
    }

    return publicData.publicUrl;
}

// === REGISTRAR PERRO ===
async function registrarPerro(nombre, edad, zona, descripcion, lat, lng, fotoUrl) {
    const TABLE = 'perros_comunitarios'; // <- ajusta si tu tabla tiene otro nombre
    const payload = {
        nombre,
        edad: edad ? parseInt(edad) : null,
        zona,
        descripcion,
        foto_url: fotoUrl,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null
    };

    const { data, error } = await supabaseClient
        .from(TABLE)
        .insert([payload])
        .select();

    if (error) {
        console.error('Error al registrar perro:', error);
        throw error;
    }

    return (data && data[0]) ? data[0].id : null;
}

// === VISTA PREVIA FOTO ===
document.getElementById('foto')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = document.getElementById('photo-preview');
            if (img) {
                img.src = evt.target.result;
                img.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
});

// === ENVÍO FORM ===
document.getElementById('dogForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!marker) {
        showMessage('form-message', 'Por favor haz clic en el mapa para marcar la ubicación del perro', 'error');
        return;
    }

    const nombre = document.getElementById('nombre').value;
    const edad = document.getElementById('edad').value;
    const zona = document.getElementById('zona').value;
    const descripcion = document.getElementById('descripcion').value;
    const fotoFile = document.getElementById('foto').files[0];
    const lat = marker.getLatLng().lat;
    const lng = marker.getLatLng().lng;

    showMessage('form-message', 'Subiendo datos...', 'loading');

    try {
        // Subir foto (si existe)
        let fotoUrl = null;
        if (fotoFile) {
            showMessage('form-message', 'Subiendo foto...', 'loading');
            fotoUrl = await subirFoto(fotoFile);
        }

        showMessage('form-message', 'Registrando perro...', 'loading');
        const dogId = await registrarPerro(nombre, edad, zona, descripcion, lat, lng, fotoUrl);

        // Mensaje de éxito - muestra enlace al perfil (opcional)
        if (dogId) {
            const profileUrl = `${window.location.origin}/perfil.html?id=${dogId}`;
            showMessage('form-message', `Perro registrado! <a href="${profileUrl}">Ver perfil</a>`, 'success');
        } else {
            showMessage('form-message', 'Perro registrado!', 'success');
        }

        // limpiar formulario
        document.getElementById('dogForm').reset();
        const imgPrev = document.getElementById('photo-preview');
        if (imgPrev) imgPrev.style.display = 'none';
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }

    } catch (error) {
        console.error('Error:', error);
        // Mensaje amigable según error
        if (error && error.message) {
            showMessage('form-message', `Error: ${error.message}`, 'error');
        } else {
            showMessage('form-message', 'Error al registrar el perro. Por favor intenta nuevamente.', 'error');
        }
    }
});

// === UTIL: mostrar mensajes ===
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = `<div class="${type}">${message}</div>`;

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

// === INICIALIZAR APLICACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('map')) {
        initMap();
    } else {
        console.error('#map no encontrado en el DOM');
    }
});
