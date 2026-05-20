// =====================================================
// Lógica de Reportes
// =====================================================

let chartGastos = null;

async function cargarReportes() {
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;

  const params = new URLSearchParams();
  if (fechaInicio) params.append('fecha_inicio', fechaInicio);
  if (fechaFin) params.append('fecha_fin', fechaFin);

  const url = `${API_BASE}/reportes/resumen${params.toString() ? '?' + params : ''}`;

  try {
    const [resumen, gastosPorCategoria] = await Promise.all([
      fetchWithAuth(url),
      fetchWithAuth(`${API_BASE}/reportes/gastos-por-categoria`)
    ]);

    actualizarResumen(resumen);
    actualizarGraficoGastos(resumen.gasto_por_categoria || gastosPorCategoria);
    mostrarTopCategorias(gastosPorCategoria);

  } catch (error) {
    showAlert('Error al cargar reportes: ' + error.message, 'danger');
  }
}

function actualizarResumen(resumen) {
  document.getElementById('reporteIngresos').textContent = formatMoney(resumen.ingresos);
  document.getElementById('reporteGastos').textContent = formatMoney(resumen.gastos);
  document.getElementById('reporteBalance').textContent = formatMoney(resumen.balance);
}

function actualizarGraficoGastos(datos) {
  const ctx = document.getElementById('chartGastosPie').getContext('2d');

  const labels = datos.map(d => d.nombre);
  const values = datos.map(d => d.total);

  if (chartGastos) chartGastos.destroy();

  chartGastos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#667eea', '#764ba2', '#f093fb', '#4facfe',
          '#43e97b', '#fa709a', '#fee140', '#30b0fe'
        ]
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
}

function mostrarTopCategorias(datos) {
  const container = document.getElementById('topCategorias');

  if (datos.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay datos disponibles</p>';
    return;
  }

  let html = '<table class="table"><tr style="background: #f7fafc; font-weight: 600;"><td>Categoría</td><td style="text-align: right;">Monto</td><td style="text-align: right;">Porcentaje</td></tr>';

  const total = datos.reduce((sum, d) => sum + (d.total || 0), 0);

  datos.sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 10).forEach(d => {
    const porcentaje = total > 0 ? ((d.total / total) * 100).toFixed(1) : 0;
    html += `<tr><td>${d.nombre}</td><td style="text-align: right;">${formatMoney(d.total)}</td><td style="text-align: right;">${porcentaje}%</td></tr>`;
  });

  html += '</table>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fechaInicio').valueAsDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  document.getElementById('fechaFin').valueAsDate = new Date();

  cargarReportes();
});
