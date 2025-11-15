// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = "https://wkeqbvgqbdvcewcodday.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU";

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

  profileMap = L.map("profile-map").setView([lat, lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(profileMap);

  profileMarker = L.marker([lat, lng]).addTo(profileMap);
  profileMarker.bindPopup(nombre).openPopup();
}

// === OBTENER PERRO POR ID ===
async function obtenerPerroPorId(id) {
  try {
    const { data, error } = await supabaseClient
      .from("perros_comunitarios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error al obtener perro:", error);
    throw error;
  }
}

// === CARGAR PERFIL ===
async function cargarPerfil() {
  try {
    // ✅ Obtener el parámetro "id" desde la URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      console.error("❌ No se encontró el parámetro 'id' en la URL.");
      document.getElementById("profile-message").textContent = "No se encontró el ID del perro.";
      return;
    }

    // ✅ Obtener datos desde Supabase
    const perro = await obtenerPerroPorId(id);

    if (!perro) {
      console.error("❌ No se encontró el perro con el ID:", id);
      document.getElementById("profile-message").textContent = "No se encontró el perro.";
      return;
    }

    // ✅ Rellenar los datos del perfil
    document.getElementById("profile-nombre").textContent = perro.nombre || "Sin nombre";
    document.getElementById("profile-edad").textContent = perro.edad || "Desconocida";
    document.getElementById("profile-zona").textContent = perro.zona || "Sin zona";
    document.getElementById("profile-descripcion").textContent = perro.descripcion || "Sin descripción";

    // ✅ Imagen del perro
    const img = document.getElementById("profile-photo");
    img.src = perro.foto_url || "https://placehold.co/200x200/e6e6e6/999999?text=Sin+Foto";
    img.alt = perro.nombre || "Perro comunitario";

    // ✅ Mostrar mapa si hay coordenadas
    if (perro.lat && perro.lng) {
      const map = L.map('profile-map').setView([perro.lat, perro.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      L.marker([perro.lat, perro.lng]).addTo(map)
        .bindPopup(`<b>${perro.nombre || 'Perro comunitario'}</b>`)
        .openPopup();
    } else {
      document.getElementById("profile-message").textContent = "No hay coordenadas para mostrar en el mapa.";
    }

    console.log("✅ Perfil cargado correctamente:", perro);

  } catch (error) {
    console.error("Error al cargar perfil:", error);
    document.getElementById("profile-message").textContent = "Error al cargar el perfil.";
  }
}

// Ejecutar al cargar la página
window.addEventListener("DOMContentLoaded", cargarPerfil);

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    const profilePhoto = document.getElementById("profile-photo");
    const closeBtn = document.querySelector(".close");

    // abrir modal al hacer clic
    profilePhoto.onclick = function () {
        modal.style.display = "block";
        modalImg.src = this.src;
    };

    // cerrar modal 
    closeBtn.onclick = function () {
        modal.style.display = "none";
    };
});
