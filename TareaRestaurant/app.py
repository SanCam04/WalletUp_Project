# importar Flask para crear la aplicacion web
from flask import Flask
# importar render_template para renderizar plantillas HTML
from flask import render_template
# importar request para acceder a datos de formularios y requests
from flask import request
# importar redirect para redirigir a otras rutas
from flask import redirect
# importar jsonify para convertir datos a JSON
from flask import jsonify
# importar session para manejar sesiones de usuarios
from flask import session
# importar flash para mostrar mensajes emergentes
from flask import flash
# importar url_for para generar URLs de rutas dinamicamente
from flask import url_for
# importar sqlite3 para conectar a base de datos SQLite
import sqlite3
# importar hashlib para encriptar contrasenas con SHA256
import hashlib
# importar shutil para copiar archivos (backups)
import shutil
# importar random para generar numeros aleatorios (captcha)
import random
# importar wraps para decoradores que preservan metadata de funciones
from functools import wraps 
# importar datetime para manejar fechas y horas
from datetime import datetime
# importar json para procesar datos en formato JSON
import json

# crear instancia de la aplicacion flask
app = Flask(__name__)

# definir clave secreta para las sesiones
app.secret_key = 'tu_clave_secreta_aqui_restaurante_2026'

# nombre de la base de datos
DB = "database.db"

# numero maximo de intentos fallidos de login
MAX_INTENTOS = 5

# =====================================================
# funciones de utilidad y base de datos
# =====================================================

# conectar a la base de datos sqlite
def get_connection():
    # establecer conexion con la base de datos usando sqlite3
    # DB es la variable que contiene el nombre del archivo "database.db"
    conn = sqlite3.connect(DB)

    # convertir cada fila de la base de datos en un objeto Row en lugar de tupla
    # esto permite acceder a los valores por nombre de columna: row['username']
    # en lugar de por indice: row[0]
    conn.row_factory = sqlite3.Row

    # retornar la conexion para que otras funciones la usen
    return conn

# encriptar contrasena con sha256 (algoritmo de encriptacion seguro)
def hash_password(password):
    # convertir la contrasena de string a bytes usando encode()
    # porque hashlib solo trabaja con bytes, no con strings
    # password.encode() convierte 'Admin#2026' a b'Admin#2026'

    # crear un hash SHA256 de la contrasena en bytes
    # hashlib.sha256() genera un objeto hash
    # .hexdigest() convierte ese hash a una cadena hexadecimal
    # ejemplo: 'Admin#2026' se convierte en una cadena larga de numeros y letras

    # retornar la contrasena encriptada como texto hexadecimal
    return hashlib.sha256(password.encode()).hexdigest()

# registrar acciones en la tabla de logs para auditoria y trazabilidad
def registrar_log(usuario, accion):
    # parametros que recibe:
    # usuario: nombre del usuario que realizo la accion
    # accion: descripcion de que hizo el usuario

    # conectar a la base de datos y obtener la conexion
    conn = get_connection()

    # crear un cursor (intermediario) para ejecutar comandos SQL
    cursor = conn.cursor()

    # obtener la fecha y hora actual del sistema
    # datetime.now() obtiene fecha y hora actual
    # strftime() formatea la fecha al formato YYYY-MM-DD HH:MM:SS
    # ejemplo: "2026-04-21 19:30:45"
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ejecutar comando SQL para insertar un nuevo registro en la tabla logs
    # INSERT INTO: inserta una nueva fila en la tabla
    # (usuario, accion, fecha): columnas donde se van a insertar valores
    # VALUES(?, ?, ?): placeholders para los valores (seguridad contra SQL injection)
    # (usuario, accion, fecha): valores que se van a insertar (tupla con los parametros)
    cursor.execute("""
    INSERT INTO logs(usuario, accion, fecha)
    VALUES(?, ?, ?)
    """, (usuario, accion, fecha))

    # confirmar los cambios en la base de datos
    # sin commit(), los cambios no se guardan permanentemente
    conn.commit()

    # cerrar la conexion a la base de datos para liberar recursos
    conn.close()

# obtener todos los privilegios de un usuario
def tiene_privilegio(user_id, privilegio):
    conn = get_connection()
    cursor = conn.cursor()

    # obtener todos los privilegios del usuario mediante joins
    cursor.execute("""
    SELECT p.nombre
    FROM privilegios p
    JOIN rol_privilegio rp ON p.id = rp.privilegio_id
    JOIN usuario_rol ur ON ur.rol_id = rp.rol_id
    WHERE ur.usuario_id = ?
    """, (user_id,))
    
    # obtener todos los permisos del usuario desde la base de datos
    privilegios_usuario = [p[0] for p in cursor.fetchall()]
    conn.close()

    # retornar true si el usuario tiene el privilegio
    return privilegio in privilegios_usuario

# obtener el rol del usuario actual (admin, mesero o cocinero)
def get_user_rol(user_id):
    # parametro que recibe:
    # user_id: identificador numerico del usuario en la base de datos

    # conectar a la base de datos y obtener la conexion
    conn = get_connection()

    # crear un cursor para ejecutar comandos SQL
    cursor = conn.cursor()

    # ejecutar consulta SQL para obtener el nombre del rol del usuario
    # SELECT r.nombre: seleccionar el nombre del rol
    # FROM roles r: de la tabla roles con alias r
    # JOIN usuario_rol ur: unir con la tabla usuario_rol
    # ON r.id = ur.rol_id: unir por el id del rol
    # WHERE ur.usuario_id = ?: donde el usuario sea igual al parametro user_id
    # LIMIT 1: obtener solo el primer resultado
    cursor.execute("""
    SELECT r.nombre
    FROM roles r
    JOIN usuario_rol ur ON r.id = ur.rol_id
    WHERE ur.usuario_id = ?
    LIMIT 1
    """, (user_id,))

    # obtener UNA SOLA fila del resultado de la consulta
    # fetchone() retorna una tupla con la fila o None si no hay resultados
    resultado = cursor.fetchone()

    # cerrar la conexion a la base de datos para liberar recursos
    conn.close()

    # verificar si se obtuvo un resultado
    if resultado:
        # retornar el primer elemento de la tupla (el nombre del rol)
        return resultado[0]

    # retornar None si el usuario no tiene rol asignado
    return None

