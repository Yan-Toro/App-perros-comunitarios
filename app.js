// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY0Mjc0MDYsImV4cCI6MTkxMTk0MzQwNn0.D1jv5n1bXq4Hkq7bX3jT8KXg1y8K3mJz8nUO3yZ5vXU';

//  CORRECCIÓN: Forma correcta de crear el cliente de Supabase
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// === VARIABLES GLOBALES ===
let map = null;
let marker = null;

// === INICIALIZAR MAPA DE REGISTRO ===
function initMap() {
    // Verificar que el elemento existe
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error(' Elemento #map no encontrado');
        return;
    }
    
    map = L.map('map').setView([-33.45694, -70.64827], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    map.on('click', function(e) {
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker(e.latlng).addTo(map);
        marker.bindPopup("Ubicación del perro").openPopup();
    });
}

// === SUBIR FOTO A SUPABASE STORAGE ===
async function subirFoto(file) {
    if (!file) return null;
    
    const fileName = `perros/${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
        .from('perros-fotos')
        .upload(fileName, file);
    
    if (error) {
        console.error('Error al subir foto:', error);
        return null;
    }
    
    const { publicUrl } = supabaseClient.storage
        .from('perros-fotos')
        .getPublicUrl(fileName);
    
    return publicUrl;
}

// === REGISTRAR PERRO EN SUPABASE ===
async function registrarPerro(nombre, edad, zona, descripcion, lat, lng, fotoUrl) {
    try {
        const { data, error } = await supabaseClient
            .from('"perros-comunitario"')
            .insert([
                {
                    nombre: nombre,
                    edad: parseInt(edad),
                    zona: zona,
                    descripcion: descripcion,
                    foto_url: fotoUrl,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                }
            ])
            .select();
        
        if (error) {
            throw error;
        }
        
        return data[0].id;
    } catch (error) {
        console.error('Error al registrar perro:', error);
        throw error;
    }
}

// === MANEJAR VISTA PREVIA DE FOTO ===
document.getElementById('foto')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photo-preview').src = e.target.result;
            document.getElementById('photo-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// === MANEJAR ENVÍO DEL FORMULARIO ===
document.getElementById('dogForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!marker) {
        showMessage('form-message', ' Por favor haz clic en el mapa para marcar la ubicación del perro', 'error');
        return;
    }
    
    const nombre = document.getElementById('nombre').value;
    const edad = document.getElementById('edad').value;
    const zona = document.getElementById('zona').value;
    const descripcion = document.getElementById('descripcion').value;
    const fotoFile = document.getElementById('foto').files[0];
    const lat = marker.getLatLng().lat;
    const lng = marker.getLatLng().lng;
    
    // Mostrar mensaje de carga
    showMessage('form-message', '  Subiendo datos...', 'loading');
    
    try {
        // Subir foto si existe
        let fotoUrl = null;
        if (fotoFile) {
            showMessage('form-message', '  Subiendo foto...', 'loading');
            fotoUrl = await subirFoto(fotoFile);
        }
        
        // Registrar en Supabase
        showMessage('form-message', '  Registrando perro...', 'loading');
        const dogId = await registrarPerro(nombre, edad, zona, descripcion, lat, lng, fotoUrl);
        
        // Generar URL del perfil
        const currentUrl = window.location.origin + '/perfil.html';
        const profileUrl = `${currentUrl}?id=${dogId}`;
        
        // Mostrar QR
        mostrarQR(profileUrl);
        
        // Limpiar formulario
        document.getElementById('dogForm').reset();
        document.getElementById('photo-preview').style.display = 'none';
        if (marker) {
            map.removeLayer(marker);
            marker = null;
        }
        
        showMessage('form-message', ' Perro registrado exitosamente!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('form-message', ' Error al registrar el perro. Por favor intenta nuevamente.', 'error');
    }
});

// === MOSTRAR MENSAJES ===
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="${type}">${message}</div>`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            element.innerHTML = '';
        }, 5000);
    }
}

// === GENERAR Y MOSTRAR QR ===
function mostrarQR(url) {
    document.getElementById('qrResult').style.display = 'block';
    document.getElementById('registro-section').scrollIntoView({ behavior: 'smooth' });
    
    QRCode.toCanvas(document.getElementById('qrcode'), url, {
        width: 200,
        height: 200
    }, function (error) {
        if (error) console.error(error);
    });
}

// === RESETEAR FORMULARIO ===
function resetForm() {
    document.getElementById('qrResult').style.display = 'none';
    document.getElementById('dogForm').reset();
    document.getElementById('photo-preview').style.display = 'none';
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
}

// === INICIALIZAR APLICACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que el elemento #map existe antes de inicializar
    if (document.getElementById('map')) {
        initMap();
    } else {
        console.error(' Elemento #map no encontrado en el DOM');
    }
});