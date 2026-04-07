from flask import Flask, render_template, request, redirect
import sqlite3
app = Flask(__name__)
# Conexión a SQLite
def get_connection():
 conn = sqlite3.connect("database.db")
 conn.row_factory = sqlite3.Row
 return conn
# Crear tabla
def init_db():
 conn = get_connection()
 conn.execute('''
 CREATE TABLE IF NOT EXISTS usuarios (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nombre TEXT NOT NULL,
 email TEXT NOT NULL
 )
 ''')
 conn.close()
# Ruta principal
@app.route('/')
def index():
 conn = get_connection()
 usuarios = conn.execute("SELECT * FROM usuarios").fetchall()
 conn.close()
 return render_template('index.html', usuarios=usuarios)
# Guardar datos
@app.route('/guardar', methods=['POST'])
def guardar():
 nombre = request.form['nombre']
 email = request.form['email']
 conn = get_connection()
 conn.execute("INSERT INTO usuarios (nombre, email) VALUES (?, ?)", (nombre, email))
 conn.commit()
 conn.close()
 return redirect('/')
if __name__ == '__main__':
 init_db()
 app.run(debug=True)