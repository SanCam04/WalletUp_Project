// =====================================================
// Utilidades Globales
// =====================================================

const API_BASE = '/api';

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;
  alert.innerHTML = `
    ${message}
    <span class="alert-close" onclick="this.parentElement.remove()">×</span>
  `;
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alert);

  setTimeout(() => {
    if (alert.parentElement) alert.remove();
  }, 5000);
}

function formatMoney(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function fetchWithAuth(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error en la solicitud');
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

function getUserFromStorage() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setUserInStorage(user) {
  localStorage.setItem('user', JSON.stringify(user));
  updateUserDisplay();
}

function clearUserStorage() {
  localStorage.removeItem('user');
}

function updateUserDisplay() {
  const user = getUserFromStorage();
  const usuarioNombreElements = document.querySelectorAll('#usuarioNombre');
  usuarioNombreElements.forEach(el => {
    el.textContent = user?.username || 'Usuario';
  });
}

function checkAuth() {
  const user = getUserFromStorage();
  updateUserDisplay();
  return true;
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function createLoadingSpinner() {
  return '<div class="spinner show"></div>';
}

document.addEventListener('DOMContentLoaded', () => {
  updateUserDisplay();
});
