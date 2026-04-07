from flask import Flask, render_template, request, redirect, jsonify
import sqlite3

app = Flask(__name__)

# Conexion a SQLite
def get_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

# Crear tablas de la base de datos
def init_db():
    conn = get_connection()

    # Tabla de clientes con nombre y telefono
    conn.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT NOT NULL
        )
    ''')

    # Tabla de platos con nombre y precio
    conn.execute('''
        CREATE TABLE IF NOT EXISTS platos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL
        )
    ''')

    # Tabla de pedidos asociados a clientes
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )
    ''')

    # Tabla de detalles de pedidos con platos y cantidad
    conn.execute('''
        CREATE TABLE IF NOT EXISTS detalles_pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            plato_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
            FOREIGN KEY (plato_id) REFERENCES platos (id)
        )
    ''')

    conn.commit()
    conn.close()

# Ruta principal que muestra clientes, platos y pedidos
@app.route('/')
def index():
    conn = get_connection()

    # Obtener todos los clientes de la base de datos
    clientes = conn.execute("SELECT * FROM clientes").fetchall()

    # Obtener todos los platos de la base de datos
    platos = conn.execute("SELECT * FROM platos").fetchall()

    # Obtener todos los pedidos con informacion del cliente
    pedidos = conn.execute("""
        SELECT p.id, c.nombre as cliente_nombre, p.fecha
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    """).fetchall()

    conn.close()

    # Retornar plantilla con los datos obtenidos
    return render_template('index.html',
                         clientes=clientes,
                         platos=platos,
                         pedidos=pedidos)

# Ruta para registrar cliente
@app.route('/registrar_cliente')
def registrar_cliente():
    # Retornar plantilla de registrar cliente
    return render_template('registrar_cliente.html')

# Ruta para registrar plato
@app.route('/registrar_plato')
def registrar_plato():
    # Retornar plantilla de registrar plato
    return render_template('registrar_plato.html')

# Ruta para crear pedido
@app.route('/crear_pedido')
def crear_pedido():
    conn = get_connection()

    # Obtener todos los clientes de la base de datos
    clientes = conn.execute("SELECT * FROM clientes").fetchall()

    conn.close()

    # Retornar plantilla con los clientes
    return render_template('crear_pedido.html', clientes=clientes)

# Guardar nuevo cliente con nombre y telefono
@app.route('/guardar_cliente', methods=['POST'])
def guardar_cliente():
    # Obtener nombre del formulario
    nombre = request.form['nombre']

    # Obtener telefono del formulario
    telefono = request.form['telefono']

    # Conectar a la base de datos
    conn = get_connection()

    # Insertar cliente en la tabla clientes
    conn.execute("INSERT INTO clientes (nombre, telefono) VALUES (?, ?)",
                (nombre, telefono))

    # Confirmar los cambios en la base de datos
    conn.commit()

    # Cerrar la conexion
    conn.close()

    # Redirigir a la pagina principal
    return redirect('/')

# Guardar nuevo plato con nombre y precio
@app.route('/guardar_plato', methods=['POST'])
def guardar_plato():
    # Obtener nombre del formulario
    nombre = request.form['nombre']

    # Obtener precio del formulario
    precio = request.form['precio']

    # Conectar a la base de datos
    conn = get_connection()

    # Insertar plato en la tabla platos
    conn.execute("INSERT INTO platos (nombre, precio) VALUES (?, ?)",
                (nombre, precio))

    # Confirmar los cambios en la base de datos
    conn.commit()

    # Cerrar la conexion
    conn.close()

    # Redirigir a la pagina principal
    return redirect('/')

# Guardar nuevo pedido realizado por un cliente
@app.route('/guardar_pedido', methods=['POST'])
def guardar_pedido():
    # Obtener id del cliente del formulario
    cliente_id = request.form.get('cliente_id')

    # Obtener fecha del formulario
    fecha = request.form.get('fecha')

    # Validar que los datos no esten vacios
    if not cliente_id or not fecha:
        # Redirigir si falta informacion
        return redirect('/')

    try:
        # Conectar a la base de datos
        conn = get_connection()

        # Validar que el cliente existe
        cliente_existe = conn.execute("SELECT id FROM clientes WHERE id = ?", (cliente_id,)).fetchone()

        # Si no existe redirigir
        if not cliente_existe:
            conn.close()
            return redirect('/')

        # Insertar pedido en la tabla pedidos
        conn.execute("INSERT INTO pedidos (cliente_id, fecha) VALUES (?, ?)",
                    (cliente_id, fecha))

        # Confirmar los cambios en la base de datos
        conn.commit()

        # Cerrar la conexion
        conn.close()

    except Exception as e:
        # Imprimir error en la consola
        print(f"Error al guardar pedido: {str(e)}")

    # Redirigir a la pagina principal
    return redirect('/')

