from flask import Flask, request, jsonify, render_template
import pymysql
import traceback
from datetime import datetime, timedelta

app = Flask(__name__)

# Configuración de conexión a la base de datos
DB_CONFIG = {
    'host': "162.241.62.217",
    'user': "arnetcom_uriel",
    'password': "Uriel$2024.Agu4",
    'database': "arnetcom_agua",
    'port': 3306
}

@app.route('/')
def index():
    return render_template('index.html')

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

@app.route('/ultimos_datos', methods=['GET'])
def ultimos_datos():
    try:
        conexion = pymysql.connect(**DB_CONFIG)
        cursor = conexion.cursor()

        ahora = datetime.utcnow() - timedelta(hours=5)  # Hora México
        hace_5_segundos = ahora - timedelta(seconds=5)

        sql = "SELECT lectura FROM registros WHERE fecha >= %s ORDER BY fecha DESC"
        cursor.execute(sql, (hace_5_segundos,))
        resultados = cursor.fetchall()
        conexion.close()

        if resultados:
            lecturas = [float(r[0]) for r in resultados]
        else:
            lecturas = [0]

        return jsonify({"lecturas": lecturas})

    except Exception as e:
        print('Error en ultimos_datos:', str(e))
        return jsonify({'error': 'Error interno del servidor en ultimos_datos'}), 500

if __name__ == '__main__':
    app.run(debug=True)
