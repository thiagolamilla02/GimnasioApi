const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const CAMPOS_TEXTO = ["apellidos", "nombres", "dni", "domicilio", "telefono"];

// ---------- Elementos de la pagina ----------

const inputBuscar = document.getElementById("buscar");
const selectFiltro = document.getElementById("filtro");
const selectOrden = document.getElementById("orden");
const tablaSocios = document.getElementById("tabla-socios");
const contador = document.getElementById("contador");
const sinResultados = document.getElementById("sin-resultados");
const mensajeError = document.getElementById("mensaje-error");
const mensajeExito = document.getElementById("mensaje-exito");

const btnNuevoSocio = document.getElementById("btn-nuevo-socio");
const btnTodos = document.getElementById("btn-todos");

const modalSocioElemento = document.getElementById("modal-socio");
const modalSocio = new bootstrap.Modal(modalSocioElemento);
const modalTitulo = document.getElementById("modal-socio-titulo");
const modalError = document.getElementById("modal-socio-error");
const formSocio = document.getElementById("form-socio");
const btnGuardarSocio = document.getElementById("btn-guardar-socio");

// null = estamos creando un socio; un numero = estamos editando ese socio
let socioEnEdicionId = null;

// ---------- Lista de socios ----------

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

function pintarTabla(socios) {
    tablaSocios.replaceChildren();

    for (const socio of socios) {
        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(socio.apellidos + ", " + socio.nombres));
        fila.appendChild(crearCelda(socio.dni));
        fila.appendChild(crearCelda(socio.telefono || "-"));

        const celdaEstado = document.createElement("td");
        celdaEstado.appendChild(crearBadgeEstado(socio));
        fila.appendChild(celdaEstado);

        fila.appendChild(crearCelda(formatearMes(socio.ultimoMesPagado)));
        fila.appendChild(crearCeldaAcciones(socio));

        tablaSocios.appendChild(fila);
    }

    contador.textContent = socios.length === 1 ? "1 socio" : socios.length + " socios";
    sinResultados.classList.toggle("d-none", socios.length > 0);
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto; // textContent evita que un dato con HTML rompa la pagina
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