# =====================================================
# decoradores para proteger rutas
# =====================================================

# decorador para verificar si el usuario esta logueado
# los decoradores son funciones que modifican el comportamiento de otras funciones
def login_required(f):
    # parametro f: la funcion que se va a proteger

    # wraps(f) preserva la metadata de la funcion original (nombre, documentacion)
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # *args: argumentos posicionales de la funcion
        # **kwargs: argumentos nombrados de la funcion

        # verificar si existe 'user_id' en la sesion del usuario
        # session es un diccionario que almacena datos del usuario
        # si no existe user_id significa que el usuario NO esta logueado
        if 'user_id' not in session:
            # redirigir a la pagina de login
            # url_for('login') genera la URL de la ruta login
            return redirect(url_for('login'))

        # si el usuario SI esta logueado, ejecutar la funcion original
        # f(*args, **kwargs) llama a la funcion protegida con los mismos argumentos
        return f(*args, **kwargs)

    # retornar la funcion decorada (con proteccion de login)
    return decorated_function

# decorador para verificar si el usuario tiene un privilegio especifico
# este decorador combina: verificacion de login + verificacion de privilegios
def privilegio_required(privilegio):
    # parametro privilegio: nombre del privilegio requerido (string)
    # ejemplo: 'crear_plato', 'ver_pedidos', 'crear_usuario'

    # funcion interna decorator que recibe la funcion a proteger
    def decorator(f):
        # parametro f: la funcion que se va a proteger

        # wraps(f) preserva la metadata de la funcion original
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # *args: argumentos posicionales de la funcion
            # **kwargs: argumentos nombrados de la funcion

            # verificar si existe 'user_id' en la sesion
            # si no existe significa que el usuario NO esta logueado
            if 'user_id' not in session:
                # redirigir a la pagina de login
                return redirect(url_for('login'))

            # verificar si el usuario tiene el privilegio requerido
            # session['user_id'] es el id del usuario logueado
            # tiene_privilegio() retorna True o False
            # not True = False, por lo que entra al if si NO tiene el privilegio
            if not tiene_privilegio(session['user_id'], privilegio):
                # mostrar mensaje de error usando flash()
                # 'danger' es la clase bootstrap para mensajes de error (rojo)
                flash('sin permiso para acceder a esta seccion', 'danger')

                # redirigir al inicio (index)
                return redirect(url_for('index'))

            # si el usuario SI esta logueado Y tiene el privilegio, ejecutar la funcion
            return f(*args, **kwargs)

        # retornar la funcion decorada
        return decorated_function

    # retornar el decorador para que se pueda usar como @privilegio_required('crear_plato')
    return decorator

# =====================================================
# crear tablas de la base de datos
# =====================================================

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # crear tabla de usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            intentos_fallidos INTEGER DEFAULT 0,
            bloqueado INTEGER DEFAULT 0
        )
    ''')

    # crear tabla de roles
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )
    ''')

    # crear tabla de privilegios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS privilegios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )
    ''')

    # crear tabla de relacion usuario-rol
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuario_rol (
            usuario_id INTEGER,
            rol_id INTEGER,
            PRIMARY KEY(usuario_id, rol_id),
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY(rol_id) REFERENCES roles(id)
        )
    ''')

    # crear tabla de relacion rol-privilegio
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rol_privilegio (
            rol_id INTEGER,
            privilegio_id INTEGER,
            PRIMARY KEY(rol_id, privilegio_id),
            FOREIGN KEY(rol_id) REFERENCES roles(id),
            FOREIGN KEY(privilegio_id) REFERENCES privilegios(id)
        )
    ''')

    # crear tabla de logs de auditoria
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL,
            accion TEXT NOT NULL,
            fecha TEXT NOT NULL
        )
    ''')

    # crear tabla de clientes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT NOT NULL
        )
    ''')

    # crear tabla de platos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS platos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL
        )
    ''')

    # crear tabla de relacion plato-ingrediente
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS plato_ingrediente (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plato_id INTEGER NOT NULL,
            inventario_id INTEGER NOT NULL,
            cantidad_requerida REAL NOT NULL,
            FOREIGN KEY (plato_id) REFERENCES platos(id),
            FOREIGN KEY (inventario_id) REFERENCES inventario(id)
        )
    ''')

    # crear tabla de pedidos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )
    ''')

    # crear tabla de detalles de pedidos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS detalles_pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            plato_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
            FOREIGN KEY (plato_id) REFERENCES platos (id)
        )
    ''')

    # crear tabla de proveedores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_empresa TEXT NOT NULL,
            telefono TEXT NOT NULL,
            producto TEXT NOT NULL,
            precio REAL NOT NULL
        )
    ''')

    # crear tabla de inventario
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_producto TEXT NOT NULL,
            cantidad REAL NOT NULL DEFAULT 0,
            unidad TEXT NOT NULL DEFAULT 'unidad',
            precio_unitario REAL NOT NULL DEFAULT 0,
            ultima_actualizacion TEXT NOT NULL
        )
    ''')

    # crear tabla de compras a proveedores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS compras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proveedor_id INTEGER NOT NULL,
            cantidad REAL NOT NULL,
            precio_total REAL NOT NULL,
            fecha TEXT NOT NULL,
            usuario TEXT NOT NULL,
            porciones_por_unidad REAL DEFAULT 1,
            FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
        )
    ''')

    # agregar columna porciones_por_unidad si la tabla ya existe (para BDs existentes)
    try:
        cursor.execute("ALTER TABLE compras ADD COLUMN porciones_por_unidad REAL DEFAULT 1")
    except Exception:
        pass

    conn.commit()
    conn.close()

# =====================================================
# inicializar roles y privilegios del sistema
# =====================================================

