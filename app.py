from flask import Flask, render_template, request, jsonify, Response
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import csv
import io
from collections import defaultdict
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

if not database_url:
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{Path(app.instance_path) / 'estudio_tracker.db'}"

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

IMPORTANCIAS_VALIDAS = {'Alta', 'Media', 'Baja'}

# Modelo de datos para las tareas de estudio
class Tarea(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    tema = db.Column(db.String(100), nullable=False)
    horas = db.Column(db.Float, nullable=False)
    proyecto = db.Column(db.String(100), nullable=False)
    importancia = db.Column(db.String(20), nullable=False)  # Alta, Media, Baja
    
    def to_dict(self):
        return {
            'id': self.id,
            'fecha': self.fecha.strftime('%Y-%m-%d'),
            'tema': self.tema,
            'horas': self.horas,
            'proyecto': self.proyecto,
            'importancia': self.importancia
        }


def validar_tarea_payload(data):
    if not isinstance(data, dict):
        return None, ('El cuerpo de la solicitud debe ser JSON.', 400)

    campos = ('fecha', 'tema', 'horas', 'proyecto', 'importancia')
    faltantes = [campo for campo in campos if campo not in data or data[campo] in (None, '')]
    if faltantes:
        return None, (f"Campos requeridos faltantes: {', '.join(faltantes)}.", 400)

    try:
        fecha = datetime.strptime(str(data['fecha']), '%Y-%m-%d').date()
    except ValueError:
        return None, ('La fecha debe tener formato YYYY-MM-DD.', 400)

    try:
        horas = float(data['horas'])
    except (TypeError, ValueError):
        return None, ('Las horas deben ser un número.', 400)

    if horas <= 0:
        return None, ('Las horas deben ser mayores que cero.', 400)

    importancia = str(data['importancia']).strip()
    if importancia not in IMPORTANCIAS_VALIDAS:
        return None, ('La importancia debe ser Alta, Media o Baja.', 400)

    payload = {
        'fecha': fecha,
        'tema': str(data['tema']).strip(),
        'horas': horas,
        'proyecto': str(data['proyecto']).strip(),
        'importancia': importancia,
    }

    if not payload['tema'] or not payload['proyecto']:
        return None, ('Tema y proyecto no pueden estar vacíos.', 400)

    return payload, None

# Crear la base de datos si no existe
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/visualizar')
def visualizar():
    return render_template('visualizar.html')

@app.route('/api/tareas_por_fecha')
def tareas_por_fecha():
    tareas = Tarea.query.order_by(Tarea.fecha).all()
    tareas_agrupadas = defaultdict(list)
    
    for tarea in tareas:
        fecha_str = tarea.fecha.strftime('%Y-%m-%d')
        tareas_agrupadas[fecha_str].append(tarea.to_dict())
    
    # Convertir a formato adecuado para JSON
    resultado = [{
        'fecha': fecha,
        'tareas': tareas_lista
    } for fecha, tareas_lista in tareas_agrupadas.items()]
    
    return jsonify(resultado)

@app.route('/api/tareas_por_proyecto')
def tareas_por_proyecto():
    tareas = Tarea.query.order_by(Tarea.proyecto).all()
    tareas_agrupadas = defaultdict(list)
    
    for tarea in tareas:
        tareas_agrupadas[tarea.proyecto].append(tarea.to_dict())
    
    # Convertir a formato adecuado para JSON
    resultado = [{
        'proyecto': proyecto,
        'tareas': tareas_lista
    } for proyecto, tareas_lista in tareas_agrupadas.items()]
    
    return jsonify(resultado)

@app.route('/exportar_csv')
def exportar_csv():
    tareas = Tarea.query.order_by(Tarea.fecha).all()
    
    # Crear un archivo CSV en memoria
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Escribir encabezados
    writer.writerow(['ID', 'Fecha', 'Tema', 'Horas', 'Proyecto', 'Importancia'])
    
    # Escribir datos
    for tarea in tareas:
        writer.writerow([
            tarea.id,
            tarea.fecha.strftime('%Y-%m-%d'),
            tarea.tema,
            tarea.horas,
            tarea.proyecto,
            tarea.importancia
        ])
    
    # Preparar la respuesta
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=tareas_estudio.csv"}
    )

@app.route('/tareas', methods=['GET'])
def obtener_tareas():
    tareas = Tarea.query.order_by(Tarea.fecha.desc(), Tarea.id.desc()).all()
    return jsonify([tarea.to_dict() for tarea in tareas])

@app.route('/tareas', methods=['POST'])
def crear_tarea():
    payload, error = validar_tarea_payload(request.get_json(silent=True))
    if error:
        mensaje, status = error
        return jsonify({'error': mensaje}), status
    
    nueva_tarea = Tarea(
        fecha=payload['fecha'],
        tema=payload['tema'],
        horas=payload['horas'],
        proyecto=payload['proyecto'],
        importancia=payload['importancia']
    )
    
    db.session.add(nueva_tarea)
    db.session.commit()
    
    return jsonify(nueva_tarea.to_dict()), 201

@app.route('/tareas/<int:tarea_id>', methods=['PUT'])
def actualizar_tarea(tarea_id):
    tarea = Tarea.query.get_or_404(tarea_id)
    payload, error = validar_tarea_payload(request.get_json(silent=True))
    if error:
        mensaje, status = error
        return jsonify({'error': mensaje}), status
    
    tarea.fecha = payload['fecha']
    tarea.tema = payload['tema']
    tarea.horas = payload['horas']
    tarea.proyecto = payload['proyecto']
    tarea.importancia = payload['importancia']
    
    db.session.commit()
    
    return jsonify(tarea.to_dict())

@app.route('/tareas/<int:tarea_id>', methods=['DELETE'])
def eliminar_tarea(tarea_id):
    tarea = Tarea.query.get_or_404(tarea_id)
    db.session.delete(tarea)
    db.session.commit()
    
    return '', 204


@app.errorhandler(404)
def no_encontrado(error):
    return jsonify({'error': 'Recurso no encontrado.'}), 404

if __name__ == '__main__':
    # Configuración para desarrollo local
    app.run(debug=True)
else:
    # Configuración para producción
    # Asegurarse de que la base de datos existe
    with app.app_context():
        db.create_all()
