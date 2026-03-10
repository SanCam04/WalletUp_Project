from flask import Flask, render_template, request #importacion

app = Flask(__name__) #instanciacion

#decorador/invocacion/endpoint
@app.route('/')
def index():
 nombre="Felipe"
 return render_template(
 'index.html',
 nombre=nombre,
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
@app.route('/CalImc', methods=['POST'])
def CalImc():
 altura = float(request.form["altura"])
 peso = float(request.form["peso"])
 imc = peso / (altura * altura)
 if imc < 18.5:
  categoria = "Bajo peso"
 elif imc < 25:
  categoria = "Peso normal"
 elif imc < 30:
  categoria = "Sobrepeso"
 else:
  categoria = "Obesidad"
 return render_template(
  'imc.html',
  imc = round(imc, 2),
  categoria = categoria,
  peso = peso,
  altura = altura
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
@app.route('/usuario',methods=['POST'])
def usuario():
 nombreU = request.form["nombre"]
 return render_template(
 'index.html',
 nombreU=nombreU
 )
if __name__ == '__main__':
 app.run(debug=True)