document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let calendar;
    let selectedDate = null;
    let tareaSeleccionada = null;
    let todasLasTareas = [];

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function manejarRespuesta(response) {
        if (!response.ok) {
            return response.json()
                .catch(() => ({}))
                .then(data => {
                    throw new Error(data.error || 'No se pudo completar la operación.');
                });
        }
        return response.status === 204 ? null : response.json();
    }
    
    // Inicializar el calendario
    const calendarEl = document.getElementById('calendario');
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        themeSystem: 'bootstrap5',
        height: 'auto',
        dayMaxEvents: true,
        nowIndicator: true,
        eventDidMount: function(info) {
            // Crear tooltip con Bootstrap
            const tooltip = new bootstrap.Tooltip(info.el, {
                title: `<div class="tooltip-content">
                            <p><strong>${escapeHTML(info.event.title)}</strong></p>
                            <p><i class="bi bi-folder me-1"></i>Proyecto: ${escapeHTML(info.event.extendedProps.proyecto)}</p>
                            <p><i class="bi bi-clock me-1"></i>Horas: ${escapeHTML(info.event.extendedProps.horas)}h</p>
                            <p><i class="bi bi-star me-1"></i>Importancia: ${escapeHTML(info.event.extendedProps.importancia)}</p>
                         </div>`,
                placement: 'top',
                trigger: 'hover',
                html: true,
                container: 'body'
            });
        },
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
            omitZeroMinute: true
        },
        displayEventTime: false, // Ocultar la hora en la visualización del evento
        selectable: true,
        select: function(info) {
            // Al seleccionar un día en el calendario
            selectedDate = info.startStr;
            document.getElementById('fecha').value = selectedDate;
            document.getElementById('fecha-seleccionada').textContent = formatearFecha(selectedDate);
            
            // Mostrar las tareas del día seleccionado
            mostrarTareasDia(selectedDate);
        },
        eventClick: function(info) {
            // Al hacer clic en un evento (tarea) del calendario
            const tareaId = parseInt(info.event.id);
            editarTarea(tareaId);
        },
        eventContent: function(arg) {
            // Personalizar el contenido de los eventos
            let importanciaIcon = '';
            switch(arg.event.extendedProps.importancia.toLowerCase()) {
                case 'alta':
                    importanciaIcon = '<i class="bi bi-exclamation-circle"></i> ';
                    break;
                case 'media':
                    importanciaIcon = '<i class="bi bi-star"></i> ';
                    break;
                case 'baja':
                    importanciaIcon = '<i class="bi bi-check-circle"></i> ';
                    break;
            }
            
            return {
                html: `<div class="fc-event-title">${importanciaIcon}${escapeHTML(arg.event.title)}</div>`
            };
        }
    });
    
    calendar.render();
    
    // Cargar todas las tareas al iniciar
    cargarTareas();
    
    // Event Listeners
    document.getElementById('tarea-form').addEventListener('submit', guardarTarea);
    document.getElementById('cancelar-btn').addEventListener('click', cancelarEdicion);
    document.getElementById('confirmar-eliminar').addEventListener('click', eliminarTareaConfirmada);
    
    // Funciones
    function cargarTareas() {
        fetch('/tareas')
            .then(manejarRespuesta)
            .then(data => {
                todasLasTareas = data;
                actualizarCalendario();
            })
            .catch(error => console.error('Error al cargar las tareas:', error));
    }
    
    function actualizarCalendario() {
        // Limpiar eventos existentes
        calendar.removeAllEvents();
        
        // Agregar eventos desde las tareas
        todasLasTareas.forEach(tarea => {
            calendar.addEvent({
                id: tarea.id,
                title: tarea.tema,
                start: tarea.fecha,
                className: `importancia-${tarea.importancia.toLowerCase()}`,
                extendedProps: {
                    horas: tarea.horas,
                    proyecto: tarea.proyecto,
                    importancia: tarea.importancia
                }
            });
        });
    }
    
    function mostrarTareasDia(fecha) {
        const listaTareas = document.getElementById('lista-tareas');
        const sinTareas = document.getElementById('sin-tareas');
        
        // Filtrar tareas del día seleccionado
        const tareasDia = todasLasTareas.filter(tarea => tarea.fecha === fecha);
        
        // Limpiar lista actual
        listaTareas.innerHTML = '';
        
        if (tareasDia.length > 0) {
            sinTareas.style.display = 'none';
            listaTareas.style.display = 'block';
            
            // Crear elementos para cada tarea
            tareasDia.forEach(tarea => {
                const importancia = tarea.importancia.toLowerCase();
                const badgeClass = importancia === 'alta' ? 'danger' : (importancia === 'media' ? 'warning' : 'primary');
                const badgeIcon = importancia === 'alta' ? '<i class="bi bi-exclamation-circle me-1"></i>' : (importancia === 'media' ? '<i class="bi bi-star me-1"></i>' : '<i class="bi bi-check-circle me-1"></i>');
                const tareaElement = document.createElement('div');
                tareaElement.className = `list-group-item tarea-item importancia-${importancia} fade-in`;
                tareaElement.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${escapeHTML(tarea.tema)}</h5>
                        <small><i class="bi bi-clock me-1"></i>${escapeHTML(tarea.horas)}h</small>
                    </div>
                    <p class="mb-1"><i class="bi bi-folder me-1"></i>Proyecto: ${escapeHTML(tarea.proyecto)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small>
                            <span class="badge bg-${badgeClass}">
                                ${badgeIcon}
                                ${escapeHTML(tarea.importancia)}
                            </span>
                        </small>
                        <div class="tarea-acciones">
                            <button class="btn btn-sm btn-outline-primary editar-btn" data-id="${tarea.id}">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger eliminar-btn" data-id="${tarea.id}">
                                <i class="bi bi-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
                listaTareas.appendChild(tareaElement);
                
                // Agregar event listeners a los botones
                tareaElement.querySelector('.editar-btn').addEventListener('click', function() {
                    editarTarea(tarea.id);
                });
                
                tareaElement.querySelector('.eliminar-btn').addEventListener('click', function() {
                    confirmarEliminarTarea(tarea.id);
                });
            });
        } else {
            sinTareas.style.display = 'block';
            listaTareas.style.display = 'none';
            sinTareas.textContent = `No hay actividades registradas para el ${formatearFecha(fecha)}`;
        }
    }
    
    function guardarTarea(event) {
        event.preventDefault();
        
        const tareaData = {
            fecha: document.getElementById('fecha').value,
            tema: document.getElementById('tema').value,
            horas: document.getElementById('horas').value,
            proyecto: document.getElementById('proyecto').value,
            importancia: document.getElementById('importancia').value
        };
        
        const tareaId = document.getElementById('tarea-id').value;
        
        if (tareaId) {
            // Actualizar tarea existente
            fetch(`/tareas/${tareaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tareaData)
            })
            .then(manejarRespuesta)
            .then(data => {
                // Actualizar la lista de tareas
                const index = todasLasTareas.findIndex(t => t.id === parseInt(tareaId));
                if (index !== -1) {
                    todasLasTareas[index] = data;
                }
                
                resetearFormulario();
                actualizarCalendario();
                mostrarTareasDia(tareaData.fecha);
            })
            .catch(error => alert(error.message));
        } else {
            // Crear nueva tarea
            fetch('/tareas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tareaData)
            })
            .then(manejarRespuesta)
            .then(data => {
                // Agregar la nueva tarea a la lista
                todasLasTareas.push(data);
                
                resetearFormulario();
                actualizarCalendario();
                mostrarTareasDia(tareaData.fecha);
            })
            .catch(error => alert(error.message));
        }
    }
    
    function editarTarea(tareaId) {
        // Encontrar la tarea por ID
        const tarea = todasLasTareas.find(t => t.id === tareaId);
        if (!tarea) return;
        
        // Llenar el formulario con los datos de la tarea
        document.getElementById('tarea-id').value = tarea.id;
        document.getElementById('fecha').value = tarea.fecha;
        document.getElementById('tema').value = tarea.tema;
        document.getElementById('horas').value = tarea.horas;
        document.getElementById('proyecto').value = tarea.proyecto;
        document.getElementById('importancia').value = tarea.importancia;
        
        // Cambiar el título del formulario y mostrar el botón de cancelar
        document.getElementById('form-title').textContent = 'Editar Actividad';
        document.getElementById('guardar-btn').textContent = 'Actualizar';
        document.getElementById('cancelar-btn').style.display = 'block';
        
        // Guardar referencia a la tarea seleccionada
        tareaSeleccionada = tarea;
    }
    
    function cancelarEdicion() {
        resetearFormulario();
    }
    
    function resetearFormulario() {
        // Limpiar el formulario
        document.getElementById('tarea-form').reset();
        document.getElementById('tarea-id').value = '';
        
        // Restaurar el título y ocultar el botón de cancelar
        document.getElementById('form-title').textContent = 'Registrar Actividad';
        document.getElementById('guardar-btn').textContent = 'Guardar';
        document.getElementById('cancelar-btn').style.display = 'none';
        
        // Si hay una fecha seleccionada, mantenerla en el formulario
        if (selectedDate) {
            document.getElementById('fecha').value = selectedDate;
        }
        
        tareaSeleccionada = null;
    }
    
    function confirmarEliminarTarea(tareaId) {
        // Guardar el ID de la tarea a eliminar
        tareaSeleccionada = todasLasTareas.find(t => t.id === tareaId);
        
        // Mostrar el modal de confirmación
        const eliminarModal = new bootstrap.Modal(document.getElementById('eliminar-modal'));
        eliminarModal.show();
    }
    
    function eliminarTareaConfirmada() {
        if (!tareaSeleccionada) return;
        
        fetch(`/tareas/${tareaSeleccionada.id}`, {
            method: 'DELETE'
        })
        .then(manejarRespuesta)
        .then(() => {
            // Eliminar la tarea de la lista
            const index = todasLasTareas.findIndex(t => t.id === tareaSeleccionada.id);
            if (index !== -1) {
                todasLasTareas.splice(index, 1);
            }

            // Actualizar la vista
            actualizarCalendario();
            if (selectedDate) {
                mostrarTareasDia(selectedDate);
            }

            // Cerrar el modal
            const eliminarModal = bootstrap.Modal.getInstance(document.getElementById('eliminar-modal'));
            eliminarModal.hide();
        })
        .catch(error => alert(error.message));
    }
    
    function formatearFecha(fechaStr) {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Función para obtener un emoji basado en el proyecto y la importancia
    function getEmojiForTarea(proyecto, importancia) {
        // Mapeo de proyectos a emojis
        const proyectoEmojis = {
            'Python': '🐍',
            'JavaScript': '🌐',
            'Web': '🖥️',
            'Matemáticas': '🧮',
            'Ciencias': '🔬',
            'Idiomas': '🗣️',
            'Literatura': '📚',
            'Historia': '📜',
            'Arte': '🎨',
            'Música': '🎵',
            'Programación': '👨‍💻',
            'Diseño': '🎭',
            'Base de datos': '💾',
            'Mobile': '📱',
            'IA': '🤖',
            'Machine Learning': '🧠',
            'DevOps': '⚙️',
            'Cloud': '☁️',
            'Seguridad': '🔒',
            'Redes': '🌐',
            'Hardware': '💻',
            'Software': '📊',
            'Blockchain': '⛓️',
            'Videojuegos': '🎮'
        };
        
        // Buscar emoji por proyecto
        for (const [key, value] of Object.entries(proyectoEmojis)) {
            if (proyecto.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        
        // Si no se encuentra un emoji específico, usar uno basado en la importancia
        switch(importancia.toLowerCase()) {
            case 'alta':
                return '🔴';
            case 'media':
                return '🟡';
            case 'baja':
                return '🔵';
            default:
                return '📝'; // Emoji por defecto
        }
    }
});
