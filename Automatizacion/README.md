# 🤖 Automatización de Compra - Selenium

Script de automatización que realiza una compra completa en el sitio de demostración **saucedemo.com**.

## 📋 Requisitos Previos

- **Python 3.8+** instalado
- **Google Chrome** instalado en tu máquina
- **pip** (gestor de paquetes de Python)

## 🚀 Instalación y Ejecución

### 1. Instalar dependencias
```bash
cd /Users/danielcamacho/development/ejemplo/Automatizacion
pip install -r requirements.txt
```

### 2. Ejecutar el script
```bash
python automacion_compra.py
```

## ✅ Qué hace el script

1. ✓ Abre el navegador Chrome
2. ✓ Navega a saucedemo.com
3. ✓ Inicia sesión con credenciales de prueba
4. ✓ Añade 2 camisetas al carrito
5. ✓ Accede al carrito
6. ✓ Inicia el proceso de checkout
7. ✓ Llena formulario con datos personales
8. ✓ Completa la compra exitosamente

## 📦 Dependencias

- **selenium** → Automatización del navegador
- **webdriver-manager** → Manejo automático del ChromeDriver

## 🔐 Credenciales de Prueba

- **Usuario:** standard_user
- **Contraseña:** secret_sauce

## 💡 Notas

- El script incluye pausas de 7-10 segundos para visualizar el proceso
- Cualquier error se capturará y mostrará en consola
- El navegador se cerrará automáticamente al finalizar
