

// Variables globales
let statsMap = null;
let statsMarkers = [];
let edadChart = null;
let zonaChart = null;

// === INICIALIZAR MAPA DE ESTADÍSTICAS ===
function initStatsMap() {
    if (statsMap) {
        statsMap.remove();
    }

    statsMap = L.map('stats-map').setView([-29.9027, -71.2520], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(statsMap);
}

// === OBTENER TODOS LOS PERROS PARA ESTADÍSTICAS ===
async function obtenerPerrosParaEstadisticas() {
        try {
            const { data, error } = await supabaseClient
                .from('perros_comunitarios')
                .select('*')
                .eq('verificado', 'aceptado') // NUEVO: Solo perros aceptados
                .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al obtener perros para estadísticas:', error);
        throw error;
    }
}

// === CALCULAR ESTADÍSTICAS ===
function calcularEstadisticas(perros) {
    // Total de perros
    const totalPerros = perros.length;

    // Perros con fotos
    const perrosConFoto = perros.filter(p => p.foto_url).length;

    // Zonas únicas
    const zonasUnicas = [...new Set(perros.map(p => p.zona).filter(Boolean))];
    const zonasActivas = zonasUnicas.length;

    // Edad promedio
    const perrosConEdad = perros.filter(p => p.edad !== null);
    const edadPromedio = perrosConEdad.length > 0
        ? Math.round(perrosConEdad.reduce((sum, p) => sum + p.edad, 0) / perrosConEdad.length)
        : 0;

    // Distribución por rangos de edad
    const distribucionEdad = {
        '0-2 años': perros.filter(p => p.edad >= 0 && p.edad <= 2).length,
        '3-7 años': perros.filter(p => p.edad >= 3 && p.edad <= 7).length,
        '8+ años': perros.filter(p => p.edad >= 8).length,
        'Sin edad': perros.filter(p => p.edad === null).length
    };

    // Conteo por zona
    const zonasCount = {};
    perros.forEach(p => {
        if (p.zona) {
            zonasCount[p.zona] = (zonasCount[p.zona] || 0) + 1;
        }
    });

    // Top 10 zonas
    const topZonas = Object.entries(zonasCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return {
        totalPerros,
        perrosConFoto,
        zonasActivas,
        edadPromedio,
        distribucionEdad,
        topZonas,
        todosPerros: perros
    };
}

// === RENDERIZAR ESTADÍSTICAS NUMÉRICAS ===
function renderizarEstadisticasNumericas(stats) {
    document.getElementById('total-perros').textContent = stats.totalPerros;
    document.getElementById('perros-con-foto').textContent = stats.perrosConFoto;
    document.getElementById('zonas-activas').textContent = stats.zonasActivas;
    document.getElementById('edad-promedio').textContent = stats.edadPromedio;
}

// === CREAR GRÁFICO DE EDAD ===
function crearGraficoEdad(distribucionEdad) {
    const ctx = document.getElementById('edad-chart').getContext('2d');

    // Destruir gráfico anterior si existe
    if (edadChart) {
        edadChart.destroy();
    }

    edadChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(distribucionEdad),
            datasets: [{
                data: Object.values(distribucionEdad),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed * 100) / total);
                            return `${context.label}: ${context.parsed} perros (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// === CREAR GRÁFICO DE ZONAS ===
function crearGraficoZonas(topZonas) {
    const ctx = document.getElementById('zona-chart').getContext('2d');

    // Destruir gráfico anterior si existe
    if (zonaChart) {
        zonaChart.destroy();
    }

    const zonas = topZonas.map(([zona]) => zona);
    const cantidades = topZonas.map(([, cantidad]) => cantidad);

    //  CORRECCIÓN: Sintaxis correcta de Chart.js
    zonaChart = new Chart(ctx, {
        type: 'bar',
        data: {  // ← ¡Propiedad "data" agregada!
            labels: zonas,
            datasets: [{
                label: 'Número de perros',
                data: cantidades,  // ← ¡Propiedad "data" agregada!
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}


// === RENDERIZAR MAPA DE ESTADÍSTICAS ===
function renderizarMapaEstadisticas(perros) {
    initStatsMap();

    // Limpiar marcadores anteriores
    if (statsMarkers && statsMarkers.length > 0) {
        statsMarkers.forEach(marker => {
            if (statsMap.hasLayer(marker)) {
                statsMap.removeLayer(marker);
            }
        });
    }
    statsMarkers = [];

    // Agregar marcadores
    perros.forEach(perro => {
        if (perro.lat && perro.lng) {
            const marker = L.marker([perro.lat, perro.lng]).addTo(statsMap);
            marker.bindPopup(`
                <div style="text-align: center;">
                    <strong>${perro.nombre}</strong><br>
                    ${perro.zona || ''}<br>
                    Edad: ${perro.edad ? perro.edad + ' años' : 'Desconocida'}
                </div>
            `);
            statsMarkers.push(marker);
        }
    });

    // Ajustar vista al conjunto de marcadores
    if (statsMarkers.length > 0) {
        const group = new L.featureGroup(statsMarkers);
        statsMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// === CARGAR Y RENDERIZAR ESTADÍSTICAS ===
async function cargarEstadisticas() {
    try {
        document.getElementById('stats-loading').style.display = 'block';
        document.getElementById('stats-content').style.display = 'none';
        document.getElementById('stats-error').style.display = 'none';

        // Obtener datos
        const perros = await obtenerPerrosParaEstadisticas();
        const stats = calcularEstadisticas(perros);

        // Renderizar todo
        renderizarEstadisticasNumericas(stats);
        crearGraficoEdad(stats.distribucionEdad);
        crearGraficoZonas(stats.topZonas);
        renderizarMapaEstadisticas(stats.todosPerros);

        // Mostrar contenido
        document.getElementById('stats-loading').style.display = 'none';
        document.getElementById('stats-content').style.display = 'block';

    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        document.getElementById('stats-loading').style.display = 'none';
        document.getElementById('stats-error').style.display = 'block';
    }
}

// === INICIALIZAR APLICACIÓN ===
document.addEventListener('DOMContentLoaded', function () {
    cargarEstadisticas();
});