const API_BASE = '/api';

function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

function mostrarAlerta(mensaje, tipo = 'info') {
  const container = document.getElementById('alertContainer');
  if (!container) return;

  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.setAttribute('role', 'alert');
  alerta.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(alerta);

  setTimeout(() => {
    if (alerta.parentElement) {
      alerta.remove();
    }
  }, 5000);
}

function showAlert(mensaje, tipo = 'info') {
  mostrarAlerta(mensaje, tipo);
}

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la solicitud');
  }

  return response.json();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES');
}

function formatMoney(amount) {
  if (!amount) return '$0.00';
  return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

window.onclick = function(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  });
}
