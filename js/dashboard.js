// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
const supabaseUrl = 'https://wkeqbvgqbdvcewcodday.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// VARIABLES GLOBALES
// ============================================
let allDogs = [];
let dogToDelete = null;

// ============================================
// VERIFICAR SESIÓN DE ADMIN
// ============================================
async function checkAdminSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error || !session) {
            window.location.href = "login.html";
            return;
        }
        
        loadDogs();
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = "login.html";
    }
}

// ============================================
// LOGOUT
// ============================================
async function logout() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showAlert('Error al cerrar sesión', 'error');
    }
}

// Hacer la función global
window.logout = logout;

// ============================================
// CARGAR PERROS
// ============================================
async function loadDogs() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `<tr><td colspan="6" class="loading">Cargando perros...</td></tr>`;

    try {
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        allDogs = data || [];
        
        console.log('=== PERROS CARGADOS ===');
        console.log('Total de perros:', allDogs.length);
        console.log('IDs en la base de datos:', allDogs.map(d => ({ id: d.id, tipo: typeof d.id, nombre: d.nombre })));
        
        displayDogs(allDogs);
        updateStats();
    } catch (error) {
        console.error('Error cargando perros:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error al cargar perros</td></tr>`;
    }
}

// ============================================
// MOSTRAR PERROS EN TABLA
// ============================================
function displayDogs(perros) {
    const tbody = document.getElementById("tableBody");

    if (!perros || perros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">No hay perros registrados</td></tr>`;
        return;
    }

    // Limpiar contenido anterior
    tbody.innerHTML = '';

    // Crear filas usando createElement para evitar problemas con comillas
    perros.forEach(perro => {
        const tr = document.createElement('tr');
        
        // Columna foto
        const tdFoto = document.createElement('td');
        const img = document.createElement('img');
        img.src = perro.foto_url || 'https://placehold.co/60/e6e6e6/999999?text=🐕';
        img.alt = perro.nombre;
        img.className = 'dog-photo-small';
        img.onerror = function() { this.src = 'https://placehold.co/60/e6e6e6/999999?text=🐕'; };
        tdFoto.appendChild(img);
        
        // Columna nombre
        const tdNombre = document.createElement('td');
        const spanNombre = document.createElement('span');
        spanNombre.className = 'dog-name';
        spanNombre.textContent = perro.nombre;
        tdNombre.appendChild(spanNombre);
        
        // Columna edad
        const tdEdad = document.createElement('td');
        tdEdad.className = 'hide-mobile';
        tdEdad.textContent = perro.edad ? perro.edad + ' año(s)' : 'Desconocida';
        
        // Columna zona
        const tdZona = document.createElement('td');
        const spanZona = document.createElement('span');
        spanZona.className = 'zone-badge';
        spanZona.textContent = perro.zona || 'Sin zona';
        tdZona.appendChild(spanZona);
        
        // Columna descripción
        const tdDesc = document.createElement('td');
        tdDesc.className = 'hide-mobile';
        tdDesc.textContent = perro.descripcion ? perro.descripcion.substring(0, 50) + '...' : '—';
        
        // Columna acciones
        const tdAcciones = document.createElement('td');
        const divButtons = document.createElement('div');
        divButtons.className = 'action-buttons';
        
        // Botón Ver
        const btnVer = document.createElement('button');
        btnVer.className = 'btn-small btn-view';
        btnVer.textContent = '👁️ Ver';
        btnVer.onclick = () => verPerfil(perro.id);
        
        // Botón Editar
        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn-small btn-edit';
        btnEditar.textContent = '✏️ Editar';
        btnEditar.onclick = () => openEditModal(perro.id);
        
        // Botón Eliminar
        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn-small btn-delete';
        btnEliminar.textContent = '🗑️';
        btnEliminar.onclick = () => openDeleteModal(perro.id, perro.nombre);
        
        divButtons.appendChild(btnVer);
        divButtons.appendChild(btnEditar);
        divButtons.appendChild(btnEliminar);
        tdAcciones.appendChild(divButtons);
        
        // Agregar todas las columnas a la fila
        tr.appendChild(tdFoto);
        tr.appendChild(tdNombre);
        tr.appendChild(tdEdad);
        tr.appendChild(tdZona);
        tr.appendChild(tdDesc);
        tr.appendChild(tdAcciones);
        
        tbody.appendChild(tr);
    });
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================
function updateStats() {
    const totalDogs = allDogs.length;
    const zones = [...new Set(allDogs.map(d => d.zona).filter(Boolean))].length;
    const avgAge = totalDogs > 0 
        ? (allDogs.reduce((sum, d) => sum + (d.edad || 0), 0) / totalDogs).toFixed(1)
        : 0;

    document.getElementById("totalDogs").textContent = totalDogs;
    document.getElementById("totalZones").textContent = zones;
    document.getElementById("avgAge").textContent = avgAge;
}

// ============================================
// BÚSQUEDA
// ============================================
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            const filtered = allDogs.filter(perro => 
                perro.nombre.toLowerCase().includes(searchTerm) ||
                (perro.zona && perro.zona.toLowerCase().includes(searchTerm))
            );
            
            displayDogs(filtered);
        });
        console.log('Listener de búsqueda configurado');
    }
}

