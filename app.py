from flask import Flask, request, jsonify, session, redirect, url_for, render_template
from functools import wraps
import sqlite3
import hashlib
from datetime import datetime
import json
import os

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = 'walletup_secret_key_2026'

DB = "walletup.db"
MAX_INTENTOS = 5

# =====================================================
# funciones de utilidad y base de datos
# =====================================================

def get_connection():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def registrar_log(usuario, accion):
    conn = get_connection()
    cursor = conn.cursor()
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO logs(usuario, accion, fecha)
    VALUES(?, ?, ?)
    """, (usuario, accion, fecha))
    conn.commit()
    conn.close()

def tiene_privilegio(user_id, privilegio):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT p.nombre
    FROM privilegios p
    JOIN rol_privilegio rp ON p.id = rp.privilegio_id
    JOIN usuario_rol ur ON ur.rol_id = rp.rol_id
    WHERE ur.usuario_id = ?
    """, (user_id,))

    privilegios_usuario = [p[0] for p in cursor.fetchall()]
    conn.close()
    return privilegio in privilegios_usuario

def get_user_rol(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.nombre
    FROM roles r
    JOIN usuario_rol ur ON r.id = ur.rol_id
    WHERE ur.usuario_id = ?
    LIMIT 1
    """, (user_id,))

    resultado = cursor.fetchone()
    conn.close()

    if resultado:
        return resultado[0]
    return None

def calcular_porcentaje_gasto(user_id):
    conn = get_connection()
    cursor = conn.cursor()

    year = datetime.now().year
    month = datetime.now().month

    cursor.execute("""
    SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo='gasto' THEN monto ELSE 0 END), 0) as total_gastos
    FROM transacciones
    WHERE usuario_id = ? AND strftime('%Y-%m', fecha) = ?
    """, (user_id, f"{year:04d}-{month:02d}"))

    resultado = cursor.fetchone()
    conn.close()

    if resultado:
        total_ingresos = resultado['total_ingresos'] or 0
        total_gastos = resultado['total_gastos'] or 0

        if total_ingresos <= 0:
            return 0

        return (total_gastos / total_ingresos) * 100

    return 0

def recalcular_monto_meta(meta_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT COALESCE(SUM(CASE WHEN t.tipo='gasto' THEN t.monto ELSE -t.monto END), 0) as total
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE c.meta_id = ?
    """, (meta_id,))

    resultado = cursor.fetchone()
    total = float(resultado['total']) if resultado else 0

    cursor.execute("UPDATE metas SET monto_actual = ? WHERE id = ?", (total, meta_id))
    conn.commit()
    conn.close()

def verificar_y_crear_alerta_gasto(user_id):
    porcentaje = calcular_porcentaje_gasto(user_id)

    if porcentaje >= 80:
        conn = get_connection()
        cursor = conn.cursor()

        year = datetime.now().year
        month = datetime.now().month
        mes_actual = f"{year:04d}-{month:02d}"

        cursor.execute("""
        SELECT id FROM alertas
        WHERE usuario_id = ? AND tipo = 'gasto_80' AND strftime('%Y-%m', fecha_creacion) = ?
        """, (user_id, mes_actual))

        alerta_existente = cursor.fetchone()

        if not alerta_existente:
            fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            porcentaje_formateado = f"{porcentaje:.1f}"

            cursor.execute("""
            INSERT INTO alertas(usuario_id, titulo, descripcion, tipo, fecha_creacion)
            VALUES(?, ?, ?, ?, ?)
            """, (
                user_id,
                "⚠️ Alerta: Gasto al 80%",
                f"Has gastado el {porcentaje_formateado}% de tus ingresos este mes. ¡Cuidado con tus gastos!",
                "gasto_80",
                fecha_creacion
            ))

            conn.commit()

        conn.close()

# =====================================================
# decoradores para proteger rutas
# =====================================================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "no autenticado"}), 401
        return f(*args, **kwargs)
    return decorated_function

def privilegio_required(privilegio):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({"error": "no autenticado"}), 401

            if not tiene_privilegio(session['user_id'], privilegio):
                return jsonify({"error": "sin permiso"}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

# =====================================================
# crear tablas de la base de datos
# =====================================================

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # tabla de usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            intentos_fallidos INTEGER DEFAULT 0,
            bloqueado INTEGER DEFAULT 0,
            fecha_registro TEXT NOT NULL
        )
    ''')

    # tabla de roles
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )
    ''')

    # tabla de privilegios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS privilegios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE NOT NULL
        )
    ''')

    # tabla usuario_rol
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuario_rol (
            usuario_id INTEGER,
            rol_id INTEGER,
            PRIMARY KEY(usuario_id, rol_id),
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY(rol_id) REFERENCES roles(id)
        )
    ''')

    # tabla rol_privilegio
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rol_privilegio (
            rol_id INTEGER,
            privilegio_id INTEGER,
            PRIMARY KEY(rol_id, privilegio_id),
            FOREIGN KEY(rol_id) REFERENCES roles(id),
            FOREIGN KEY(privilegio_id) REFERENCES privilegios(id)
        )
    ''')

    # tabla de logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL,
            accion TEXT NOT NULL,
            fecha TEXT NOT NULL
        )
    ''')

    # tabla de categorias
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            tipo TEXT NOT NULL,
            color TEXT,
            deuda_id INTEGER,
            meta_id INTEGER,
            fecha_creacion TEXT NOT NULL,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY(deuda_id) REFERENCES deudas(id) ON DELETE SET NULL,
            FOREIGN KEY(meta_id) REFERENCES metas(id) ON DELETE SET NULL,
            UNIQUE(usuario_id, nombre)
        )
    ''')

    # tabla de transacciones
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transacciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            categoria_id INTEGER NOT NULL,
            monto REAL NOT NULL,
            tipo TEXT NOT NULL,
            descripcion TEXT,
            fecha TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY(categoria_id) REFERENCES categorias(id)
        )
    ''')

    # tabla de metas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            monto_objetivo REAL NOT NULL,
            monto_actual REAL DEFAULT 0,
            fecha_inicio TEXT NOT NULL,
            fecha_objetivo TEXT NOT NULL,
            estado TEXT DEFAULT 'activa',
            descripcion TEXT,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    ''')

    # tabla de articulos educativos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS articulos_educativos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            contenido TEXT NOT NULL,
            categoria TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL
        )
    ''')

    # tabla de alertas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alertas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            tipo TEXT NOT NULL,
            leida INTEGER DEFAULT 0,
            fecha_creacion TEXT NOT NULL,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    ''')

    # tabla de deudas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deudas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            monto_total REAL NOT NULL,
            monto_pagado REAL DEFAULT 0,
            acreedor TEXT NOT NULL,
            fecha_vencimiento TEXT,
            tasa_interes REAL DEFAULT 0,
            estado TEXT DEFAULT 'activa',
            descripcion TEXT,
            fecha_creacion TEXT NOT NULL,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    ''')

    conn.commit()
    conn.close()

