// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = "https://wkeqbvgqbdvcewcodday.supabase.co";
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// === VARIABLES GLOBALES ===
let map = null;
let statsMap = null;
let marker = null;
let statsMarkers = [];

// === INICIALIZAR MAPA DE REGISTRO ===
function initMap() {
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

// === INICIALIZAR MAPA DE ESTADÍSTICAS ===
function initStatsMap() {
    if (statsMap) {
        statsMap.remove();
    }
    
    statsMap = L.map('stats-map').setView([-33.45694, -70.64827], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(statsMap);
}

// === SUBIR FOTO A SUPABASE STORAGE ===
async function subirFoto(file) {
    if (!file) return null;
    
    const fileName = `perros/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
        .from('perros-fotos')
        .upload(fileName, file);
    
    if (error) {
        console.error('Error al subir foto:', error);
        return null;
    }
    
    const { publicUrl } = supabase.storage
        .from('perros-fotos')
        .getPublicUrl(fileName);
    
    return publicUrl;
}

// === REGISTRAR PERRO EN SUPABASE ===
async function registrarPerro(nombre, edad, zona, descripcion, lat, lng, fotoUrl) {
    try {
        const { data, error } = await supabase
            .from('perros_comunitarios')
            .insert([
                {
                    nombre: nombre,
                    edad: parseInt(edad),
                    zona: zona,
                    descripcion: descripcion,
                    foto_url: fotoUrl,
                    ubicacion: `POINT(${lng} ${lat})`
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

// === OBTENER ESTADÍSTICAS ===
async function obtenerEstadisticas() {
    try {
        // Total de perros
        const { count: totalPerros, error: errorTotal } = await supabase
            .from('perros_comunitarios')
            .select('*', { count: 'exact', head: true });
        
        if (errorTotal) throw errorTotal;
        
        // Perros con fotos
        const { count: perrosConFoto, error: errorFoto } = await supabase
            .from('perros_comunitarios')
            .select('*', { count: 'exact', head: true })
            .not('foto_url', 'is', null);
        
        if (errorFoto) throw errorFoto;
        
        // Zonas únicas
        const { data: zonasData, error: errorZonas } = await supabase
            .from('perros_comunitarios')
            .select('zona');
        
        if (errorZonas) throw errorZonas;
        
        const zonasUnicas = [...new Set(zonasData.map(d => d.zona))];
        const zonasActivas = zonasUnicas.length;
        
        // Edad promedio
        const perrosConEdad = zonasData.filter(d => d.edad !== null);
        const edadPromedio = perrosConEdad.length > 0 
            ? Math.round(perrosConEdad.reduce((sum, d) => sum + d.edad, 0) / perrosConEdad.length)
            : 0;
        
        // Top zonas
        const zonasCount = {};
        zonasData.forEach(d => {
            zonasCount[d.zona] = (zonasCount[d.zona] || 0) + 1;
        });
        
        const topZonas = Object.entries(zonasCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        // Todos los perros para el mapa
        const { data: todosPerros, error: errorTodos } = await supabase
            .from('perros_comunitarios')
            .select('nombre, ubicacion');
        
        if (errorTodos) throw errorTodos;
        
        return {
            totalPerros,
            perrosConFoto,
            zonasActivas,
            edadPromedio,
            topZonas,
            todosPerros
        };
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        throw error;
    }
}

// === MOSTRAR ESTADÍSTICAS ===
async function mostrarEstadisticas() {
    try {
        document.getElementById('stats-loading').style.display = 'block';
        document.getElementById('stats-content').style.display = 'none';
        
        const stats = await obtenerEstadisticas();
        
        // Actualizar números
        document.getElementById('total-perros').textContent = stats.totalPerros;
        document.getElementById('perros-con-foto').textContent = stats.perrosConFoto;
        document.getElementById('zonas-activas').textContent = stats.zonasActivas;
        document.getElementById('edad-promedio').textContent = stats.edadPromedio;
        
        // Actualizar lista de zonas
        const zonasLista = document.getElementById('zonas-lista');
        zonasLista.innerHTML = '';
        stats.topZonas.forEach(([zona, count]) => {
            const div = document.createElement('div');
            div.className = 'zone-item';
            div.innerHTML = `
                <span class="zone-name">${zona}</span>
                <span class="zone-count">${count} perros</span>
            `;
            zonasLista.appendChild(div);
        });
        
        // Inicializar mapa de estadísticas
        initStatsMap();
        
        // Agregar marcadores al mapa
        statsMarkers.forEach(marker => statsMap.removeLayer(marker));
        statsMarkers = [];
        
        stats.todosPerros.forEach(perro => {
            const coordsMatch = perro.ubicacion.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
            if (coordsMatch) {
                const lng = parseFloat(coordsMatch[1]);
                const lat = parseFloat(coordsMatch[2]);
                const marker = L.marker([lat, lng]).addTo(statsMap);
                marker.bindPopup(perro.nombre);
                statsMarkers.push(marker);
            }
        });
        
        document.getElementById('stats-loading').style.display = 'none';
        document.getElementById('stats-content').style.display = 'block';
        
    } catch (error) {
        document.getElementById('stats-loading').innerHTML = 
            '<div class="error">❌ Error al cargar estadísticas</div>';
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
        showMessage('form-message', '⚠️ Por favor haz clic en el mapa para marcar la ubicación del perro', 'error');
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
    showMessage('form-message', ' 📤 Subiendo datos...', 'loading');
    
    try {
        // Subir foto si existe
        let fotoUrl = null;
        if (fotoFile) {
            showMessage('form-message', ' 📸 Subiendo foto...', 'loading');
            fotoUrl = await subirFoto(fotoFile);
        }
        
        // Registrar en Supabase
        showMessage('form-message', ' 🐾 Registrando perro...', 'loading');
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
        
        showMessage('form-message', '✅ Perro registrado exitosamente!', 'success');
        
    } catch (error) {
        console.error('Error detallado:', error);
        showMessage('form-message', '❌ Error al registrar el perro. Por favor intenta nuevamente.', 'error');
        // Re-lanzar el error para debugging
        throw error;
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
    initMap();
});