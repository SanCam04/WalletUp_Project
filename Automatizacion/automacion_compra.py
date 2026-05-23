# Importacion de Librerias
from webdriver_manager.chrome import ChromeDriverManager
# Descarga automáticamente el driver de Chrome compatible con el navegador
from selenium import webdriver
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.service import Service
# Importa herramienta para controlar el navegador Chrome
import time
# Permite pausar la ejecución con time.sleep()
from selenium.webdriver.common.by import By
# Define la forma de localizar elementos (By.ID, By.NAME, By.XPATH, etc.).
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait as Wait

# credenciales de prueba para iniciar sesión en el sitio
USER = "standard_user"
PASSWORD = "secret_sauce"

# función principal
def main():
    # CONFIGURACION DE NAVEGADOR
    # Instala y configura el chromedriver
    service = Service(ChromeDriverManager().install())
    # Crea opciones para el navegador (por ejemplo, el tamaño de la ventana).
    option = webdriver.ChromeOptions()
    option.add_argument("--window-size=1920, 1080")
    # Inicia una instancia del navegador Chrome con el servicio y las opciones
    driver = Chrome(service=service, options=option)

    try:
        # Abre la página de inicio de sesión de la tienda de prueba
        driver.get("https://www.saucedemo.com/")
        # Espera 7 segundos para que se vea el proceso
        time.sleep(7)

        # LOGIN
        # Localiza los campos de usuario y contraseña por su ID y envía las credenciales
        driver.find_element(By.ID, "user-name").send_keys(USER)
        driver.find_element(By.ID, "password").send_keys(PASSWORD)
        driver.find_element(By.ID, "login-button").click()
        # Espera 7 segundos para que se vea el proceso
        time.sleep(7)

        # COMPRAS
        # Añade dos camisetas al carrito usando By.NAME y By.ID.
        driver.find_element(By.NAME, "add-to-cart-sauce-labs-bolt-t-shirt").click()
        driver.find_element(By.ID, "add-to-cart-test.allthethings()-t-shirt-(red)").click()
        # Espera 7 segundos para que se vea el proceso
        time.sleep(7)

        # CARRITO
        # Va al carrito de compras y presiona el botón de checkout
        driver.find_element(By.XPATH, "/html/body/div/div/div/div[1]/div[1]/div[3]/a").click()
        driver.find_element(By.ID, "checkout").click()
        # Espera 7 segundos para que se vea el proceso
        time.sleep(7)

        # PAGAR
        # Llena el formulario de datos personales y continúa
        driver.find_element(By.ID, "first-name").send_keys("Test")
        driver.find_element(By.ID, "last-name").send_keys("TEST")
        driver.find_element(By.ID, "postal-code").send_keys("12345")
        driver.find_element(By.ID, "continue").click()
        # Espera 10 segundos para que se vea el proceso
        time.sleep(10)

        # Finaliza la compra
        driver.find_element(By.ID, "finish").click()
        # Espera 10 segundos para que se vea el proceso
        time.sleep(10)

        print("✓ Compra completada exitosamente!")

    except Exception as e:
        print(f"✗ Error durante la ejecución: {e}")

    finally:
        # cierra el navegador
        driver.quit()

# Ejecutar el script
if __name__ == "__main__":
    main()
