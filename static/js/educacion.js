// =====================================================
// Calculadora Financiera
// =====================================================

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

document.addEventListener('DOMContentLoaded', () => {
  // Calculadora lista
});
