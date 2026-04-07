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
        btnCalcularIMC.addEventListener("click", function() {
            calcularIMC();
        });
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
    var pesoInput = document.getElementById("peso");
    var alturaInput = document.getElementById("altura");
    var mensajeIMC = document.getElementById("mensajeIMC");

    var peso = parseFloat(pesoInput.value);
    var altura = parseFloat(alturaInput.value);

    // Validar que los campos tengan valores válidos
    if (isNaN(peso) || isNaN(altura) || peso <= 0 || altura <= 0) {
        mensajeIMC.innerHTML = '<div class="alert alert-danger">Por favor ingresa peso y altura válidos (números positivos)</div>';
        return;
    }

    // Validar que la altura esté en formato correcto (entre 0.5 y 3 metros)
    if (altura > 3) {
        mensajeIMC.innerHTML = '<div class="alert alert-danger">⚠️ La altura debe estar en metros (ej: 1.75, no 175). Parece que ingresaste cm en lugar de metros.</div>';
        return;
    }

    if (altura < 0.5) {
        mensajeIMC.innerHTML = '<div class="alert alert-danger">La altura debe ser mayor a 0.5 metros</div>';
        return;
    }

    // Calcular IMC
    var imc = peso / (altura * altura);

    // Determinar categoría
    var categoria;
    if (imc < 18.5) {
        categoria = "Bajo peso";
    } else if (imc < 25) {
        categoria = "Peso normal";
    } else if (imc < 30) {
        categoria = "Sobrepeso";
    } else {
        categoria = "Obesidad";
    }

    // Mostrar resultados
    mensajeIMC.innerHTML = '<div class="alert alert-success">' +
        '<h5>Resultados:</h5>' +
        '<p>Peso: <strong>' + peso + ' kg</strong></p>' +
        '<p>Altura: <strong>' + altura + ' m</strong></p>' +
        '<p>IMC: <strong>' + imc.toFixed(2) + '</strong></p>' +
        '<p>Categoría: <strong>' + categoria + '</strong></p>' +
        '</div>';
}

