document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".menu-btn");
    const closeBtn = document.querySelector(".close-btn");
    
    // ✅ Verificar si los elementos existen
    if (!sidebar || !toggleBtn) {
        console.error("No se encontraron los elementos. Revisa los selectores.");
        return;
    }

    // 🔹 Alternar la clase 'active' para mostrar/ocultar el menú
    toggleBtn.addEventListener("click", function () {
        console.log("Menú desplegado"); // Debugging
        sidebar.classList.toggle("active");
    });

    // 🔹 Cerrar el menú si hay un botón de cierre
    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            console.log("Menú cerrado");
            sidebar.classList.remove("active");
        });
    }

    // 🔹 Cerrar el menú al hacer clic fuera de él
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
            sidebar.classList.remove("active");
        }
    });
});
console.log("✅ Gerente.js está enlazado correctamente!");
// Selecciona todos los elementos que deben revelarse
const reveals = document.querySelectorAll('.reveal');

function revealOnScroll() {
  const windowHeight = window.innerHeight;

  reveals.forEach(element => {
    const elementTop = element.getBoundingClientRect().top;

    if (elementTop < windowHeight - 100) {
      element.classList.add('visible');
    }
  });
}

// Ejecuta al hacer scroll
window.addEventListener('scroll', revealOnScroll);

// Ejecuta también al cargar la página (por si hay algo ya visible)
window.addEventListener('DOMContentLoaded', revealOnScroll);
// Mostrar u ocultar botón al hacer scroll
const btnTop = document.getElementById("btnTop");

window.onscroll = function() {
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btnTop.style.display = "block";
  } else {
    btnTop.style.display = "none";
  }
};

// Volver arriba al hacer clic
btnTop.addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
