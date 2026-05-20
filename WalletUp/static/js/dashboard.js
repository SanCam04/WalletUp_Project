// =====================================================
// Lógica del Dashboard
// =====================================================

let chartGastosCategoria = null;
let chartIngresosGastos = null;
let tipoActual = 'gasto';
let categorias = [];

async function cargarDatos() {
  try {
    const resumen = await fetchWithAuth(`${API_BASE}/reportes/resumen`);
    if (!resumen) return;

    const transacciones = await fetchWithAuth(`${API_BASE}/transacciones`);
    if (!transacciones) return;

    const metas = await fetchWithAuth(`${API_BASE}/metas`);
    if (!metas) return;

    actualizarEstadisticas(resumen);
    actualizarGraficos(resumen, transacciones);
    actualizarUltimasTransacciones(transacciones);
    actualizarMetas(metas);

  } catch (error) {
    console.error('Error:', error);
    showAlert('Error al cargar datos: ' + error.message, 'danger');
  }
}

function actualizarEstadisticas(resumen) {
  document.getElementById('ingresos').textContent = formatMoney(resumen.ingresos);
  document.getElementById('gastos').textContent = formatMoney(resumen.gastos);
  document.getElementById('balance').textContent = formatMoney(resumen.balance);
  document.getElementById('metasCount').textContent = '5'; // Placeholder
}

function actualizarGraficos(resumen, transacciones) {
  // Gráfico de gastos por categoría
  const ctxGastos = document.getElementById('chartGastosCategoria').getContext('2d');

  const categorias = resumen.gasto_por_categoria?.map(item => item.nombre) || [];
  const montos = resumen.gasto_por_categoria?.map(item => item.total) || [];
  const colores = resumen.gasto_por_categoria?.map(item => item.color || '#667eea') || [];

  if (chartGastosCategoria) chartGastosCategoria.destroy();

  chartGastosCategoria = new Chart(ctxGastos, {
    type: 'doughnut',
    data: {
      labels: categorias,
      datasets: [{
        data: montos,
        backgroundColor: colores
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // Gráfico de ingresos vs gastos
  const ctxBalance = document.getElementById('chartIngresosGastos').getContext('2d');

  if (chartIngresosGastos) chartIngresosGastos.destroy();

  chartIngresosGastos = new Chart(ctxBalance, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        label: 'Monto',
        data: [resumen.ingresos, resumen.gastos],
        backgroundColor: ['#48bb78', '#f56565']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

function actualizarUltimasTransacciones(transacciones) {
  const container = document.getElementById('ultimasTransacciones');
  const ultimas = transacciones.slice(0, 5);

  if (ultimas.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay transacciones aún</p>';
    return;
  }

  let html = `
    <div class="table">
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; padding: 1rem; background: #f7fafc; font-weight: 600;">
        <div>Descripción</div>
        <div>Categoría</div>
        <div style="text-align: right;">Monto</div>
      </div>
  `;

  ultimas.forEach(t => {
    const tipoColor = t.tipo === 'ingreso' ? '#48bb78' : '#f56565';
    const tipoSymbol = t.tipo === 'ingreso' ? '+' : '-';

    html += `
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; padding: 1rem; border-bottom: 1px solid #e2e8f0; align-items: center;">
        <div>
          <div>${t.descripcion || 'Sin descripción'}</div>
          <small class="text-muted">${formatDate(t.fecha)}</small>
        </div>
        <div>
          <span class="badge" style="background-color: #e2e8f0; color: #2d3748;">${t.categoria_nombre}</span>
        </div>
        <div style="text-align: right; color: ${tipoColor}; font-weight: 600;">
          ${tipoSymbol}${formatMoney(t.monto)}
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function actualizarMetas(metas) {
  const container = document.getElementById('metasContainer');

  if (metas.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No tienes metas creadas</p>';
    return;
  }

  let html = '';

  metas.slice(0, 3).forEach(meta => {
    const porcentaje = (meta.monto_actual / meta.monto_objetivo) * 100;
    const estado = meta.estado === 'completada' ? '✓' : '○';
    const color = porcentaje >= 100 ? '#48bb78' : porcentaje >= 50 ? '#ed8936' : '#cbd5e0';

    html += `
      <div style="margin-bottom: 1.5rem;">
        <div class="flex-between mb-2">
          <div>
            <h4 class="m-0">${meta.nombre}</h4>
            <small class="text-muted">${meta.descripcion}</small>
          </div>
          <span class="badge badge-primary">${estado}</span>
        </div>
        <div style="background-color: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden;">
          <div style="background-color: ${color}; height: 100%; width: ${Math.min(porcentaje, 100)}%; transition: width 0.3s ease;"></div>
        </div>
        <div class="flex-between mt-2" style="font-size: 0.85rem;">
          <span>${formatMoney(meta.monto_actual)} / ${formatMoney(meta.monto_objetivo)}</span>
          <span>${Math.round(Math.min(porcentaje, 100))}%</span>
        </div>
      </div>
    `;
  });

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
    cargarDatos();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

async function cargarCategorias() {
  try {
    categorias = await fetchWithAuth(`${API_BASE}/categorias`);
  } catch (error) {
    console.error('Error cargando categorías:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategorias();
  cargarDatos();
  setInterval(cargarDatos, 30000);
});
