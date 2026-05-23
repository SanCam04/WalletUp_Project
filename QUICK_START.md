# 🚀 WalletUp - Quick Start Guide

Guía rápida para instalar y ejecutar WalletUp (Backend + Frontend).

---

## 📋 Requisitos Previos

- Python 3.8+ (para el backend)
- Node.js 18+ (para el frontend)
- Git
- Terminal/CMD

---

## 🔧 Instalación Backend (Flask)

### 1. Navegar a la carpeta del backend

```bash
cd /Users/danielcamacho/development/ejemplo/WalletUp
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Ejecutar el servidor

```bash
python app.py
```

**Esperado:**
```
 * Running on http://127.0.0.1:5000
 * Press CTRL+C to quit
```

El backend estará disponible en: **http://localhost:5000**

---

## 🎨 Instalación Frontend (Astro)

### 1. Abrir nueva terminal y navegar al frontend

```bash
cd /Users/danielcamacho/development/ejemplo/WalletUp-Frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

**Esperado:**
```
  http://localhost:3000/
```

El frontend estará disponible en: **http://localhost:3000**

---

## 🔐 Credenciales de Prueba

### SuperAdmin

```
Usuario: superadmin
Email:   admin@walletup.com
Contraseña: Admin#2026
```

### Acceder

1. Abre http://localhost:3000
2. Ingresa `superadmin` y `Admin#2026`
3. Responde el CAPTCHA (suma de números)
4. ¡Listo!

---

## 📊 Flujo Típico

### Como SuperAdmin

```
1. Login como superadmin
2. Ir a /admin/usuarios
3. Crear un usuario cliente
4. Obtener credenciales del nuevo cliente
5. Logout
6. Login como cliente
7. Usar la plataforma
```

### Como Cliente

```
1. Login con credenciales proporcionadas
2. Ver Dashboard
3. Crear transacciones (ingresos/gastos)
4. Crear metas de ahorro
5. Ver reportes
6. Aprender en módulo educativo
```

---

## 🛠️ Estructura de Carpetas

```
desarrollo/ejemplo/
├── WalletUp/                    # Backend Flask
│   ├── app.py                   # Aplicación principal
│   ├── database.db              # Base de datos (se crea automáticamente)
│   ├── requirements.txt         # Dependencias Python
│   ├── README.md
│   └── ENDPOINTS.md
│
└── WalletUp-Frontend/           # Frontend Astro
    ├── src/
    │   ├── pages/              # Páginas (rutas)
    │   ├── components/         # Componentes React & Astro
    │   ├── services/           # Servicios API
    │   ├── stores/             # Estado global
    │   ├── styles/             # CSS
    │   └── types/              # TypeScript interfaces
    ├── package.json
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── .env.local
    └── README.md
```

---

## 🔗 URLs Importantes

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend | http://localhost:3000 | 3000 |
| Backend | http://localhost:5000 | 5000 |
| API Base | http://localhost:5000/api | 5000 |
| Login | http://localhost:3000 | 3000 |

---

## 📝 Comandos Útiles

### Backend

```bash
# Entrar en el entorno
source venv/bin/activate

# Correr el servidor
python app.py

# Salir del entorno
deactivate

# Instalar nuevas dependencias
pip install nombre-paquete
pip freeze > requirements.txt
```

### Frontend

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev

# Build para producción
npm run build

# Preview de build
npm run preview

# Instalar nuevos paquetes
npm install nombre-paquete
```

---

## 🐛 Troubleshooting

### Error: "Port 5000 already in use"

```bash
# En Mac/Linux: encontrar y matar el proceso
lsof -ti:5000 | xargs kill -9

# En Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Error: "Module not found"

```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### Error: "Cannot connect to API"

1. Verifica que el backend esté corriendo en http://localhost:5000
2. Verifica que CORS esté habilitado en `app.py`
3. Verifica `.env.local` en frontend tenga la URL correcta

### Base de datos corrupta

```bash
# Eliminar la base de datos
rm WalletUp/database.db

# Reiniciar el backend (creará una nueva BD)
python app.py
```

---

## 🎯 Próximos Pasos

1. **Explorar el Dashboard**
   - Ver balance, transacciones y metas

2. **Crear Transacciones**
   - Registrar ingresos y gastos
   - Crear categorías custom

3. **Metas de Ahorro**
   - Crear objetivos
   - Hacer aportes
   - Ver progreso

4. **Reportes**
   - Analizar gastos por categoría
   - Ver tendencias

5. **Módulo Educativo**
   - Aprender sobre finanzas

---

## 📚 Documentación

- **Backend**: Ver `WalletUp/ENDPOINTS.md` para lista completa de endpoints
- **Frontend**: Ver `WalletUp-Frontend/README.md` para estructura
- **Arquitectura**: Ver `WalletUp/README.md` para detalles del proyecto

---

## 🚀 Deploy (Futuro)

### Backend
- Usar Render, Railway, o Heroku
- Configurar variables de entorno
- Database PostgreSQL

### Frontend
- Usar Vercel, Netlify o Firebase Hosting
- Ajustar `PUBLIC_API_URL` a servidor de producción
- Build automático

---

## ❓ Soporte

Si encuentras problemas:

1. Revisa los logs en terminal
2. Consulta la documentación de endpoints
3. Verifica credenciales y permisos
4. Contacta: support@walletup.com

---

## 📄 Licencia

MIT © 2026 WalletUp

---

**¡Bienvenido a WalletUp! Ahora puedes empezar a gestionar tus finanzas. 💳**
