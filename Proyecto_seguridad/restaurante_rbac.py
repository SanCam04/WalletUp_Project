# importar librerias necesarias
import sqlite3
import hashlib
import random
import shutil
import os
from datetime import datetime

# nombre de la base de datos
DB = "restaurante_rbac.db"
# numero maximo de intentos fallidos de login
MAX_INTENTOS = 5

# =====================================================
# funciones de utilidad
# =====================================================

# conectar a la base de datos
def conectar():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

# encriptar contraseña con sha256
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# guardar acciones en la tabla de logs para auditoria
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

# captcha simple de suma
def captcha():
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    try:
        respuesta = int(input(f"🤖 CAPTCHA: cuanto es {a} + {b}? "))
        return respuesta == (a + b)
    except:
        return False

# =====================================================
# crear todas las tablas de la base de datos
# =====================================================

def crear_tablas():
    conn = conectar()
    cursor = conn.cursor()

    # crear todas las tablas si no existen
    cursor.executescript("""
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

    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    );

    CREATE TABLE IF NOT EXISTS detalles_pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        plato_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
        FOREIGN KEY (plato_id) REFERENCES platos (id)
    );
    """)

    conn.commit()
    conn.close()

# =====================================================
# inicializar roles y privilegios del sistema
# =====================================================

def inicializar_roles():
    conn = conectar()
    cursor = conn.cursor()

    # definir los tres roles del sistema
    roles = ["admin", "mesero", "cocinero"]
    # definir los privilegios disponibles
    privilegios = ["crear_plato", "editar_plato", "eliminar_plato", "crear_cliente",
                   "ver_clientes", "crear_pedido", "ver_pedidos", "ver_logs",
                   "crear_usuario", "backup"]

    # insertar los roles
    for r in roles:
        cursor.execute("INSERT OR IGNORE INTO roles(nombre) VALUES(?)", (r,))

    # insertar los privilegios
    for p in privilegios:
        cursor.execute("INSERT OR IGNORE INTO privilegios(nombre) VALUES(?)", (p,))

    conn.commit()

    # obtener ids de roles
    cursor.execute("SELECT id, nombre FROM roles")
    roles_dict = {r[1]: r[0] for r in cursor.fetchall()}

    # obtener ids de privilegios
    cursor.execute("SELECT id, nombre FROM privilegios")
    priv_dict = {p[1]: p[0] for p in cursor.fetchall()}

    # asignar privilegios a cada rol
    permisos = {
        "admin": ["crear_plato", "editar_plato", "eliminar_plato", "crear_cliente",
                  "ver_clientes", "crear_pedido", "ver_pedidos", "ver_logs",
                  "crear_usuario", "backup"],
        "mesero": ["crear_cliente", "ver_clientes", "crear_pedido", "ver_pedidos"],
        "cocinero": ["ver_pedidos"]
    }

    # insertar las relaciones rol-privilegio
    for rol, lista_priv in permisos.items():
        for priv in lista_priv:
            cursor.execute("""
            INSERT OR IGNORE INTO rol_privilegio(rol_id, privilegio_id)
            VALUES(?,?)
            """, (roles_dict[rol], priv_dict[priv]))

    conn.commit()
    conn.close()

# =====================================================
# crear un nuevo usuario y asignarlo a un rol
# =====================================================

def crear_usuario(username, password, rol_nombre):
    conn = conectar()
    cursor = conn.cursor()

    # insertar el usuario con contraseña hasheada
    cursor.execute("""
    INSERT OR IGNORE INTO usuarios(username,password)
    VALUES(?,?)
    """, (username, hash_password(password)))

    # obtener el id del usuario creado
    cursor.execute("SELECT id FROM usuarios WHERE username=?", (username,))
    user_id = cursor.fetchone()[0]

    # obtener el id del rol
    cursor.execute("SELECT id FROM roles WHERE nombre=?", (rol_nombre,))
    rol_id = cursor.fetchone()[0]

    # asignar el rol al usuario
    cursor.execute("""
    INSERT OR IGNORE INTO usuario_rol(usuario_id,rol_id)
    VALUES(?,?)
    """, (user_id, rol_id))

    conn.commit()
    conn.close()

