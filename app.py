from flask import Flask, request, jsonify, render_template
import pymysql
import traceback  # Para imprimir rastreo completo de errores

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/guardar_datos', methods=['POST'])
def guardar_datos():
    try:
        print('Contenido del tipo de solicitud:', request.content_type)
        
        # Verificar si el tipo de contenido es JSON
        if request.content_type != 'application/json':
            return jsonify({'error': 'Tipo de contenido no soportado'}), 415

        data = request.get_json()
        print('Datos recibidos:', data)  # Imprimir los datos recibidos para depuración
        
        consumo = data.get('consumo')
        if not consumo:
            return jsonify({'error': 'El campo consumo está vacío'}), 400

        # Lógica para verificar si el consumo excede el límite de 40 litros
        flujo = 1 if float(consumo) > 40 else 0  # 1 para rojo (fuga), 0 para verde

        # Conectar a la base de datos
        try:
            conexion = pymysql.connect(
                host="162.241.62.217",
                user="arnetcom_uriel",
                password="Uriel$2024.Agu4",
                #user="arnetcom",
                #password="O6r#]IYdr0x06G",
                database="arnetcom_agua",
                port=3306  
            )
            cursor = conexion.cursor()
        except pymysql.MySQLError as e:
            print('Error en la conexión a la base de datos:', e)
            return jsonify({'error': 'Error en la conexión a la base de datos'}), 500

        # Insertar datos en la base de datos
        sql = "INSERT INTO registros (fecha, lectura, flujo) VALUES (NOW(), %s, %s)"
        valores = (consumo, flujo)

        try:
            cursor.execute(sql, valores)
            conexion.commit()
        except pymysql.MySQLError as e:
            print('Error al ejecutar la consulta SQL:', e)
            return jsonify({'error': 'Error al guardar los datos en la base de datos'}), 500
        finally:
            conexion.close()

        # Devolver una respuesta en JSON para la interfaz
        return jsonify({'mensaje': 'Datos guardados correctamente', 'flujo': flujo})

    except Exception as e:
        print('Error general:', str(e))
        print(traceback.format_exc())  # Imprimir rastreo completo del error
        return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    app.run(debug=True)
