# importar librerias necesarias de flask para la aplicacion
from flask import Flask, render_template, request, session, redirect, url_for, flash
# importar funciones de seguridad para hashear contrasenas
from werkzeug.security import generate_password_hash, check_password_hash

# crear la aplicacion flask
app = Flask(__name__)
# clave secreta para manejar sesiones
app.secret_key = 'secret'

# diccionario vacio para almacenar usuarios registrados en memoria
usuarios = {}


# ruta raiz que muestra la pagina principal
@app.route('/')
def index():
    # renderizar template del index
    return render_template('index.html')


# ruta para procesar login con metodo post
@app.route('/login', methods=['POST'])
def login():
    # obtener email del formulario
    email = request.form.get('email')
    # obtener contrasena del formulario
    password = request.form.get('password')

    # verificar si el email existe en usuarios y la contrasena es correcta
    if email in usuarios and check_password_hash(usuarios[email]['password'], password):
        # guardar email en sesion
        session['usuario'] = email
        # guardar nombre en sesion
        session['nombre'] = usuarios[email]['nombre']
        # mostrar mensaje de exito
        flash('¡Bienvenido! Sesion iniciada correctamente.', 'success')
        # redirigir a pagina principal
        return redirect(url_for('index'))
    else:
        # mostrar mensaje de error si falla login
        flash('Email o contrasena incorrectos', 'error')
        # redirigir a pagina principal
        return redirect(url_for('index'))


# ruta para procesar registro con metodo post
@app.route('/register', methods=['POST'])
def register():
    # obtener nombre completo del formulario
    fullname = request.form.get('fullname')
    # obtener email del formulario
    email = request.form.get('email')
    # obtener telefono del formulario
    phone = request.form.get('phone')
    # obtener contrasena del formulario
    password = request.form.get('password')
    # obtener confirmacion de contrasena del formulario
    confirm_password = request.form.get('confirm_password')

    # validar si el email ya esta registrado
    if email in usuarios:
        # mostrar error si email existe
        flash('El email ya esta registrado', 'error')
        # redirigir a pagina principal
        return redirect(url_for('index'))

    # validar si las contrasenas coinciden
    if password != confirm_password:
        # mostrar error si no coinciden
        flash('Las contrasenas no coinciden', 'error')
        # redirigir a pagina principal
        return redirect(url_for('index'))

    # validar si la contrasena tiene minimo 6 caracteres
    if len(password) < 6:
        # mostrar error si es muy corta
        flash('La contrasena debe tener al menos 6 caracteres', 'error')
        # redirigir a pagina principal
        return redirect(url_for('index'))

    # crear nuevo usuario en el diccionario
    usuarios[email] = {
        # guardar nombre completo
        'nombre': fullname,
        # guardar email
        'email': email,
        # guardar telefono
        'phone': phone,
        # guardar contrasena hasheada
        'password': generate_password_hash(password)
    }

    # guardar email en sesion para autologueo
    session['usuario'] = email
    # guardar nombre en sesion
    session['nombre'] = fullname

    # mostrar mensaje de exito
    flash('¡Bienvenido! Cuenta creada correctamente.', 'success')
    # redirigir a pagina principal
    return redirect(url_for('index'))


# ruta para cerrar sesion
@app.route('/logout')
def logout():
    # limpiar sesion
    session.clear()
    # mostrar mensaje de cierre de sesion
    flash('Sesion cerrada correctamente.', 'info')
    # redirigir a pagina principal
    return redirect(url_for('index'))


# punto de entrada de la aplicacion
if __name__ == '__main__':
    # ejecutar aplicacion en modo debug
    app.run(debug=True)