# =====================================================
# verificar si un usuario tiene un privilegio especifico
# =====================================================

def tiene_privilegio(user_id, privilegio):
    conn = conectar()
    cursor = conn.cursor()

    # obtener todos los privilegios del usuario
    cursor.execute("""
    SELECT p.nombre
    FROM privilegios p
    JOIN rol_privilegio rp ON p.id = rp.privilegio_id
    JOIN usuario_rol ur ON ur.rol_id = rp.rol_id
    WHERE ur.usuario_id = ?
    """, (user_id,))

    privilegios_usuario = [p[0] for p in cursor.fetchall()]
    conn.close()

    # retornar true si el usuario tiene el privilegio
    return privilegio in privilegios_usuario

# =====================================================
# sistema de login con captcha y bloqueo por intentos
# =====================================================

def login():
    # validar captcha primero
    if not captcha():
        print("❌ CAPTCHA incorrecto")
        return None

    conn = conectar()
    cursor = conn.cursor()

    username = input("Usuario: ")
    password = hash_password(input("Contrasena: "))

    # buscar el usuario
    cursor.execute("SELECT * FROM usuarios WHERE username=?", (username,))
    user = cursor.fetchone()

    if not user:
        print("❌ Usuario no existe")
        return None

    # verificar si la cuenta esta bloqueada
    if user[4] == 1:
        print("🚫 Cuenta bloqueada")
        registrar_log(username, "Intento acceso cuenta bloqueada")
        return None

    # verificar si la contrasena es correcta
    if password == user[2]:
        # login exitoso, resetear intentos
        cursor.execute("UPDATE usuarios SET intentos_fallidos=0 WHERE id=?", (user[0],))
        conn.commit()
        registrar_log(username, "Login exitoso")
        conn.close()
        return {"id": user[0], "username": username}
    else:
        # login fallido, incrementar intentos
        intentos = user[3] + 1
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
# crear, listar, editar y eliminar platos
# =====================================================

def listar_platos(usuario):
    # obtener todos los platos
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM platos")
    platos = cursor.fetchall()
    conn.close()

    registrar_log(usuario["username"], "Consulto platos")

    if not platos:
        print("📭 No hay platos registrados")
        return

    print("\n🍽️  PLATOS:")
    for p in platos:
        print(f"  ID: {p['id']} | {p['nombre']} - ${p['precio']}")

def crear_plato(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_plato"):
        print("🚫 Sin permiso para crear platos")
        registrar_log(usuario["username"], "Intento crear plato sin permiso")
        return

    nombre = input("Nombre del plato: ")
    try:
        precio = float(input("Precio: "))
    except:
        print("❌ Precio invalido")
        return

    # insertar el plato
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO platos(nombre,precio) VALUES(?,?)",
                   (nombre, precio))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], f"Creo plato '{nombre}' - ${precio}")
    print("✅ Plato creado correctamente")

def editar_plato(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "editar_plato"):
        print("🚫 Sin permiso para editar platos")
        registrar_log(usuario["username"], "Intento editar plato sin permiso")
        return

    listar_platos(usuario)
    try:
        id_plato = int(input("\nID del plato a editar: "))
    except:
        print("❌ ID invalido")
        return

    nombre = input("Nuevo nombre (Enter para no cambiar): ")
    precio_str = input("Nuevo precio (Enter para no cambiar): ")

    conn = conectar()
    cursor = conn.cursor()

    # actualizar nombre y precio
    if nombre and precio_str:
        try:
            precio = float(precio_str)
            cursor.execute("UPDATE platos SET nombre=?, precio=? WHERE id=?",
                           (nombre, precio, id_plato))
            registrar_log(usuario["username"], f"Edito plato ID {id_plato}")
        except:
            print("❌ Precio invalido")
            conn.close()
            return
    elif nombre:
        cursor.execute("UPDATE platos SET nombre=? WHERE id=?",
                       (nombre, id_plato))
        registrar_log(usuario["username"], f"Edito nombre plato ID {id_plato}")
    elif precio_str:
        try:
            precio = float(precio_str)
            cursor.execute("UPDATE platos SET precio=? WHERE id=?",
                           (precio, id_plato))
            registrar_log(usuario["username"], f"Edito precio plato ID {id_plato}")
        except:
            print("❌ Precio invalido")
            conn.close()
            return

    conn.commit()
    conn.close()
    print("✅ Plato actualizado")

