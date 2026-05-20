// Script para validacion de formularios y calculo de precios en inventario

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

    // establecer la fecha actual por defecto
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.value = hoy;
    }
});

// funcion para actualizar el precio total automaticamente
function actualizarPrecio() {
    // obtener elementos
    const selectProveedor = document.getElementById('proveedor_id');
    const inputCantidad = document.getElementById('cantidad');
    const inputPorciones = document.getElementById('porciones_por_unidad');
    const inputPrecioUnitario = document.getElementById('precio_unitario');
    const inputPrecioTotal = document.getElementById('precio_total');

    // obtener el proveedor seleccionado
    const opcionSeleccionada = selectProveedor.options[selectProveedor.selectedIndex];

    // obtener el precio del proveedor desde el data attribute
    const precioUnitario = parseFloat(opcionSeleccionada.getAttribute('data-precio'));
    const cantidad = parseFloat(inputCantidad.value) || 0;
    const porciones = Math.max(1, parseInt(inputPorciones.value) || 1);

    // verificar que tenemos datos validos
    if (!isNaN(precioUnitario) && !isNaN(cantidad) && cantidad > 0) {
        // calcular precio total
        const precioTotal = (precioUnitario * cantidad).toFixed(2);

        // calcular precio por porcion
        const precioPorcion = (precioUnitario / porciones).toFixed(2);

        // calcular cantidad total en inventario
        const cantidadTotal = (cantidad * porciones).toFixed(2);

        // actualizar inputs de lectura
        if (porciones > 1) {
            inputPrecioUnitario.value = '$' + precioPorcion + ' (porción)';
            inputPrecioTotal.value = '$' + precioTotal + ' → ' + cantidadTotal + ' porciones';
        } else {
            inputPrecioUnitario.value = '$' + precioUnitario.toFixed(2);
            inputPrecioTotal.value = '$' + precioTotal;
        }
    } else {
        // limpiar inputs si no hay datos validos
        inputPrecioUnitario.value = '';
        inputPrecioTotal.value = '';
    }
}
