// Script principal de la aplicacion de restaurante

// Esperar a que el DOM este completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Mensaje de confirmacion en consola
    console.log('Aplicacion de Restaurante Cargada Correctamente');

    // Inicializar tooltips de Bootstrap
    inicializar_tooltips();

    // Validar formularios
    validar_formularios();

    // Agregar eventos a los formularios
    agregar_eventos_formularios();
});

// Funcion para inicializar tooltips de Bootstrap
function inicializar_tooltips() {
    // Obtener todos los elementos con atributo data-bs-toggle tooltip
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));

    // Mapear y crear instancia de tooltip para cada elemento
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        // Retornar nueva instancia de tooltip
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Funcion para validar formularios al enviar
function validar_formularios() {
    // Obtener todos los formularios en la pagina
    const formularios = document.querySelectorAll('form');

    // Iterar sobre cada formulario
    formularios.forEach(function(formulario) {
        // Agregar evento submit al formulario
        formulario.addEventListener('submit', function(evento) {
            // Validar si el formulario es valido
            if (!formulario.checkValidity()) {
                // Prevenir el envio del formulario
                evento.preventDefault();

                // Detener propagacion del evento
                evento.stopPropagation();

                // Agregar clase de fue validado
                formulario.classList.add('was-validated');
            }
        });
    });
}

// Funcion para agregar eventos a los formularios
function agregar_eventos_formularios() {
    // Obtener formulario de cliente
    const formCliente = document.querySelector('form[action*="guardar_cliente"]');

    // Obtener formulario de plato
    const formPlato = document.querySelector('form[action*="guardar_plato"]');

    // Obtener formulario de pedido
    const formPedido = document.querySelector('form[action*="guardar_pedido"]');

    // Obtener formulario de detalle
    const formDetalle = document.querySelector('form[action*="agregar_detalle"]');

    // Agregar evento al formulario de cliente
    if (formCliente) {
        // Evento submit del formulario cliente
        formCliente.addEventListener('submit', function(evento) {
            // Mensaje de confirmacion
            console.log('Guardando cliente');
        });
    }

    // Agregar evento al formulario de plato
    if (formPlato) {
        // Evento submit del formulario plato
        formPlato.addEventListener('submit', function(evento) {
            // Mensaje de confirmacion
            console.log('Guardando plato');
        });
    }

    // Agregar evento al formulario de pedido
    if (formPedido) {
        // Evento submit del formulario pedido
        formPedido.addEventListener('submit', function(evento) {
            // Mensaje de confirmacion
            console.log('Creando pedido');
        });
    }

    // Agregar evento al formulario de detalle
    if (formDetalle) {
        // Evento submit del formulario detalle
        formDetalle.addEventListener('submit', function(evento) {
            // Mensaje de confirmacion
            console.log('Agregando detalle a pedido');
        });
    }
}

// Funcion para mostrar alerta de exito
function mostrar_alerta_exito(mensaje) {
    // Crear elemento div para la alerta
    const alerta = document.createElement('div');

    // Agregar clases de bootstrap a la alerta
    alerta.className = 'alert alert-success alert-dismissible fade show';

    // Agregar rol de alerta
    alerta.setAttribute('role', 'alert');

    // Establecer contenido HTML de la alerta
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Obtener contenedor principal
    const container = document.querySelector('.container');

    // Insertar alerta al inicio del contenedor
    container.insertBefore(alerta, container.firstChild);

    // Remover alerta despues de 5 segundos
    setTimeout(function() {
        // Animar desaparicion
        alerta.style.opacity = '0';

        // Remover elemento despues de la animacion
        setTimeout(function() {
            // Remover elemento del DOM
            alerta.remove();
        }, 300);
    }, 5000);
}

// Funcion para mostrar alerta de error
function mostrar_alerta_error(mensaje) {
    // Crear elemento div para la alerta
    const alerta = document.createElement('div');

    // Agregar clases de bootstrap a la alerta
    alerta.className = 'alert alert-danger alert-dismissible fade show';

    // Agregar rol de alerta
    alerta.setAttribute('role', 'alert');

    // Establecer contenido HTML de la alerta
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Obtener contenedor principal
    const container = document.querySelector('.container');

    // Insertar alerta al inicio del contenedor
    container.insertBefore(alerta, container.firstChild);

    // Remover alerta despues de 5 segundos
    setTimeout(function() {
        // Animar desaparicion
        alerta.style.opacity = '0';

        // Remover elemento despues de la animacion
        setTimeout(function() {
            // Remover elemento del DOM
            alerta.remove();
        }, 300);
    }, 5000);
}

// Funcion para validar entrada de texto
function validar_texto(texto, minimo, maximo) {
    // Obtener longitud del texto
    const longitud = texto.trim().length;

    // Validar si cumple con minimo y maximo
    return longitud >= minimo && longitud <= maximo;
}

// Funcion para validar numero
function validar_numero(numero, minimo, maximo) {
    // Convertir a numero flotante
    const num = parseFloat(numero);

    // Validar si es numero valido
    if (isNaN(num)) {
        // Retornar falso si no es numero
        return false;
    }

    // Validar si cumple con minimo y maximo
    return num >= minimo && num <= maximo;
}

