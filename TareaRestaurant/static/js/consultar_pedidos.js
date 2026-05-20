// Script para cargar y mostrar pedidos con detalles

// esperar a que el DOM este completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // obtener elemento del boton
    const btnConsultar = document.getElementById('btn_consultar');

    // obtener elemento donde se mostraran los resultados
    const resultadosDiv = document.getElementById('resultados_pedidos');

    // agregar listener al boton
    btnConsultar.addEventListener('click', function() {
        // cambiar texto del boton
        btnConsultar.textContent = 'Cargando...';
        btnConsultar.disabled = true;

        // hacer fetch a la api
        fetch('/api/consultar_pedidos')
            .then(response => response.json())
            .then(data => {
                // limpiar resultados previos
                resultadosDiv.innerHTML = '';

                // si no hay pedidos
                if (data.length === 0) {
                    resultadosDiv.innerHTML = '<div class="alert alert-info">no hay pedidos registrados</div>';
                    btnConsultar.textContent = 'Cargar Pedidos';
                    btnConsultar.disabled = false;
                    return;
                }

                // crear acordeon para los pedidos
                const accordion = document.createElement('div');
                accordion.className = 'accordion';
                accordion.id = 'accordionPedidos';

                // iterar sobre cada pedido
                data.forEach((pedido, index) => {
                    // crear item del acordeon
                    const item = document.createElement('div');
                    item.className = 'accordion-item';

                    // crear encabezado del item
                    const header = document.createElement('h2');
                    header.className = 'accordion-header';

                    // crear boton del encabezado
                    const button = document.createElement('button');
                    button.className = 'accordion-button collapsed';
                    button.type = 'button';
                    button.setAttribute('data-bs-toggle', 'collapse');
                    button.setAttribute('data-bs-target', '#collapse' + index);
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-controls', 'collapse' + index);

                    // contenido del boton con informacion del pedido
                    button.innerHTML = `
                        <strong>Pedido ID: ${pedido.id}</strong> -
                        Cliente: ${pedido.cliente_nombre} -
                        Telefono: ${pedido.telefono} -
                        Fecha: ${pedido.fecha} -
                        Total: $${pedido.total.toFixed(2)}
                    `;

                    header.appendChild(button);
                    item.appendChild(header);

                    // crear body del acordeon
                    const collapse = document.createElement('div');
                    collapse.id = 'collapse' + index;
                    collapse.className = 'accordion-collapse collapse';
                    collapse.setAttribute('data-bs-parent', '#accordionPedidos');

                    // crear contenido del body
                    const body = document.createElement('div');
                    body.className = 'accordion-body p-0';

                    // crear tabla con los detalles del pedido
                    let htmlTabla = '<table class="table table-hover mb-0"><thead class="table-light"><tr><th>Plato</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>';

                    // iterar sobre detalles del pedido
                    pedido.detalles.forEach(detalle => {
                        htmlTabla += `
                            <tr>
                                <td>${detalle.plato_nombre}</td>
                                <td>${detalle.cantidad}</td>
                                <td>$${detalle.precio.toFixed(2)}</td>
                                <td>$${detalle.subtotal.toFixed(2)}</td>
                            </tr>
                        `;
                    });

                    // cerrar tabla
                    htmlTabla += '</tbody></table>';
                    body.innerHTML = htmlTabla;

                    collapse.appendChild(body);
                    item.appendChild(collapse);

                    // agregar item al acordeon
                    accordion.appendChild(item);
                });

                // agregar acordeon a los resultados
                resultadosDiv.appendChild(accordion);

                // restaurar boton
                btnConsultar.textContent = 'Cargar Pedidos';
                btnConsultar.disabled = false;
            })
            .catch(error => {
                // mostrar error
                resultadosDiv.innerHTML = '<div class="alert alert-danger">error al cargar pedidos: ' + error.message + '</div>';
                btnConsultar.textContent = 'Cargar Pedidos';
                btnConsultar.disabled = false;
            });
    });

    // cargar pedidos automaticamente cuando carga la pagina
    btnConsultar.click();
});