# =====================================================
# inicializar roles y privilegios
# =====================================================

def inicializar_roles():
    conn = get_connection()
    cursor = conn.cursor()

    roles = ["cliente", "superadmin"]

    privilegios = [
        "crear_transaccion", "editar_transaccion", "eliminar_transaccion",
        "crear_categoria", "editar_categoria", "eliminar_categoria",
        "crear_meta", "editar_meta", "eliminar_meta",
        "crear_deuda", "editar_deuda", "eliminar_deuda",
        "ver_reportes", "ver_educacion",
        "ver_logs", "crear_usuario", "ver_usuarios", "gestionar_usuarios"
    ]

    for r in roles:
        cursor.execute("INSERT OR IGNORE INTO roles(nombre) VALUES(?)", (r,))

    for p in privilegios:
        cursor.execute("INSERT OR IGNORE INTO privilegios(nombre) VALUES(?)", (p,))

    conn.commit()

    cursor.execute("SELECT id, nombre FROM roles")
    roles_dict = {r[1]: r[0] for r in cursor.fetchall()}

    cursor.execute("SELECT id, nombre FROM privilegios")
    priv_dict = {p[1]: p[0] for p in cursor.fetchall()}

    permisos = {
        "cliente": ["crear_transaccion", "editar_transaccion", "eliminar_transaccion",
                   "crear_categoria", "editar_categoria", "eliminar_categoria",
                   "crear_meta", "editar_meta", "eliminar_meta",
                   "crear_deuda", "editar_deuda", "eliminar_deuda",
                   "ver_reportes", "ver_educacion"],
        "superadmin": ["crear_transaccion", "editar_transaccion", "eliminar_transaccion",
                      "crear_categoria", "editar_categoria", "eliminar_categoria",
                      "crear_meta", "editar_meta", "eliminar_meta",
                      "crear_deuda", "editar_deuda", "eliminar_deuda",
                      "ver_reportes", "ver_educacion",
                      "ver_logs", "crear_usuario", "ver_usuarios", "gestionar_usuarios"]
    }

    for rol, lista_priv in permisos.items():
        for priv in lista_priv:
            cursor.execute("""
            INSERT OR IGNORE INTO rol_privilegio(rol_id, privilegio_id)
            VALUES(?, ?)
            """, (roles_dict[rol], priv_dict[priv]))

    conn.commit()
    conn.close()

