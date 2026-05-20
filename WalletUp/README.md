# WalletUp - Sistema de Gestión Financiera Personal

Aplicación web completa para gestión de finanzas personales con backend Flask y frontend moderno con Bootstrap.

## Estructura del Proyecto

```
WalletUp/
├── app.py                      # Aplicación Flask principal
├── walletup.db                # Base de datos SQLite
├── requirements.txt           # Dependencias Python
├── README.md                  # Este archivo
│
├── templates/                 # Plantillas HTML
│   ├── login.html            # Página de login
│   ├── registro.html         # Página de registro
│   ├── dashboard.html        # Dashboard principal
│   ├── transacciones.html    # Gestión de transacciones
│   ├── metas.html           # Gestión de metas de ahorro
│   ├── reportes.html        # Reportes financieros
│   ├── educacion.html       # Centro educativo
│   └── componentes/          # Componentes reutilizables
│       ├── header.html      # Encabezado
│       └── footer.html      # Pie de página
│
├── static/                    # Archivos estáticos
│   ├── css/
│   │   └── styles.css       # Estilos principales (Bootstrap personalizado)
│   └── js/
│       ├── utils.js         # Funciones utilitarias globales
│       ├── auth.js          # Lógica de autenticación
│       ├── dashboard.js     # Lógica del dashboard
│       ├── transacciones.js # CRUD de transacciones
│       ├── metas.js         # CRUD de metas
│       ├── reportes.js      # Generación de reportes
│       └── educacion.js     # Gestión de educación
```

## Instalación

```bash
# Clonar o descargar el repositorio
cd WalletUp

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar la aplicación
python app.py
```

La aplicación estará disponible en `http://localhost:5000`

## Credenciales de Prueba

**SuperAdmin:**
- Usuario: `superadmin`
- Contraseña: `SuperAdmin#2026`

**Cliente:**
- Usuario: `cliente1`
- Contraseña: `Cliente#2026`

## Endpoints

### Autenticación

- **POST** `/api/registro` - Registrar nuevo usuario
- **POST** `/api/login` - Iniciar sesión
- **POST** `/api/logout` - Cerrar sesión (requiere login)

### Transacciones

- **GET** `/api/transacciones` - Obtener transacciones (con filtros opcionales)
  - Query params: `categoria_id`, `tipo`, `fecha_inicio`, `fecha_fin`
- **POST** `/api/transacciones` - Crear transacción
- **PUT** `/api/transacciones/<id>` - Editar transacción
- **DELETE** `/api/transacciones/<id>` - Eliminar transacción

### Categorías

- **GET** `/api/categorias` - Obtener categorías
- **POST** `/api/categorias` - Crear categoría
- **PUT** `/api/categorias/<id>` - Editar categoría
- **DELETE** `/api/categorias/<id>` - Eliminar categoría

### Metas

- **GET** `/api/metas` - Obtener metas
- **POST** `/api/metas` - Crear meta
- **PUT** `/api/metas/<id>` - Editar meta
- **DELETE** `/api/metas/<id>` - Eliminar meta

### Reportes

- **GET** `/api/reportes/resumen` - Obtener resumen (con filtros de fecha)
- **GET** `/api/reportes/gastos-por-categoria` - Obtener gastos por categoría

### Educación

- **GET** `/api/educacion` - Obtener artículos educativos
  - Query param: `categoria` (opcional)

### Alertas

- **GET** `/api/alertas` - Obtener alertas (no leídas por defecto)
- **PUT** `/api/alertas/<id>/marcar-leida` - Marcar alerta como leída

### Administración (Solo Superadmin)

- **GET** `/api/admin/usuarios` - Obtener lista de todos los usuarios
- **POST** `/api/admin/usuarios` - Crear nuevo usuario
- **PUT** `/api/admin/usuarios/<id>/bloquear` - Bloquear usuario
- **PUT** `/api/admin/usuarios/<id>/desbloquear` - Desbloquear usuario
- **GET** `/api/admin/logs` - Obtener logs de auditoría

## Roles y Permisos

### Roles
- **cliente** - Usuario regular con acceso a sus propias finanzas
- **superadmin** - Administrador del sistema con acceso a todos los usuarios

### Privilegios por rol

**Cliente:**
- `crear_transaccion`, `editar_transaccion`, `eliminar_transaccion`
- `crear_categoria`, `editar_categoria`, `eliminar_categoria`
- `crear_meta`, `editar_meta`, `eliminar_meta`
- `ver_reportes`, `ver_educacion`

**Superadmin:**
- Todos los privilegios del cliente
- `ver_logs`, `crear_usuario`, `ver_usuarios`, `gestionar_usuarios`

## Usuarios por defecto

- **superadmin** / SuperAdmin#2026
- **cliente1** / Cliente#2026

## Estructura de la base de datos

### Tablas principales
- `usuarios` - Registro de usuarios
- `roles` - Roles del sistema
- `privilegios` - Permisos disponibles
- `usuario_rol` - Relación usuario-rol
- `rol_privilegio` - Relación rol-privilegio
- `categorias` - Categorías de transacciones
- `transacciones` - Registro de ingresos y gastos
- `metas` - Metas de ahorro
- `articulos_educativos` - Contenido educativo
- `alertas` - Sistema de alertas
- `logs` - Registro de auditoría