def inicializar_roles():
    conn = get_connection()
    cursor = conn.cursor()

    # definir los tres roles del sistema
    roles = ["admin", "mesero", "cocinero"]

    # definir los privilegios disponibles
    privilegios = [
        "crear_plato", "editar_plato", "eliminar_plato",
        "crear_cliente", "ver_clientes",
        "crear_pedido", "ver_pedidos",
        "ver_logs", "crear_usuario", "backup",
        "ver_proveedores", "gestionar_proveedores",
        "ver_inventario", "gestionar_inventario"
    ]

    # insertar los roles si no existen
    for r in roles:
        cursor.execute("INSERT OR IGNORE INTO roles(nombre) VALUES(?)", (r,))

    # insertar los privilegios si no existen
    for p in privilegios:
        cursor.execute("INSERT OR IGNORE INTO privilegios(nombre) VALUES(?)", (p,))

    conn.commit()

    # obtener ids de roles
    cursor.execute("SELECT id, nombre FROM roles")
    roles_dict = {r[1]: r[0] for r in cursor.fetchall()}

    # obtener ids de privilegios
    cursor.execute("SELECT id, nombre FROM privilegios")
    priv_dict = {p[1]: p[0] for p in cursor.fetchall()}

    # definir permisos por rol
    permisos = {
        "admin": ["crear_plato", "editar_plato", "eliminar_plato",
                  "crear_cliente", "ver_clientes", "crear_pedido", "ver_pedidos",
                  "ver_logs", "crear_usuario", "backup",
                  "ver_proveedores", "gestionar_proveedores",
                  "ver_inventario", "gestionar_inventario"],
        "mesero": ["crear_cliente", "ver_clientes", "crear_pedido", "ver_pedidos"],
        "cocinero": ["ver_pedidos"]
    }

    # asignar privilegios a cada rol
    for rol, lista_priv in permisos.items():
        for priv in lista_priv:
            cursor.execute("""
            INSERT OR IGNORE INTO rol_privilegio(rol_id, privilegio_id)
            VALUES(?, ?)
            """, (roles_dict[rol], priv_dict[priv]))

    conn.commit()
    conn.close()

# =====================================================
# crear usuarios iniciales del sistema
# =====================================================

def crear_usuario_inicial(username, password, rol_nombre):
    conn = get_connection()
    cursor = conn.cursor()

    # insertar el usuario con contrasena hasheada
    cursor.execute("""
    INSERT OR IGNORE INTO usuarios(username, password)
    VALUES(?, ?)
    """, (username, hash_password(password)))

    # obtener el id del usuario creado
    cursor.execute("SELECT id FROM usuarios WHERE username=?", (username,))
    resultado = cursor.fetchone()

    if resultado:
        user_id = resultado[0]

        # obtener el id del rol
        cursor.execute("SELECT id FROM roles WHERE nombre=?", (rol_nombre,))
        rol_resultado = cursor.fetchone()

        if rol_resultado:
            rol_id = rol_resultado[0]

            # asignar el rol al usuario
            cursor.execute("""
            INSERT OR IGNORE INTO usuario_rol(usuario_id, rol_id)
            VALUES(?, ?)
            """, (user_id, rol_id))

    conn.commit()
    conn.close()

# =====================================================
# rutas de autenticacion (login y logout)
# =====================================================