def crear_usuario_inicial(username, email, password, rol_nombre):
    conn = get_connection()
    cursor = conn.cursor()
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT OR IGNORE INTO usuarios(username, email, password, fecha_registro)
    VALUES(?, ?, ?, ?)
    """, (username, email, hash_password(password), fecha))

    cursor.execute("SELECT id FROM usuarios WHERE username=?", (username,))
    resultado = cursor.fetchone()

    if resultado:
        user_id = resultado[0]
        cursor.execute("SELECT id FROM roles WHERE nombre=?", (rol_nombre,))
        rol_resultado = cursor.fetchone()

        if rol_resultado:
            rol_id = rol_resultado[0]
            cursor.execute("""
            INSERT OR IGNORE INTO usuario_rol(usuario_id, rol_id)
            VALUES(?, ?)
            """, (user_id, rol_id))

    conn.commit()
    conn.close()

# =====================================================
# rutas de autenticacion
# =====================================================

@app.route('/api/registro', methods=['POST'])
def registro():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({"error": "username, email y password son requeridos"}), 400

    try:
        crear_usuario_inicial(username, email, password, 'cliente')
        registrar_log(username, "registro exitoso")
        return jsonify({"mensaje": "usuario registrado correctamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"error": "username y password son requeridos"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuarios WHERE username=?", (username,))
    user = cursor.fetchone()

    if not user:
        registrar_log(username, "intento acceso usuario inexistente")
        conn.close()
        return jsonify({"error": "credenciales incorrectas"}), 401

    if user['bloqueado'] == 1:
        registrar_log(username, "intento acceso cuenta bloqueada")
        conn.close()
        return jsonify({"error": "cuenta bloqueada por intentos fallidos"}), 403

    password_hash = hash_password(password)

    if password_hash == user['password']:
        cursor.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE id=?", (user['id'],))
        conn.commit()

        rol = get_user_rol(user['id'])

        session['user_id'] = user['id']
        session['username'] = username
        session['email'] = user['email']
        session['rol'] = rol

        registrar_log(username, "login exitoso")
        conn.close()

        return jsonify({
            "mensaje": "login exitoso",
            "usuario_id": user['id'],
            "username": username,
            "rol": rol
        }), 200
    else:
        intentos = user['intentos_fallidos'] + 1
        bloqueado = 1 if intentos >= MAX_INTENTOS else 0

        cursor.execute("""
        UPDATE usuarios
        SET intentos_fallidos=?, bloqueado=?
        WHERE id=?
        """, (intentos, bloqueado, user['id']))

        conn.commit()
        registrar_log(username, "login fallido")
        conn.close()

        return jsonify({"error": f"credenciales incorrectas ({intentos}/{MAX_INTENTOS})"}), 401

@app.route('/api/logout', methods=['POST'])
@api_login_required
def logout():
    registrar_log(session.get('username', 'desconocido'), "logout")
    session.clear()
    return jsonify({"mensaje": "logout exitoso"}), 200

# =====================================================
# rutas de transacciones
# =====================================================

@app.route('/api/transacciones', methods=['GET'])
@api_login_required
def obtener_transacciones():
    conn = get_connection()
    cursor = conn.cursor()

    filtro_categoria = request.args.get('categoria_id')
    filtro_tipo = request.args.get('tipo')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')

    query = """
    SELECT t.*, c.nombre as categoria_nombre
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.usuario_id = ?
    """
    params = [session['user_id']]

    if filtro_categoria:
        query += " AND t.categoria_id = ?"
        params.append(filtro_categoria)

    if filtro_tipo:
        query += " AND t.tipo = ?"
        params.append(filtro_tipo)

    if fecha_inicio:
        query += " AND t.fecha >= ?"
        params.append(fecha_inicio)

    if fecha_fin:
        query += " AND t.fecha <= ?"
        params.append(fecha_fin)

    query += " ORDER BY t.fecha DESC"

    cursor.execute(query, params)
    transacciones = cursor.fetchall()
    conn.close()

    resultado = [dict(t) for t in transacciones]
    registrar_log(session['username'], "consulto transacciones")

    return jsonify(resultado), 200

@app.route('/api/transacciones', methods=['POST'])
@api_login_required
@privilegio_required('crear_transaccion')
def crear_transaccion():
    data = request.get_json()
    categoria_id = data.get('categoria_id')
    monto = data.get('monto')
    tipo = data.get('tipo')
    descripcion = data.get('descripcion', '')
    fecha = data.get('fecha')

    if not categoria_id or not monto or not tipo or not fecha:
        return jsonify({"error": "categoria_id, monto, tipo y fecha son requeridos"}), 400

    if tipo not in ['ingreso', 'gasto']:
        return jsonify({"error": "tipo debe ser 'ingreso' o 'gasto'"}), 400

    try:
        monto = float(monto)
        if monto <= 0:
            return jsonify({"error": "monto debe ser mayor a 0"}), 400
    except ValueError:
        return jsonify({"error": "monto invalido"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM categorias WHERE id=? AND usuario_id=?",
                  (categoria_id, session['user_id']))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "categoria no existe"}), 404

    fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO transacciones(usuario_id, categoria_id, monto, tipo, descripcion, fecha, fecha_creacion)
    VALUES(?, ?, ?, ?, ?, ?, ?)
    """, (session['user_id'], categoria_id, monto, tipo, descripcion, fecha, fecha_creacion))

    conn.commit()
    transaccion_id = cursor.lastrowid
    conn.close()

    registrar_log(session['username'], f"creo transaccion {tipo} de ${monto}")

    if tipo == 'gasto':
        verificar_y_crear_alerta_gasto(session['user_id'])

    return jsonify({
        "id": transaccion_id,
        "mensaje": "transaccion creada correctamente"
    }), 201

