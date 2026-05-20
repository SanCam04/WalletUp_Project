// =====================================================
// Lógica de Educación
// =====================================================

let articulosOriginal = [];

async function cargarArticulos() {
  try {
    const articulos = await fetchWithAuth(`${API_BASE}/educacion`);
    articulosOriginal = articulos;
    mostrarArticulos(articulos);
  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarArticulos(articulos) {
  const container = document.getElementById('articulosContainer');

  if (articulos.length === 0) {
    container.innerHTML = '<p class="text-center text-muted col-4" style="grid-column: span 4;">No hay artículos disponibles aún</p>';
    return;
  }

  let html = '';

  articulos.forEach(a => {
    const contenidoPreview = a.contenido.substring(0, 150) + '...';

    html += `
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-2">
            <h4 class="m-0">${a.titulo}</h4>
            <span class="badge badge-info" style="background-color: #4299e1; color: white;">${a.categoria}</span>
          </div>

          <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">${contenidoPreview}</p>

          <small class="text-muted">Publicado: ${formatDate(a.fecha_creacion)}</small>

          <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="leerArticulo(${a.id}, '${a.titulo}', '${a.contenido.replace(/'/g, "\\'")}')">
              Leer más →
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filtrarArticulos(termino) {
  if (!termino) {
    mostrarArticulos(articulosOriginal);
    return;
  }

  const filtrados = articulosOriginal.filter(a =>
    a.titulo.toLowerCase().includes(termino.toLowerCase()) ||
    a.contenido.toLowerCase().includes(termino.toLowerCase())
  );

  mostrarArticulos(filtrados);
}

function leerArticulo(id, titulo, contenido) {
  document.getElementById('tituloArticulo').textContent = titulo;
  document.getElementById('contenidoArticulo').innerHTML = contenido;
  document.getElementById('modalArticulo').classList.add('show');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  cargarArticulos();
});