# ruta para la pagina de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        # generar numeros aleatorios para captcha
        captcha_a = random.randint(1, 9)
        captcha_b = random.randint(1, 9)

        # guardar numeros en la sesion
        session['captcha_a'] = captcha_a
        session['captcha_b'] = captcha_b

        # si ya esta logueado, redirigir al indice
        if 'user_id' in session:
            return redirect(url_for('index'))

        # mostrar formulario de login
        return render_template('login.html')

    # cuando el usuario envia el formulario de login (request POST)
    if request.method == 'POST':
        # obtener el campo 'username' del formulario
        # request.form.get() obtiene valores de formularios HTML
        # el segundo parametro '' es el valor por defecto si no existe el campo
        username = request.form.get('username', '')

        # obtener el campo 'password' del formulario
        password = request.form.get('password', '')

        # obtener el campo 'captcha_respuesta' del formulario
        captcha_respuesta = request.form.get('captcha_respuesta', '')

        # validar el CAPTCHA primero antes de validar usuario y contrasena
        try:
            # convertir la respuesta del captcha de string a numero entero
            # ejemplo: '18' se convierte a 18
            captcha_respuesta_int = int(captcha_respuesta)

            # obtener los numeros del captcha que guardamos en la sesion
            # session.get('captcha_a', 0) obtiene captcha_a o 0 si no existe
            # sumamos los dos numeros para obtener la respuesta correcta
            respuesta_correcta = session.get('captcha_a', 0) + session.get('captcha_b', 0)

            # comparar la respuesta del usuario con la respuesta correcta
            if captcha_respuesta_int != respuesta_correcta:
                # si es incorrecto, mostrar mensaje de error
                flash('captcha incorrecto', 'danger')

                # redirigir a la pagina de login para intentar de nuevo
                return redirect(url_for('login'))

        # capturar excepciones si la respuesta no es un numero valido
        except (ValueError, TypeError):
            # ValueError: si int() no puede convertir el string a numero
            # TypeError: si hay otro error de tipo de datos
            flash('captcha invalido', 'danger')

            # redirigir a login
            return redirect(url_for('login'))

        # validar que los campos de usuario y contrasena no esten vacios
        if not username or not password:
            # 'not username' es True si username es vacio o None
            # 'not password' es True si password es vacio o None
            flash('usuario y contrasena son requeridos', 'danger')

            # redirigir a login para que el usuario intente de nuevo
            return redirect(url_for('login'))

        # conectar a la base de datos para buscar al usuario
        conn = get_connection()

        # crear cursor para ejecutar comandos SQL
        cursor = conn.cursor()

        # buscar al usuario en la tabla usuarios por nombre de usuario
        # SELECT *: obtener todos los campos del usuario
        # WHERE username=?: buscar por el username ingresado
        # ? es un placeholder para evitar SQL injection
        cursor.execute("SELECT * FROM usuarios WHERE username=?", (username,))

        # obtener el resultado (una fila) de la consulta
        # fetchone() retorna una tupla con los datos del usuario o None
        # indices de la tupla: [0]=id, [1]=username, [2]=password, [3]=intentos_fallidos, [4]=bloqueado
        user = cursor.fetchone()

        # verificar si el usuario no existe en la base de datos
        if not user:
            # 'not user' es True si user es None (usuario no encontrado)
            flash('credenciales incorrectas', 'danger')

            # registrar en logs el intento de acceso con usuario inexistente
            registrar_log(username, "intento acceso usuario inexistente")

            # cerrar la conexion a la base de datos
            conn.close()

            # redirigir a login
            return redirect(url_for('login'))

        # verificar si la cuenta del usuario esta bloqueada por demasiados intentos fallidos
        # user[4] es el campo 'bloqueado' (0=activo, 1=bloqueado)
        if user[4] == 1:
            # la cuenta esta bloqueada
            flash('cuenta bloqueada por intentos fallidos', 'danger')

            # registrar el intento de acceso a cuenta bloqueada
            registrar_log(username, "intento acceso cuenta bloqueada")

            # cerrar la conexion
            conn.close()

            # redirigir a login
            return redirect(url_for('login'))

        # encriptar la contrasena ingresada con SHA256 para compararla con la del usuario
        # hash_password() convierte 'Admin#2026' en una cadena larga encriptada
        password_hash = hash_password(password)

        # verificar si la contrasena ingresada es CORRECTA
        # user[2] es el campo 'password' (contrasena encriptada en la BD)
        if password_hash == user[2]:
            # la contrasena es correcta, LOGIN EXITOSO
            # user[0] es el id del usuario

            # actualizar la tabla usuarios: resetear intentos fallidos a 0
            # porque el login fue exitoso
            cursor.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE id=?", (user[0],))

            # confirmar los cambios en la base de datos
            conn.commit()

            # obtener el rol del usuario (admin, mesero o cocinero)
            rol = get_user_rol(user[0])

            # guardar datos en la sesion del usuario (esto persiste durante la navegacion)
            # session['user_id'] almacena el id del usuario logueado
            session['user_id'] = user[0]

            # session['username'] almacena el nombre de usuario para mostrar en navbar
            session['username'] = username

            # session['rol'] almacena el rol para verificar permisos
            session['rol'] = rol

            # registrar en logs el login exitoso
            registrar_log(username, "login exitoso")

            # cerrar la conexion a la base de datos
            conn.close()

            # redirigir a la pagina principal (index)
            return redirect(url_for('index'))

        # si llegamos aqui significa que la CONTRASENA ES INCORRECTA
        else:
            # obtener el numero actual de intentos fallidos
            # user[3] es el campo 'intentos_fallidos'
            intentos = user[3] + 1

            # calcular si la cuenta debe bloquearse
            # si intentos >= MAX_INTENTOS (5), bloqueado = 1, sino = 0
            bloqueado = 1 if intentos >= MAX_INTENTOS else 0

            # actualizar la tabla usuarios con los nuevos intentos fallidos y estado bloqueado
            cursor.execute("""
            UPDATE usuarios
            SET intentos_fallidos=?, bloqueado=?
            WHERE id=?
            """, (intentos, bloqueado, user[0]))

            # confirmar los cambios en la base de datos
            conn.commit()

            # registrar en logs el intento fallido de login
            registrar_log(username, "login fallido")

            # cerrar la conexion
            conn.close()

            # mostrar mensaje de error con el numero de intentos restantes
            # f'...' es una f-string para interpolar variables dentro del string
            # ejemplo: "credenciales incorrectas (2/5)"
            flash(f'credenciales incorrectas ({intentos}/{MAX_INTENTOS})', 'danger')

            # redirigir a login para intentar de nuevo
            return redirect(url_for('login'))

# ruta para cerrar sesion
@app.route('/logout')
@login_required
def logout():
    # registrar el logout
    registrar_log(session.get('username', 'desconocido'), "logout")

    # limpiar la sesion
    session.clear()

    # redirigir a login
    return redirect(url_for('login'))

# =====================================================
# rutas principales protegidas por login
# =====================================================

# ruta principal que muestra dashboard
@app.route('/')
@login_required
def index():
    conn = get_connection()

    # obtener todos los clientes
    clientes = conn.execute("SELECT * FROM clientes").fetchall()

    # obtener todos los platos
    platos = conn.execute("SELECT * FROM platos").fetchall()

    # obtener todos los pedidos
    pedidos = conn.execute("""
        SELECT p.id, c.nombre as cliente_nombre, p.fecha
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    """).fetchall()

    conn.close()

    # retornar plantilla con los datos
    return render_template('index.html',
                         clientes=clientes,
                         platos=platos,
                         pedidos=pedidos)

# =====================================================
# rutas para gestion de clientes
# =====================================================

# ruta para mostrar formulario de registrar cliente
@app.route('/registrar_cliente')
@login_required
@privilegio_required('crear_cliente')
def registrar_cliente():
    return render_template('registrar_cliente.html')

# ruta para guardar un nuevo cliente
@app.route('/guardar_cliente', methods=['POST'])
@login_required
@privilegio_required('crear_cliente')
def guardar_cliente():
    # obtener datos del formulario
    nombre = request.form.get('nombre', '').strip()
    telefono = request.form.get('telefono', '').strip()

    # validar datos
    if not nombre or not telefono:
        flash('nombre y telefono son requeridos', 'danger')
        return redirect(url_for('registrar_cliente'))

    try:
        conn = get_connection()

        # insertar el cliente
        conn.execute("INSERT INTO clientes (nombre, telefono) VALUES (?, ?)",
                    (nombre, telefono))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"creo cliente '{nombre}'")

        flash('cliente registrado correctamente', 'success')
    except Exception as e:
        flash(f'error al registrar cliente: {str(e)}', 'danger')

    return redirect(url_for('index'))