// Funcion para formatear dinero
function formatear_dinero(monto) {
    // Retornar monto formateado con dos decimales
    return monto.toFixed(2);
}

// Funcion para limpiar formulario
function limpiar_formulario(formulario) {
    // Resetear todos los campos del formulario
    formulario.reset();

    // Remover clase was-validated
    formulario.classList.remove('was-validated');
}

// Funcionalidad para consultar pedidos con detalles
function inicializar_consulta_pedidos() {
    // Obtener elemento del boton consultar
    const btnConsultar = document.getElementById('btn_consultar');

    // Validar si existe el boton
    if (!btnConsultar) {
        // Salir si no existe el boton
        return;
    }

    // Obtener elemento del contenedor de resultados
    const resultadosContainer = document.getElementById('resultados_pedidos');

    // Agregar evento click al boton
    btnConsultar.addEventListener('click', async function() {
        // Cambiar estado del boton a cargando
        btnConsultar.disabled = true;

        // Cambiar texto del boton
        btnConsultar.innerText = 'Cargando...';

        try {
            // Realizar peticion GET a la ruta de consultar pedidos
            const respuesta = await fetch('/api/consultar_pedidos');

            // Validar que la respuesta sea correcta
            if (!respuesta.ok) {
                // Lanzar error si la respuesta no es ok
                throw new Error('Error al consultar pedidos');
            }

            // Convertir respuesta a JSON
            const pedidos = await respuesta.json();

            // Limpiar el contenedor de resultados
            resultadosContainer.innerHTML = '';

            // Validar si hay pedidos
            if (pedidos.length === 0) {
                // Mostrar mensaje si no hay pedidos
                resultadosContainer.innerHTML = '<div class="alert alert-info">No hay pedidos registrados</div>';

                // Restaurar boton
                btnConsultar.disabled = false;

                // Restaurar texto del boton
                btnConsultar.innerText = 'Cargar Pedidos';

                // Salir de la funcion
                return;
            }

            // Crear contenedor acordeon
            let acordeonHtml = '<div class="accordion" id="acordeonPedidos">';

            // Iterar sobre cada pedido obtenido
            pedidos.forEach(function(pedido, index) {
                // Crear IDs unicos para el acordeon
                const headingId = `heading_${pedido.id}`;
                const collapseId = `collapse_${pedido.id}`;

                // Crear HTML para el encabezado del acordeon
                acordeonHtml += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="${headingId}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                                <strong>Pedido ${pedido.id}</strong> - ${pedido.cliente_nombre} | Tel: ${pedido.telefono} | Fecha: ${pedido.fecha}
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#acordeonPedidos">
                            <div class="accordion-body">
                `;

                // Variable para acumular total del pedido
                let totalPedido = 0;

                // Validar si hay detalles en el pedido
                if (pedido.detalles.length === 0) {
                    // Mostrar mensaje si no hay detalles
                    acordeonHtml += '<div class="alert alert-warning mb-0">Este pedido no tiene platos agregados</div>';
                } else {
                    // Agregar tabla si hay detalles
                    acordeonHtml += `
                        <table class="table table-sm table-striped">
                            <thead class="table-light">
                                <tr>
                                    <th>Plato</th>
                                    <th class="text-center">Precio Unit.</th>
                                    <th class="text-center">Cantidad</th>
                                    <th class="text-end">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    // Iterar sobre detalles del pedido
                    pedido.detalles.forEach(function(detalle) {
                        // Calcular subtotal del detalle
                        const subtotal = detalle.precio * detalle.cantidad;

                        // Acumular al total del pedido
                        totalPedido += subtotal;

                        // Agregar fila a la tabla HTML
                        acordeonHtml += `
                            <tr>
                                <td>${detalle.plato_nombre}</td>
                                <td class="text-center">$${detalle.precio.toFixed(2)}</td>
                                <td class="text-center">${detalle.cantidad}</td>
                                <td class="text-end"><strong>$${subtotal.toFixed(2)}</strong></td>
                            </tr>
                        `;
                    });

                    // Cerrar tabla
                    acordeonHtml += `
                            </tbody>
                        </table>
                        <div class="border-top pt-2">
                            <div class="text-end">
                                <h6 class="mb-0">Total: <span class="text-success">$${totalPedido.toFixed(2)}</span></h6>
                            </div>
                        </div>
                    `;
                }

                // Cerrar contenido colapsable
                acordeonHtml += `
                            </div>
                        </div>
                    </div>
                `;
            });

            // Cerrar contenedor acordeon
            acordeonHtml += '</div>';

            // Establecer HTML del acordeon en el contenedor
            resultadosContainer.innerHTML = acordeonHtml;

        } catch (error) {
            // Mostrar error en la consola
            console.error('Error:', error);

            // Mostrar mensaje de error al usuario
            resultadosContainer.innerHTML = '<div class="alert alert-danger">Error al cargar los pedidos. Intenta de nuevo.</div>';
        } finally {
            // Restaurar boton despues de cargar
            btnConsultar.disabled = false;

            // Restaurar texto del boton
            btnConsultar.innerText = 'Cargar Pedidos';
        }
    });
}

// Ejecutar inicializacion cuando el DOM este listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar consulta de pedidos
    inicializar_consulta_pedidos();
});
