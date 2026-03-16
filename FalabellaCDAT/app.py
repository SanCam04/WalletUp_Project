# importar funciones principales de flask para crear la aplicacion web
from flask import Flask, render_template, request, session, redirect, url_for, flash, jsonify

# importar funciones de seguridad para encriptar contrasenas
# generate_password_hash: convierte la contrasena en un hash seguro
# check_password_hash: verifica si la contrasena coincide con el hash almacenado
from werkzeug.security import generate_password_hash, check_password_hash

# importar datetime para manejar fechas y hacer calculos de dias
from datetime import datetime

# ====================================================================
# INICIALIZAR APLICACION FLASK
# ====================================================================

# crear la aplicacion flask principal
app = Flask(__name__)

# definir clave secreta para encriptar las sesiones de los usuarios
# esta clave es necesaria para que flask pueda guardar datos en session
# en produccion, esta clave debe ser mucho mas segura y no estar en el codigo
app.secret_key = 'secret'

# crear un diccionario vacio para almacenar los datos de usuarios en memoria
# estructura: {email: {nombre, email, password_hasheada}}
# nota: estos datos se pierden cuando se reinicia la aplicacion
# para una aplicacion real, usar una base de datos
usuarios = {}


# ====================================================================
# FUNCIONES AUXILIARES
# ====================================================================

# ====================================================================
# EJEMPLO: RESTA DE FECHAS
# ====================================================================
# Python convierte cada fecha a numero de dias desde 1970, luego resta:
# fecha1 = fecha(2026, 12, 25)  # → 20,719 dias desde 1970
# fecha2 = fecha(2026, 3, 14)   # → 20,433 dias desde 1970
# diferencia = fecha1 - fecha2  # → 20,719 - 20,433 = 286 dias

# funcion para calcular los dias entre hoy y una fecha futura
def calcular_dias(fecha_str):
    # convertir el string de fecha (formato yyyy-mm-dd) a objeto date
    fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()

    # obtener la fecha de hoy
    hoy = datetime.today().date()

    # calcular la diferencia de dias entre la fecha futura y hoy
    dias = (fecha - hoy).days

    # retornar el numero de dias
    return dias


# funcion para obtener la tasa de interes segun el numero de dias
# las tasas se basan en los valores reales de Falabella CDAT
def obtener_tasa(dias):
    # 366+ dias -> 10.85%
    if dias >= 366:
        return 10.85
    # 270-365 dias -> 10.26%
    elif dias >= 270:
        return 10.26
    # 180-269 dias -> 10.26%
    elif dias >= 180:
        return 10.26
    # 90-179 dias -> 5.0%
    elif dias >= 90:
        return 5.0
    # 60-89 dias -> 3.5%
    elif dias >= 60:
        return 3.5
    # 30-59 dias -> 2.0%
    elif dias >= 30:
        return 2.0
    # menos de 30 dias -> 0% (sin tasa)
    else:
        return 0


# funcion para calcular la tasa efectiva anual
# convierte una tasa nominal a una tasa efectiva considerando el numero de dias
def calcular_tasa_anual(tasa_nominal, dias):
    # convertir la tasa de porcentaje a decimal
    # ejemplo: 5% -> 0.05
    tasa_decimal = tasa_nominal / 100

    # aplicar formula: ((1 + tasa)^(365/dias) - 1) * 100
    # esto calcula la tasa anualizada basada en el plazo real
    tasa_anual = (pow(1 + tasa_decimal, 365 / dias) - 1) * 100

    # retornar la tasa anual calculada
    return tasa_anual


# funcion para formatear una fecha al formato colombiano dd/mm/yyyy
def formatear_fecha(fecha_str):
    # convertir el string de fecha (formato yyyy-mm-dd) a objeto datetime
    fecha = datetime.strptime(fecha_str, '%Y-%m-%d')

    # formatear la fecha al formato dd/mm/yyyy
    return fecha.strftime('%d/%m/%Y')


# funcion para formatear un numero como moneda colombiana
def formatear_moneda(valor):
    # usar format de python para agregar puntos de miles
    # reemplazar comas por puntos (formato colombiano)
    # ejemplo: 1000000 -> $ 1.000.000
    return f"$ {valor:,.0f}".replace(',', '.')


# ====================================================================
# RUTAS DE AUTENTICACION
# ====================================================================

