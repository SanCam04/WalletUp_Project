// =====================================================
// Lógica de Educación
// =====================================================

let articulosOriginal = [];

async function cargarArticulos() {
  try {
    const articulos = await fetchWithAuth(`${API_BASE}/educacion`);
    articulosOriginal = articulos;
    mostrarArticulos(articulos);
  } catch (error) {
    showAlert('Error al cargar: ' + error.message, 'danger');
  }
}

function mostrarArticulos(articulos) {
  const container = document.getElementById('articulosContainer');

  if (articulos.length === 0) {
    container.innerHTML = '<p class="text-center text-muted col-4" style="grid-column: span 4;">No hay artículos disponibles aún</p>';
    return;
  }

  let html = '';

  articulos.forEach(a => {
    const contenidoPreview = a.contenido.substring(0, 150) + '...';

    html += `
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-2">
            <h4 class="m-0">${a.titulo}</h4>
            <span class="badge badge-info" style="background-color: #4299e1; color: white;">${a.categoria}</span>
          </div>

          <p class="text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">${contenidoPreview}</p>

          <small class="text-muted">Publicado: ${formatDate(a.fecha_creacion)}</small>

          <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="leerArticulo(${a.id}, '${a.titulo}', '${a.contenido.replace(/'/g, "\\'")}')">
              Leer más →
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filtrarArticulos(termino) {
  if (!termino) {
    mostrarArticulos(articulosOriginal);
    return;
  }

  const filtrados = articulosOriginal.filter(a =>
    a.titulo.toLowerCase().includes(termino.toLowerCase()) ||
    a.contenido.toLowerCase().includes(termino.toLowerCase())
  );

  mostrarArticulos(filtrados);
}

function leerArticulo(id, titulo, contenido) {
  document.getElementById('tituloArticulo').textContent = titulo;
  document.getElementById('contenidoArticulo').innerHTML = contenido;
  document.getElementById('modalArticulo').classList.add('show');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

function cambiarTab(tab) {
  const tabs = document.querySelectorAll('.tab-content');
  const botones = document.querySelectorAll('.tab-btn');

  tabs.forEach(t => t.style.display = 'none');
  botones.forEach(b => {
    b.style.color = '#718096';
    b.style.borderBottom = 'none';
  });

  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).style.display = 'block';
  event.target.style.color = '#667eea';
  event.target.style.borderBottom = '3px solid #667eea';

  if (tab === 'noticias') {
    cargarNoticias();
  }
}

function calcularCuota() {
  const monto = parseFloat(document.getElementById('montoCapital').value) || 0;
  const tasaAnual = parseFloat(document.getElementById('tasaInteres').value) || 0;
  const plazo = parseInt(document.getElementById('plazoMeses').value) || 1;

  if (monto <= 0 || tasaAnual < 0 || plazo <= 0) {
    showAlert('Ingresa valores válidos', 'warning');
    return;
  }

  const tasaMensual = tasaAnual / 100 / 12;
  const cuota = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1);
  const totalPagar = cuota * plazo;
  const totalIntereses = totalPagar - monto;

  document.getElementById('resultCuota').textContent = formatMoney(cuota);
  document.getElementById('resultTotal').textContent = formatMoney(totalPagar);
  document.getElementById('resultIntereses').textContent = formatMoney(totalIntereses);
  document.getElementById('resultTasaMensual').textContent = (tasaMensual * 100).toFixed(4) + '%';

  generarTablaAmortizacion(monto, tasaMensual, cuota, plazo);
}

function generarTablaAmortizacion(capital, tasaMensual, cuota, plazo) {
  let saldo = capital;
  let html = `
    <div class="table-responsive">
      <table class="table" style="font-size: 0.85rem;">
        <tr style="background: #f7fafc; font-weight: 600;">
          <td>Mes</td>
          <td>Cuota</td>
          <td>Interés</td>
          <td>Capital</td>
          <td>Saldo</td>
        </tr>
  `;

  for (let mes = 1; mes <= plazo; mes++) {
    const interes = saldo * tasaMensual;
    const capital_pago = cuota - interes;
    saldo -= capital_pago;

    html += `
      <tr>
        <td>${mes}</td>
        <td>${formatMoney(cuota)}</td>
        <td>${formatMoney(interes)}</td>
        <td>${formatMoney(capital_pago)}</td>
        <td>${formatMoney(Math.max(0, saldo))}</td>
      </tr>
    `;
  }

  html += '</table></div>';
  document.getElementById('tablaAmortizacion').innerHTML = html;
}

async function cargarNoticias() {
  try {
    const noticias = await fetchWithAuth(`${API_BASE}/educacion/noticias`);
    mostrarNoticias(noticias);
  } catch (error) {
    console.error('Error cargando noticias:', error);
    document.getElementById('noticiasContainer').innerHTML =
      '<p class="text-center text-muted">No se pudieron cargar las noticias en este momento</p>';
  }
}

function mostrarNoticias(noticias) {
  const container = document.getElementById('noticiasContainer');

  if (!noticias || noticias.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">No hay noticias disponibles</p>';
    return;
  }

  let html = '<div style="display: grid; gap: 1.5rem;">';

  noticias.forEach(noticia => {
    html += `
      <div class="card">
        <div class="card-body">
          <h4>${noticia.title}</h4>
          <p class="text-muted" style="margin: 1rem 0;">${noticia.description || 'Sin descripción'}</p>
          <small class="text-muted">Fuente: ${noticia.source.name} • ${formatDate(noticia.publishedAt)}</small>
          <div style="margin-top: 1rem;">
            <a href="${noticia.url}" target="_blank" class="btn btn-primary" style="text-decoration: none;">Leer artículo →</a>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  cargarArticulos();
});
