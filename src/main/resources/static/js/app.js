const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const CAMPOS_TEXTO = ["apellidos", "nombres", "dni", "domicilio", "telefono"];

// Rutas de la API para dar de baja y reactivar un socio (ambas con PATCH).
// Si en tu controller se llaman distinto, cambialas aca.
const RUTA_BAJA = (id) => "/socios/" + id + "/baja";
const RUTA_REACTIVAR = (id) => "/socios/" + id + "/alta";

// Cada vista arranca con su propio filtro y orden
const VISTAS = {
    cobranza: {filtro: "activos", orden: "apellido"},
    socios: {filtro: "todos", orden: "apellido"}
};

const encabezadoTabla = document.getElementById("encabezado-tabla");

let vista = "cobranza";

// ---------- Elementos de la pagina ----------

const pestanas = document.getElementById("pestanas");
const inputBuscar = document.getElementById("buscar");
const selectFiltro = document.getElementById("filtro");
const selectOrden = document.getElementById("orden");
const tablaSocios = document.getElementById("tabla-socios");
const contador = document.getElementById("contador");
const sinResultados = document.getElementById("sin-resultados");
const mensajeError = document.getElementById("mensaje-error");
const mensajeExito = document.getElementById("mensaje-exito");
const btnNuevoSocio = document.getElementById("btn-nuevo-socio");

// Ventana de nuevo / editar socio
const modalSocioElemento = document.getElementById("modal-socio");
const modalSocio = new bootstrap.Modal(modalSocioElemento);
const modalTitulo = document.getElementById("modal-socio-titulo");
const modalError = document.getElementById("modal-socio-error");
const formSocio = document.getElementById("form-socio");
const btnGuardarSocio = document.getElementById("btn-guardar-socio");

// Ventana de confirmacion
const modalConfirmacion = new bootstrap.Modal(document.getElementById("modal-confirmacion"));
const confirmacionTitulo = document.getElementById("confirmacion-titulo");
const confirmacionMensaje = document.getElementById("confirmacion-mensaje");
const confirmacionError = document.getElementById("confirmacion-error");
const btnConfirmar = document.getElementById("btn-confirmar");

// Los socios que se estan mostrando, por id (para recuperar sus datos al tocar un boton)
const sociosPorId = new Map();

// null = estamos creando un socio; un numero = estamos editando ese socio
let socioEnEdicionId = null;

// Funcion que se ejecuta cuando la persona confirma en la ventana de confirmacion
let accionConfirmable = null;

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

// Columnas que se muestran en cada pestaña (la columna "Acciones" se agrega siempre al final)
const COLUMNAS = {
    cobranza: [
        {titulo: "ID", celda: (s) => crearCelda(String(s.id))},
        {titulo: "Apellido y nombre", celda: (s) => crearCelda(nombreCompleto(s))},
        {titulo: "Teléfono", celda: (s) => crearCelda(s.telefono || "-")},
        {titulo: "Estado", celda: (s) => crearCeldaEstado(s)},
        {titulo: "Último mes pagado", celda: (s) => crearCelda(formatearMes(s.ultimoMesPagado))}
    ],
    socios: [
        {titulo: "ID", celda: (s) => crearCelda(String(s.id))},
        {titulo: "DNI", celda: (s) => crearCelda(s.dni)},
        {titulo: "Nombres", celda: (s) => crearCelda(s.nombres)},
        {titulo: "Apellidos", celda: (s) => crearCelda(s.apellidos)},
        {titulo: "Teléfono", celda: (s) => crearCelda(s.telefono || "-")},
        {titulo: "Domicilio", celda: (s) => crearCelda(s.domicilio || "-")},
        {titulo: "Apto físico", celda: (s) => crearCeldaAptoFisico(s)},
        {titulo: "Estado", celda: (s) => crearCeldaEstado(s)}
    ]
};

function pintarEncabezado() {
    encabezadoTabla.replaceChildren();

    for (const columna of COLUMNAS[vista]) {
        const th = document.createElement("th");
        th.textContent = columna.titulo;
        encabezadoTabla.appendChild(th);
    }

    const thAcciones = document.createElement("th");
    thAcciones.classList.add("text-end");
    thAcciones.textContent = "Acciones";
    encabezadoTabla.appendChild(thAcciones);
}

