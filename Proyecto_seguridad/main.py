import sqlite3
import hashlib
import random
import shutil
import os
from datetime import datetime

DB = "empresa_rbac.db"
MAX_INTENTOS = 5

# =====================================================
# UTILIDADES
# =====================================================
#Abre una conexión a la base de datos SQLite cuyo nombre está almacenado en la variable DB.
def conectar():
    return sqlite3.connect(DB)

#Convierte una contraseña en texto plano en un hash SHA-256.
#Aplica el algoritmo criptográfico SHA-256.
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

#Registra una acción en la tabla logs.
def registrar_log(usuario, accion):
    conn = conectar()
    cursor = conn.cursor()
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO logs(usuario,accion,fecha)
    VALUES(?,?,?)
    """, (usuario, accion, fecha))

    conn.commit()
    conn.close()
#Genera un pequeño desafío matemático para verificar que quien intenta iniciar sesión es humano.
def captcha():
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    try:
        respuesta = int(input(f"🤖 CAPTCHA: ¿Cuánto es {a} + {b}? "))
        return respuesta == (a + b)
    except:
        return False

# =====================================================
# CREACIÓN DE TABLAS
# =====================================================

def crear_tablas():
    conn = conectar()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS empleados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        cargo TEXT,
        salario REAL
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        intentos_fallidos INTEGER DEFAULT 0,
        bloqueado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS privilegios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS usuario_rol (
        usuario_id INTEGER,
        rol_id INTEGER,
        PRIMARY KEY(usuario_id, rol_id)
    );

    CREATE TABLE IF NOT EXISTS rol_privilegio (
        rol_id INTEGER,
        privilegio_id INTEGER,
        PRIMARY KEY(rol_id, privilegio_id)
    );

    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        accion TEXT,
        fecha TEXT
    );
    """)

    conn.commit()
    conn.close()

# =====================================================
# INICIALIZAR ROLES Y PRIVILEGIOS
# =====================================================

def inicializar_roles():
    conn = conectar()
    cursor = conn.cursor()

    roles = ["admin", "editor", "visualizador"]
    privilegios = ["crear", "leer", "actualizar", "eliminar", "ver_logs"]

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
        "admin": ["crear","leer","actualizar","eliminar","ver_logs"],
        "editor": ["leer","actualizar"],
        "visualizador": ["leer"]
    }

    for rol, lista_priv in permisos.items():
        for priv in lista_priv:
            cursor.execute("""
            INSERT OR IGNORE INTO rol_privilegio(rol_id, privilegio_id)
            VALUES(?,?)
            """, (roles_dict[rol], priv_dict[priv]))

    conn.commit()
    conn.close()

# =====================================================
# CREAR USUARIO
# =====================================================

def crear_usuario(username, password, rol_nombre):
    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR IGNORE INTO usuarios(username,password)
    VALUES(?,?)
    """, (username, hash_password(password)))

    cursor.execute("SELECT id FROM usuarios WHERE username=?", (username,))
    user_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM roles WHERE nombre=?", (rol_nombre,))
    rol_id = cursor.fetchone()[0]

    cursor.execute("""
    INSERT OR IGNORE INTO usuario_rol(usuario_id,rol_id)
    VALUES(?,?)
    """, (user_id, rol_id))

    conn.commit()
    conn.close()

# =====================================================
# VERIFICAR PRIVILEGIOS
# =====================================================

def tiene_privilegio(user_id, privilegio):
    conn = conectar()
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

# =====================================================
# LOGIN
# =====================================================

def login():
    #Si el usuario falla → termina la función.
    #Mitiga fuerza bruta automatizada.
    if not captcha():
        print("❌ CAPTCHA incorrecto")
        return None

    conn = conectar()
    cursor = conn.cursor()

    username = input("Usuario: ")
    password = hash_password(input("Contraseña: "))

    #Consulta parametrizada → evita SQL Injection.
    cursor.execute("SELECT * FROM usuarios WHERE username=?", (username,))
    user = cursor.fetchone()

    if not user:
        print("❌ Usuario no existe")
        return None

    #Cuenta bloqueada = True
    if user[4] == 1:
        print("🚫 Cuenta bloqueada")
        registrar_log(username, "Intento acceso cuenta bloqueada")
        return None

    #Si coinciden → login exitoso.
    if password == user[2]:
        #Reinicia contador de intentos.
        cursor.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE id=?", (user[0],))
        conn.commit()
        #Registra auditoría.
        registrar_log(username, "Login exitoso")
        conn.close()
        return {"id": user[0], "username": username}
    else:
        #Incrementa intentos.
        intentos = user[3] + 1
        #Si supera límite → bloquea cuenta.
        bloqueado = 1 if intentos >= MAX_INTENTOS else 0

        cursor.execute("""
        UPDATE usuarios
        SET intentos_fallidos=?, bloqueado=?
        WHERE id=?
        """, (intentos, bloqueado, user[0]))

        conn.commit()
        registrar_log(username, "Login fallido")

        conn.close()
        print(f"❌ Credenciales incorrectas ({intentos}/{MAX_INTENTOS})")
        return None
    

# =====================================================
# crear_Usuario
# =====================================================
def crear_usuario_admin(usuario):
    if not tiene_privilegio(usuario["id"], "crear"):
        print("🚫 Solo el administrador puede crear usuarios")
        return

    username = input("Nuevo usuario: ")
    password = input("Contraseña: ")

    print("Roles disponibles:")
    print("1. editor")
    print("2. visualizador")

    opcion = input("Seleccione rol: ")

    if opcion == "1":
        rol = "editor"
    elif opcion == "2":
        rol = "visualizador"
    else:
        print("Rol inválido")
        return

    crear_usuario(username, password, rol)

    registrar_log(usuario["username"], f"Creó usuario {username} con rol {rol}")

    print("✅ Usuario creado correctamente")

# =====================================================
# backup
# =====================================================
def backup_bd(usuario):
    if not tiene_privilegio(usuario["id"], "ver_logs"):
        print("🚫 Solo administrador puede hacer backup")
        return

    fecha = datetime.now().strftime("%Y%m%d_%H%M%S")

    backup_file = f"backup_empresa_{fecha}.db"

    try:
        shutil.copy(DB, backup_file)

        registrar_log(usuario["username"], f"Backup creado: {backup_file}")

        print(f"✅ Backup creado: {backup_file}")

    except Exception as e:
        print("❌ Error en backup:", e)

# =====================================================
# Recuperación de contraseña
# =====================================================
def recuperar_password(usuario):
    if not tiene_privilegio(usuario["id"], "actualizar"):
        print("🚫 Sin permisos")
        return

    username = input("Usuario a recuperar: ")
    nueva = input("Nueva contraseña: ")

    conn = conectar()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE usuarios
    SET password=?, intentos_fallidos=0, bloqueado=0
    WHERE username=?
    """, (hash_password(nueva), username))

    conn.commit()
    conn.close()

    registrar_log(usuario["username"], f"Reseteó contraseña de {username}")

    print("✅ Contraseña actualizada")

