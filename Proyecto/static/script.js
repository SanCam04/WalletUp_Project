document.addEventListener("DOMContentLoaded", function() {
    var formRegistro = document.getElementById("formRegistro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", function (event) {
            event.preventDefault(); // evita recarga de la página
            let nombre = document.getElementById("nombre").value;
            let correo = document.getElementById("correo").value;
            let edad = parseInt(document.getElementById("edad").value);
            let mensaje = document.getElementById("mensaje");
            if (edad < 18) {
                mensaje.innerHTML = `<div class="alert alert-danger">Debes ser mayor de edad</div>`;
            } else {
                mensaje.innerHTML = `<div class="alert alert-success">Registro exitoso, ${nombre}</div>`;
            }
        });
    }

    var btnMul = document.getElementById("btnMul");
    var btnDiv = document.getElementById("btnDiv");
    var btnSum = document.getElementById("btnSum");
    var btnRes = document.getElementById("btnRes");

    if (btnMul) btnMul.addEventListener("click", function () { calcular("*"); });
    if (btnDiv) btnDiv.addEventListener("click", function () { calcular("/"); });
    if (btnSum) btnSum.addEventListener("click", function () { calcular("+"); });
    if (btnRes) btnRes.addEventListener("click", function () { calcular("-"); });
});

function calcular(op) {
    var n1 = parseFloat(document.getElementById("numero1").value);
    var n2 = parseFloat(document.getElementById("numero2").value);
    var mensajeCalc = document.getElementById("mensajeCalc");

    if (Number.isNaN(n1) || Number.isNaN(n2)) {
        mensajeCalc.innerHTML = '<div class="alert alert-danger">Completa ambos números</div>';
        return;
    }

    var r;
    if (op === "*") r = n1 * n2;
    else if (op === "/") r = (n2 === 0) ? "Error: división por 0" : (n1 / n2);
    else if (op === "+") r = n1 + n2;
    else if (op === "-") r = n1 - n2;

    mensajeCalc.innerHTML = '<div class="alert alert-info">Resultado: ' + r + "</div>";
}