function pintarTabla(socios) {
    pintarEncabezado();
    tablaSocios.replaceChildren();
    sociosPorId.clear();

    for (const socio of socios) {
        sociosPorId.set(socio.id, socio);

        const fila = document.createElement("tr");
        for (const columna of COLUMNAS[vista]) {
            fila.appendChild(columna.celda(socio));
        }
        fila.appendChild(crearCeldaAcciones(socio));

        tablaSocios.appendChild(fila);
    }

    contador.textContent = socios.length === 1 ? "1 socio" : socios.length + " socios";
    sinResultados.classList.toggle("d-none", socios.length > 0);
}

function nombreCompleto(socio) {
    return socio.apellidos + ", " + socio.nombres;
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

function crearCeldaEstado(socio) {
    const celda = document.createElement("td");
    celda.appendChild(crearBadgeEstado(socio));
    return celda;
}

function crearCeldaAptoFisico(socio) {
    const celda = document.createElement("td");
    const badge = document.createElement("span");
    badge.classList.add("badge");

    if (socio.aptoFisico) {
        badge.classList.add("text-bg-primary");
        badge.textContent = "Sí";
    } else {
        badge.classList.add("text-bg-warning");
        badge.textContent = "No";
    }
    celda.appendChild(badge);
    return celda;
}

// Botones de cada fila. Cambian segun la vista.
// Solo llevan texto fijo y el id numerico del socio (ningun dato escrito por el usuario).
function crearCeldaAcciones(socio) {
    const id = Number(socio.id);
    const celda = document.createElement("td");
    celda.classList.add("text-end");

    if (vista === "cobranza") {
        celda.innerHTML = `
            <div class="d-inline-flex gap-2">
                <button type="button" class="btn btn-success" disabled title="Próximamente">Cobrar</button>
                <div class="dropdown">
                    <button type="button" class="btn btn-outline-secondary"
                            data-bs-toggle="dropdown" aria-expanded="false" aria-label="Más acciones">⋮</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button type="button" class="dropdown-item" disabled>Ver pagos (próximamente)</button></li>
                    </ul>
                </div>
            </div>`;
    } else {
        const accionEstado = socio.activo ? "baja" : "reactivar";
        const textoEstado = socio.activo ? "Dar de baja" : "Reactivar";

        celda.innerHTML = `
            <div class="dropdown">
                <button type="button" class="btn btn-outline-secondary"
                        data-bs-toggle="dropdown" aria-expanded="false">⋮ Acciones</button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><button type="button" class="dropdown-item"
                                data-accion="editar" data-id="${id}">Editar socio</button></li>
                    <li><button type="button" class="dropdown-item" disabled>Ver pagos (próximamente)</button></li>
                    <li><button type="button" class="dropdown-item"
                                data-accion="${accionEstado}" data-id="${id}">${textoEstado}</button></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button type="button" class="dropdown-item text-danger"
                                data-accion="eliminar" data-id="${id}">Eliminar</button></li>
                </ul>
            </div>`;
    }
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

// ---------- Pestañas (vistas) ----------

function cambiarVista(nueva) {
    vista = nueva;
    for (const boton of pestanas.querySelectorAll("[data-vista]")) {
        boton.classList.toggle("active", boton.dataset.vista === nueva);
    }
    inputBuscar.value = "";
    selectFiltro.value = VISTAS[nueva].filtro;
    selectOrden.value = VISTAS[nueva].orden;
    cargarSocios();
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
        errores.apellidos = "Ingresá el apellido.";
    }
    if (!datos.nombres) {
        errores.nombres = "Ingresá el nombre.";
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

// Interpreta una respuesta de error de la API al guardar un socio (400, 409...)
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

// ---------- Confirmaciones: baja, reactivar y eliminar ----------

function abrirConfirmacion({titulo, mensaje, textoBoton, claseBoton, accion}) {
    confirmacionTitulo.textContent = titulo;
    confirmacionMensaje.textContent = mensaje;
    confirmacionError.classList.add("d-none");
    btnConfirmar.textContent = textoBoton;
    btnConfirmar.className = "btn " + claseBoton;
    btnConfirmar.disabled = false;
    accionConfirmable = accion;
    modalConfirmacion.show();
}

function mostrarErrorEnConfirmacion(texto) {
    confirmacionError.textContent = texto;
    confirmacionError.classList.remove("d-none");
}

btnConfirmar.addEventListener("click", async () => {
    if (!accionConfirmable) {
        return;
    }
    btnConfirmar.disabled = true; // evita confirmar dos veces con un doble clic
    try {
        await accionConfirmable();
    } finally {
        btnConfirmar.disabled = false;
    }
});

// Saca el mensaje de una respuesta de error de la API
async function leerMensajeDeError(respuesta) {
    const texto = await respuesta.text();
    console.log("Respuesta del servidor (" + respuesta.status + "):", texto);
    try {
        const problema = JSON.parse(texto);
        if (problema.detail) {
            return problema.detail;
        }
    } catch (error) {
        // la respuesta no es JSON
    }
    return "Ocurrió un error (código " + respuesta.status + ").";
}

function pedirBaja(socio) {
    abrirConfirmacion({
        titulo: "Dar de baja",
        mensaje: "¿Dar de baja a " + nombreCompleto(socio) + "? Dejará de figurar como activo, "
            + "pero se conservan sus datos y su historial de pagos. Podés reactivarlo cuando quieras.",
        textoBoton: "Dar de baja",
        claseBoton: "btn-warning",
        accion: () => cambiarEstado(socio, "baja")
    });
}

function pedirReactivacion(socio) {
    abrirConfirmacion({
        titulo: "Reactivar socio",
        mensaje: "¿Reactivar a " + nombreCompleto(socio) + "? Volverá a figurar como activo.",
        textoBoton: "Reactivar",
        claseBoton: "btn-success",
        accion: () => cambiarEstado(socio, "reactivar")
    });
}

async function cambiarEstado(socio, tipo) {
    const ruta = tipo === "baja" ? RUTA_BAJA(socio.id) : RUTA_REACTIVAR(socio.id);

    try {
        const respuesta = await fetch(ruta, {method: "PATCH"});
        if (respuesta.ok) {
            modalConfirmacion.hide();
            mostrarExito(tipo === "baja" ? "Socio dado de baja." : "Socio reactivado.");
            await cargarSocios();
        } else {
            mostrarErrorEnConfirmacion(await leerMensajeDeError(respuesta));
        }
    } catch (error) {
        mostrarErrorEnConfirmacion("No se pudo conectar con el servidor.");
    }
}

function pedirEliminar(socio) {
    abrirConfirmacion({
        titulo: "Eliminar socio",
        mensaje: "¿Eliminar definitivamente a " + nombreCompleto(socio) + "? Esta acción no se puede "
            + "deshacer. Si solo querés que deje de figurar como activo, usá \"Dar de baja\".",
        textoBoton: "Eliminar",
        claseBoton: "btn-danger",
        accion: () => eliminarSocio(socio, false)
    });
}

async function eliminarSocio(socio, conPagos) {
    const url = "/socios/" + socio.id + (conPagos ? "?eliminarPagos=true" : "");

    try {
        const respuesta = await fetch(url, {method: "DELETE"});

        if (respuesta.ok) {
            modalConfirmacion.hide();
            mostrarExito("Socio eliminado.");
            await cargarSocios();
        } else if (respuesta.status === 409 && !conPagos) {
            // El socio tiene pagos: pedimos una confirmacion mas fuerte
            abrirConfirmacion({
                titulo: "El socio tiene pagos registrados",
                mensaje: nombreCompleto(socio) + " tiene pagos registrados. Si lo eliminás, también se "
                    + "borrarán todos sus pagos y no se podrán recuperar. Para conservar su historial, "
                    + "es mejor darlo de baja.",
                textoBoton: "Eliminar socio y sus pagos",
                claseBoton: "btn-danger",
                accion: () => eliminarSocio(socio, true)
            });
        } else {
            mostrarErrorEnConfirmacion(await leerMensajeDeError(respuesta));
        }
    } catch (error) {
        mostrarErrorEnConfirmacion("No se pudo conectar con el servidor.");
    }
}

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

pestanas.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-vista]");
    if (boton) {
        cambiarVista(boton.dataset.vista);
    }
});

// Un solo "oyente" para todos los botones del menu de acciones de la tabla
tablaSocios.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion]");
    if (!boton) {
        return;
    }
    const id = Number(boton.dataset.id);
    const socio = sociosPorId.get(id);
    if (!socio) {
        return;
    }

    switch (boton.dataset.accion) {
        case "editar":
            abrirModalEditar(id);
            break;
        case "baja":
            pedirBaja(socio);
            break;
        case "reactivar":
            pedirReactivacion(socio);
            break;
        case "eliminar":
            pedirEliminar(socio);
            break;
    }
});

// Carga inicial
cargarSocios();