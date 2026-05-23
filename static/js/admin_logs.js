// =====================================================
// Lógica de Auditoría (Admin)
// =====================================================

async function cargarLogs() {
  try {
    const logs = await fetchWithAuth(`${API_BASE}/admin/logs`);
    mostrarLogs(logs);
  } catch (error) {
    showAlert('Error al cargar auditoría: ' + error.message, 'danger');
  }
}

function mostrarLogs(logs) {
  const container = document.getElementById('logsContainer');
  const filtro = document.getElementById('filtroUsuario').value.toLowerCase();

  let logsFiltrados = logs;
  if (filtro) {
    logsFiltrados = logs.filter(log => log.usuario.toLowerCase().includes(filtro));
  }

  if (logsFiltrados.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay registros de auditoría</p>';
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="table">
        <tr style="background: #f7fafc; font-weight: 600;">
          <td>Fecha</td>
          <td>Usuario</td>
          <td>Acción</td>
        </tr>
  `;

  logsFiltrados.forEach(log => {
    const fecha = new Date(log.fecha);
    const fechaFormato = fecha.toLocaleDateString('es-ES') + ' ' + fecha.toLocaleTimeString('es-ES');

    html += `
      <tr>
        <td style="font-size: 0.9rem;">${fechaFormato}</td>
        <td><strong>${log.usuario}</strong></td>
        <td>${log.accion}</td>
      </tr>
    `;
  });

  html += '</table></div>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  cargarLogs();

  // Filtro en tiempo real
  document.getElementById('filtroUsuario').addEventListener('input', () => {
    cargarLogs();
  });
});