// Menu desplegable de acciones de cada fila.
// Solo lleva texto fijo y el id numerico del socio (ningun dato escrito por el usuario).
function crearCeldaAcciones(socio) {
    const id = Number(socio.id);
    const celda = document.createElement("td");
    celda.classList.add("text-end");

    celda.innerHTML = `
        <div class="dropdown">
            <button type="button" class="btn btn-outline-secondary"
                    data-bs-toggle="dropdown" aria-expanded="false">⋮ Acciones</button>
            <ul class="dropdown-menu dropdown-menu-end">
                <li><button type="button" class="dropdown-item"
                            data-accion="editar" data-id="${id}">Editar socio</button></li>
                <li><button type="button" class="dropdown-item" disabled>Ver pagos (próximamente)</button></li>
                <li><button type="button" class="dropdown-item" disabled>${socio.activo ? "Dar de baja" : "Reactivar"} (próximamente)</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item text-danger" disabled>Eliminar (próximamente)</button></li>
            </ul>
        </div>`;
    return celda;
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

// ---------- Formulario de socio (nuevo / editar) ----------

function abrirModalNuevo() {
    socioEnEdicionId = null;
    modalTitulo.textContent = "Nuevo socio";
    limpiarFormulario();
    modalSocio.show();
}

async function abrirModalEditar(id) {
    try {
        // La lista no trae domicilio ni apto fisico, asi que pedimos el socio completo
        const respuesta = await fetch("/socios/" + id);
        if (!respuesta.ok) {
            throw new Error("el servidor respondió " + respuesta.status);
        }
        const socio = await respuesta.json();

        socioEnEdicionId = id;
        modalTitulo.textContent = "Editar socio";
        limpiarFormulario();
        for (const campo of CAMPOS_TEXTO) {
            document.getElementById("socio-" + campo).value = socio[campo] ?? "";
        }
        document.getElementById("socio-aptoFisico").checked = socio.aptoFisico;

        ocultarError();
        modalSocio.show();
    } catch (error) {
        mostrarError("No se pudo cargar el socio (" + error.message + ").");
    }
}

function limpiarFormulario() {
    formSocio.reset();
    limpiarErroresDelFormulario();
}

function limpiarErroresDelFormulario() {
    modalError.classList.add("d-none");
    for (const campo of CAMPOS_TEXTO) {
        document.getElementById("socio-" + campo).classList.remove("is-invalid");
    }
}

function valorDe(campo) {
    return document.getElementById("socio-" + campo).value.trim();
}

// Validacion rapida en el navegador (la validacion que manda es la del servidor)
function validar(datos) {
    const errores = {};
    if (!datos.apellidos) {
        errores.apellidos = "Ingresá el o los apellidos.";
    }
    if (!datos.nombres) {
        errores.nombres = "Ingresá el o los nombres.";
    }
    if (!datos.dni) {
        errores.dni = "Ingresá el DNI.";
    } else if (!/^\d{7,8}$/.test(datos.dni)) {
        errores.dni = "El DNI debe tener 7 u 8 números, sin puntos.";
    }
    return errores;
}

function mostrarErroresDeCampos(errores) {
    for (const [campo, mensaje] of Object.entries(errores)) {
        const input = document.getElementById("socio-" + campo);
        const aviso = input ? input.parentElement.querySelector(".invalid-feedback") : null;

        if (input && aviso) {
            input.classList.add("is-invalid");
            aviso.textContent = mensaje;
        } else {
            mostrarErrorEnModal(mensaje);
        }
    }
}

function mostrarErrorEnModal(texto) {
    modalError.textContent = texto;
    modalError.classList.remove("d-none");
}

// Interpreta una respuesta de error de la API (400, 409, 404...)
async function manejarErrorDeRespuesta(respuesta) {
    const texto = await respuesta.text();
    console.log("Respuesta del servidor (" + respuesta.status + "):", texto);

    let problema = null;
    try {
        problema = JSON.parse(texto);
    } catch (error) {
        // la respuesta no es JSON
    }

    if (respuesta.status === 400 && problema && problema.errores) {
        mostrarErroresDeCampos(problema.errores);
    } else if (problema && problema.detail) {
        mostrarErrorEnModal(problema.detail);
    } else {
        mostrarErrorEnModal("Ocurrió un error (código " + respuesta.status + ").");
    }
}

formSocio.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarErroresDelFormulario();

    const datos = {
        apellidos: valorDe("apellidos"),
        nombres: valorDe("nombres"),
        dni: valorDe("dni"),
        domicilio: valorDe("domicilio"),
        telefono: valorDe("telefono"),
        aptoFisico: document.getElementById("socio-aptoFisico").checked
    };

    const errores = validar(datos);
    if (Object.keys(errores).length > 0) {
        mostrarErroresDeCampos(errores);
        return;
    }

    const editando = socioEnEdicionId !== null;
    const url = editando ? "/socios/" + socioEnEdicionId : "/socios";
    const metodo = editando ? "PUT" : "POST";

    btnGuardarSocio.disabled = true; // evita guardar dos veces con un doble clic
    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            modalSocio.hide();
            mostrarExito(editando ? "Socio actualizado." : "Socio creado.");
            await cargarSocios();
        } else {
            await manejarErrorDeRespuesta(respuesta);
        }
    } catch (error) {
        mostrarErrorEnModal("No se pudo conectar con el servidor.");
    } finally {
        btnGuardarSocio.disabled = false;
    }
});

// Al abrirse la ventana, el cursor queda en el primer campo
modalSocioElemento.addEventListener("shown.bs.modal", () => {
    document.getElementById("socio-apellidos").focus();
});

// ---------- Mensajes ----------

function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.classList.remove("d-none");
}

function ocultarError() {
    mensajeError.classList.add("d-none");
}

let temporizadorExito;
function mostrarExito(texto) {
    mensajeExito.textContent = texto;
    mensajeExito.classList.remove("d-none");
    clearTimeout(temporizadorExito);
    temporizadorExito = setTimeout(() => mensajeExito.classList.add("d-none"), 4000);
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

btnNuevoSocio.addEventListener("click", abrirModalNuevo);

// "Todos los socios": limpia el buscador y muestra la lista completa (incluye bajas)
btnTodos.addEventListener("click", () => {
    inputBuscar.value = "";
    selectFiltro.value = "todos";
    selectOrden.value = "apellido";
    cargarSocios();
});

// Un solo "oyente" para todos los botones del menu de acciones de la tabla
tablaSocios.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) {
        return;
    }
    const id = Number(boton.dataset.id);

    if (boton.dataset.accion === "editar") {
        abrirModalEditar(id);
    }
});

// Carga inicial
cargarSocios();