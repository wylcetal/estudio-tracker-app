from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file, Response
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import csv
import io
from collections import defaultdict
import tempfile

app = Flask(__name__)
app.config['SECRET_KEY'] = 'tu_clave_secreta'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///estudio_tracker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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
    tareas = Tarea.query.all()
    return jsonify([tarea.to_dict() for tarea in tareas])

@app.route('/tareas', methods=['POST'])
def crear_tarea():
    data = request.json
    
    # Convertir la fecha de string a objeto date
    fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    
    nueva_tarea = Tarea(
        fecha=fecha,
        tema=data['tema'],
        horas=float(data['horas']),
        proyecto=data['proyecto'],
        importancia=data['importancia']
    )
    
    db.session.add(nueva_tarea)
    db.session.commit()
    
    return jsonify(nueva_tarea.to_dict()), 201

@app.route('/tareas/<int:tarea_id>', methods=['PUT'])
def actualizar_tarea(tarea_id):
    tarea = Tarea.query.get_or_404(tarea_id)
    data = request.json
    
    # Convertir la fecha de string a objeto date
    fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    
    tarea.fecha = fecha
    tarea.tema = data['tema']
    tarea.horas = float(data['horas'])
    tarea.proyecto = data['proyecto']
    tarea.importancia = data['importancia']
    
    db.session.commit()
    
    return jsonify(tarea.to_dict())

@app.route('/tareas/<int:tarea_id>', methods=['DELETE'])
def eliminar_tarea(tarea_id):
    tarea = Tarea.query.get_or_404(tarea_id)
    db.session.delete(tarea)
    db.session.commit()
    
    return '', 204

if __name__ == '__main__':
    # Configuración para desarrollo local
    app.run(debug=True)
else:
    # Configuración para producción
    # Asegurarse de que la base de datos existe
    with app.app_context():
        db.create_all()
