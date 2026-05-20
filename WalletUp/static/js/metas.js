// =====================================================
// Lógica de Metas
// =====================================================

async function cargarMetas() {
  try {
    const metas = await fetchWithAuth(`${API_BASE}/metas`);
    mostrarMetas(metas);
  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarMetas(metas) {
  const container = document.getElementById('metasContainer');

  if (metas.length === 0) {
    container.innerHTML = '<p class="text-center text-muted col-4" style="grid-column: span 4;">No tienes metas creadas. ¡Crea una!</p>';
    return;
  }

  let html = '';

  metas.forEach(meta => {
    const porcentaje = (meta.monto_actual / meta.monto_objetivo) * 100;
    const color = porcentaje >= 100 ? '#48bb78' : porcentaje >= 50 ? '#ed8936' : '#cbd5e0';
    const estado = meta.estado === 'completada' ? '✓ Completada' : meta.estado === 'cancelada' ? '✗ Cancelada' : 'Activa';
    const estadoColor = meta.estado === 'completada' ? '#48bb78' : meta.estado === 'cancelada' ? '#f56565' : '#4299e1';

    html += `
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-3">
            <h4 class="m-0">${meta.nombre}</h4>
            <span class="badge" style="background-color: ${estadoColor}; color: white;">${estado}</span>
          </div>

          <p class="text-muted" style="margin-bottom: 1rem;">${meta.descripcion || 'Sin descripción'}</p>

          <div style="background-color: #e2e8f0; border-radius: 10px; height: 30px; overflow: hidden; margin-bottom: 1rem;">
            <div style="background: linear-gradient(90deg, ${color}, ${color}); height: 100%; width: ${Math.min(porcentaje, 100)}%; transition: width 0.3s ease;"></div>
          </div>

          <div class="flex-between mb-3">
            <span>${formatMoney(meta.monto_actual)}</span>
            <span style="font-weight: 600;">${Math.round(Math.min(porcentaje, 100))}%</span>
            <span class="text-muted">${formatMoney(meta.monto_objetivo)}</span>
          </div>

          <small class="text-muted">Objetivo: ${formatDate(meta.fecha_objetivo)}</small>

          <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-sm" style="background: #48bb78; color: white;" onclick="mostrarModalAnadir(${meta.id}, '${meta.nombre}')">➕ Añadir</button>
            <button class="btn btn-sm" style="background: #f56565; color: white;" onclick="mostrarModalQuitar(${meta.id}, '${meta.nombre}')">➖ Quitar</button>
            <button class="btn btn-sm" style="background: #cbd5e0; color: #2d3748;" onclick="editarMeta(${meta.id})">✏️ Editar</button>
            <button class="btn btn-sm" style="background: #fed7d7; color: #c53030;" onclick="eliminarMeta(${meta.id})">🗑️ Eliminar</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function mostrarModalMeta() {
  document.getElementById('formMeta').reset();
  document.getElementById('fecha_objetivo').valueAsDate = new Date(new Date().getTime() + 30*24*60*60*1000);
  document.getElementById('modalMeta').classList.add('show');
}

async function guardarMeta(event) {
  event.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const monto_objetivo = document.getElementById('monto_objetivo').value;
  const fecha_objetivo = document.getElementById('fecha_objetivo').value;
  const descripcion = document.getElementById('descripcion').value;

  try {
    await fetchWithAuth(`${API_BASE}/metas`, {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        monto_objetivo: parseFloat(monto_objetivo),
        fecha_objetivo,
        descripcion
      })
    });

    showAlert('Meta creada exitosamente', 'success');
    cerrarModal('modalMeta');
    cargarMetas();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function eliminarMeta(id) {
  if (!confirm('¿Eliminar esta meta?')) return;

  try {
    await fetchWithAuth(`${API_BASE}/metas/${id}`, { method: 'DELETE' });
    showAlert('Meta eliminada', 'success');
    cargarMetas();
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function mostrarModalAnadir(metaId, metaNombre) {
  document.getElementById('metaIdActual').value = metaId;
  document.getElementById('metaNombreActual').textContent = metaNombre;
  document.getElementById('montoAnadir').value = '';
  document.getElementById('modalAnadir').classList.add('show');
}

function mostrarModalQuitar(metaId, metaNombre) {
  document.getElementById('metaIdActualQuitar').value = metaId;
  document.getElementById('metaNombreActualQuitar').textContent = metaNombre;
  document.getElementById('montoQuitar').value = '';
  document.getElementById('modalQuitar').classList.add('show');
}

async function anadirDinero(event) {
  event.preventDefault();

  const metaId = document.getElementById('metaIdActual').value;
  const montoAnadir = parseFloat(document.getElementById('montoAnadir').value);

  if (!montoAnadir || montoAnadir <= 0) {
    showAlert('Ingresa un monto válido', 'warning');
    return;
  }

  try {
    // Obtener la meta actual
    const metas = await fetchWithAuth(`${API_BASE}/metas`);
    const meta = metas.find(m => m.id == metaId);

    if (!meta) {
      showAlert('Meta no encontrada', 'danger');
      return;
    }

    const nuevoMonto = meta.monto_actual + montoAnadir;

    // Actualizar la meta
    await fetchWithAuth(`${API_BASE}/metas/${metaId}`, {
      method: 'PUT',
      body: JSON.stringify({
        monto_actual: nuevoMonto
      })
    });

    showAlert(`¡${formatMoney(montoAnadir)} añadidos a la meta!`, 'success');
    cerrarModal('modalAnadir');
    cargarMetas();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function quitarDinero(event) {
  event.preventDefault();

  const metaId = document.getElementById('metaIdActualQuitar').value;
  const montoQuitar = parseFloat(document.getElementById('montoQuitar').value);

  if (!montoQuitar || montoQuitar <= 0) {
    showAlert('Ingresa un monto válido', 'warning');
    return;
  }

  try {
    // Obtener la meta actual
    const metas = await fetchWithAuth(`${API_BASE}/metas`);
    const meta = metas.find(m => m.id == metaId);

    if (!meta) {
      showAlert('Meta no encontrada', 'danger');
      return;
    }

    const nuevoMonto = Math.max(0, meta.monto_actual - montoQuitar);

    // Actualizar la meta
    await fetchWithAuth(`${API_BASE}/metas/${metaId}`, {
      method: 'PUT',
      body: JSON.stringify({
        monto_actual: nuevoMonto
      })
    });

    showAlert(`¡${formatMoney(montoQuitar)} retirados de la meta!`, 'success');
    cerrarModal('modalQuitar');
    cargarMetas();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  cargarMetas();
});