// ============================================
// MODAL DE EDICIÓN
// ============================================
function openEditModal(dogId) {
    console.log('Abriendo modal de edición para ID:', dogId, 'Tipo:', typeof dogId);
    
    // Comparar IDs como números
    const idNum = typeof dogId === 'number' ? dogId : parseInt(dogId);
    const perro = allDogs.find(d => d.id === idNum);
    
    if (!perro) {
        console.error('Perro no encontrado con ID:', idNum);
        console.error('IDs disponibles:', allDogs.map(d => ({ id: d.id, tipo: typeof d.id })));
        showAlert('Error: Perro no encontrado', 'error');
        return;
    }

    console.log('Perro encontrado:', perro);

    // Rellenar el formulario
    document.getElementById("editId").value = perro.id;
    document.getElementById("editNombre").value = perro.nombre;
    document.getElementById("editEdad").value = perro.edad || '';
    document.getElementById("editZona").value = perro.zona || '';
    document.getElementById("editDescripcion").value = perro.descripcion || '';

    // Mostrar el modal
    document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("show");
    document.getElementById("editForm").reset();
}

// Hacer las funciones globales
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;

// Event listener para el formulario de edición
function setupEditFormListener() {
    const editForm = document.getElementById("editForm");
    
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            console.log('=== INICIANDO ACTUALIZACIÓN ===');

            // CRÍTICO: Convertir el ID a número entero (int8)
            const dogIdRaw = document.getElementById("editId").value;
            const dogId = parseInt(dogIdRaw);
            
            console.log('ID raw del input:', dogIdRaw, 'Tipo:', typeof dogIdRaw);
            console.log('ID convertido a int:', dogId, 'Tipo:', typeof dogId);
            
            // Verificar si el perro existe en allDogs
            const perroEnMemoria = allDogs.find(d => d.id === dogId);
            console.log('Perro en memoria (allDogs):', perroEnMemoria);
            
            if (!perroEnMemoria) {
                console.error('⚠️ ADVERTENCIA: El perro con ID', dogId, 'no está en allDogs');
                console.log('IDs disponibles en allDogs:', allDogs.map(d => d.id));
            }
            
            const updates = {
                nombre: document.getElementById("editNombre").value,
                edad: document.getElementById("editEdad").value ? parseInt(document.getElementById("editEdad").value) : null,
                zona: document.getElementById("editZona").value,
                descripcion: document.getElementById("editDescripcion").value
            };

            console.log('Datos a actualizar:', updates);

            try {
                console.log('Enviando actualización a Supabase...');
                console.log('Query: UPDATE perros_comunitarios SET ... WHERE id =', dogId);
                
                // Primero verificar si el registro existe
                const { data: checkData, error: checkError } = await supabaseClient
                    .from("perros_comunitarios")
                    .select("id, nombre")
                    .eq("id", dogId);
                
                console.log('Verificación previa - Registro existe?:', checkData);
                
                if (checkError) {
                    console.error('Error en verificación:', checkError);
                }
                
                if (!checkData || checkData.length === 0) {
                    throw new Error(`No existe un perro con ID ${dogId} en la base de datos`);
                }
                
                // Si existe, proceder con la actualización
                const { data, error } = await supabaseClient
                    .from("perros_comunitarios")
                    .update(updates)
                    .eq("id", dogId)
                    .select();

                console.log('Respuesta de actualización:', { data, error });

                if (error) {
                    console.error('Error de Supabase:', error);
                    throw error;
                }

                if (!data || data.length === 0) {
                    console.error('No se actualizó ningún registro. ID:', dogId);
                    throw new Error('No se pudo actualizar el perro');
                }

                console.log('✅ Perro actualizado exitosamente:', data);
                
                showAlert("✅ Perro actualizado correctamente", "success");
                closeEditModal();
                await loadDogs();

            } catch (error) {
                console.error('❌ Error en el catch:', error);
                showAlert("❌ Error al actualizar el perro: " + error.message, "error");
            }
        });
        
        console.log('Event listener del formulario de edición registrado');
    } else {
        console.error('No se encontró el formulario editForm');
    }
}

