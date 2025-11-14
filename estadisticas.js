// === CONFIGURACIÓN DE SUPABASE ===
const supabaseUrl = "https://wkeqbvgqbdvcewcodday.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXFidmdxYmR2Y2V3Y29kZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjU5ODEsImV4cCI6MjA3NTAwMTk4MX0.7Dv1ePEOBZNWDCjQGBTSvSUh3fhu27q_A1ERmxcvwaU";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

// === FUNCIÓN PRINCIPAL ===
async function cargarEstadisticas() {
  try {
    const { data, error } = await supabaseClient.from("perros_comunitarios").select("*");
    if (error) throw error;

    document.getElementById("totalPerros").textContent = data.length;
    document.getElementById("perrosConFotos").textContent = data.filter(p => p.foto_url).length;

    const zonas = [...new Set(data.map(p => p.zona))];
    document.getElementById("zonasActivas").textContent = zonas.length;

    const edades = data.map(p => parseInt(p.edad)).filter(e => !isNaN(e));
    const edadPromedio = edades.length ? (edades.reduce((a, b) => a + b) / edades.length).toFixed(1) : 0;
    document.getElementById("edadPromedio").textContent = edadPromedio;

    const totalEsterilizados = data.filter(p => p.esterilizado === "Sí").length;
    const totalVacunados = data.filter(p => p.vacunado === "Sí").length;

    document.getElementById("totalEsterilizados").textContent = totalEsterilizados;
    document.getElementById("totalVacunados").textContent = totalVacunados;

    generarGraficos(data);
    inicializarMapa(data);
  } catch (err) {
    console.error("Error al cargar estadísticas:", err);
  }
}

// === GENERAR GRÁFICOS ===
function generarGraficos(data) {
  // Edad
  const gruposEdad = { "0-2 años": 0, "3-7 años": 0, "8+ años": 0, "Sin edad": 0 };
  data.forEach(p => {
    const edad = parseInt(p.edad);
    if (isNaN(edad)) gruposEdad["Sin edad"]++;
    else if (edad <= 2) gruposEdad["0-2 años"]++;
    else if (edad <= 7) gruposEdad["3-7 años"]++;
    else gruposEdad["8+ años"]++;
  });

  new Chart(document.getElementById("chartEdad"), {
    type: "doughnut",
    data: {
      labels: Object.keys(gruposEdad),
      datasets: [{
        data: Object.values(gruposEdad),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#AAAAAA"]
      }]
    }
  });

  // Esterilización
  const datosEsterilizacion = {
    "Sí": data.filter(p => p.esterilizado === "Sí").length,
    "No": data.filter(p => p.esterilizado === "No").length,
    "En proceso": data.filter(p => p.esterilizado === "En proceso").length
  };

  new Chart(document.getElementById("chartEsterilizacion"), {
    type: "doughnut",
    data: {
      labels: Object.keys(datosEsterilizacion),
      datasets: [{
        data: Object.values(datosEsterilizacion),
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"]
      }]
    }
  });

  // Vacunación
  const datosVacunacion = {
    "Sí": data.filter(p => p.vacunado === "Sí").length,
    "No": data.filter(p => p.vacunado === "No").length,
    "En proceso": data.filter(p => p.vacunado === "En proceso").length
  };

  new Chart(document.getElementById("chartVacunacion"), {
    type: "doughnut",
    data: {
      labels: Object.keys(datosVacunacion),
      datasets: [{
        data: Object.values(datosVacunacion),
        backgroundColor: ["#4CAF50", "#F44336", "#FFC107"]
      }]
    }
  });
}

// === MAPA ===
async function inicializarMapa(data) {
  const map = L.map("map").setView([-29.9027, -71.2510], 13); // Coordenadas de La Serena, Chile

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  data.forEach(p => {
    if (p.latitud && p.longitud) {
      L.marker([p.latitud, p.longitud])
        .addTo(map)
        .bindPopup(`<strong>${p.nombre}</strong><br>${p.zona}`);
    }
  });
}

// === EJECUCIÓN AUTOMÁTICA ===
document.addEventListener("DOMContentLoaded", cargarEstadisticas);
