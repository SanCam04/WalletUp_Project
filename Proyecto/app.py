from flask import Flask, render_template #importacion

app = Flask(__name__) #instanciacion

#decorador/invocacion/endpoint
@app.route('/')
def index():
 return render_template(
 'index.html',
 nombre="Felipe",
 rol="Administrador"
 )
@app.route('/register')
def register():
 return render_template(
 'register.html',
 )
@app.route('/calculadora')
def calculadora():
 return render_template(
 'calculadora.html',
 )
@app.route('/imc')
def imc():
 return render_template(
 'imc.html',
 )
@app.route('/informacion')
def informacion():
 return render_template(
 'informacion.html',
 curso="Desarrollo Web con Flask"
 )
@app.route('/contacto')
def contacto():
 return render_template(
 'contacto.html',
 email="soporte@midominio.com"
 )
if __name__ == '__main__':
 app.run(debug=True)