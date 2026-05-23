// Script para validacion del formulario de login

// esperar a que el DOM este completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // obtener formulario de login
    const loginForm = document.getElementById('login-form');

    // agregar evento submit al formulario
    loginForm.addEventListener('submit', function(e) {
        // validar si el formulario es valido
        if (!this.checkValidity()) {
            // prevenir el envio del formulario
            e.preventDefault();

            // detener propagacion del evento
            e.stopPropagation();
        }

        // agregar clase de fue validado
        this.classList.add('was-validated');
    });
});