def eliminar_plato(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "eliminar_plato"):
        print("🚫 Sin permiso para eliminar platos")
        registrar_log(usuario["username"], "Intento eliminar plato sin permiso")
        return

    listar_platos(usuario)
    try:
        id_plato = int(input("\nID del plato a eliminar: "))
    except:
        print("❌ ID invalido")
        return

    # eliminar el plato
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM platos WHERE id=?", (id_plato,))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], f"Elimino plato ID {id_plato}")
    print("✅ Plato eliminado")

# =====================================================
# crear y listar clientes
# =====================================================

def listar_clientes(usuario):
    # obtener todos los clientes
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clientes")
    clientes = cursor.fetchall()
    conn.close()

    registrar_log(usuario["username"], "Consulto clientes")

    if not clientes:
        print("📭 No hay clientes registrados")
        return

    print("\n👥 CLIENTES:")
    for c in clientes:
        print(f"  ID: {c['id']} | {c['nombre']} - {c['telefono']}")

def crear_cliente(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_cliente"):
        print("🚫 Sin permiso para crear clientes")
        registrar_log(usuario["username"], "Intento crear cliente sin permiso")
        return

    nombre = input("Nombre del cliente: ")
    telefono = input("Telefono: ")

    # insertar el cliente
    conn = conectar()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO clientes(nombre,telefono) VALUES(?,?)",
                   (nombre, telefono))
    conn.commit()
    conn.close()

    registrar_log(usuario["username"], f"Creo cliente '{nombre}'")
    print("✅ Cliente registrado correctamente")

# =====================================================
# crear, agregar platos y ver pedidos
# =====================================================

def crear_pedido(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_pedido"):
        print("🚫 Sin permiso para crear pedidos")
        registrar_log(usuario["username"], "Intento crear pedido sin permiso")
        return

    listar_clientes(usuario)
    try:
        cliente_id = int(input("\nID del cliente: "))
    except:
        print("❌ ID invalido")
        return

    conn = conectar()
    cursor = conn.cursor()

    # verificar que el cliente existe
    cursor.execute("SELECT id FROM clientes WHERE id=?", (cliente_id,))
    if not cursor.fetchone():
        print("❌ Cliente no existe")
        conn.close()
        return

    # insertar el pedido
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO pedidos(cliente_id,fecha) VALUES(?,?)",
                   (cliente_id, fecha))
    conn.commit()

    pedido_id = cursor.lastrowid
    conn.close()

    registrar_log(usuario["username"], f"Creo pedido ID {pedido_id}")
    print(f"✅ Pedido creado (ID: {pedido_id})")

    agregar_platos_pedido(usuario, pedido_id)

def agregar_platos_pedido(usuario, pedido_id):
    # agregar platos al pedido
    if not tiene_privilegio(usuario["id"], "crear_pedido"):
        return

    while True:
        listar_platos(usuario)
        try:
            plato_id = int(input("\nID del plato (0 para terminar): "))
        except:
            print("❌ ID invalido")
            continue

        if plato_id == 0:
            break

        try:
            cantidad = int(input("Cantidad: "))
        except:
            print("❌ Cantidad invalida")
            continue

        conn = conectar()
        cursor = conn.cursor()

        # verificar que el plato existe
        cursor.execute("SELECT id FROM platos WHERE id=?", (plato_id,))
        if not cursor.fetchone():
            print("❌ Plato no existe")
            conn.close()
            continue

        # insertar el detalle del pedido
        cursor.execute("""
        INSERT INTO detalles_pedidos(pedido_id,plato_id,cantidad)
        VALUES(?,?,?)
        """, (pedido_id, plato_id, cantidad))
        conn.commit()
        conn.close()

        print("✅ Plato agregado al pedido")

