// obtener elemento del modal de registro del html
const registroModal = document.getElementById('registroModal');
// verificar si el modal de registro existe
if (registroModal) {
    // agregar evento cuando el modal se abre
    registroModal.addEventListener('show.bs.modal', function () {
        // limpiar los campos del formulario de registro
        document.getElementById('registroForm').reset();
        // limpiar los mensajes de error
        document.getElementById('registroError').innerHTML = '';
    });
}

// obtener elemento del modal de login del html
const loginModal = document.getElementById('loginModal');
// verificar si el modal de login existe
if (loginModal) {
    // agregar evento cuando el modal se abre
    loginModal.addEventListener('show.bs.modal', function () {
        // limpiar los campos del formulario de login
        document.getElementById('loginForm').reset();
        // limpiar los mensajes de error
        document.getElementById('loginError').innerHTML = '';
    });
}

// obtener elemento del formulario de registro del html
const registroForm = document.getElementById('registroForm');
// verificar si el formulario de registro existe
if (registroForm) {
    // agregar evento cuando se envia el formulario
    registroForm.addEventListener('submit', function (e) {
        // prevenir envio por defecto
        e.preventDefault();

        // obtener valor del campo nombre completo
        const fullname = document.getElementById('registerName').value;
        // obtener valor del campo email
        const email = document.getElementById('registerEmail').value;
        // obtener valor del campo telefono
        const phone = document.getElementById('registerPhone').value;
        // obtener valor del campo contrasena
        const password = document.getElementById('registerPassword').value;
        // obtener valor del campo confirmar contrasena
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        // obtener elemento donde mostrar errores
        const errorDiv = document.getElementById('registroError');

        // validar que todos los campos tengan contenido
        if (!fullname || !email || !phone || !password || !confirmPassword) {
            // mostrar mensaje de error si falta algun campo
            errorDiv.innerHTML = '<div class="alert alert-danger">Todos los campos son obligatorios</div>';
            // salir de la funcion
            return;
        }

        // validar que las contrasenas coincidan
        if (password !== confirmPassword) {
            // mostrar mensaje de error si no coinciden
            errorDiv.innerHTML = '<div class="alert alert-danger">Las contrasenas no coinciden</div>';
            // salir de la funcion
            return;
        }

        // validar que la contrasena tenga minimo 6 caracteres
        if (password.length < 6) {
            // mostrar mensaje de error si es muy corta
            errorDiv.innerHTML = '<div class="alert alert-danger">La contrasena debe tener al menos 6 caracteres</div>';
            // salir de la funcion
            return;
        }

        // enviar el formulario al servidor
        this.submit();
    });
}

// obtener elemento del formulario de login del html
const loginForm = document.getElementById('loginForm');
// verificar si el formulario de login existe
if (loginForm) {
    // agregar evento cuando se envia el formulario
    loginForm.addEventListener('submit', function (e) {
        // prevenir envio por defecto
        e.preventDefault();

        // obtener valor del campo email
        const email = document.getElementById('loginEmail').value;
        // obtener valor del campo contrasena
        const password = document.getElementById('loginPassword').value;
        // obtener elemento donde mostrar errores
        const errorDiv = document.getElementById('loginError');

        // validar que email y contrasena no esten vacios
        if (!email || !password) {
            // mostrar mensaje de error si faltan campos
            errorDiv.innerHTML = '<div class="alert alert-danger">Email y contrasena son obligatorios</div>';
            // salir de la funcion
            return;
        }

        // enviar el formulario al servidor
        this.submit();
    });
}
