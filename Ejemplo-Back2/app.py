from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# ===== CONEXIÓN A LA BASE DE DATOS =====
def get_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

# ===== INICIALIZAR BASE DE DATOS =====
def init_db():
    conn = get_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT NOT NULL
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS vehiculos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_vehiculo TEXT NOT NULL,
            placa TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# ===== RUTAS USUARIOS =====

# READ (Listar usuarios)
@app.route('/')
def index():
    conn = get_connection()
    usuarios = conn.execute("SELECT * FROM usuarios").fetchall()
    vehiculos = conn.execute("SELECT * FROM vehiculos").fetchall()
    conn.close()
    return render_template('index.html', usuarios=usuarios, vehiculos=vehiculos)

# CREATE (Crear nuevo usuario)
@app.route('/crear', methods=['GET', 'POST'])
def crear():
    if request.method == 'POST':
        nombre = request.form['nombre']
        email = request.form['email']
        conn = get_connection()
        conn.execute("INSERT INTO usuarios (nombre, email) VALUES (?, ?)", (nombre, email))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    return render_template('crear.html')

# UPDATE (Editar usuario)
@app.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar(id):
    conn = get_connection()
    usuario = conn.execute("SELECT * FROM usuarios WHERE id=?", (id,)).fetchone()
    if request.method == 'POST':
        nombre = request.form['nombre']
        email = request.form['email']
        conn.execute("UPDATE usuarios SET nombre=?, email=? WHERE id=?", (nombre, email, id))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    conn.close()
    return render_template('editar.html', usuario=usuario)

# DELETE (Eliminar usuario)
@app.route('/eliminar/<int:id>')
def eliminar(id):
    conn = get_connection()
    conn.execute("DELETE FROM usuarios WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return redirect(url_for('index'))

# ===== RUTAS VEHÍCULOS =====

# READ (Listar vehículos)
@app.route('/vehiculos')
def vehiculos():
    conn = get_connection()
    vehiculos = conn.execute("SELECT * FROM vehiculos").fetchall()
    conn.close()
    return render_template('vehiculos.html', vehiculos=vehiculos)

# CREATE (Crear nuevo vehículo)
@app.route('/crear_vehiculo', methods=['GET', 'POST'])
def crear_vehiculo():
    if request.method == 'POST':
        tipo_vehiculo = request.form['tipo_vehiculo']
        placa = request.form['placa']
        conn = get_connection()
        conn.execute("INSERT INTO vehiculos (tipo_vehiculo, placa) VALUES (?, ?)", (tipo_vehiculo, placa))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    return render_template('crear_vehiculo.html')

# UPDATE (Editar vehículo)
@app.route('/editar_vehiculo/<int:id>', methods=['GET', 'POST'])
def editar_vehiculo(id):
    conn = get_connection()
    vehiculo = conn.execute("SELECT * FROM vehiculos WHERE id=?", (id,)).fetchone()
    if request.method == 'POST':
        tipo_vehiculo = request.form['tipo_vehiculo']
        placa = request.form['placa']
        conn.execute("UPDATE vehiculos SET tipo_vehiculo=?, placa=? WHERE id=?", (tipo_vehiculo, placa, id))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    conn.close()
    return render_template('editar_vehiculo.html', vehiculo=vehiculo)

# DELETE (Eliminar vehículo)
@app.route('/eliminar_vehiculo/<int:id>')
def eliminar_vehiculo(id):
    conn = get_connection()
    conn.execute("DELETE FROM vehiculos WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return redirect(url_for('index'))

# ===== EJECUTAR APLICACIÓN =====
if __name__ == '__main__':
    init_db()
    app.run(debug=True)