@app.route('/api/transacciones/<int:id>', methods=['PUT'])
@api_login_required
@privilegio_required('editar_transaccion')
def editar_transaccion(id):
    data = request.get_json()
    categoria_id = data.get('categoria_id')
    monto = data.get('monto')
    tipo = data.get('tipo')
    descripcion = data.get('descripcion')
    fecha = data.get('fecha')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transacciones WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    transaccion = cursor.fetchone()

    if not transaccion:
        conn.close()
        return jsonify({"error": "transaccion no existe"}), 404

    if tipo and tipo not in ['ingreso', 'gasto']:
        conn.close()
        return jsonify({"error": "tipo debe ser 'ingreso' o 'gasto'"}), 400

    if monto:
        try:
            monto = float(monto)
            if monto <= 0:
                conn.close()
                return jsonify({"error": "monto debe ser mayor a 0"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "monto invalido"}), 400

    if categoria_id:
        cursor.execute("SELECT id FROM categorias WHERE id=? AND usuario_id=?",
                      (categoria_id, session['user_id']))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "categoria no existe"}), 404

    cursor.execute("""
    UPDATE transacciones
    SET categoria_id = COALESCE(?, categoria_id),
        monto = COALESCE(?, monto),
        tipo = COALESCE(?, tipo),
        descripcion = COALESCE(?, descripcion),
        fecha = COALESCE(?, fecha)
    WHERE id = ? AND usuario_id = ?
    """, (categoria_id, monto, tipo, descripcion, fecha, id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"edito transaccion {id}")

    return jsonify({"mensaje": "transaccion actualizada correctamente"}), 200

@app.route('/api/transacciones/<int:id>', methods=['DELETE'])
@api_login_required
@privilegio_required('eliminar_transaccion')
def eliminar_transaccion(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transacciones WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    transaccion = cursor.fetchone()

    if not transaccion:
        conn.close()
        return jsonify({"error": "transaccion no existe"}), 404

    cursor.execute("DELETE FROM transacciones WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"elimino transaccion {id}")

    return jsonify({"mensaje": "transaccion eliminada correctamente"}), 200

# =====================================================
# rutas de categorias
# =====================================================

@app.route('/api/categorias', methods=['GET'])
@api_login_required
def obtener_categorias():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM categorias
    WHERE usuario_id = ?
    ORDER BY nombre
    """, (session['user_id'],))

    categorias = cursor.fetchall()
    conn.close()

    resultado = [dict(c) for c in categorias]
    return jsonify(resultado), 200

@app.route('/api/categorias', methods=['POST'])
@api_login_required
@privilegio_required('crear_categoria')
def crear_categoria():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    tipo = data.get('tipo', '').strip()
    color = data.get('color', '#000000')

    if not nombre or not tipo:
        return jsonify({"error": "nombre y tipo son requeridos"}), 400

    if tipo not in ['ingreso', 'gasto']:
        return jsonify({"error": "tipo debe ser 'ingreso' o 'gasto'"}), 400

    conn = get_connection()
    cursor = conn.cursor()
    fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        cursor.execute("""
        INSERT INTO categorias(usuario_id, nombre, tipo, color, fecha_creacion)
        VALUES(?, ?, ?, ?, ?)
        """, (session['user_id'], nombre, tipo, color, fecha_creacion))

        conn.commit()
        categoria_id = cursor.lastrowid
        conn.close()

        registrar_log(session['username'], f"creo categoria '{nombre}'")

        return jsonify({
            "id": categoria_id,
            "mensaje": "categoria creada correctamente"
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

@app.route('/api/categorias/<int:id>', methods=['PUT'])
@api_login_required
@privilegio_required('editar_categoria')
def editar_categoria(id):
    data = request.get_json()
    nombre = data.get('nombre')
    tipo = data.get('tipo')
    color = data.get('color')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM categorias WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    categoria = cursor.fetchone()

    if not categoria:
        conn.close()
        return jsonify({"error": "categoria no existe"}), 404

    if tipo and tipo not in ['ingreso', 'gasto']:
        conn.close()
        return jsonify({"error": "tipo debe ser 'ingreso' o 'gasto'"}), 400

    cursor.execute("""
    UPDATE categorias
    SET nombre = COALESCE(?, nombre),
        tipo = COALESCE(?, tipo),
        color = COALESCE(?, color)
    WHERE id = ? AND usuario_id = ?
    """, (nombre, tipo, color, id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"edito categoria {id}")

    return jsonify({"mensaje": "categoria actualizada correctamente"}), 200

@app.route('/api/categorias/<int:id>', methods=['DELETE'])
@api_login_required
@privilegio_required('eliminar_categoria')
def eliminar_categoria(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM categorias WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    categoria = cursor.fetchone()

    if not categoria:
        conn.close()
        return jsonify({"error": "categoria no existe"}), 404

    cursor.execute("SELECT COUNT(*) as total FROM transacciones WHERE categoria_id=?", (id,))
    transacciones = cursor.fetchone()

    if transacciones['total'] > 0:
        conn.close()
        return jsonify({"error": "no se puede eliminar categoria con transacciones"}), 400

    cursor.execute("DELETE FROM categorias WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"elimino categoria {id}")

    return jsonify({"mensaje": "categoria eliminada correctamente"}), 200

# =====================================================
# rutas de metas
# =====================================================

@app.route('/api/metas', methods=['GET'])
@api_login_required
def obtener_metas():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM metas
    WHERE usuario_id = ?
    ORDER BY fecha_objetivo
    """, (session['user_id'],))

    metas = cursor.fetchall()
    resultado = []

    for meta in metas:
        meta_dict = dict(meta)

        cursor.execute("""
        SELECT COALESCE(SUM(CASE
            WHEN t.tipo = 'gasto' THEN t.monto
            WHEN t.tipo = 'ingreso' THEN -t.monto
            ELSE 0
        END), 0) as monto_ahorrado
        FROM transacciones t
        JOIN categorias c ON t.categoria_id = c.id
        WHERE c.meta_id = ?
        """, (meta['id'],))

        resultado_monto = cursor.fetchone()
        if resultado_monto:
            meta_dict['monto_actual'] = resultado_monto[0]
        else:
            meta_dict['monto_actual'] = 0
        resultado.append(meta_dict)

    conn.close()
    registrar_log(session['username'], "consulto metas")

    return jsonify(resultado), 200

@app.route('/api/metas', methods=['POST'])
@api_login_required
@privilegio_required('crear_meta')
def crear_meta():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    monto_objetivo = data.get('monto_objetivo')
    fecha_objetivo = data.get('fecha_objetivo')
    descripcion = data.get('descripcion', '')

    if not nombre or not monto_objetivo or not fecha_objetivo:
        return jsonify({"error": "nombre, monto_objetivo y fecha_objetivo son requeridos"}), 400

    try:
        monto_objetivo = float(monto_objetivo)
        if monto_objetivo <= 0:
            return jsonify({"error": "monto_objetivo debe ser mayor a 0"}), 400
    except ValueError:
        return jsonify({"error": "monto_objetivo invalido"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor()
        fecha_inicio = datetime.now().strftime("%Y-%m-%d")
        fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT INTO metas(usuario_id, nombre, monto_objetivo, fecha_inicio, fecha_objetivo, descripcion)
        VALUES(?, ?, ?, ?, ?, ?)
        """, (session['user_id'], nombre, monto_objetivo, fecha_inicio, fecha_objetivo, descripcion))

        conn.commit()
        meta_id = cursor.lastrowid

        cursor.execute("""
        INSERT OR IGNORE INTO categorias(usuario_id, nombre, tipo, meta_id, fecha_creacion)
        VALUES(?, ?, ?, ?, ?)
        """, (session['user_id'], nombre, 'gasto', meta_id, fecha_creacion))

        conn.commit()
        conn.close()
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

    registrar_log(session['username'], f"creo meta '{nombre}' por ${monto_objetivo}")

    return jsonify({
        "id": meta_id,
        "mensaje": "meta creada correctamente"
    }), 201

@app.route('/api/metas/<int:id>', methods=['PUT'])
@api_login_required
@privilegio_required('editar_meta')
def editar_meta(id):
    data = request.get_json()
    nombre = data.get('nombre')
    monto_objetivo = data.get('monto_objetivo')
    monto_actual = data.get('monto_actual')
    fecha_objetivo = data.get('fecha_objetivo')
    estado = data.get('estado')
    descripcion = data.get('descripcion')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM metas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    meta = cursor.fetchone()

    if not meta:
        conn.close()
        return jsonify({"error": "meta no existe"}), 404

    if estado and estado not in ['activa', 'completada', 'cancelada']:
        conn.close()
        return jsonify({"error": "estado invalido"}), 400

    if monto_objetivo:
        try:
            monto_objetivo = float(monto_objetivo)
            if monto_objetivo <= 0:
                conn.close()
                return jsonify({"error": "monto_objetivo debe ser mayor a 0"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "monto_objetivo invalido"}), 400

    if monto_actual is not None:
        try:
            monto_actual = float(monto_actual)
            if monto_actual < 0:
                conn.close()
                return jsonify({"error": "monto_actual no puede ser negativo"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "monto_actual invalido"}), 400

    cursor.execute("""
    UPDATE metas
    SET nombre = COALESCE(?, nombre),
        monto_objetivo = COALESCE(?, monto_objetivo),
        monto_actual = COALESCE(?, monto_actual),
        fecha_objetivo = COALESCE(?, fecha_objetivo),
        estado = COALESCE(?, estado),
        descripcion = COALESCE(?, descripcion)
    WHERE id = ? AND usuario_id = ?
    """, (nombre, monto_objetivo, monto_actual, fecha_objetivo, estado, descripcion, id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"edito meta {id}")

    return jsonify({"mensaje": "meta actualizada correctamente"}), 200

@app.route('/api/metas/<int:id>', methods=['DELETE'])
@api_login_required
@privilegio_required('eliminar_meta')
def eliminar_meta(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM metas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    meta = cursor.fetchone()

    if not meta:
        conn.close()
        return jsonify({"error": "meta no existe"}), 404

    cursor.execute("DELETE FROM categorias WHERE meta_id=?", (id,))
    cursor.execute("DELETE FROM metas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"elimino meta {id}")

    return jsonify({"mensaje": "meta eliminada correctamente"}), 200

@app.route('/api/metas/<int:id>/agregar', methods=['POST'])
@api_login_required
@privilegio_required('editar_meta')
def agregar_a_meta(id):
    data = request.get_json()
    monto = data.get('monto')

    if not monto:
        return jsonify({"error": "monto es requerido"}), 400

    try:
        monto = float(monto)
        if monto <= 0:
            return jsonify({"error": "monto debe ser mayor a 0"}), 400
    except ValueError:
        return jsonify({"error": "monto invalido"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM metas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    meta = cursor.fetchone()

    if not meta:
        conn.close()
        return jsonify({"error": "meta no existe"}), 404

    cursor.execute("SELECT id FROM categorias WHERE meta_id=?", (id,))
    categoria = cursor.fetchone()

    if not categoria:
        conn.close()
        return jsonify({"error": "categoria de meta no existe"}), 404

    fecha = datetime.now().strftime("%Y-%m-%d")
    fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        cursor.execute("""
        INSERT INTO transacciones(usuario_id, categoria_id, monto, tipo, descripcion, fecha, fecha_creacion)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """, (session['user_id'], categoria['id'], monto, 'gasto', f"Ahorro para {meta['nombre']}", fecha, fecha_creacion))

        conn.commit()
        conn.close()

        registrar_log(session['username'], f"agrego ${monto} a meta {meta['nombre']}")

        recalcular_monto_meta(id)
        verificar_y_crear_alerta_gasto(session['user_id'])

        return jsonify({"mensaje": "dinero agregado a meta"}), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

@app.route('/api/metas/<int:id>/sacar', methods=['POST'])
@api_login_required
@privilegio_required('editar_meta')
def sacar_de_meta(id):
    data = request.get_json()
    monto = data.get('monto')

    if not monto:
        return jsonify({"error": "monto es requerido"}), 400

    try:
        monto = float(monto)
        if monto <= 0:
            return jsonify({"error": "monto debe ser mayor a 0"}), 400
    except ValueError:
        return jsonify({"error": "monto invalido"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM metas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    meta = cursor.fetchone()

    if not meta:
        conn.close()
        return jsonify({"error": "meta no existe"}), 404

    cursor.execute("SELECT id FROM categorias WHERE meta_id=?", (id,))
    categoria = cursor.fetchone()

    if not categoria:
        conn.close()
        return jsonify({"error": "categoria de meta no existe"}), 404

    monto_disponible = float(meta['monto_actual'] or 0)

    if monto_disponible < monto:
        conn.close()
        return jsonify({"error": f"no hay suficiente dinero en la meta. Disponible: ${monto_disponible:.2f}"}), 400

    try:
        fecha = datetime.now().strftime("%Y-%m-%d")
        fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT INTO transacciones(usuario_id, categoria_id, monto, tipo, descripcion, fecha, fecha_creacion)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """, (session['user_id'], categoria['id'], monto, 'ingreso', f"Retiro de meta {meta['nombre']}", fecha, fecha_creacion))

        conn.commit()
        conn.close()

        registrar_log(session['username'], f"saco ${monto} de meta {meta['nombre']}")

        recalcular_monto_meta(id)

        return jsonify({"mensaje": "dinero sacado de meta"}), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

# =====================================================
# rutas de deudas
# =====================================================

@app.route('/api/deudas', methods=['GET'])
@api_login_required
def obtener_deudas():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM deudas
    WHERE usuario_id = ?
    ORDER BY fecha_vencimiento
    """, (session['user_id'],))

    deudas = cursor.fetchall()
    resultado = []

    for deuda in deudas:
        deuda_dict = dict(deuda)

        cursor.execute("""
        SELECT COALESCE(SUM(monto), 0) as total_pagado
        FROM transacciones t
        JOIN categorias c ON t.categoria_id = c.id
        WHERE c.deuda_id = ? AND t.tipo = 'gasto'
        """, (deuda['id'],))

        pago = cursor.fetchone()
        deuda_dict['monto_pagado'] = pago['total_pagado'] if pago else 0
        resultado.append(deuda_dict)

    conn.close()
    registrar_log(session['username'], "consulto deudas")

    return jsonify(resultado), 200

@app.route('/api/deudas', methods=['POST'])
@api_login_required
@privilegio_required('crear_deuda')
def crear_deuda():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    monto_total = data.get('monto_total')
    acreedor = data.get('acreedor', '').strip()
    fecha_vencimiento = data.get('fecha_vencimiento')
    tasa_interes = data.get('tasa_interes', 0)
    descripcion = data.get('descripcion', '')

    if not nombre or not monto_total or not acreedor:
        return jsonify({"error": "nombre, monto_total y acreedor son requeridos"}), 400

    try:
        monto_total = float(monto_total)
        if monto_total <= 0:
            return jsonify({"error": "monto_total debe ser mayor a 0"}), 400
    except ValueError:
        return jsonify({"error": "monto_total invalido"}), 400

    try:
        tasa_interes = float(tasa_interes)
        if tasa_interes < 0:
            return jsonify({"error": "tasa_interes no puede ser negativa"}), 400
    except ValueError:
        return jsonify({"error": "tasa_interes invalida"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor()
        fecha_creacion = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT INTO deudas(usuario_id, nombre, monto_total, acreedor, fecha_vencimiento, tasa_interes, descripcion, fecha_creacion)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
        """, (session['user_id'], nombre, monto_total, acreedor, fecha_vencimiento, tasa_interes, descripcion, fecha_creacion))

        conn.commit()
        deuda_id = cursor.lastrowid

        fecha_cat = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        INSERT OR IGNORE INTO categorias(usuario_id, nombre, tipo, deuda_id, fecha_creacion)
        VALUES(?, ?, ?, ?, ?)
        """, (session['user_id'], nombre, 'gasto', deuda_id, fecha_cat))

        conn.commit()
        conn.close()

        registrar_log(session['username'], f"creo deuda '{nombre}' por ${monto_total}")

        return jsonify({
            "id": deuda_id,
            "mensaje": "deuda creada correctamente"
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

@app.route('/api/deudas/<int:id>', methods=['PUT'])
@api_login_required
@privilegio_required('editar_deuda')
def editar_deuda(id):
    data = request.get_json()
    nombre = data.get('nombre')
    monto_total = data.get('monto_total')
    monto_pagado = data.get('monto_pagado')
    acreedor = data.get('acreedor')
    fecha_vencimiento = data.get('fecha_vencimiento')
    tasa_interes = data.get('tasa_interes')
    estado = data.get('estado')
    descripcion = data.get('descripcion')

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM deudas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    deuda = cursor.fetchone()

    if not deuda:
        conn.close()
        return jsonify({"error": "deuda no existe"}), 404

    if estado and estado not in ['activa', 'pagada', 'cancelada']:
        conn.close()
        return jsonify({"error": "estado invalido"}), 400

    if monto_total:
        try:
            monto_total = float(monto_total)
            if monto_total <= 0:
                conn.close()
                return jsonify({"error": "monto_total debe ser mayor a 0"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "monto_total invalido"}), 400

    if monto_pagado is not None:
        try:
            monto_pagado = float(monto_pagado)
            if monto_pagado < 0:
                conn.close()
                return jsonify({"error": "monto_pagado no puede ser negativo"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "monto_pagado invalido"}), 400

    if tasa_interes is not None:
        try:
            tasa_interes = float(tasa_interes)
            if tasa_interes < 0:
                conn.close()
                return jsonify({"error": "tasa_interes no puede ser negativa"}), 400
        except ValueError:
            conn.close()
            return jsonify({"error": "tasa_interes invalida"}), 400

    cursor.execute("""
    UPDATE deudas
    SET nombre = COALESCE(?, nombre),
        monto_total = COALESCE(?, monto_total),
        monto_pagado = COALESCE(?, monto_pagado),
        acreedor = COALESCE(?, acreedor),
        fecha_vencimiento = COALESCE(?, fecha_vencimiento),
        tasa_interes = COALESCE(?, tasa_interes),
        estado = COALESCE(?, estado),
        descripcion = COALESCE(?, descripcion)
    WHERE id = ? AND usuario_id = ?
    """, (nombre, monto_total, monto_pagado, acreedor, fecha_vencimiento, tasa_interes, estado, descripcion, id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"edito deuda {id}")

    return jsonify({"mensaje": "deuda actualizada correctamente"}), 200

@app.route('/api/deudas/<int:id>', methods=['DELETE'])
@api_login_required
@privilegio_required('eliminar_deuda')
def eliminar_deuda(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM deudas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    deuda = cursor.fetchone()

    if not deuda:
        conn.close()
        return jsonify({"error": "deuda no existe"}), 404

    cursor.execute("DELETE FROM categorias WHERE deuda_id=?", (id,))
    cursor.execute("DELETE FROM deudas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))

    conn.commit()
    conn.close()

    registrar_log(session['username'], f"elimino deuda {id}")

    return jsonify({"mensaje": "deuda eliminada correctamente"}), 200

# =====================================================
# rutas de reportes
# =====================================================

@app.route('/api/reportes/resumen', methods=['GET'])
@api_login_required
@privilegio_required('ver_reportes')
def obtener_resumen():
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')

    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT SUM(t.monto) as total, t.tipo
    FROM transacciones t
    WHERE t.usuario_id = ?
    AND NOT (t.tipo = 'ingreso' AND t.descripcion LIKE 'Retiro de meta%')
    """
    params = [session['user_id']]

    if fecha_inicio:
        query += " AND t.fecha >= ?"
        params.append(fecha_inicio)

    if fecha_fin:
        query += " AND t.fecha <= ?"
        params.append(fecha_fin)

    query += " GROUP BY t.tipo"

    cursor.execute(query, params)
    resultados = cursor.fetchall()

    totales = {}
    for row in resultados:
        totales[row['tipo']] = row['total'] or 0

    cursor.execute("""
    SELECT c.id, c.nombre, c.color, SUM(t.monto) as total
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.usuario_id = ? AND t.tipo = 'gasto'
    GROUP BY c.id ORDER BY total DESC
    """, (session['user_id'],))
    gasto_por_categoria_base = cursor.fetchall()

    cursor.execute("""
    SELECT COALESCE(SUM(monto), 0) as total_retiros
    FROM transacciones
    WHERE usuario_id = ? AND tipo = 'ingreso' AND descripcion LIKE 'Retiro de meta%'
    """, (session['user_id'],))
    retiros_result = cursor.fetchone()
    retiros_metas = retiros_result['total_retiros'] or 0

    cursor.execute("""
    SELECT c.id, SUM(t.monto) as total_retiros
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.usuario_id = ? AND t.tipo = 'ingreso' AND t.descripcion LIKE 'Retiro de meta%'
    GROUP BY c.id
    """, (session['user_id'],))
    retiros_por_categoria = {row['id']: row['total_retiros'] for row in cursor.fetchall()}

    gasto_por_categoria = []
    for row in gasto_por_categoria_base:
        total_neto = row['total'] - retiros_por_categoria.get(row['id'], 0)
        if total_neto > 0:
            gasto_por_categoria.append({
                'nombre': row['nombre'],
                'color': row['color'],
                'total': total_neto
            })

    conn.close()
    registrar_log(session['username'], "consulto resumen")

    ingresos = totales.get('ingreso', 0)
    gastos_totales = totales.get('gasto', 0)
    gastos = gastos_totales - retiros_metas
    balance = ingresos - gastos

    return jsonify({
        "ingresos": ingresos,
        "gastos": gastos,
        "balance": balance,
        "gasto_por_categoria": gasto_por_categoria
    }), 200

@app.route('/api/reportes/gastos-por-categoria', methods=['GET'])
@api_login_required
@privilegio_required('ver_reportes')
def obtener_gastos_por_categoria():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT c.nombre, c.color, SUM(t.monto) as total
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    WHERE t.usuario_id = ? AND t.tipo = 'gasto'
    GROUP BY c.id
    ORDER BY total DESC
    """, (session['user_id'],))

    datos = cursor.fetchall()
    conn.close()

    resultado = [dict(d) for d in datos]
    registrar_log(session['username'], "consulto gastos por categoria")

    return jsonify(resultado), 200

# =====================================================
# rutas educativas
# =====================================================

@app.route('/api/educacion', methods=['GET'])
@api_login_required
@privilegio_required('ver_educacion')
def obtener_articulos_educativos():
    conn = get_connection()
    cursor = conn.cursor()

    categoria = request.args.get('categoria')

    if categoria:
        cursor.execute("""
        SELECT * FROM articulos_educativos
        WHERE categoria = ?
        ORDER BY fecha_creacion DESC
        """, (categoria,))
    else:
        cursor.execute("""
        SELECT * FROM articulos_educativos
        ORDER BY fecha_creacion DESC
        """)

    articulos = cursor.fetchall()
    conn.close()

    resultado = [dict(a) for a in articulos]
    registrar_log(session['username'], "consulto contenido educativo")

    return jsonify(resultado), 200

@app.route('/api/educacion/noticias', methods=['GET'])
@api_login_required
def obtener_noticias_financieras():
    try:
        import requests
        api_key = os.environ.get('NEWS_API_KEY', '')

        if api_key:
            url = f"https://newsapi.org/v2/everything?q=finanzas+educación+personal&language=es&sortBy=publishedAt&apiKey={api_key}&pageSize=10"
            response = requests.get(url, timeout=5)

            if response.status_code == 200:
                datos = response.json()
                registrar_log(session['username'], "consulto noticias financieras")
                return jsonify(datos.get('articles', [])), 200

        noticias_ejemplo = [
            {
                "title": "Cómo empezar a ahorrar: consejos prácticos",
                "description": "Descubre estrategias efectivas para comenzar tu viaje hacia la independencia financiera.",
                "url": "#",
                "publishedAt": datetime.now().isoformat(),
                "source": {"name": "WalletUp"}
            },
            {
                "title": "Entendiendo el interés compuesto",
                "description": "El interés compuesto es la octava maravilla del mundo. Aprende cómo funciona en tu favor.",
                "url": "#",
                "publishedAt": datetime.now().isoformat(),
                "source": {"name": "WalletUp"}
            },
            {
                "title": "Presupuesto personal: guía paso a paso",
                "description": "Controla tus gastos y alcanza tus metas financieras con un presupuesto bien planificado.",
                "url": "#",
                "publishedAt": datetime.now().isoformat(),
                "source": {"name": "WalletUp"}
            }
        ]

        registrar_log(session['username'], "consulto noticias financieras (ejemplo)")
        return jsonify(noticias_ejemplo), 200

    except Exception as e:
        registrar_log(session['username'], f"error al consultar noticias: {str(e)}")
        return jsonify({"error": str(e)}), 500

# =====================================================
# rutas de alertas
# =====================================================

@app.route('/api/alertas', methods=['GET'])
@api_login_required
def obtener_alertas():
    conn = get_connection()
    cursor = conn.cursor()

    leidas = request.args.get('leidas', '0')

    cursor.execute("""
    SELECT * FROM alertas
    WHERE usuario_id = ? AND leida = ?
    ORDER BY fecha_creacion DESC
    """, (session['user_id'], int(leidas)))

    alertas = cursor.fetchall()
    conn.close()

    resultado = [dict(a) for a in alertas]
    return jsonify(resultado), 200

@app.route('/api/alertas/<int:id>/marcar-leida', methods=['PUT'])
@api_login_required
def marcar_alerta_leida(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM alertas WHERE id=? AND usuario_id=?",
                  (id, session['user_id']))
    alerta = cursor.fetchone()

    if not alerta:
        conn.close()
        return jsonify({"error": "alerta no existe"}), 404

    cursor.execute("UPDATE alertas SET leida=1 WHERE id=?", (id,))
    conn.commit()
    conn.close()

    return jsonify({"mensaje": "alerta marcada como leida"}), 200

# =====================================================
# rutas administrativas (solo superadmin)
# =====================================================

@app.route('/api/admin/usuarios', methods=['GET'])
@api_login_required
@privilegio_required('ver_usuarios')
def obtener_usuarios():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT u.id, u.username, u.email, u.fecha_registro, u.bloqueado,
           r.nombre as rol
    FROM usuarios u
    LEFT JOIN usuario_rol ur ON u.id = ur.usuario_id
    LEFT JOIN roles r ON ur.rol_id = r.id
    ORDER BY u.fecha_registro DESC
    """)

    usuarios = cursor.fetchall()
    conn.close()

    resultado = [dict(u) for u in usuarios]
    registrar_log(session['username'], "consulto lista de usuarios")

    return jsonify(resultado), 200

@app.route('/api/admin/usuarios', methods=['POST'])
@api_login_required
@privilegio_required('crear_usuario')
def crear_usuario_admin():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    rol = data.get('rol', 'cliente').strip()

    if not username or not email or not password:
        return jsonify({"error": "username, email y password son requeridos"}), 400

    if rol not in ['cliente', 'superadmin']:
        return jsonify({"error": "rol invalido"}), 400

    try:
        crear_usuario_inicial(username, email, password, rol)
        registrar_log(session['username'], f"creo usuario {username} con rol {rol}")
        return jsonify({"mensaje": f"usuario {username} creado correctamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/usuarios/<int:id>/bloquear', methods=['PUT'])
@api_login_required
@privilegio_required('gestionar_usuarios')
def bloquear_usuario(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuarios WHERE id=?", (id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({"error": "usuario no existe"}), 404

    cursor.execute("UPDATE usuarios SET bloqueado=1 WHERE id=?", (id,))
    conn.commit()
    conn.close()

    registrar_log(session['username'], f"bloqueo usuario {usuario['username']}")

    return jsonify({"mensaje": "usuario bloqueado correctamente"}), 200

@app.route('/api/admin/usuarios/<int:id>/desbloquear', methods=['PUT'])
@api_login_required
@privilegio_required('gestionar_usuarios')
def desbloquear_usuario(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM usuarios WHERE id=?", (id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({"error": "usuario no existe"}), 404

    cursor.execute("UPDATE usuarios SET bloqueado=0, intentos_fallidos=0 WHERE id=?", (id,))
    conn.commit()
    conn.close()

    registrar_log(session['username'], f"desbloqueo usuario {usuario['username']}")

    return jsonify({"mensaje": "usuario desbloqueado correctamente"}), 200

@app.route('/api/admin/logs', methods=['GET'])
@api_login_required
@privilegio_required('ver_logs')
def obtener_logs():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM logs
    ORDER BY fecha DESC
    LIMIT 500
    """)

    logs = cursor.fetchall()
    conn.close()

    resultado = [dict(l) for l in logs]
    registrar_log(session['username'], "consulto logs de auditoria")

    return jsonify(resultado), 200

# =====================================================
# rutas de backup
# =====================================================

@app.route('/api/admin/backup', methods=['POST'])
@api_login_required
@privilegio_required('ver_usuarios')
def crear_backup():
    import shutil
    from datetime import datetime as dt

    try:
        fecha = dt.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"walletup_backup_{fecha}.db"
        backup_path = f"backups/{backup_filename}"

        os.makedirs("backups", exist_ok=True)
        shutil.copy(DB, backup_path)

        registrar_log(session['username'], f"creo backup {backup_filename}")

        return jsonify({
            "mensaje": "backup creado exitosamente",
            "archivo": backup_filename
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/backup/<filename>', methods=['GET'])
@api_login_required
@privilegio_required('ver_usuarios')
def descargar_backup(filename):
    from flask import send_file

    try:
        backup_path = f"backups/{filename}"

        if not os.path.exists(backup_path):
            return jsonify({"error": "backup no encontrado"}), 404

        registrar_log(session['username'], f"descargo backup {filename}")

        return send_file(backup_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/admin/backups', methods=['GET'])
@api_login_required
@privilegio_required('ver_usuarios')
def listar_backups():
    try:
        backups = []
        if os.path.exists("backups"):
            for archivo in sorted(os.listdir("backups"), reverse=True):
                if archivo.endswith('.db'):
                    ruta = f"backups/{archivo}"
                    tamaño = os.path.getsize(ruta) / (1024 * 1024)
                    fecha_mod = datetime.fromtimestamp(os.path.getmtime(ruta)).strftime("%Y-%m-%d %H:%M:%S")
                    backups.append({
                        "nombre": archivo,
                        "tamaño_mb": round(tamaño, 2),
                        "fecha": fecha_mod
                    })

        registrar_log(session['username'], "consulto lista de backups")
        return jsonify(backups), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/auditoria', methods=['GET'])
@api_login_required
def obtener_auditoria_usuario():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        SELECT * FROM logs
        WHERE usuario = ?
        ORDER BY fecha DESC
        LIMIT 500
        """, (session['username'],))

        logs = cursor.fetchall()
        conn.close()

        resultado = [dict(l) for l in logs]
        registrar_log(session['username'], "consulto su auditoria")

        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# =====================================================
# rutas para servir páginas HTML
# =====================================================

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard_page'))
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard_page'))
    return render_template('login.html')

@app.route('/registro')
def registro_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard_page'))
    return render_template('registro.html')

@app.route('/dashboard')
@login_required
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/admin/usuarios')
@login_required
@privilegio_required('ver_usuarios')
def admin_usuarios_page():
    return render_template('admin_usuarios.html')

@app.route('/transacciones')
@login_required
def transacciones_page():
    return render_template('transacciones.html')

@app.route('/categorias')
@login_required
def categorias_page():
    return render_template('categorias.html')

@app.route('/metas')
@login_required
def metas_page():
    return render_template('metas.html')

@app.route('/reportes')
@login_required
def reportes_page():
    return render_template('reportes.html')

@app.route('/educacion')
@login_required
def educacion_page():
    return render_template('educacion.html')

@app.route('/deudas')
@login_required
def deudas_page():
    return render_template('deudas.html')

# =====================================================
# punto de entrada
# =====================================================

if __name__ == '__main__':
    init_db()
    inicializar_roles()
    crear_usuario_inicial("superadmin", "superadmin@walletup.com", "SuperAdmin#2026", "superadmin")
    crear_usuario_inicial("cliente1", "cliente1@walletup.com", "Cliente#2026", "cliente")

    app.run(debug=True, port=5000)