# =====================================================
# rutas para gestion de platos
# =====================================================

# ruta para mostrar formulario de registrar plato
@app.route('/registrar_plato')
@login_required
@privilegio_required('crear_plato')
def registrar_plato():
    conn = get_connection()

    # obtener todos los items del inventario
    inventario = conn.execute("SELECT * FROM inventario ORDER BY nombre_producto").fetchall()

    conn.close()

    return render_template('registrar_plato.html', inventario=inventario)

# ruta para guardar un nuevo plato
@app.route('/guardar_plato', methods=['POST'])
@login_required
@privilegio_required('crear_plato')
def guardar_plato():
    # obtener datos del formulario
    nombre = request.form.get('nombre', '').strip()
    precio_str = request.form.get('precio', '')
    ingredientes_json = request.form.get('ingredientes', '[]')

    # validar nombre
    if not nombre:
        flash('nombre del plato es requerido', 'danger')
        return redirect(url_for('registrar_plato'))

    # validar precio
    try:
        precio = float(precio_str)
        if precio < 0:
            raise ValueError("precio no puede ser negativo")
    except (ValueError, TypeError):
        flash('precio invalido', 'danger')
        return redirect(url_for('registrar_plato'))

    # procesar ingredientes JSON
    try:
        ingredientes = json.loads(ingredientes_json)
    except (json.JSONDecodeError, TypeError):
        ingredientes = []

    try:
        conn = get_connection()

        # insertar el plato
        conn.execute("INSERT INTO platos (nombre, precio) VALUES (?, ?)",
                    (nombre, precio))

        # obtener el id del plato que se acaba de insertar
        plato_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        # insertar los ingredientes asociados al plato
        for ingrediente in ingredientes:
            try:
                inventario_id = int(ingrediente.get('id'))
                cantidad_requerida = float(ingrediente.get('cantidad', 0))

                # validar que el inventario existe
                inv_existe = conn.execute(
                    "SELECT id FROM inventario WHERE id = ?",
                    (inventario_id,)
                ).fetchone()

                if inv_existe:
                    conn.execute("""
                        INSERT INTO plato_ingrediente (plato_id, inventario_id, cantidad_requerida)
                        VALUES (?, ?, ?)
                    """, (plato_id, inventario_id, cantidad_requerida))
            except (ValueError, KeyError):
                continue

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"creo plato '{nombre}' - ${precio} con {len(ingredientes)} ingredientes")

        flash('plato registrado correctamente', 'success')
    except Exception as e:
        flash(f'error al registrar plato: {str(e)}', 'danger')

    return redirect(url_for('index'))

# =====================================================
# rutas para gestion de pedidos
# =====================================================

# ruta para mostrar formulario de crear pedido
@app.route('/crear_pedido')
@login_required
@privilegio_required('crear_pedido')
def crear_pedido():
    conn = get_connection()

    # obtener todos los clientes
    clientes = conn.execute("SELECT * FROM clientes").fetchall()

    conn.close()

    return render_template('crear_pedido.html', clientes=clientes)

# ruta para guardar un nuevo pedido
@app.route('/guardar_pedido', methods=['POST'])
@login_required
@privilegio_required('crear_pedido')
def guardar_pedido():
    # obtener datos del formulario
    cliente_id = request.form.get('cliente_id')
    fecha = request.form.get('fecha')

    # validar datos
    if not cliente_id or not fecha:
        flash('cliente y fecha son requeridos', 'danger')
        return redirect(url_for('crear_pedido'))

    try:
        conn = get_connection()

        # verificar que el cliente existe
        cliente_existe = conn.execute(
            "SELECT id FROM clientes WHERE id = ?", (cliente_id,)
        ).fetchone()

        if not cliente_existe:
            flash('cliente no existe', 'danger')
            conn.close()
            return redirect(url_for('crear_pedido'))

        # insertar el pedido
        conn.execute("INSERT INTO pedidos (cliente_id, fecha) VALUES (?, ?)",
                    (cliente_id, fecha))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"creo pedido para cliente {cliente_id}")

        flash('pedido creado correctamente', 'success')
    except Exception as e:
        flash(f'error al crear pedido: {str(e)}', 'danger')

    return redirect(url_for('index'))

# ruta para agregar platos a un pedido
@app.route('/agregar_detalle', methods=['POST'])
@login_required
@privilegio_required('crear_pedido')
def agregar_detalle():
    # obtener datos del formulario
    pedido_id = request.form.get('pedido_id')
    plato_id = request.form.get('plato_id')
    cantidad = request.form.get('cantidad')

    # validar datos
    if not pedido_id or not plato_id or not cantidad:
        flash('pedido, plato y cantidad son requeridos', 'danger')
        return redirect(url_for('index'))

    try:
        cantidad = int(cantidad)
        if cantidad <= 0:
            raise ValueError("cantidad debe ser mayor a 0")
    except (ValueError, TypeError):
        flash('cantidad invalida', 'danger')
        return redirect(url_for('index'))

    try:
        conn = get_connection()

        # verificar que el pedido existe
        pedido_existe = conn.execute(
            "SELECT id FROM pedidos WHERE id = ?", (pedido_id,)
        ).fetchone()

        # verificar que el plato existe
        plato_existe = conn.execute(
            "SELECT id FROM platos WHERE id = ?", (plato_id,)
        ).fetchone()

        if not pedido_existe or not plato_existe:
            flash('pedido o plato no existe', 'danger')
            conn.close()
            return redirect(url_for('index'))

        # insertar detalle del pedido
        conn.execute("""
            INSERT INTO detalles_pedidos (pedido_id, plato_id, cantidad)
            VALUES (?, ?, ?)
        """, (pedido_id, plato_id, cantidad))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"agrego plato {plato_id} a pedido {pedido_id}")

        flash('plato agregado al pedido', 'success')
    except Exception as e:
        flash(f'error al agregar plato: {str(e)}', 'danger')

    return redirect(url_for('index'))

