// Envuelve fetch para dos cosas:
//  1) Agregar el token CSRF (de la cookie XSRF-TOKEN) a las llamadas que modifican datos
//  2) Volver al login si el servidor responde 401 (sesion vencida o sin iniciar)
(function () {
    const fetchOriginal = window.fetch.bind(window);
    const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

    function leerCookie(nombre) {
        const par = document.cookie.split("; ").find((c) => c.startsWith(nombre + "="));
        return par ? decodeURIComponent(par.substring(nombre.length + 1)) : null;
    }

    window.fetch = async function (recurso, opciones = {}) {
        const metodo = (opciones.method || "GET").toUpperCase();

        if (!METODOS_SEGUROS.includes(metodo)) {
            const token = leerCookie("XSRF-TOKEN");
            if (token) {
                const encabezados = new Headers(opciones.headers || {});
                encabezados.set("X-XSRF-TOKEN", token);
                opciones = {...opciones, headers: encabezados};
            }
        }

        const respuesta = await fetchOriginal(recurso, opciones);

        if (respuesta.status === 401 && !window.location.pathname.endsWith("login.html")) {
            window.location.href = "/login.html";
        }
        return respuesta;
    };
})();