# =====================================================
# CRUD
# =====================================================

def listar_empleados(usuario):
    if not tiene_privilegio(usuario["id"], "leer"):
        print("🚫 Sin permiso")
        return

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM empleados")
    empleados = cursor.fetchall()
    conn.close()

    registrar_log(usuario["username"], "Consultó empleados")

    for e in empleados:
        print(e)

def insertar_empleado(usuario):
    if not tiene_privilegio(usuario["id"], "crear"):
        print("🚫 Sin permiso")
        registrar_log(usuario["username"], "Intento crear sin permiso")
        return

    nombre = input("Nombre: ")
    cargo = input("Cargo: ")
    salario = float(input("Salario: "))

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO empleados(nombre,cargo,salario) VALUES(?,?,?)",
                   (nombre,cargo,salario))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], "Insertó empleado")

def actualizar_salario(usuario):
    if not tiene_privilegio(usuario["id"], "actualizar"):
        print("🚫 Sin permiso")
        registrar_log(usuario["username"], "Intento actualizar sin permiso")
        return

    id_emp = int(input("ID empleado: "))
    nuevo_salario = float(input("Nuevo salario: "))

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("UPDATE empleados SET salario=? WHERE id=?",
                   (nuevo_salario,id_emp))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], "Actualizó salario")

def eliminar_empleado(usuario):
    if not tiene_privilegio(usuario["id"], "eliminar"):
        print("🚫 Sin permiso")
        registrar_log(usuario["username"], "Intento eliminar sin permiso")
        return

    id_emp = int(input("ID empleado: "))

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM empleados WHERE id=?", (id_emp,))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], "Eliminó empleado")

def ver_logs(usuario):
    if not tiene_privilegio(usuario["id"], "ver_logs"):
        print("🚫 Sin permiso")
        return

    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs")
    logs = cursor.fetchall()
    conn.close()

    for l in logs:
        print(l)




# =====================================================
# MENÚ
# =====================================================

def menu(usuario):
    while True:
        print("\n===== MENÚ =====")
        print("1. Listar empleados")
        print("2. Insertar empleado")
        print("3. Actualizar salario")
        print("4. Eliminar empleado")
        print("5. Ver auditoría")
        print("6. Crear usuario")
        print("7. Backup base de datos")
        print("8. Recuperar contraseña")
        print("0. Salir")

        opcion = input("Seleccione: ")

        if opcion == "1":
            listar_empleados(usuario)
        elif opcion == "2":
            insertar_empleado(usuario)
        elif opcion == "3":
            actualizar_salario(usuario)
        elif opcion == "4":
            eliminar_empleado(usuario)
        elif opcion == "5":
            ver_logs(usuario)
        elif opcion == "6":
            crear_usuario_admin(usuario)
        elif opcion == "7":
            backup_bd(usuario)
        elif opcion == "8":
            recuperar_password(usuario)
        elif opcion == "0":
            break
        else:
            print("Opción inválida")

# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":
    crear_tablas()
    inicializar_roles()

    # Usuarios por defecto
    crear_usuario("admin", "Admin#2026", "admin")
    crear_usuario("editor1", "Editor#2026", "editor")
    crear_usuario("viewer1", "Viewer#2026", "visualizador")

    usuario = login()
    if usuario:
        menu(usuario)


""" =====================================================
Qué vulnerabilidades OWASP estás mitigando
Implementación	               OWASP
CAPTCHA	                       A07 Identification & Authentication Failures
Control de roles RBAC	       A01 Broken Access Control
Hash SHA256	                   A02 Cryptographic Failures
Logs de auditoría	           A09 Security Logging
Backup	                       A05 Security Misconfiguration
Bloqueo por intentos	       A07 Authentication Failures
Reset de contraseña controlado A07 Authentication
# ====================================================="""