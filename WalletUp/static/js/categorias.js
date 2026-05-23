// =====================================================
// Lógica de Categorías
// =====================================================

async function cargarCategorias() {
  try {
    const categorias = await fetchWithAuth(`${API_BASE}/categorias`);
    mostrarCategorias(categorias);
  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarCategorias(categorias) {
  const ingresosContainer = document.getElementById('ingresosContainer');
  const gastosContainer = document.getElementById('gastosContainer');

  const ingresos = categorias.filter(c => c.tipo === 'ingreso');
  const gastos = categorias.filter(c => c.tipo === 'gasto');

  ingresosContainer.innerHTML = ingresos.length === 0
    ? '<p class="text-center text-muted">No hay categorías de ingreso</p>'
    : crearGridCategorias(ingresos);

  gastosContainer.innerHTML = gastos.length === 0
    ? '<p class="text-center text-muted">No hay categorías de gasto</p>'
    : crearGridCategorias(gastos);
}

function crearGridCategorias(categorias) {
  let html = '<div class="row">';

  categorias.forEach(cat => {
    html += `
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-3">
            <div style="width: 40px; height: 40px; background-color: ${cat.color || '#667eea'}; border-radius: 8px;"></div>
            <div class="flex gap-1">
              <button class="btn btn-sm" style="background: #cbd5e0; color: #2d3748; padding: 0.25rem 0.5rem;" onclick="editarCategoria(${cat.id})">✏️</button>
              <button class="btn btn-sm" style="background: #fed7d7; color: #c53030; padding: 0.25rem 0.5rem;" onclick="eliminarCategoria(${cat.id})">🗑️</button>
            </div>
          </div>

          <h4 class="m-0 mb-1">${cat.nombre}</h4>
          <small class="text-muted">Creada: ${formatDate(cat.fecha_creacion)}</small>
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

function mostrarModalCategoria() {
  document.getElementById('formCategoria').reset();
  document.getElementById('color').value = '#667eea';
  document.getElementById('formCategoria').dataset.catId = '';
  document.getElementById('modalCategoria').classList.add('show');
}

async function editarCategoria(id) {
  try {
    const categorias = await fetchWithAuth(`${API_BASE}/categorias`);
    const categoria = categorias.find(c => c.id === id);

    if (!categoria) {
      showAlert('Categoría no encontrada', 'danger');
      return;
    }

    document.getElementById('nombre').value = categoria.nombre;
    document.getElementById('tipo').value = categoria.tipo;
    document.getElementById('color').value = categoria.color || '#667eea';
    document.getElementById('formCategoria').dataset.catId = id;

    document.getElementById('modalCategoria').classList.add('show');
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function guardarCategoria(event) {
  event.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const tipo = document.getElementById('tipo').value;
  const color = document.getElementById('color').value;
  const catId = document.getElementById('formCategoria').dataset.catId;

  if (!nombre || !tipo) {
    showAlert('Completa todos los campos', 'warning');
    return;
  }

  try {
    const isEditing = catId && catId !== '';
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_BASE}/categorias/${catId}` : `${API_BASE}/categorias`;

    await fetchWithAuth(url, {
      method,
      body: JSON.stringify({
        nombre,
        tipo,
        color
      })
    });

    const mensaje = isEditing ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente';
    showAlert(mensaje, 'success');
    cerrarModal('modalCategoria');
    cargarCategorias();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;

  try {
    await fetchWithAuth(`${API_BASE}/categorias/${id}`, { method: 'DELETE' });
    showAlert('Categoría eliminada', 'success');
    cargarCategorias();
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCategorias();
});
