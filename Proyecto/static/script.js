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

    var btnCalcularIMC = document.getElementById("btnCalcularIMC");
    if (btnCalcularIMC) {
        btnCalcularIMC.addEventListener("click", function () { calcularIMC(); });
    }
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

function calcularIMC() {
    var peso = parseFloat(document.getElementById("peso").value);
    var altura = parseFloat(document.getElementById("altura").value);
    var mensajeIMC = document.getElementById("mensajeIMC");

    if (Number.isNaN(peso) || Number.isNaN(altura)) {
        mensajeIMC.innerHTML = '<div class="alert alert-danger">Completa peso y altura</div>';
        return;
    }

    if (peso <= 0 || altura <= 0) {
        mensajeIMC.innerHTML = '<div class="alert alert-danger">Peso y altura deben ser mayores a 0</div>';
        return;
    }

    var imc = peso / (altura * altura);
    var categoria = "";
    var color = "info";

    if (imc < 18.5) {
        categoria = "Bajo peso";
        color = "warning";
    } else if (imc < 25) {
        categoria = "Peso normal";
        color = "success";
    } else if (imc < 30) {
        categoria = "Sobrepeso";
        color = "warning";
    } else {
        categoria = "Obesidad";
        color = "danger";
    }

    mensajeIMC.innerHTML = '<div class="alert alert-' + color + '">IMC: ' + imc.toFixed(2) + ' (' + categoria + ')</div>';
}