def ver_pedidos(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "ver_pedidos"):
        print("🚫 Sin permiso para ver pedidos")
        registrar_log(usuario["username"], "Intento ver pedidos sin permiso")
        return

    conn = conectar()
    cursor = conn.cursor()

    # obtener todos los pedidos
    cursor.execute("""
    SELECT p.id, c.nombre as cliente_nombre, p.fecha
    FROM pedidos p
    JOIN clientes c ON p.cliente_id = c.id
    """)
    pedidos = cursor.fetchall()

    if not pedidos:
        print("📭 No hay pedidos registrados")
        conn.close()
        return

    print("\n📋 PEDIDOS:")
    for pedido in pedidos:
        print(f"\n  Pedido ID: {pedido['id']} | Cliente: {pedido['cliente_nombre']}")
        print(f"  Fecha: {pedido['fecha']}")

        # obtener detalles del pedido
        cursor.execute("""
        SELECT dp.cantidad, pl.nombre as plato_nombre, pl.precio
        FROM detalles_pedidos dp
        JOIN platos pl ON dp.plato_id = pl.id
        WHERE dp.pedido_id = ?
        """, (pedido['id'],))

        detalles = cursor.fetchall()
        print("  Detalles:")
        total = 0
        for d in detalles:
            subtotal = d['cantidad'] * d['precio']
            total += subtotal
            print(f"    - {d['plato_nombre']} x{d['cantidad']} = ${subtotal:.2f}")
        print(f"  Total: ${total:.2f}")

    conn.close()
    registrar_log(usuario["username"], "Consulto pedidos")

# =====================================================
# funciones administrativas del sistema
# =====================================================