# ruta para mostrar el modulo de cmr puntos
@app.route('/cmr-puntos')
def cmr_puntos():
    # renderizar el template cmr-puntos.html
    return render_template('modules/cmr-puntos/cmr-puntos.html')


# ruta raiz que muestra el simulador de inversion y procesa simulaciones
# maneja GET (mostrar formulario) y POST (procesar y mostrar resultados)
@app.route('/', methods=['GET', 'POST'])
def index():
    # inicializar variables
    resultados = None
    mostrar_resultados = False

    # procesar el formulario cuando se hace POST
    if request.method == 'POST':
        # obtener el tipo de documento del formulario
        tipo_documento = request.form.get('tipoDocumento')

        # obtener el numero de documento del formulario
        documento = request.form.get('documento')

        # obtener el monto inicial a invertir del formulario
        abono = request.form.get('abono')

        # obtener el tipo de vencimiento (al vencimiento o abono periodico)
        vencimiento = request.form.get('vencimiento')

        # obtener la fecha de vencimiento del formulario (en formato yyyy-mm-dd)
        fecha_plazo = request.form.get('plazo')

        # validar que todos los campos obligatorios esten presentes
        if not all([tipo_documento, documento, abono, vencimiento, fecha_plazo]):
            # mostrar mensaje de error
            flash('Todos los campos son obligatorios', 'error')
            return render_template('index.html',
                                 resultados=None,
                                 mostrar_resultados=False)

        # convertir el monto a numero decimal
        try:
            abono = float(abono)
        except:
            # si la conversion falla, mostrar error
            flash('El monto debe ser un numero valido', 'error')
            return render_template('index.html',
                                 resultados=None,
                                 mostrar_resultados=False)

        # validar que el monto sea el minimo requerido por el banco
        if abono < 200000:
            # mostrar mensaje de error si es menor al minimo
            flash('El monto minimo es $200.000', 'error')
            return render_template('index.html',
                                 resultados=None,
                                 mostrar_resultados=False)

        # calcular los dias entre hoy y la fecha de vencimiento seleccionada
        dias = calcular_dias(fecha_plazo)

        # validar que el plazo este dentro del rango permitido
        if dias < 30 or dias > 1080:
            # mostrar mensaje de error si no esta en el rango
            flash('El plazo debe estar entre 30 y 1080 dias', 'error')
            return render_template('index.html',
                                 resultados=None,
                                 mostrar_resultados=False)

        # obtener la tasa de interes segun el numero de dias
        tasa = obtener_tasa(dias)

        # calcular los intereses generados
        # formula: monto * tasa / 100
        # ejemplo: 1.000.000 * 5 / 100 = 50.000
        intereses = abono * tasa / 100

        # calcular la retencion en la fuente
        # el banco retiene el 4% de los intereses por impuestos
        retencion = intereses * 0.04

        # calcular el monto final que recibira el cliente
        # es el capital inicial mas los intereses generados
        monto_final = abono + intereses

        # calcular la tasa efectiva anual
        # convierte la tasa nominal del plazo a tasa anualizada
        tasa_anual = calcular_tasa_anual(tasa, dias)

        # obtener la fecha de hoy
        hoy = datetime.today().date()

        # formatear la fecha de hoy al formato dd/mm/yyyy
        fecha_inicial_formato = hoy.strftime('%d/%m/%Y')

        # formatear la fecha de vencimiento al formato dd/mm/yyyy
        fecha_vencimiento_formato = formatear_fecha(fecha_plazo)

        # crear un diccionario que mapea los valores de vencimiento a sus etiquetas
        vencimiento_labels = {
            'vencimiento': 'Al vencimiento',  # el interes se paga al final
            'periodico': 'Abono periodico'     # el interes se paga periodicamente
        }

        # obtener la etiqueta correspondiente al tipo de vencimiento seleccionado
        vencimiento_label = vencimiento_labels.get(vencimiento, 'Al vencimiento')

        # guardar todos los resultados calculados en la sesion del usuario
        # esto permite pasar los datos al template sin exponer la url
        resultados = {
            # monto total formateado como moneda colombiana
            'montoTotalGrande': formatear_moneda(monto_final),

            # numero de dias del plazo
            'plazoResultado': dias,

            # intereses totales formateados
            'rendimientosTotal': formatear_moneda(intereses),

            # retencion en la fuente formateada
            'retencion': formatear_moneda(retencion),

            # monto inicial formateado
            'valorInversion': formatear_moneda(abono),

            # tipo de pago de rendimientos
            'pagoRendimientos': vencimiento_label,

            # tasa anual con 2 decimales
            'tasaAnual': f'{tasa_anual:.2f}%',

            # fecha inicial formateada
            'fechaInicial': fecha_inicial_formato,

            # fecha de vencimiento formateada
            'fechaVencimiento': fecha_vencimiento_formato
        }

        # guardar en la sesion
        session['resultados'] = resultados

        # marcar que se deben mostrar los resultados
        mostrar_resultados = True

    # renderizar el template con formulario o resultados segun corresponda
    return render_template('index.html',
                         resultados=resultados,
                         mostrar_resultados=mostrar_resultados)


