function toggleInfo(id) {
  const elemento = document.getElementById(id);

  // cerrar todos
  document.querySelectorAll('.info').forEach(el => {
    if (el.id !== id) {
      el.classList.remove('active');
    }
  });

  // abrir/cerrar el seleccionado
  elemento.classList.toggle('active');
}