def crear_usuario_admin(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_usuario"):
        print("🚫 Solo el administrador puede crear usuarios")
        return

    username = input("Nuevo usuario: ")
    password = input("Contrasena: ")

    print("Roles disponibles:")
    print("1. mesero")
    print("2. cocinero")

    opcion = input("Seleccione rol: ")

    if opcion == "1":
        rol = "mesero"
    elif opcion == "2":
        rol = "cocinero"
    else:
        print("Rol invalido")
        return

    # crear el nuevo usuario
    crear_usuario(username, password, rol)

    registrar_log(usuario["username"], f"Creo usuario {username} con rol {rol}")

    print("✅ Usuario creado correctamente")

def backup_bd(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "backup"):
        print("🚫 Solo administrador puede hacer backup")
        return

    fecha = datetime.now().strftime("%Y%m%d_%H%M%S")

    backup_file = f"backup_restaurante_{fecha}.db"

    try:
        # copiar la base de datos
        shutil.copy(DB, backup_file)

        registrar_log(usuario["username"], f"Backup creado: {backup_file}")

        print(f"✅ Backup creado: {backup_file}")

    except Exception as e:
        print("❌ Error en backup:", e)

def recuperar_password(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_usuario"):
        print("🚫 Sin permisos")
        return

    username = input("Usuario a recuperar: ")
    nueva = input("Nueva contrasena: ")

    conn = conectar()
    cursor = conn.cursor()

    # resetear la contrasena y desbloquear la cuenta
    cursor.execute("""
    UPDATE usuarios
    SET password=?, intentos_fallidos=0, bloqueado=0
    WHERE username=?
    """, (hash_password(nueva), username))

    conn.commit()
    conn.close()

    registrar_log(usuario["username"], f"Reseteo contrasena de {username}")

    print("✅ Contrasena actualizada")

def listar_usuarios(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "crear_usuario"):
        print("🚫 Sin permiso para listar usuarios")
        registrar_log(usuario["username"], "Intento listar usuarios sin permiso")
        return

    conn = conectar()
    cursor = conn.cursor()

    # obtener todos los usuarios con sus roles
    cursor.execute("""
    SELECT u.id, u.username, u.bloqueado, GROUP_CONCAT(r.nombre, ', ') as roles
    FROM usuarios u
    LEFT JOIN usuario_rol ur ON u.id = ur.usuario_id
    LEFT JOIN roles r ON ur.rol_id = r.id
    GROUP BY u.id
    """)
    usuarios = cursor.fetchall()
    conn.close()

    if not usuarios:
        print("📭 No hay usuarios registrados")
        return

    print("\n👤 USUARIOS:")
    for u in usuarios:
        estado = "🔒 Bloqueado" if u['bloqueado'] else "✅ Activo"
        rol = u['roles'] if u['roles'] else "Sin rol"
        print(f"  ID: {u['id']} | {u['username']} | {rol} | {estado}")

    registrar_log(usuario["username"], "Consulto listado de usuarios")

def ver_logs(usuario):
    # verificar permiso
    if not tiene_privilegio(usuario["id"], "ver_logs"):
        print("🚫 Sin permiso")
        return

    conn = conectar()
    cursor = conn.cursor()
    # obtener todos los registros de auditoria
    cursor.execute("SELECT * FROM logs")
    logs = cursor.fetchall()
    conn.close()

    if not logs:
        print("📭 No hay registros de auditoria")
        return

    print("\n📊 AUDITORIA:")
    for l in logs:
        print(f"  [{l['fecha']}] {l['usuario']}: {l['accion']}")

# =====================================================
# menu principal del sistema
# =====================================================

def menu(usuario):
    # bucle principal del menu
    while True:
        print("\n" + "="*50)
        print("🍽️  RESTAURANTE RBAC".center(50))
        print("="*50)
        print(f"Usuario: {usuario['username']}")
        print("="*50)

        print("\n--- PLATOS ---")
        print("1. Listar platos")
        print("2. Crear plato")
        print("3. Editar plato")
        print("4. Eliminar plato")

        print("\n--- CLIENTES ---")
        print("5. Listar clientes")
        print("6. Registrar cliente")

        print("\n--- PEDIDOS ---")
        print("7. Crear pedido")
        print("8. Ver pedidos")

        print("\n--- SISTEMA ---")
        print("9. Ver auditoria")
        print("10. Crear usuario")
        print("11. Listar usuarios")
        print("12. Backup")
        print("13. Recuperar contrasena")

        print("\n0. Salir")

        opcion = input("\nSeleccione opcion: ")

        # procesar la opcion seleccionada
        if opcion == "1":
            listar_platos(usuario)
        elif opcion == "2":
            crear_plato(usuario)
        elif opcion == "3":
            editar_plato(usuario)
        elif opcion == "4":
            eliminar_plato(usuario)
        elif opcion == "5":
            listar_clientes(usuario)
        elif opcion == "6":
            crear_cliente(usuario)
        elif opcion == "7":
            crear_pedido(usuario)
        elif opcion == "8":
            ver_pedidos(usuario)
        elif opcion == "9":
            ver_logs(usuario)
        elif opcion == "10":
            crear_usuario_admin(usuario)
        elif opcion == "11":
            listar_usuarios(usuario)
        elif opcion == "12":
            backup_bd(usuario)
        elif opcion == "13":
            recuperar_password(usuario)
        elif opcion == "0":
            print("\n👋 Hasta luego!")
            break
        else:
            print("❌ Opcion invalida")

# =====================================================
# punto de entrada del programa
# =====================================================

if __name__ == "__main__":
    # crear las tablas de la base de datos
    crear_tablas()
    # inicializar roles y privilegios
    inicializar_roles()

    # crear usuarios por defecto
    crear_usuario("admin", "Admin#2026", "admin")
    crear_usuario("mesero1", "Mesero#2026", "mesero")
    crear_usuario("cocinero1", "Cocinero#2026", "cocinero")

    # realizar el login
    usuario = login()
    # mostrar el menu si el login fue exitoso
    if usuario:
        menu(usuario)

"""
integracion: tarearestaurant + proyecto_seguridad/main.py

combina el sistema rbac con gestion de restaurante:
- login con captcha y bloqueo por intentos
- control de acceso basado en 3 roles
- crud de platos, clientes y pedidos
- auditoria completa de todas las acciones
- backup automatico de bd
- recuperacion de contrasena controlada
"""