# ruta para consultar pedidos con detalles
@app.route('/consultar_pedidos')
@login_required
@privilegio_required('ver_pedidos')
def consultar_pedidos():
    return render_template('consultar_pedidos.html')

# api para obtener pedidos en formato json
@app.route('/api/consultar_pedidos', methods=['GET'])
@login_required
@privilegio_required('ver_pedidos')
def api_consultar_pedidos():
    conn = get_connection()

    # obtener todos los pedidos con cliente
    pedidos = conn.execute("""
        SELECT p.id, c.nombre as cliente_nombre, c.telefono, p.fecha
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    """).fetchall()

    resultado = []

    # iterar sobre cada pedido
    for pedido in pedidos:
        # obtener detalles del pedido
        detalles_rows = conn.execute("""
            SELECT dp.cantidad, pl.nombre as plato_nombre, pl.precio
            FROM detalles_pedidos dp
            JOIN platos pl ON dp.plato_id = pl.id
            WHERE dp.pedido_id = ?
        """, (pedido['id'],)).fetchall()

        # convertir detalles a lista
        detalles_list = []
        total = 0

        for detalle in detalles_rows:
            subtotal = detalle['cantidad'] * detalle['precio']
            total += subtotal

            detalles_list.append({
                'cantidad': detalle['cantidad'],
                'plato_nombre': detalle['plato_nombre'],
                'precio': detalle['precio'],
                'subtotal': subtotal
            })

        # agregar pedido al resultado
        resultado.append({
            'id': pedido['id'],
            'cliente_nombre': pedido['cliente_nombre'],
            'telefono': pedido['telefono'],
            'fecha': pedido['fecha'],
            'detalles': detalles_list,
            'total': total
        })

    conn.close()

    # registrar en logs
    registrar_log(session['username'], "consulto pedidos")

    # retornar json
    return jsonify(resultado)

# =====================================================
# rutas administrativas (solo para admin)
# =====================================================

# ruta para ver y gestionar usuarios
@app.route('/admin/usuarios')
@login_required
@privilegio_required('crear_usuario')
def admin_usuarios():
    conn = get_connection()

    # obtener todos los usuarios con sus roles
    usuarios = conn.execute("""
        SELECT u.id, u.username, u.bloqueado,
               GROUP_CONCAT(r.nombre, ', ') as roles
        FROM usuarios u
        LEFT JOIN usuario_rol ur ON u.id = ur.usuario_id
        LEFT JOIN roles r ON ur.rol_id = r.id
        GROUP BY u.id
    """).fetchall()

    conn.close()

    # registrar en logs
    registrar_log(session['username'], "acceso a gestion de usuarios")

    return render_template('admin_usuarios.html', usuarios=usuarios)

# ruta para crear un nuevo usuario (solo admin)
@app.route('/admin/crear_usuario', methods=['POST'])
@login_required
@privilegio_required('crear_usuario')
def admin_crear_usuario():
    # obtener datos del formulario
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    rol = request.form.get('rol', '').strip()

    # validar datos
    if not username or not password or not rol:
        flash('usuario, contrasena y rol son requeridos', 'danger')
        return redirect(url_for('admin_usuarios'))

    # validar rol
    if rol not in ['mesero', 'cocinero']:
        flash('rol invalido', 'danger')
        return redirect(url_for('admin_usuarios'))

    try:
        # crear el usuario
        crear_usuario_inicial(username, password, rol)

        # registrar en logs
        registrar_log(session['username'], f"creo usuario {username} con rol {rol}")

        flash(f'usuario {username} creado correctamente', 'success')
    except Exception as e:
        flash(f'error al crear usuario: {str(e)}', 'danger')

    return redirect(url_for('admin_usuarios'))

# ruta para ver logs de auditoria
@app.route('/admin/logs')
@login_required
@privilegio_required('ver_logs')
def admin_logs():
    conn = get_connection()

    # obtener todos los logs ordenados por fecha descendente
    logs = conn.execute("""
        SELECT * FROM logs
        ORDER BY fecha DESC
        LIMIT 500
    """).fetchall()

    conn.close()

    # registrar en logs
    registrar_log(session['username'], "acceso a auditoria")

    return render_template('admin_logs.html', logs=logs)

# ruta para hacer backup de la base de datos
@app.route('/admin/backup', methods=['POST'])
@login_required
@privilegio_required('backup')
def admin_backup():
    try:
        # crear nombre del archivo con fecha y hora
        fecha = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_restaurante_{fecha}.db"

        # copiar la base de datos
        shutil.copy(DB, backup_file)

        # registrar en logs
        registrar_log(session['username'], f"backup creado: {backup_file}")

        flash(f'backup creado: {backup_file}', 'success')
    except Exception as e:
        flash(f'error en backup: {str(e)}', 'danger')

    return redirect(url_for('admin_usuarios'))

# =====================================================
# rutas de proveedores (solo admin)
# =====================================================

# ruta para ver proveedores
@app.route('/admin/proveedores')
@login_required
@privilegio_required('ver_proveedores')
def admin_proveedores():
    conn = get_connection()

    # obtener todos los proveedores
    proveedores = conn.execute("SELECT * FROM proveedores").fetchall()

    conn.close()

    # registrar en logs
    registrar_log(session['username'], "acceso a gestion de proveedores")

    return render_template('admin_proveedores.html', proveedores=proveedores)

