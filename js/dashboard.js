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
let pendingDogs = [];
let acceptedDogs = [];
let dogToDelete = null;
let currentView = 'all'; // 'all', 'pending', 'accepted'

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

window.logout = logout;

// ============================================
// CARGAR PERROS
// ============================================
async function loadDogs() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="loading">Cargando perros...</td></tr>`;

    try {
        // Cargar TODOS los perros (incluyendo pendientes)
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        allDogs = data || [];
        
        // Separar por estado
        pendingDogs = allDogs.filter(d => d.verificado === 'pendiente');
        acceptedDogs = allDogs.filter(d => d.verificado === 'aceptado');
        
        console.log('=== PERROS CARGADOS ===');
        console.log('Total:', allDogs.length);
        console.log('Pendientes:', pendingDogs.length);
        console.log('Aceptados:', acceptedDogs.length);
        
        displayDogs(allDogs);
        updateStats();
    } catch (error) {
        console.error('Error cargando perros:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="no-data">Error al cargar perros</td></tr>`;
    }
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================
function updateStats() {
    const totalDogs = acceptedDogs.length; // Solo contar aceptados
    const zones = [...new Set(acceptedDogs.map(d => d.zona).filter(Boolean))].length;
    const avgAge = acceptedDogs.length > 0 
        ? (acceptedDogs.reduce((sum, d) => sum + (d.edad || 0), 0) / acceptedDogs.length).toFixed(1)
        : 0;

    document.getElementById("totalDogs").textContent = totalDogs;
    document.getElementById("totalZones").textContent = zones;
    document.getElementById("avgAge").textContent = avgAge;
    
    // Actualizar contador de pendientes
    const pendingCount = pendingDogs.length;
    document.getElementById("pendingCount").textContent = pendingCount;
    
    // Resaltar si hay pendientes
    const pendingBadge = document.getElementById("pendingBadge");
    if (pendingBadge) {
        if (pendingCount > 0) {
            pendingBadge.style.display = 'inline-block';
        } else {
            pendingBadge.style.display = 'none';
        }
    }
}

// ============================================
// MOSTRAR PERROS EN TABLA
// ============================================
function displayDogs(perros) {
    const tbody = document.getElementById("tableBody");

    if (!perros || perros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-data">No hay perros en esta categoría</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    perros.forEach(perro => {
        const tr = document.createElement('tr');
        
        // Agregar clase según estado
        if (perro.verificado === 'pendiente') {
            tr.classList.add('pending-row');
        }
        
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
        
        // Columna verificado (NUEVA)
        const tdVerificado = document.createElement('td');
        const spanVerificado = document.createElement('span');
        spanVerificado.className = 'verification-badge';
        
        if (perro.verificado === 'pendiente') {
            spanVerificado.classList.add('pending');
            spanVerificado.textContent = '🟡 Pendiente';
        } else if (perro.verificado === 'aceptado') {
            spanVerificado.classList.add('accepted');
            spanVerificado.textContent = '🟢 Aceptado';
        }
        
        tdVerificado.appendChild(spanVerificado);
        
        // Columna descripción
        const tdDesc = document.createElement('td');
        tdDesc.className = 'hide-mobile';
        tdDesc.textContent = perro.descripcion ? perro.descripcion.substring(0, 50) + '...' : '—';
        
        // Columna acciones
        const tdAcciones = document.createElement('td');
        const divButtons = document.createElement('div');
        divButtons.className = 'action-buttons';
        
        // Si es pendiente, mostrar botones de aprobar/rechazar
        if (perro.verificado === 'pendiente') {
            const btnAceptar = document.createElement('button');
            btnAceptar.className = 'btn-small btn-accept';
            btnAceptar.textContent = '✓ Aceptar';
            btnAceptar.onclick = () => acceptDog(perro.id, perro.nombre);
            
            const btnRechazar = document.createElement('button');
            btnRechazar.className = 'btn-small btn-reject';
            btnRechazar.textContent = '✗ Rechazar';
            btnRechazar.onclick = () => rejectDog(perro.id, perro.nombre);
            
            divButtons.appendChild(btnAceptar);
            divButtons.appendChild(btnRechazar);
        } else {
            // Si ya está aceptado, mostrar botones normales
            const btnVer = document.createElement('button');
            btnVer.className = 'btn-small btn-view';
            btnVer.textContent = '👁️ Ver';
            btnVer.onclick = () => verPerfil(perro.id);
            
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-small btn-edit';
            btnEditar.textContent = '✏️ Editar';
            btnEditar.onclick = () => openEditModal(perro.id);
            
            const btnEliminar = document.createElement('button');
            btnEliminar.className = 'btn-small btn-delete';
            btnEliminar.textContent = '🗑️';
            btnEliminar.onclick = () => openDeleteModal(perro.id, perro.nombre);
            
            divButtons.appendChild(btnVer);
            divButtons.appendChild(btnEditar);
            divButtons.appendChild(btnEliminar);
        }
        
        tdAcciones.appendChild(divButtons);
        
        // Agregar todas las columnas
        tr.appendChild(tdFoto);
        tr.appendChild(tdNombre);
        tr.appendChild(tdEdad);
        tr.appendChild(tdZona);
        tr.appendChild(tdVerificado);
        tr.appendChild(tdDesc);
        tr.appendChild(tdAcciones);
        
        tbody.appendChild(tr);
    });
}

