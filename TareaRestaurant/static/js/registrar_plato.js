// Script para manejo dinamico de ingredientes en la creacion de platos

// estado en memoria: array de ingredientes seleccionados
let ingredientes = [];

// variable temporal para guardar el item seleccionado
let itemSeleccionado = null;

// esperar a que el DOM cargue completamente
document.addEventListener('DOMContentLoaded', function() {
    // validar formularios al hacer submit
    document.querySelectorAll('.needs-validation').forEach(form => {
        form.addEventListener('submit', function(e) {
            // si el formulario es invalido
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            // antes de enviar, actualizar el campo oculto de ingredientes
            document.getElementById('ingredientes_json').value = JSON.stringify(ingredientes);
            // agregar clase de validacion
            this.classList.add('was-validated');
        });
    });

    // agregar listeners a los botones de agregar ingrediente
    document.querySelectorAll('.btn-agregar-ingrediente').forEach(btn => {
        btn.addEventListener('click', function() {
            // obtener los datos del item
            const itemId = this.getAttribute('data-item-id');
            const itemNombre = this.getAttribute('data-item-nombre');
            const itemCantidad = this.getAttribute('data-item-cantidad');
            const itemUnidad = this.getAttribute('data-item-unidad');

            // guardar el item seleccionado
            itemSeleccionado = {
                id: parseInt(itemId),
                nombre: itemNombre,
                cantidad: parseFloat(itemCantidad),
                unidad: itemUnidad
            };

            // actualizar el modal con los datos del item
            document.getElementById('modalTitulo').textContent = `Agregar ${itemNombre}`;
            document.getElementById('modalUnidad').textContent = itemUnidad;
            document.getElementById('modalMaximo').textContent = itemCantidad;
            document.getElementById('modalUnidadMax').textContent = itemUnidad;
            document.getElementById('modalCantidad').max = itemCantidad;
            document.getElementById('modalCantidad').value = '';

            // mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('modalAgregarIngrediente'));
            modal.show();
        });
    });

    // agregar listener al boton de confirmar en el modal
    document.getElementById('btnConfirmarAgregar').addEventListener('click', function() {
        if (itemSeleccionado) {
            const cantidad = document.getElementById('modalCantidad').value;
            agregarIngrediente(
                itemSeleccionado.id,
                itemSeleccionado.nombre,
                cantidad,
                itemSeleccionado.unidad
            );

            // cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarIngrediente'));
            if (modal) {
                modal.hide();
            }
        }
    });
});

// funcion: agregar un ingrediente a la lista
function agregarIngrediente(id, nombre, cantidad, unidad) {
    // validar que la cantidad sea valida
    const cant = parseFloat(cantidad);

    if (isNaN(cant) || cant <= 0) {
        alert('Por favor ingresa una cantidad valida');
        return;
    }

    // verificar si el ingrediente ya esta en la lista
    const yaExiste = ingredientes.findIndex(ing => ing.id === id);

    if (yaExiste !== -1) {
        // si ya existe, actualizar la cantidad
        ingredientes[yaExiste].cantidad = cant;
    } else {
        // si no existe, agregarlo
        ingredientes.push({
            id: id,
            nombre: nombre,
            cantidad: cant,
            unidad: unidad
        });
    }

    // renderizar la tabla de ingredientes
    renderIngredientes();
}

// funcion: quitar un ingrediente de la lista
function quitarIngrediente(id) {
    // buscar el indice del ingrediente
    const indice = ingredientes.findIndex(ing => ing.id === id);

    // si lo encontramos, eliminarlo
    if (indice !== -1) {
        ingredientes.splice(indice, 1);
    }

    // renderizar la tabla de ingredientes
    renderIngredientes();
}

// funcion: renderizar la tabla de ingredientes seleccionados
function renderIngredientes() {
    // obtener el contenedor
    const container = document.getElementById('tabla-ingredientes-container');

    // si no hay ingredientes, mostrar mensaje
    if (ingredientes.length === 0) {
        container.innerHTML = '<div class="alert alert-info small mb-3">Selecciona ingredientes desde la tabla de inventario a la derecha</div>';
        return;
    }

    // crear HTML de la tabla
    let html = '<div class="table-responsive"><table class="table table-sm table-borderless mb-0"><thead class="table-light"><tr><th>Producto</th><th>Cantidad</th><th>Accion</th></tr></thead><tbody>';

    // iterar sobre cada ingrediente
    ingredientes.forEach(ing => {
        html += `
            <tr>
                <td><small>${ing.nombre}</small></td>
                <td><small>${ing.cantidad.toFixed(2)} ${ing.unidad}</small></td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger" onclick="quitarIngrediente(${ing.id})">
                        Quitar
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';

    // actualizar el contenedor
    container.innerHTML = html;
}
