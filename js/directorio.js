        // === CONFIGURACIÓN DE SUPABASE ===
        const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co'; // Sin espacios al final!
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU';

        //  CORRECCIÓN: Usar createClient correctamente
        const { createClient } = supabase;
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

        // Variables globales
        let directoryMap = null;
        let mapMarkers = []; //  Inicializar como array vacío

        // === INICIALIZAR MAPA DEL DIRECTORIO ===
        function initDirectoryMap() {
            if (directoryMap) {
                directoryMap.remove();
            }

            directoryMap = L.map('directory-map').setView([-33.45694, -70.64827], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(directoryMap);
        }

        // === OBTENER TODOS LOS PERROS ===
        async function obtenerTodosLosPerros() {
            try {
                const { data, error } = await supabaseClient
                    .from('perros_comunitarios')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Error al obtener perros:', error);
                throw error;
            }
        }

        // === RENDERIZAR GALERÍA DE PERROS ===
        function renderizarGaleria(perros) {
            const container = document.getElementById('dogs-container');

            if (perros.length === 0) {
                container.innerHTML = `
                    <div class="no-dogs">
                        <h3> No se encontraron perros</h3>
                        <p>Aún no hay perros registrados en la comunidad.</p>
                    </div>
                `;
                return;
            }

            // Obtener zonas únicas para el filtro (solo si aún no están cargadas)
                const zonaSelect = document.getElementById('search-zone');
                if (zonaSelect.options.length <= 1) {
                const zonasUnicas = [...new Set(perros.map(p => p.zona).filter(Boolean))];
                zonaSelect.innerHTML = '<option value="">Todas las zonas</option>';
                zonasUnicas.forEach(zona => {
                    const option = document.createElement('option');
                    option.value = zona;
                    option.textContent = zona;
                    zonaSelect.appendChild(option);
                });
}
            // Renderizar tarjetas
            container.innerHTML = perros.map(perro => `
                <div class="dog-card">
                    <img src="${perro.foto_url || 'https://placehold.co/400x400/e6e6e6/999999?text=Sin+Foto'}" 
                        alt="${perro.nombre}" class="dog-photo">
                    <div class="dog-info">
                        <h3>${perro.nombre}</h3>
                        <div class="dog-details">
                            <p><strong>Edad:</strong> ${perro.edad ? perro.edad + ' años' : 'Desconocida'}</p>
                            <p><strong>Zona:</strong> ${perro.zona || 'Sin zona'}</p>
                            <p>${perro.descripcion || 'Sin descripción'}</p>
                        </div>
                        <button class="view-profile-btn" onclick="verPerfil('${perro.id}')">
                            Ver Perfil
                        </button>
                         <div class="dog-zone">
                        <img src="img/icono.ubicacion.png" alt="ubicación" class="icono-ubicacion">
                        ${perro.zona || 'Sin zona'}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // === RENDERIZAR MAPA DEL DIRECTORIO ===
        function renderizarMapa(perros) {
            initDirectoryMap();

            // Limpiar marcadores anteriores
            if (mapMarkers && mapMarkers.length > 0) {
                mapMarkers.forEach(marker => {
                    if (directoryMap.hasLayer(marker)) {
                        directoryMap.removeLayer(marker);
                    }
                });
            }
            mapMarkers = [];

            // Agregar marcadores
            perros.forEach(perro => {
                if (perro.lat && perro.lng) {
                    const marker = L.marker([perro.lat, perro.lng]).addTo(directoryMap);
                    marker.bindPopup(`
                        <div style="text-align: center;">
                            <strong>${perro.nombre}</strong><br>
                            ${perro.zona || ''}<br>
                            <button onclick="verPerfil('${perro.id}')" 
                                    style="margin-top: 10px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Ver Perfil
                            </button>
                        </div>
                    `);
                    mapMarkers.push(marker);
                }
            });

            // Ajustar vista al conjunto de marcadores
            if (mapMarkers.length > 0) {
                const group = new L.featureGroup(mapMarkers);
                directoryMap.fitBounds(group.getBounds().pad(0.1));
            }
        }

        
        function filtrarPerros(perros) {
            const nombre = document.getElementById('search-name').value.toLowerCase();
            const zona = document.getElementById('search-zone').value;
            const rangoEdad = document.getElementById('search-age').value;

            return perros.filter(perro => {
                // Filtro por nombre
                if (nombre && !perro.nombre.toLowerCase().includes(nombre)) {
                    return false;
                }

                // Filtro por zona
                if (zona && perro.zona !== zona) {
                    return false;
                }

                // Filtro por edad
                if (rangoEdad && perro.edad !== null) {
                    const edad = perro.edad;
                    if (rangoEdad === '0-2' && (edad < 0 || edad > 2)) {
                        return false;
                    }
                    if (rangoEdad === '3-7' && (edad < 3 || edad > 7)) {
                        return false;
                    }
                    if (rangoEdad === '8+' && edad < 8) {
                        return false;
                    }
                }

                return true;
            });
        }

        // === VER PERFIL DE PERRO ===
        function verPerfil(dogId) {
            window.location.href = `perfil.html?id=${dogId}`;
        }

        // === CAMBIAR PESTAÑA ===
        function switchTab(tab) {
            // Actualizar botones
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // Mostrar contenido
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            if (tab === 'gallery') {
                document.getElementById('gallery-tab').classList.add('active');
                // Cargar perros para la galería si no están cargados
                cargarPerros();
            } else if (tab === 'map') {
                document.getElementById('map-tab').classList.add('active');
                // Cargar perros para el mapa
                cargarPerrosParaMapa();
            }
        }

        // === CARGAR PERROS PARA GALERÍA ===
        async function cargarPerros() {
            try {
                const perros = await obtenerTodosLosPerros();
                const perrosFiltrados = filtrarPerros(perros);

                // Renderizar galería
                renderizarGaleria(perrosFiltrados);

            } catch (error) {
                document.getElementById('dogs-container').innerHTML = `
                    <div class="error" style="grid-column: 1 / -1;">
                         Error al cargar los perros. Por favor intenta nuevamente.
                    </div>
                `;
            }
        }

        // === CARGAR PERROS PARA MAPA ===
        async function cargarPerrosParaMapa() {
            try {
                const perros = await obtenerTodosLosPerros();
                renderizarMapa(perros);
            } catch (error) {
                console.error('Error al cargar perros para mapa:', error);
            }
        }

        // === EVENT LISTENERS PARA FILTROS ===
        document.getElementById('search-name').addEventListener('input', cargarPerros);
        document.getElementById('search-zone').addEventListener('change', cargarPerros);
        document.getElementById('search-age').addEventListener('change', cargarPerros);

        // === INICIALIZAR APLICACIÓN ===
        document.addEventListener('DOMContentLoaded', function () {
            cargarPerros();
        });