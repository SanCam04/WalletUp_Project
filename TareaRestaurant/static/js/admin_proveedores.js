// Script para validacion de formularios en gestion de proveedores

// esperar a que el DOM este completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // validar formularios al hacer submit
    document.querySelectorAll('.needs-validation').forEach(form => {
        form.addEventListener('submit', function(e) {
            // si el formulario es invalido
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            // agregar clase de validacion
            this.classList.add('was-validated');
        });
    });
});