# Agregar plato a un pedido con cantidad
@app.route('/agregar_detalle', methods=['POST'])
def agregar_detalle():
    # Obtener id del pedido del formulario
    pedido_id = request.form.get('pedido_id')

    # Obtener id del plato del formulario
    plato_id = request.form.get('plato_id')

    # Obtener cantidad del formulario
    cantidad = request.form.get('cantidad')

    # Validar que los datos no esten vacios
    if not pedido_id or not plato_id or not cantidad:
        # Retornar error si falta informacion
        return redirect('/')

    try:
        # Conectar a la base de datos
        conn = get_connection()

        # Validar que el pedido existe
        pedido_existe = conn.execute("SELECT id FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()

        # Validar que el plato existe
        plato_existe = conn.execute("SELECT id FROM platos WHERE id = ?", (plato_id,)).fetchone()

        # Si alguno no existe redirigir
        if not pedido_existe or not plato_existe:
            conn.close()
            return redirect('/')

        # Insertar detalle en la tabla detalles_pedidos
        conn.execute("INSERT INTO detalles_pedidos (pedido_id, plato_id, cantidad) VALUES (?, ?, ?)",
                    (pedido_id, plato_id, cantidad))

        # Confirmar los cambios en la base de datos
        conn.commit()

        # Cerrar la conexion
        conn.close()

    except Exception as e:
        # Imprimir error en la consola
        print(f"Error al agregar detalle: {str(e)}")

    # Redirigir a la pagina principal
    return redirect('/')

# Ruta para pagina de consultar pedidos
@app.route('/consultar_pedidos')
def consultar_pedidos():
    conn = get_connection()

    # Obtener todos los clientes de la base de datos
    clientes = conn.execute("SELECT * FROM clientes").fetchall()

    # Obtener todos los platos de la base de datos
    platos = conn.execute("SELECT * FROM platos").fetchall()

    # Obtener todos los pedidos con informacion del cliente
    pedidos = conn.execute("""
        SELECT p.id, c.nombre as cliente_nombre, p.fecha
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    """).fetchall()

    conn.close()

    # Retornar plantilla con los datos obtenidos
    return render_template('consultar_pedidos.html',
                         clientes=clientes,
                         platos=platos,
                         pedidos=pedidos)

# API para obtener pedidos con detalles en JSON
@app.route('/api/consultar_pedidos', methods=['GET'])
def api_consultar_pedidos():
    # Conectar a la base de datos
    conn = get_connection()

    # Obtener todos los pedidos con cliente y detalles
    pedidos = conn.execute("""
        SELECT p.id, c.nombre as cliente_nombre, c.telefono, p.fecha
        FROM pedidos p
        JOIN clientes c ON p.cliente_id = c.id
    """).fetchall()

    # Crear lista para almacenar resultados
    resultado = []

    # Iterar sobre cada pedido obtenido
    for pedido in pedidos:
        # Obtener detalles del pedido con los platos
        detalles_rows = conn.execute("""
            SELECT dp.cantidad, pl.nombre as plato_nombre, pl.precio
            FROM detalles_pedidos dp
            JOIN platos pl ON dp.plato_id = pl.id
            WHERE dp.pedido_id = ?
        """, (pedido['id'],)).fetchall()

        # Convertir detalles a lista de diccionarios
        detalles_list = []

        # Iterar sobre cada detalle obtenido
        for detalle in detalles_rows:
            # Agregar detalle convertido a diccionario
            detalles_list.append({
                'cantidad': detalle['cantidad'],
                'plato_nombre': detalle['plato_nombre'],
                'precio': detalle['precio']
            })

        # Agregar pedido con sus detalles a la lista resultado
        resultado.append({
            'id': pedido['id'],
            'cliente_nombre': pedido['cliente_nombre'],
            'telefono': pedido['telefono'],
            'fecha': pedido['fecha'],
            'detalles': detalles_list
        })

    # Cerrar la conexion
    conn.close()

    # Retornar resultado en formato JSON
    return jsonify(resultado)

# Iniciar la aplicacion
if __name__ == '__main__':
    # Inicializar base de datos y crear tablas
    init_db()

    # Ejecutar aplicacion en modo debug
    app.run(debug=True)
