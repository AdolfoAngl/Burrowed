document.addEventListener('DOMContentLoaded', function() {
  const labSelect = document.getElementById('laboratorioId');
  const materialesContainer = document.getElementById('materialesContainer');

  function renderMateriales(materiales) {
    materialesContainer.innerHTML = '';
    if (!materiales.length) {
      materialesContainer.innerHTML = '<span class="text-muted">No hay materiales para este laboratorio.</span>';
      return;
    }
    materiales.forEach(mat => {
      const div = document.createElement('div');
      div.className = 'form-check';
      div.innerHTML = `
        <input class="form-check-input" type="checkbox" name="materiales" id="mat_${mat.id}" value="${mat.id}">
        <label class="form-check-label" for="mat_${mat.id}">${mat.nombre}</label>
      `;
      materialesContainer.appendChild(div);
    });
  }

  if (labSelect) {
    labSelect.addEventListener('change', function() {
      fetch(`/api/materiales-por-laboratorio/${labSelect.value}`)
        .then(res => res.json())
        .then(renderMateriales);
    });
    // Trigger on load
    if (labSelect.value) {
      fetch(`/api/materiales-por-laboratorio/${labSelect.value}`)
        .then(res => res.json())
        .then(renderMateriales);
    }
  }
});
