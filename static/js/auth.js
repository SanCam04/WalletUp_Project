// =====================================================
// Lógica de Autenticación
// =====================================================

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const submitText = document.getElementById('submitText');
  const loadingSpinner = document.getElementById('loadingSpinner');

  submitBtn.disabled = true;
  submitText.style.display = 'none';
  loadingSpinner.style.display = 'inline-block';

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Error al iniciar sesión', 'danger');
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
      return;
    }

    localStorage.setItem('user', JSON.stringify({
      usuario_id: data.usuario_id,
      username: data.username,
      rol: data.rol
    }));

    showAlert('¡Bienvenido!', 'success');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);

  } catch (error) {
    showAlert(error.message, 'danger');
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    loadingSpinner.style.display = 'none';
  }
}

async function handleRegistro(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('passwordConfirm').value;
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const submitText = document.getElementById('submitText');
  const loadingSpinner = document.getElementById('loadingSpinner');

  if (username.length < 3) {
    showAlert('El usuario debe tener al menos 3 caracteres', 'warning');
    return;
  }

  if (password.length < 8) {
    showAlert('La contraseña debe tener al menos 8 caracteres', 'warning');
    return;
  }

  if (password !== passwordConfirm) {
    showAlert('Las contraseñas no coinciden', 'danger');
    return;
  }

  submitBtn.disabled = true;
  submitText.style.display = 'none';
  loadingSpinner.style.display = 'inline-block';

  try {
    const response = await fetch(`${API_BASE}/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.error || 'Error al registrarse', 'danger');
      submitBtn.disabled = false;
      submitText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
      return;
    }

    showAlert('¡Registro exitoso! Redirigiendo al login...', 'success');
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);

  } catch (error) {
    showAlert(error.message, 'danger');
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    loadingSpinner.style.display = 'none';
  }
}
