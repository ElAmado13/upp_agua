from flask import Flask, request, jsonify, render_template
import pymysql
import traceback
from datetime import datetime

app = Flask(__name__)

# Configuración de conexión a la base de datos
DB_CONFIG = {
    'host': "162.241.62.217",
    'user': "arnetcom_uriel",
    'password': "Uriel$2024.Agu4",
    'database': "arnetcom_agua",
    'port': 3306
}

# Buffer temporal
pulso_buffer = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recibir_pulsos', methods=['POST'])
def recibir_pulsos():
    global pulso_buffer
    try:
        data = request.get_json()
        pulsos = data.get('pulsos')
        if not pulsos:
            return jsonify({'error': 'Lista vacía'}), 400
        pulso_buffer = pulsos
        return jsonify({'mensaje': 'Pulsos recibidos'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ultimos_datos', methods=['GET'])
def ultimos_datos():
    global pulso_buffer
    return jsonify({'lecturas': pulso_buffer})

@app.route('/guardar_datos', methods=['POST'])
def guardar_datos():
    try:
        if request.content_type != 'application/json':
            return jsonify({'error': 'Tipo de contenido no soportado'}), 415

        data = request.get_json()
        consumo = data.get('consumo')
        if consumo is None:
            return jsonify({'error': 'El campo consumo está vacío'}), 400

        flujo = 1 if float(consumo) > 40 else 0  # 1 para fuga, 0 consumo adecuado

        conexion = pymysql.connect(**DB_CONFIG)
        cursor = conexion.cursor()

        sql = "INSERT INTO registros (fecha, lectura, flujo) VALUES (NOW(), %s, %s)"
        valores = (consumo, flujo)

        cursor.execute(sql, valores)
        conexion.commit()
        conexion.close()

        return jsonify({'mensaje': 'Datos guardados correctamente', 'flujo': flujo})

    except Exception as e:
        print('Error general:', str(e))
        print(traceback.format_exc())
        return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == '__main__':
    app.run(debug=True)