# ruta para crear un nuevo proveedor
@app.route('/admin/proveedores/crear', methods=['POST'])
@login_required
@privilegio_required('gestionar_proveedores')
def admin_crear_proveedor():
    # obtener datos del formulario
    nombre_empresa = request.form.get('nombre_empresa', '').strip()
    telefono = request.form.get('telefono', '').strip()
    producto = request.form.get('producto', '').strip()
    precio_str = request.form.get('precio', '')

    # validar datos
    if not nombre_empresa or not telefono or not producto:
        flash('nombre empresa, telefono y producto son requeridos', 'danger')
        return redirect(url_for('admin_proveedores'))

    # validar precio
    try:
        precio = float(precio_str)
        if precio < 0:
            raise ValueError("precio no puede ser negativo")
    except (ValueError, TypeError):
        flash('precio invalido', 'danger')
        return redirect(url_for('admin_proveedores'))

    try:
        conn = get_connection()

        # insertar el proveedor
        conn.execute("""
            INSERT INTO proveedores (nombre_empresa, telefono, producto, precio)
            VALUES (?, ?, ?, ?)
        """, (nombre_empresa, telefono, producto, precio))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"creo proveedor '{nombre_empresa}' - producto '{producto}'")

        flash('proveedor creado correctamente', 'success')
    except Exception as e:
        flash(f'error al crear proveedor: {str(e)}', 'danger')

    return redirect(url_for('admin_proveedores'))

# ruta para editar un proveedor
@app.route('/admin/proveedores/editar/<int:id>', methods=['POST'])
@login_required
@privilegio_required('gestionar_proveedores')
def admin_editar_proveedor(id):
    # obtener datos del formulario
    nombre_empresa = request.form.get('nombre_empresa', '').strip()
    telefono = request.form.get('telefono', '').strip()
    producto = request.form.get('producto', '').strip()
    precio_str = request.form.get('precio', '')

    # validar datos
    if not nombre_empresa or not telefono or not producto:
        flash('nombre empresa, telefono y producto son requeridos', 'danger')
        return redirect(url_for('admin_proveedores'))

    # validar precio
    try:
        precio = float(precio_str)
        if precio < 0:
            raise ValueError("precio no puede ser negativo")
    except (ValueError, TypeError):
        flash('precio invalido', 'danger')
        return redirect(url_for('admin_proveedores'))

    try:
        conn = get_connection()

        # verificar que el proveedor existe
        proveedor = conn.execute("SELECT * FROM proveedores WHERE id = ?", (id,)).fetchone()
        if not proveedor:
            flash('proveedor no existe', 'danger')
            conn.close()
            return redirect(url_for('admin_proveedores'))

        # actualizar el proveedor
        conn.execute("""
            UPDATE proveedores
            SET nombre_empresa = ?, telefono = ?, producto = ?, precio = ?
            WHERE id = ?
        """, (nombre_empresa, telefono, producto, precio, id))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"edito proveedor '{nombre_empresa}' (id: {id})")

        flash('proveedor actualizado correctamente', 'success')
    except Exception as e:
        flash(f'error al editar proveedor: {str(e)}', 'danger')

    return redirect(url_for('admin_proveedores'))

# ruta para eliminar un proveedor
@app.route('/admin/proveedores/eliminar/<int:id>', methods=['POST'])
@login_required
@privilegio_required('gestionar_proveedores')
def admin_eliminar_proveedor(id):
    try:
        conn = get_connection()

        # verificar que el proveedor existe
        proveedor = conn.execute("SELECT * FROM proveedores WHERE id = ?", (id,)).fetchone()
        if not proveedor:
            flash('proveedor no existe', 'danger')
            conn.close()
            return redirect(url_for('admin_proveedores'))

        # verificar que el proveedor no tiene compras asociadas
        compras = conn.execute("SELECT COUNT(*) as total FROM compras WHERE proveedor_id = ?", (id,)).fetchone()
        if compras['total'] > 0:
            flash('no se puede eliminar proveedor con compras registradas', 'danger')
            conn.close()
            return redirect(url_for('admin_proveedores'))

        # eliminar el proveedor
        conn.execute("DELETE FROM proveedores WHERE id = ?", (id,))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"elimino proveedor '{proveedor['nombre_empresa']}' (id: {id})")

        flash('proveedor eliminado correctamente', 'success')
    except Exception as e:
        flash(f'error al eliminar proveedor: {str(e)}', 'danger')

    return redirect(url_for('admin_proveedores'))

# =====================================================
# rutas de inventario (solo admin)
# =====================================================

# ruta para ver inventario
@app.route('/admin/inventario')
@login_required
@privilegio_required('ver_inventario')
def admin_inventario():
    conn = get_connection()

    # obtener todos los items del inventario
    inventario = conn.execute("SELECT * FROM inventario ORDER BY nombre_producto").fetchall()

    # obtener los proveedores para el formulario de compra
    proveedores = conn.execute("SELECT * FROM proveedores").fetchall()

    # obtener las ultimas 20 compras
    compras = conn.execute("""
        SELECT c.id, p.nombre_empresa, p.producto, c.cantidad, c.precio_total, c.fecha, c.usuario
        FROM compras c
        JOIN proveedores p ON c.proveedor_id = p.id
        ORDER BY c.fecha DESC
        LIMIT 20
    """).fetchall()

    conn.close()

    # registrar en logs
    registrar_log(session['username'], "acceso a inventario")

    return render_template('admin_inventario.html',
                         inventario=inventario,
                         proveedores=proveedores,
                         compras=compras)

