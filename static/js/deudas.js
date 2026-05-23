let deudaEditando = null;

document.addEventListener('DOMContentLoaded', function() {
    cargarDeudas();
});

function cargarDeudas() {
    fetch('/api/deudas')
        .then(response => response.json())
        .then(deudas => {
            mostrarDeudas(deudas);
            calcularResumen(deudas);
        })
        .catch(error => {
            mostrarAlerta('Error al cargar las deudas', 'danger');
            console.error('Error:', error);
        });
}

function mostrarDeudas(deudas) {
    const container = document.getElementById('deudasContainer');

    if (deudas.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No tienes deudas registradas</p>';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Acreedor</th>
                        <th>Monto Total</th>
                        <th>Pagado</th>
                        <th>Pendiente</th>
                        <th>Vencimiento</th>
                        <th>Tasa</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    deudas.forEach(deuda => {
        const pendiente = deuda.monto_total - deuda.monto_pagado;
        const estado = deuda.estado || 'activa';
        const estadoBadge = estado === 'activa' ? 'badge-warning' :
                           estado === 'pagada' ? 'badge-success' : 'badge-danger';

        html += `
            <tr>
                <td><strong>${deuda.nombre}</strong></td>
                <td>${deuda.acreedor}</td>
                <td>$${deuda.monto_total.toFixed(2)}</td>
                <td>$${deuda.monto_pagado.toFixed(2)}</td>
                <td>$${pendiente.toFixed(2)}</td>
                <td>${deuda.fecha_vencimiento || '-'}</td>
                <td>${deuda.tasa_interes}% A</td>
                <td><span class="badge ${estadoBadge}">${estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editarDeuda(${deuda.id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarDeuda(${deuda.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function calcularResumen(deudas) {
    let totalAdeudado = 0;
    let totalPagado = 0;
    let deudasActivas = 0;

    deudas.forEach(deuda => {
        totalAdeudado += deuda.monto_total;
        totalPagado += deuda.monto_pagado;
        if (deuda.estado === 'activa') deudasActivas++;
    });

    document.getElementById('totalAdeudado').textContent = '$' + totalAdeudado.toFixed(2);
    document.getElementById('totalPagado').textContent = '$' + totalPagado.toFixed(2);
    document.getElementById('deudasActivas').textContent = deudasActivas;
}

function mostrarModalDeuda() {
    deudaEditando = null;
    document.getElementById('modalTitle').textContent = 'Nueva Deuda';
    document.getElementById('formDeuda').reset();
    abrirModal('modalDeuda');
}

function editarDeuda(id) {
    fetch('/api/deudas')
        .then(response => response.json())
        .then(deudas => {
            const deuda = deudas.find(d => d.id === id);
            if (deuda) {
                deudaEditando = id;
                document.getElementById('modalTitle').textContent = 'Editar Deuda';
                document.getElementById('nombre').value = deuda.nombre;
                document.getElementById('acreedor').value = deuda.acreedor;
                document.getElementById('montoTotal').value = deuda.monto_total;
                document.getElementById('fechaVencimiento').value = deuda.fecha_vencimiento || '';
                document.getElementById('tasaInteres').value = deuda.tasa_interes;
                document.getElementById('estado').value = deuda.estado;
                document.getElementById('descripcion').value = deuda.descripcion || '';
                abrirModal('modalDeuda');
            }
        })
        .catch(error => {
            mostrarAlerta('Error al cargar la deuda', 'danger');
            console.error('Error:', error);
        });
}

function guardarDeuda(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const acreedor = document.getElementById('acreedor').value;
    const montoTotal = parseFloat(document.getElementById('montoTotal').value);
    const fechaVencimiento = document.getElementById('fechaVencimiento').value;
    const tasaInteres = parseFloat(document.getElementById('tasaInteres').value);
    const estado = document.getElementById('estado').value;
    const descripcion = document.getElementById('descripcion').value;

    const datos = {
        nombre,
        acreedor,
        monto_total: montoTotal,
        fecha_vencimiento: fechaVencimiento || null,
        tasa_interes: tasaInteres,
        estado,
        descripcion
    };

    const url = deudaEditando ? `/api/deudas/${deudaEditando}` : '/api/deudas';
    const metodo = deudaEditando ? 'PUT' : 'POST';

    fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            mostrarAlerta('Error: ' + data.error, 'danger');
        } else {
            mostrarAlerta(deudaEditando ? 'Deuda actualizada' : 'Deuda creada', 'success');
            cerrarModal('modalDeuda');
            cargarDeudas();
        }
    })
    .catch(error => {
        mostrarAlerta('Error al guardar la deuda', 'danger');
        console.error('Error:', error);
    });
}

function eliminarDeuda(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta deuda?')) {
        fetch(`/api/deudas/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                mostrarAlerta('Error: ' + data.error, 'danger');
            } else {
                mostrarAlerta('Deuda eliminada', 'success');
                cargarDeudas();
            }
        })
        .catch(error => {
            mostrarAlerta('Error al eliminar la deuda', 'danger');
            console.error('Error:', error);
        });
    }
}
