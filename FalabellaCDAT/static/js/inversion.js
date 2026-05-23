// Manejar botones toggle para tipo de vencimiento
document.addEventListener('DOMContentLoaded', function() {
    const toggleContainer = document.getElementById('toggleVencimiento');
    const vencimientoInput = document.getElementById('vencimiento');

    if (toggleContainer) {
        const buttons = toggleContainer.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                // Remover active de todos los botones
                buttons.forEach(b => b.classList.remove('active'));
                // Agregar active al botón clickeado
                this.classList.add('active');
                // Actualizar el valor del input hidden
                vencimientoInput.value = this.dataset.value;
            });
        });
    }
});
