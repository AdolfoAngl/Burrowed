// Script para mostrar materiales según laboratorio seleccionado en la vista de crear evento

document.addEventListener('DOMContentLoaded', function() {
  const laboratorioSelect = document.getElementById('laboratorioId');
  const materialesContainer = document.getElementById('materiales-container');

  async function cargarMateriales(labId) {
    if (!labId) return;
    const res = await fetch(`/api/materiales/${labId}`);
    const materiales = await res.json();
    let html = '';
    if (materiales.length === 0) {
      html = '<div class="alert alert-warning">No hay materiales en este laboratorio.</div>';
    } else {
      materiales.forEach(mat => {
        html += `<div class='form-check'>
          <input class='form-check-input' type='checkbox' name='materiales' id='mat_${mat.id}' value='${mat.id}'>
          <label class='form-check-label' for='mat_${mat.id}'>${mat.nombre}</label>
        </div>`;
      });
    }
    materialesContainer.innerHTML = html;
  }

  if (laboratorioSelect) {
    laboratorioSelect.addEventListener('change', function() {
      cargarMateriales(this.value);
    });
    // Cargar materiales del primer laboratorio al cargar la página
    if (laboratorioSelect.value) {
      cargarMateriales(laboratorioSelect.value);
    }
  }
});
