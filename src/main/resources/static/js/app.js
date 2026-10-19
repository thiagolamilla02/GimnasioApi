const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const inputBuscar = document.getElementById("buscar");
const selectFiltro = document.getElementById("filtro");
const selectOrden = document.getElementById("orden");
const tablaSocios = document.getElementById("tabla-socios");
const contador = document.getElementById("contador");
const sinResultados = document.getElementById("sin-resultados");
const mensajeError = document.getElementById("mensaje-error");

// ---------- Llamada a la API ----------

async function cargarSocios() {
    const parametros = new URLSearchParams({
        filtro: selectFiltro.value,
        orden: selectOrden.value
    });
    const texto = inputBuscar.value.trim();
    if (texto) {
        parametros.set("buscar", texto);
    }

    try {
        const respuesta = await fetch("/socios/estado?" + parametros.toString());
        if (!respuesta.ok) {
            throw new Error("el servidor respondió " + respuesta.status);
        }
        const socios = await respuesta.json();
        pintarTabla(socios);
        ocultarError();
    } catch (error) {
        mostrarError("No se pudo cargar la lista de socios (" + error.message + ").");
    }
}

// ---------- Dibujar la tabla ----------

function pintarTabla(socios) {
    tablaSocios.replaceChildren();

    for (const socio of socios) {
        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(socio.apellido + ", " + socio.nombre));
        fila.appendChild(crearCelda(socio.dni));
        fila.appendChild(crearCelda(socio.telefono || "-"));

        const celdaEstado = document.createElement("td");
        celdaEstado.appendChild(crearBadgeEstado(socio));
        fila.appendChild(celdaEstado);

        fila.appendChild(crearCelda(formatearMes(socio.ultimoMesPagado)));

        tablaSocios.appendChild(fila);
    }

    contador.textContent = socios.length === 1 ? "1 socio" : socios.length + " socios";
    sinResultados.classList.toggle("d-none", socios.length > 0);
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto; // textContent evita que un dato con HTML rompa la página
    return celda;
}

function crearBadgeEstado(socio) {
    const badge = document.createElement("span");
    badge.classList.add("badge", "estado-badge");

    if (!socio.activo) {
        badge.classList.add("text-bg-secondary");
        badge.textContent = "Baja";
    } else if (socio.debe) {
        badge.classList.add("text-bg-danger");
        badge.textContent = socio.mesesAdeudados === 1
            ? "Debe 1 mes"
            : "Debe " + socio.mesesAdeudados + " meses";
    } else {
        badge.classList.add("text-bg-success");
        badge.textContent = "Al día";
    }
    return badge;
}

// "2026-09-01" -> "Septiembre 2026"
// (se parte el texto a mano: new Date() puede correr el dia por la zona horaria)
function formatearMes(fechaIso) {
    if (!fechaIso) {
        return "Nunca pagó";
    }
    const [anio, mes] = fechaIso.split("-");
    const nombre = MESES[Number(mes) - 1];
    return nombre.charAt(0).toUpperCase() + nombre.slice(1) + " " + anio;
}

// ---------- Mensajes de error ----------

function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.classList.remove("d-none");
}

function ocultarError() {
    mensajeError.classList.add("d-none");
}

// ---------- Eventos ----------

// El buscador espera 300 ms despues de la ultima tecla (evita una llamada por letra)
let temporizador;
inputBuscar.addEventListener("input", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(cargarSocios, 300);
});

selectFiltro.addEventListener("change", cargarSocios);
selectOrden.addEventListener("change", cargarSocios);

// Carga inicial
cargarSocios();