# ruta para crear una compra
@app.route('/admin/compras/crear', methods=['POST'])
@login_required
@privilegio_required('gestionar_inventario')
def admin_crear_compra():
    # obtener datos del formulario
    proveedor_id = request.form.get('proveedor_id')
    cantidad_str = request.form.get('cantidad', '')
    fecha = request.form.get('fecha', '')
    porciones_str = request.form.get('porciones_por_unidad', '1')

    # validar datos
    if not proveedor_id or not cantidad_str or not fecha:
        flash('proveedor, cantidad y fecha son requeridos', 'danger')
        return redirect(url_for('admin_inventario'))

    # validar cantidad
    try:
        cantidad = float(cantidad_str)
        if cantidad <= 0:
            raise ValueError("cantidad debe ser mayor a 0")
    except (ValueError, TypeError):
        flash('cantidad invalida', 'danger')
        return redirect(url_for('admin_inventario'))

    # validar porciones
    try:
        porciones = max(1.0, float(porciones_str))
    except (ValueError, TypeError):
        porciones = 1.0

    try:
        conn = get_connection()

        # verificar que el proveedor existe
        proveedor = conn.execute("SELECT * FROM proveedores WHERE id = ?", (proveedor_id,)).fetchone()
        if not proveedor:
            flash('proveedor no existe', 'danger')
            conn.close()
            return redirect(url_for('admin_inventario'))

        # calcular precio total
        precio_total = cantidad * proveedor['precio']

        # insertar la compra con porciones
        conn.execute("""
            INSERT INTO compras (proveedor_id, cantidad, precio_total, fecha, usuario, porciones_por_unidad)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (proveedor_id, cantidad, precio_total, fecha, session['username'], porciones))

        # calcular cantidad e inventario basado en porciones
        cantidad_inventario = cantidad * porciones
        precio_por_porcion = proveedor['precio'] / porciones if porciones > 1 else proveedor['precio']
        unidad_inventario = 'porcion' if porciones > 1 else 'unidad'

        # buscar si el producto ya existe en inventario
        item_inventario = conn.execute("""
            SELECT * FROM inventario WHERE nombre_producto = ?
        """, (proveedor['producto'],)).fetchone()

        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if item_inventario:
            # actualizar la cantidad en inventario
            nueva_cantidad = item_inventario['cantidad'] + cantidad_inventario
            conn.execute("""
                UPDATE inventario
                SET cantidad = ?, ultima_actualizacion = ?
                WHERE id = ?
            """, (nueva_cantidad, fecha_actual, item_inventario['id']))
        else:
            # insertar nuevo item en inventario
            conn.execute("""
                INSERT INTO inventario (nombre_producto, cantidad, unidad, precio_unitario, ultima_actualizacion)
                VALUES (?, ?, ?, ?, ?)
            """, (proveedor['producto'], cantidad_inventario, unidad_inventario, precio_por_porcion, fecha_actual))

        conn.commit()
        conn.close()

        # registrar en logs
        if porciones > 1:
            registrar_log(session['username'],
                         f"creo compra a proveedor '{proveedor['nombre_empresa']}' - producto '{proveedor['producto']}' - cantidad {cantidad} ÷ {porciones} porciones")
        else:
            registrar_log(session['username'],
                         f"creo compra a proveedor '{proveedor['nombre_empresa']}' - producto '{proveedor['producto']}' - cantidad {cantidad}")

        flash('compra registrada y agregada a inventario correctamente', 'success')
    except Exception as e:
        flash(f'error al crear compra: {str(e)}', 'danger')

    return redirect(url_for('admin_inventario'))

# ruta para editar inventario
@app.route('/admin/inventario/editar/<int:id>', methods=['POST'])
@login_required
@privilegio_required('gestionar_inventario')
def admin_editar_inventario(id):
    # obtener datos del formulario
    cantidad_str = request.form.get('cantidad', '')
    unidad = request.form.get('unidad', '').strip()
    precio_unitario_str = request.form.get('precio_unitario', '')

    # validar cantidad
    try:
        cantidad = float(cantidad_str)
        if cantidad < 0:
            raise ValueError("cantidad no puede ser negativa")
    except (ValueError, TypeError):
        flash('cantidad invalida', 'danger')
        return redirect(url_for('admin_inventario'))

    # validar precio
    try:
        precio_unitario = float(precio_unitario_str)
        if precio_unitario < 0:
            raise ValueError("precio no puede ser negativo")
    except (ValueError, TypeError):
        flash('precio invalido', 'danger')
        return redirect(url_for('admin_inventario'))

    try:
        conn = get_connection()

        # verificar que el item existe
        item = conn.execute("SELECT * FROM inventario WHERE id = ?", (id,)).fetchone()
        if not item:
            flash('item de inventario no existe', 'danger')
            conn.close()
            return redirect(url_for('admin_inventario'))

        # actualizar el inventario
        fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn.execute("""
            UPDATE inventario
            SET cantidad = ?, unidad = ?, precio_unitario = ?, ultima_actualizacion = ?
            WHERE id = ?
        """, (cantidad, unidad, precio_unitario, fecha_actual, id))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"edito inventario '{item['nombre_producto']}' (id: {id})")

        flash('inventario actualizado correctamente', 'success')
    except Exception as e:
        flash(f'error al editar inventario: {str(e)}', 'danger')

    return redirect(url_for('admin_inventario'))

# ruta para eliminar del inventario
@app.route('/admin/inventario/eliminar/<int:id>', methods=['POST'])
@login_required
@privilegio_required('gestionar_inventario')
def admin_eliminar_inventario(id):
    try:
        conn = get_connection()

        # verificar que el item existe
        item = conn.execute("SELECT * FROM inventario WHERE id = ?", (id,)).fetchone()
        if not item:
            flash('item de inventario no existe', 'danger')
            conn.close()
            return redirect(url_for('admin_inventario'))

        # eliminar del inventario
        conn.execute("DELETE FROM inventario WHERE id = ?", (id,))

        conn.commit()
        conn.close()

        # registrar en logs
        registrar_log(session['username'], f"elimino inventario '{item['nombre_producto']}' (id: {id})")

        flash('item eliminado del inventario correctamente', 'success')
    except Exception as e:
        flash(f'error al eliminar del inventario: {str(e)}', 'danger')

    return redirect(url_for('admin_inventario'))

# =====================================================
# punto de entrada de la aplicacion
# =====================================================

if __name__ == '__main__':
    # inicializar base de datos y crear tablas
    init_db()

    # inicializar roles y privilegios
    inicializar_roles()

    # crear usuarios iniciales
    crear_usuario_inicial("admin", "Admin#2026", "admin")
    crear_usuario_inicial("mesero1", "Mesero#2026", "mesero")
    crear_usuario_inicial("cocinero1", "Cocinero#2026", "cocinero")

    # ejecutar aplicacion en modo debug
    app.run(debug=True)
