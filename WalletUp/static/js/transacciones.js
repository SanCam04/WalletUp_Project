// =====================================================
// Lógica de Transacciones
// =====================================================

let tipoActual = 'gasto';
let categorias = [];

async function cargarTransacciones() {
  try {
    const [trans, cats] = await Promise.all([
      fetchWithAuth(`${API_BASE}/transacciones`),
      fetchWithAuth(`${API_BASE}/categorias`)
    ]);

    categorias = cats;
    mostrarTransacciones(trans);

  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarTransacciones(transacciones) {
  const container = document.getElementById('transaccionesContainer');

  if (transacciones.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay transacciones registradas</p>';
    return;
  }

  let html = `
    <table class="table">
      <tr style="background: #f7fafc; font-weight: 600;">
        <td>Fecha</td>
        <td>Descripción</td>
        <td>Categoría</td>
        <td style="text-align: right;">Monto</td>
        <td style="text-align: center;">Acciones</td>
      </tr>
  `;

  transacciones.forEach(t => {
    const tipoColor = t.tipo === 'ingreso' ? '#48bb78' : '#f56565';
    const tipoSymbol = t.tipo === 'ingreso' ? '+' : '-';

    html += `
      <tr>
        <td>${formatDate(t.fecha)}</td>
        <td>${t.descripcion || 'Sin descripción'}</td>
        <td><span class="badge" style="background: #e2e8f0; color: #2d3748;">${t.categoria_nombre}</span></td>
        <td style="text-align: right; color: ${tipoColor}; font-weight: 600;">${tipoSymbol}${formatMoney(t.monto)}</td>
        <td style="text-align: center;">
          <button class="btn btn-sm" style="background: #cbd5e0; color: #2d3748;" onclick="editarTransaccion(${t.id})">✏️</button>
          <button class="btn btn-sm" style="background: #fed7d7; color: #c53030;" onclick="eliminarTransaccion(${t.id})">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  container.innerHTML = html;
}

function mostrarModalTransaccion(tipo) {
  tipoActual = tipo;
  document.getElementById('fecha').valueAsDate = new Date();

  const catSelect = document.getElementById('categoria');
  catSelect.innerHTML = '<option value="">Selecciona una categoría</option>';

  const catsFiltradas = categorias.filter(c => c.tipo === tipo);
  catsFiltradas.forEach(cat => {
    catSelect.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
  });

  if (catsFiltradas.length === 0) {
    catSelect.innerHTML += '<option value="" disabled>No hay categorías para este tipo</option>';
  }

  document.getElementById('modalTransaccion').classList.add('show');
}

async function guardarTransaccion(event) {
  event.preventDefault();

  const categoria_id = document.getElementById('categoria').value;
  const monto = document.getElementById('monto').value;
  const descripcion = document.getElementById('descripcion').value;
  const fecha = document.getElementById('fecha').value;

  if (!categoria_id) {
    showAlert('Selecciona una categoría', 'warning');
    return;
  }

  try {
    await fetchWithAuth(`${API_BASE}/transacciones`, {
      method: 'POST',
      body: JSON.stringify({
        categoria_id: parseInt(categoria_id),
        monto: parseFloat(monto),
        tipo: tipoActual,
        descripcion,
        fecha
      })
    });

    showAlert('Transacción guardada', 'success');
    cerrarModal('modalTransaccion');
    cargarTransacciones();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Confirmas que quieres eliminar esta transacción?')) return;

  try {
    await fetchWithAuth(`${API_BASE}/transacciones/${id}`, { method: 'DELETE' });
    showAlert('Transacción eliminada', 'success');
    cargarTransacciones();
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  cargarTransacciones();
});
