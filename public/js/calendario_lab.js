document.addEventListener('DOMContentLoaded', function() {
  var calendarEl = document.getElementById('calendar-container');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'es',
    selectable: true,
    dateClick: function(info) {
      fetch(`/api/laboratorios/disponibilidad?fecha=${info.dateStr}`)
        .then(res => res.json())
        .then(data => {
          const infoDia = document.getElementById('info-dia');
          if (data.disponibles.length > 0) {
            infoDia.innerHTML = `<h5>Laboratorios disponibles el ${info.dateStr}:</h5>` +
              data.disponibles.map(lab => `
                <div class='mb-2'>
                  <b>${lab.nombre}</b> (Profesor: ${lab.profesor})<br>
                  <span class='text-secondary'>Horario: ${lab.horaInicio} - ${lab.horaFin}</span><br>
                  <span class='text-secondary'>Cupos: ${lab.ocupados} / ${lab.cupos}</span>
                  <form method='POST' action='/reservar-laboratorio'>
                    <input type='hidden' name='reservacionId' value='${lab.reservacionId}' />
                    <button class='btn btn-primary btn-sm mt-1' type='submit' ${lab.ocupados >= lab.cupos ? 'disabled' : ''}>Solicitar reservación</button>
                  </form>
                </div>
              `).join('');
          } else {
            infoDia.innerHTML = `<div class='alert alert-warning'>No hay laboratorios disponibles ese día.</div>`;
          }
        });
    }
  });
  calendar.render();
});