// ============================================
// MODAL DE ELIMINACIÓN
// ============================================
function openDeleteModal(dogId, dogName) {
    console.log('Abriendo modal de eliminación para:', dogId, dogName);
    
    dogToDelete = dogId;
    document.getElementById("deleteDogName").textContent = dogName;
    document.getElementById("deleteModal").classList.add("show");
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.remove("show");
    dogToDelete = null;
}

async function confirmDelete() {
    if (!dogToDelete) {
        console.error('No hay perro seleccionado para eliminar');
        return;
    }

    // CRÍTICO: Convertir el ID a número entero (int8)
    const dogId = parseInt(dogToDelete);
    console.log('Eliminando perro con ID:', dogId, 'Tipo:', typeof dogId);

    try {
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .delete()
            .eq("id", dogId)
            .select();

        console.log('Respuesta de eliminación:', { data, error });

        if (error) throw error;

        if (!data || data.length === 0) {
            console.error('No se eliminó ningún registro. Verificar ID:', dogId);
            throw new Error('No se encontró el perro en la base de datos');
        }

        console.log('Perro eliminado:', data);

        showAlert("✅ Perro eliminado correctamente", "success");
        closeDeleteModal();
        loadDogs();

    } catch (error) {
        console.error('Error eliminando perro:', error);
        showAlert("❌ Error al eliminar el perro: " + error.message, "error");
    }
}

// Hacer las funciones globales
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;

// ============================================
// VER PERFIL
// ============================================
function verPerfil(dogId) {
    window.location.href = `perfil.html?id=${dogId}`;
}

window.verPerfil = verPerfil;

// ============================================
// ALERTAS
// ============================================
function showAlert(message, type) {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.className = `alert ${type} show`;
    
    setTimeout(() => {
        alertBox.className = "alert";
    }, 5000);
    
    // Scroll al inicio para ver la alerta
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// CERRAR MODALES AL HACER CLIC FUERA
// ============================================
function setupModalCloseListeners() {
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                closeEditModal();
            }
        });
    }

    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                closeDeleteModal();
            }
        });
    }
    
    console.log('Listeners de cierre de modales configurados');
}

// ============================================
// INICIALIZACIÓN
// ============================================
console.log('Inicializando dashboard...');

// Función de inicialización principal
function initDashboard() {
    console.log('DOM cargado, configurando listeners...');
    
    // Configurar todos los event listeners
    setupSearchListener();
    setupEditFormListener();
    setupModalCloseListeners();
    
    console.log('Iniciando verificación de sesión...');
    checkAdminSession();
}

// Verificar que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}