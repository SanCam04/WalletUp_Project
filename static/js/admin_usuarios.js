// =====================================================
// Lógica de Gestión de Usuarios (Admin)
// =====================================================

async function cargarUsuarios() {
  try {
    const usuarios = await fetchWithAuth(`${API_BASE}/admin/usuarios`);
    mostrarUsuarios(usuarios);
  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarUsuarios(usuarios) {
  const container = document.getElementById('usuariosContainer');

  if (usuarios.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay usuarios registrados</p>';
    return;
  }

  let html = `
    <table class="table">
      <tr style="background: #f7fafc; font-weight: 600;">
        <td>Usuario</td>
        <td>Email</td>
        <td>Rol</td>
        <td>Registrado</td>
        <td style="text-align: center;">Acciones</td>
      </tr>
  `;

  usuarios.forEach(u => {
    const rolColor = u.rol === 'superadmin' ? '#667eea' : '#48bb78';
    const fechaReg = formatDate(u.fecha_registro);

    html += `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge" style="background-color: ${rolColor}; color: white;">${u.rol}</span></td>
        <td>${fechaReg}</td>
        <td style="text-align: center;">
          ${u.bloqueado === 1
            ? `<button class="btn btn-sm" style="background: #48bb78; color: white;" onclick="desbloquearUsuario(${u.id})">🔓 Desbloquear</button>`
            : `<button class="btn btn-sm" style="background: #fed7d7; color: #c53030;" onclick="bloquearUsuario(${u.id})">🔒 Bloquear</button>`
          }
        </td>
      </tr>
    `;
  });

  html += '</table>';
  container.innerHTML = html;
}

function mostrarModalUsuario() {
  document.getElementById('formUsuario').reset();
  document.getElementById('rol').value = 'cliente';
  document.getElementById('modalUsuario').classList.add('show');
}

async function guardarUsuario(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const rol = document.getElementById('rol').value;

  try {
    await fetchWithAuth(`${API_BASE}/admin/usuarios`, {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        rol
      })
    });

    showAlert('Usuario creado exitosamente', 'success');
    cerrarModal('modalUsuario');
    cargarUsuarios();

  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function bloquearUsuario(id) {
  if (!confirm('¿Bloquear este usuario?')) return;

  try {
    await fetchWithAuth(`${API_BASE}/admin/usuarios/${id}/bloquear`, { method: 'PUT' });
    showAlert('Usuario bloqueado', 'success');
    cargarUsuarios();
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

async function desbloquearUsuario(id) {
  if (!confirm('¿Desbloquear este usuario?')) return;

  try {
    await fetchWithAuth(`${API_BASE}/admin/usuarios/${id}/desbloquear`, { method: 'PUT' });
    showAlert('Usuario desbloqueado', 'success');
    cargarUsuarios();
  } catch (error) {
    showAlert('Error: ' + error.message, 'danger');
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

async function cargarBackups() {
  try {
    const backups = await fetchWithAuth(`${API_BASE}/admin/backups`);
    mostrarBackups(backups);
  } catch (error) {
    console.error('Error cargando backups:', error);
  }
}

function mostrarBackups(backups) {
  const container = document.getElementById('backupsContainer');

  if (backups.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay backups realizados aún</p>';
    return;
  }

  let html = `
    <table class="table">
      <tr style="background: #f7fafc; font-weight: 600;">
        <td>Archivo</td>
        <td>Tamaño</td>
        <td>Fecha</td>
        <td style="text-align: center;">Descargar</td>
      </tr>
  `;

  backups.forEach(b => {
    html += `
      <tr>
        <td>${b.nombre}</td>
        <td>${b.tamaño_mb} MB</td>
        <td>${b.fecha}</td>
        <td style="text-align: center;">
          <a href="/api/admin/backup/${b.nombre}" class="btn btn-sm" style="background: #4299e1; color: white; text-decoration: none;">⬇️ Descargar</a>
        </td>
      </tr>
    `;
  });

  html += '</table>';
  container.innerHTML = html;
}

async function crearBackup() {
  const button = event.target;
  button.disabled = true;
  button.textContent = '⏳ Creando backup...';

  try {
    const response = await fetchWithAuth(`${API_BASE}/admin/backup`, { method: 'POST' });

    document.getElementById('backupStatus').style.display = 'block';
    document.getElementById('backupMessage').textContent = `✅ ${response.mensaje} - ${response.archivo}`;

    setTimeout(() => {
      document.getElementById('backupStatus').style.display = 'none';
    }, 5000);

    cargarBackups();
  } catch (error) {
    document.getElementById('backupStatus').style.display = 'block';
    document.getElementById('backupMessage').textContent = `❌ Error: ${error.message}`;
    document.getElementById('backupStatus').className = 'alert alert-danger mb-3';
  } finally {
    button.disabled = false;
    button.textContent = '📥 Crear Backup Ahora';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarios();
  cargarBackups();
});