# ruta para procesar el login de usuarios registrados
@app.route('/login', methods=['POST'])
def login():
    # obtener el email enviado desde el formulario del modal de login
    email = request.form.get('email')

    # obtener la contrasena enviada desde el formulario del modal de login
    password = request.form.get('password')

    # verificar si el email existe en el diccionario de usuarios
    # y si la contrasena es correcta usando check_password_hash
    if email in usuarios and check_password_hash(usuarios[email]['password'], password):
        # guardar el email del usuario en la sesion
        # esto permite saber quien esta logueado
        session['usuario'] = email

        # guardar el nombre del usuario en la sesion
        # para mostrarlo en el navbar
        session['nombre'] = usuarios[email]['nombre']

        # mostrar un mensaje de exito al usuario
        flash('Sesion iniciada correctamente.', 'success')

        # redirigir a la pagina principal (index)
        return redirect(url_for('index'))
    else:
        # si las credenciales son incorrectas, mostrar mensaje de error
        flash('Email o contrasena incorrectos', 'error')

        # redirigir al index para que intente de nuevo
        return redirect(url_for('index'))


# ruta para procesar el registro de nuevos usuarios
@app.route('/register', methods=['POST'])
def register():
    # obtener el nombre completo del formulario de registro
    fullname = request.form.get('fullname')

    # obtener el email del formulario de registro
    email = request.form.get('email')

    # obtener la contrasena del formulario de registro
    password = request.form.get('password')

    # obtener la confirmacion de contrasena (no se valida actualmente en el servidor)
    confirm_password = request.form.get('confirm_password')

    # crear un nuevo usuario en el diccionario
    # la clave es el email y el valor es un diccionario con los datos del usuario
    usuarios[email] = {
        # almacenar el nombre completo
        'nombre': fullname,

        # almacenar el email
        'email': email,

        # almacenar la contrasena hasheada (encriptada) por seguridad
        # nunca se debe guardar la contrasena en texto plano
        'password': generate_password_hash(password)
    }

    # guardar el email en la sesion para autologuear al usuario
    # (hacer que inicie sesion automaticamente despues de registrarse)
    session['usuario'] = email

    # guardar el nombre en la sesion
    session['nombre'] = fullname

    # mostrar mensaje de exito
    flash('Cuenta creada correctamente.', 'success')

    # redirigir a la pagina principal
    return redirect(url_for('index'))


# ruta para cerrar sesion (logout) del usuario actual
@app.route('/logout')
def logout():
    # eliminar todos los datos de la sesion del usuario
    session.clear()

    # mostrar un mensaje informativo
    flash('Sesion cerrada.', 'info')

    # redirigir a la pagina principal
    return redirect(url_for('index'))


# ====================================================================
# RUTAS DEL SIMULADOR CDAT
# ====================================================================

# ruta para mostrar el formulario de inversion y procesar simulaciones
# maneja GET (mostrar formulario) y POST (procesar y mostrar resultados)
# rutas legacy para compatibilidad (redireccionan a la ruta principal)
@app.route('/inversion', methods=['GET', 'POST'])
@app.route('/simular', methods=['POST'])
def inversion_redirect():
    # redirigir a la ruta principal
    return redirect(url_for('index'))


@app.route('/resultados')
def resultados():
    # redirigir a la ruta principal
    return redirect(url_for('index'))


# ====================================================================
# PUNTO DE ENTRADA DE LA APLICACION
# ====================================================================

# validar que el archivo se esta ejecutando directamente (no importado)
if __name__ == '__main__':
    # ejecutar la aplicacion en modo debug
    # debug=True permite ver errores detallados y recargar automaticamente los cambios
    # nunca usar debug=True en produccion por razones de seguridad
    app.run(debug=True)