// ============================================
// FILTRAR POR ESTADO
// ============================================
function filterByStatus(status) {
    currentView = status;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Mostrar perros según filtro
    if (status === 'all') {
        displayDogs(allDogs);
    } else if (status === 'pending') {
        displayDogs(pendingDogs);
    } else if (status === 'accepted') {
        displayDogs(acceptedDogs);
    }
}

window.filterByStatus = filterByStatus;

// ============================================
// ACEPTAR PERRO
// ============================================
async function acceptDog(dogId, dogName) {
    if (!confirm(`¿Aprobar el registro de "${dogName}"?\n\nEl perro será visible en el directorio público.`)) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .update({ verificado: 'aceptado' })
            .eq("id", parseInt(dogId))
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('No se pudo actualizar el perro');
        }

        showAlert(`✅ "${dogName}" ha sido aceptado y ahora es visible en el directorio`, 'success');
        loadDogs();

    } catch (error) {
        console.error('Error aceptando perro:', error);
        showAlert('❌ Error al aceptar el perro: ' + error.message, 'error');
    }
}

window.acceptDog = acceptDog;

// ============================================
// RECHAZAR PERRO
// ============================================
async function rejectDog(dogId, dogName) {
    if (!confirm(`¿Rechazar el registro de "${dogName}"?\n\n⚠️ ADVERTENCIA: El perro será eliminado permanentemente de la base de datos.`)) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .delete()
            .eq("id", parseInt(dogId))
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('No se pudo eliminar el perro');
        }

        showAlert(`✅ "${dogName}" ha sido rechazado y eliminado`, 'success');
        loadDogs();

    } catch (error) {
        console.error('Error rechazando perro:', error);
        showAlert('❌ Error al rechazar el perro: ' + error.message, 'error');
    }
}

window.rejectDog = rejectDog;

// ============================================
// BÚSQUEDA
// ============================================
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            let filtered = [];
            if (currentView === 'all') {
                filtered = allDogs;
            } else if (currentView === 'pending') {
                filtered = pendingDogs;
            } else if (currentView === 'accepted') {
                filtered = acceptedDogs;
            }
            
            filtered = filtered.filter(perro => 
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
    
    const idNum = typeof dogId === 'number' ? dogId : parseInt(dogId);
    const perro = allDogs.find(d => d.id === idNum);
    
    if (!perro) {
        console.error('Perro no encontrado con ID:', idNum);
        showAlert('Error: Perro no encontrado', 'error');
        return;
    }

    console.log('Perro encontrado:', perro);

    document.getElementById("editId").value = perro.id;
    document.getElementById("editNombre").value = perro.nombre;
    document.getElementById("editEdad").value = perro.edad || '';
    document.getElementById("editZona").value = perro.zona || '';
    document.getElementById("editDescripcion").value = perro.descripcion || '';

    document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
    document.getElementById("editModal").classList.remove("show");
    document.getElementById("editForm").reset();
}

window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;

function setupEditFormListener() {
    const editForm = document.getElementById("editForm");
    
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const dogId = parseInt(document.getElementById("editId").value);
            const updates = {
                nombre: document.getElementById("editNombre").value,
                edad: document.getElementById("editEdad").value ? parseInt(document.getElementById("editEdad").value) : null,
                zona: document.getElementById("editZona").value,
                descripcion: document.getElementById("editDescripcion").value
            };

            try {
                const { data, error } = await supabaseClient
                    .from("perros_comunitarios")
                    .update(updates)
                    .eq("id", dogId)
                    .select();

                if (error) throw error;

                if (!data || data.length === 0) {
                    throw new Error('No se pudo actualizar el perro');
                }

                showAlert("✅ Perro actualizado correctamente", "success");
                closeEditModal();
                await loadDogs();

            } catch (error) {
                console.error('Error actualizando perro:', error);
                showAlert("❌ Error al actualizar el perro: " + error.message, "error");
            }
        });
        
        console.log('Event listener del formulario de edición registrado');
    }
}

// ============================================
// MODAL DE ELIMINACIÓN
// ============================================
function openDeleteModal(dogId, dogName) {
    dogToDelete = dogId;
    document.getElementById("deleteDogName").textContent = dogName;
    document.getElementById("deleteModal").classList.add("show");
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.remove("show");
    dogToDelete = null;
}

async function confirmDelete() {
    if (!dogToDelete) return;

    const dogId = parseInt(dogToDelete);

    try {
        const { data, error } = await supabaseClient
            .from("perros_comunitarios")
            .delete()
            .eq("id", dogId)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error('No se encontró el perro en la base de datos');
        }

        showAlert("✅ Perro eliminado correctamente", "success");
        closeDeleteModal();
        loadDogs();

    } catch (error) {
        console.error('Error eliminando perro:', error);
        showAlert("❌ Error al eliminar el perro: " + error.message, "error");
    }
}

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

function initDashboard() {
    console.log('DOM cargado, configurando listeners...');
    
    setupSearchListener();
    setupEditFormListener();
    setupModalCloseListeners();
    
    console.log('Iniciando verificación de sesión...');
    checkAdminSession();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}