// Manejar los tabs de CMR Puntos
function mostrarContenido(tipo) {
    // Ocultar todos los paneles
    const paneles = document.querySelectorAll('.cmr-content-panel');
    paneles.forEach(panel => panel.style.display = 'none');

    // Mostrar el panel seleccionado
    const panelSeleccionado = document.getElementById(tipo);
    if (panelSeleccionado) {
        panelSeleccionado.style.display = 'block';
    }
}

// Mostrar el primer contenido por defecto
window.addEventListener('load', function () {
    mostrarContenido('que-es');
});
