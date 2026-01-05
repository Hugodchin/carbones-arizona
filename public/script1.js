document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle");
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
