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

const seccionSocios = document.getElementById("seccion-socios");

const seccionPagos = document.getElementById("seccion-pagos");

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
    thAcciones.classList.add("text-end", "d-print-none");
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
// Botones de cada fila. Cambian segun la vista.
// Solo llevan texto fijo y el id numerico del socio (ningun dato escrito por el usuario).
function crearCeldaAcciones(socio) {
    const id = Number(socio.id);
    const celda = document.createElement("td");
    celda.classList.add("text-end", "d-print-none");

    if (vista === "cobranza") {
        celda.innerHTML = `
            <div class="d-inline-flex gap-2">
                <button type="button" class="btn btn-success"
                        data-accion="cobrar" data-id="${id}">Cobrar</button>
                <div class="dropdown">
                    <button type="button" class="btn btn-outline-secondary"
                            data-bs-toggle="dropdown" aria-expanded="false" aria-label="Más acciones">⋮</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button type="button" class="dropdown-item"
                                    data-accion="pagos" data-id="${id}">Ver pagos</button></li>
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
                    <li><button type="button" class="dropdown-item"
                                data-accion="pagos" data-id="${id}">Ver pagos</button></li>
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

    // La pestaña Pagos tiene su propio contenido; las otras dos comparten la tabla de socios
    const esPagos = nueva === "pagos";
    seccionSocios.classList.toggle("d-none", esPagos);
    seccionPagos.classList.toggle("d-none", !esPagos);
    btnImportarExcel.classList.toggle("d-none", nueva !== "socios");

    if (esPagos) {
        cargarPagosDelMes();
        return;
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

// ---------- Pagos: cobrar, historial, corregir y eliminar ----------

const MEDIOS = {EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia"};

const modalPagosElemento = document.getElementById("modal-pagos");
const modalPagos = new bootstrap.Modal(modalPagosElemento);
const pagosTitulo = document.getElementById("pagos-titulo");

// Panel 1: lista
const panelLista = document.getElementById("panel-lista");
const pagosError = document.getElementById("pagos-error");
const pagosExito = document.getElementById("pagos-exito");
const pagosResumen = document.getElementById("pagos-resumen");
const pagosVacio = document.getElementById("pagos-vacio");
const tablaPagos = document.getElementById("tabla-pagos");
const btnNuevoPago = document.getElementById("btn-nuevo-pago");

// Panel 2: formulario
const formPago = document.getElementById("form-pago");
const pagoError = document.getElementById("pago-error");
const selectPagoMes = document.getElementById("pago-mes");
const selectPagoAnio = document.getElementById("pago-anio");
const inputPagoFecha = document.getElementById("pago-fecha");
const inputPagoMonto = document.getElementById("pago-monto");
const selectPagoMedio = document.getElementById("pago-medio");
const btnCancelarPago = document.getElementById("btn-cancelar-pago");
const btnGuardarPago = document.getElementById("btn-guardar-pago");

// Panel 3: confirmar eliminacion
const panelConfirmarPago = document.getElementById("panel-confirmar-pago");
const eliminarPagoError = document.getElementById("eliminar-pago-error");
const eliminarPagoMensaje = document.getElementById("eliminar-pago-mensaje");
const btnCancelarEliminarPago = document.getElementById("btn-cancelar-eliminar-pago");
const btnConfirmarEliminarPago = document.getElementById("btn-confirmar-eliminar-pago");

let socioDePagos = null;       // socio al que pertenece la ventana abierta
let pagoEnEdicionId = null;    // null = registrando un pago nuevo; numero = corrigiendo ese pago
let volverALista = false;      // true si el formulario se abrio desde la lista de pagos
let pagoPorEliminar = null;    // pago que espera confirmacion para eliminarse
const pagosDelSocio = new Map(); // pagos cargados, por id (en el orden en que llegan: del mas reciente)

// Llenamos las listas de mes y de año
MESES.forEach((nombre, indice) => {
    const opcion = document.createElement("option");
    opcion.value = String(indice + 1);
    opcion.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    selectPagoMes.appendChild(opcion);
});
const anioActual = new Date().getFullYear();
for (let anio = anioActual - 3; anio <= anioActual + 1; anio++) {
    asegurarAnio(anio);
}

// ----- Fechas (se manejan como texto "AAAA-MM-DD"; las fechas de los pagos son del dia 1 del mes) -----

function dosDigitos(numero) {
    return String(numero).padStart(2, "0");
}

// Fecha de hoy segun el reloj de la PC
function hoyIso() {
    const hoy = new Date();
    return hoy.getFullYear() + "-" + dosDigitos(hoy.getMonth() + 1) + "-" + dosDigitos(hoy.getDate());
}

function mesActualIso() {
    return hoyIso().slice(0, 8) + "01";
}

// sumarMeses("2026-10-01", 1) -> "2026-11-01"
function sumarMeses(fechaIso, cantidad) {
    const [anio, mes] = fechaIso.split("-").map(Number);
    const indice = anio * 12 + (mes - 1) + cantidad;
    return Math.floor(indice / 12) + "-" + dosDigitos((indice % 12) + 1) + "-01";
}

// "2026-10-15" -> "15/10/2026"
function formatearFecha(fechaIso) {
    if (!fechaIso) {
        return "-";
    }
    const [anio, mes, dia] = fechaIso.split("-");
    return dia + "/" + mes + "/" + anio;
}

function formatearMonto(monto) {
    return Number(monto).toLocaleString("es-AR", {style: "currency", currency: "ARS"});
}

// Mes que se propone al cobrar: el siguiente al ultimo pagado; si nunca pago, el primer mes que debe
function sugerirMes(ultimoMesPagado, mesesAdeudados) {
    if (ultimoMesPagado) {
        return sumarMeses(ultimoMesPagado, 1);
    }
    return sumarMeses(mesActualIso(), -(Math.max(mesesAdeudados, 1) - 1));
}

// Agrega un año a una lista si todavia no esta (por defecto, la del formulario de pago)
function asegurarAnio(anio, select = selectPagoAnio) {
    const opciones = Array.from(select.options);
    if (opciones.some((opcion) => Number(opcion.value) === anio)) {
        return;
    }
    const posterior = opciones.find((opcion) => Number(opcion.value) > anio);
    select.add(new Option(String(anio), String(anio)), posterior || null);
}

function establecerMesPago(fechaIso) {
    const [anio, mes] = fechaIso.split("-").map(Number);
    asegurarAnio(anio);
    selectPagoAnio.value = String(anio);
    selectPagoMes.value = String(mes);
}

// ----- Paneles de la ventana -----

function mostrarPanel(nombre, titulo) {
    panelLista.classList.toggle("d-none", nombre !== "lista");
    formPago.classList.toggle("d-none", nombre !== "formulario");
    panelConfirmarPago.classList.toggle("d-none", nombre !== "confirmar");
    pagosTitulo.textContent = titulo;
}

function tituloLista() {
    return "Pagos de " + nombreCompleto(socioDePagos);
}

// ----- Abrir la ventana: cobrar -----

async function abrirCobro(socio) {
    socioDePagos = socio;
    pagoEnEdicionId = null;
    volverALista = false;

    const pagos = await obtenerPagos(socio);
    prepararFormularioPago(null, pagos);
    mostrarPanel("formulario", "Registrar pago: " + nombreCompleto(socio));
    modalPagos.show();
}

// Trae los pagos del socio; si falla, devuelve una lista vacia (el formulario igual se puede usar)
async function obtenerPagos(socio) {
    try {
        const respuesta = await fetch("/socios/" + socio.id + "/pagos");
        if (!respuesta.ok) {
            return [];
        }
        return await respuesta.json();
    } catch (error) {
        return [];
    }
}

// ----- Abrir la ventana: historial -----

async function abrirHistorial(socio) {
    socioDePagos = socio;
    pagosError.classList.add("d-none");
    pagosExito.classList.add("d-none");
    pagosResumen.textContent = "Cargando...";
    tablaPagos.replaceChildren();
    pagosVacio.classList.add("d-none");

    mostrarPanel("lista", tituloLista());
    modalPagos.show();
    await cargarPagos();
}

async function cargarPagos() {
    try {
        const respuesta = await fetch("/socios/" + socioDePagos.id + "/pagos");
        if (!respuesta.ok) {
            throw new Error("el servidor respondió " + respuesta.status);
        }
        pintarPagos(await respuesta.json());
    } catch (error) {
        pagosResumen.textContent = "";
        mostrarErrorLista("No se pudieron cargar los pagos (" + error.message + ").");
    }
}

function pintarPagos(pagos) {
    tablaPagos.replaceChildren();
    pagosDelSocio.clear();

    for (const pago of pagos) {
        pagosDelSocio.set(pago.id, pago);
        const id = Number(pago.id);

        const fila = document.createElement("tr");
        fila.appendChild(crearCelda(formatearMes(pago.mesPagado)));
        fila.appendChild(crearCelda(formatearFecha(pago.fechaPago)));
        fila.appendChild(crearCelda(formatearMonto(pago.monto)));
        fila.appendChild(crearCelda(MEDIOS[pago.medioPago] || pago.medioPago));

        const celda = document.createElement("td");
        celda.classList.add("text-end", "text-nowrap");
        celda.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-primary"
                    data-accion-pago="editar" data-id="${id}">Corregir</button>
            <button type="button" class="btn btn-sm btn-outline-danger"
                    data-accion-pago="eliminar" data-id="${id}">Eliminar</button>`;
        fila.appendChild(celda);

        tablaPagos.appendChild(fila);
    }

    pagosVacio.classList.toggle("d-none", pagos.length > 0);
    pagosResumen.textContent = pagos.length === 1 ? "1 pago registrado" : pagos.length + " pagos registrados";
}

function mostrarErrorLista(texto) {
    pagosError.textContent = texto;
    pagosError.classList.remove("d-none");
}

let temporizadorExitoPagos;

function mostrarExitoPagos(texto) {
    pagosExito.textContent = texto;
    pagosExito.classList.remove("d-none");
    clearTimeout(temporizadorExitoPagos);
    temporizadorExitoPagos = setTimeout(() => pagosExito.classList.add("d-none"), 4000);
}

// ----- Formulario de pago -----

// pago = el pago a corregir, o null si es uno nuevo; pagos = pagos ya conocidos del socio (del mas reciente)
function prepararFormularioPago(pago, pagos) {
    limpiarErroresPago();

    if (pago) {
        establecerMesPago(pago.mesPagado);
        inputPagoFecha.value = pago.fechaPago || "";
        inputPagoMonto.value = pago.monto;
        selectPagoMedio.value = pago.medioPago;
        return;
    }

    const ultimoPago = pagos.length > 0 ? pagos[0] : null;
    const ultimoMes = ultimoPago ? ultimoPago.mesPagado : null;

    establecerMesPago(sugerirMes(ultimoMes, socioDePagos.mesesAdeudados));
    inputPagoFecha.value = hoyIso();
    inputPagoMonto.value = ultimoPago ? ultimoPago.monto : ""; // se propone el monto del ultimo pago
    selectPagoMedio.value = "EFECTIVO";
}

function limpiarErroresPago() {
    pagoError.classList.add("d-none");
    inputPagoMonto.classList.remove("is-invalid");
    selectPagoMedio.classList.remove("is-invalid");
}

function mostrarErrorPago(texto) {
    pagoError.textContent = texto;
    pagoError.classList.remove("d-none");
}

function mostrarErroresDePago(errores) {
    for (const [campo, mensaje] of Object.entries(errores)) {
        let control = null;
        if (campo === "monto") {
            control = inputPagoMonto;
        } else if (campo === "medioPago") {
            control = selectPagoMedio;
        }
        const aviso = control ? control.parentElement.querySelector(".invalid-feedback") : null;

        if (control && aviso) {
            control.classList.add("is-invalid");
            aviso.textContent = mensaje;
        } else {
            mostrarErrorPago(mensaje);
        }
    }
}

async function manejarErrorDePago(respuesta) {
    const texto = await respuesta.text();
    console.log("Respuesta del servidor (" + respuesta.status + "):", texto);

    let problema = null;
    try {
        problema = JSON.parse(texto);
    } catch (error) {
        // la respuesta no es JSON
    }

    if (respuesta.status === 400 && problema && problema.errores) {
        mostrarErroresDePago(problema.errores);
    } else if (problema && problema.detail) {
        mostrarErrorPago(problema.detail);
    } else {
        mostrarErrorPago("Ocurrió un error (código " + respuesta.status + ").");
    }
}

formPago.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarErroresPago();

    const monto = Number(inputPagoMonto.value);
    if (!(monto > 0)) {
        mostrarErroresDePago({monto: "Ingresá un monto mayor a cero."});
        return;
    }

    const datos = {
        mesPagado: selectPagoAnio.value + "-" + dosDigitos(selectPagoMes.value) + "-01",
        fechaPago: inputPagoFecha.value || null,
        monto: monto,
        medioPago: selectPagoMedio.value
    };

    const editando = pagoEnEdicionId !== null;
    const url = "/socios/" + socioDePagos.id + "/pagos" + (editando ? "/" + pagoEnEdicionId : "");

    btnGuardarPago.disabled = true; // evita guardar dos veces con un doble clic
    try {
        const respuesta = await fetch(url, {
            method: editando ? "PUT" : "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            const mensaje = (editando ? "Pago actualizado: " : "Pago registrado: ")
                + formatearMes(datos.mesPagado) + ".";

            cargarSocios(); // actualiza los estados de la lista principal

            if (volverALista) {
                await cargarPagos();
                mostrarPanel("lista", tituloLista());
                mostrarExitoPagos(mensaje);
            } else {
                modalPagos.hide();
                mostrarExito(mensaje);
            }
        } else {
            await manejarErrorDePago(respuesta);
        }
    } catch (error) {
        mostrarErrorPago("No se pudo conectar con el servidor.");
    } finally {
        btnGuardarPago.disabled = false;
    }
});

btnNuevoPago.addEventListener("click", () => {
    pagoEnEdicionId = null;
    volverALista = true;
    prepararFormularioPago(null, Array.from(pagosDelSocio.values()));
    mostrarPanel("formulario", "Registrar pago: " + nombreCompleto(socioDePagos));
    inputPagoMonto.focus();
});

btnCancelarPago.addEventListener("click", () => {
    if (volverALista) {
        mostrarPanel("lista", tituloLista());
    } else {
        modalPagos.hide();
    }
});

// ----- Botones de cada pago (corregir / eliminar) -----

tablaPagos.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-accion-pago]");
    if (!boton) {
        return;
    }
    const pago = pagosDelSocio.get(Number(boton.dataset.id));
    if (!pago) {
        return;
    }

    if (boton.dataset.accionPago === "editar") {
        pagoEnEdicionId = pago.id;
        volverALista = true;
        prepararFormularioPago(pago, []);
        mostrarPanel("formulario", "Corregir pago: " + formatearMes(pago.mesPagado));
        inputPagoMonto.focus();
    } else if (boton.dataset.accionPago === "eliminar") {
        pagoPorEliminar = pago;
        eliminarPagoError.classList.add("d-none");
        eliminarPagoMensaje.textContent = "¿Eliminar el pago de " + formatearMes(pago.mesPagado)
            + " (" + formatearMonto(pago.monto) + ") de " + nombreCompleto(socioDePagos)
            + "? Esta acción no se puede deshacer.";
        mostrarPanel("confirmar", "Eliminar pago");
    }
});

btnCancelarEliminarPago.addEventListener("click", () => {
    pagoPorEliminar = null;
    mostrarPanel("lista", tituloLista());
});

btnConfirmarEliminarPago.addEventListener("click", async () => {
    if (!pagoPorEliminar) {
        return;
    }
    btnConfirmarEliminarPago.disabled = true;
    try {
        const respuesta = await fetch(
            "/socios/" + socioDePagos.id + "/pagos/" + pagoPorEliminar.id, {method: "DELETE"});

        if (respuesta.ok) {
            const mes = formatearMes(pagoPorEliminar.mesPagado);
            pagoPorEliminar = null;

            cargarSocios(); // actualiza los estados de la lista principal
            await cargarPagos();
            mostrarPanel("lista", tituloLista());
            mostrarExitoPagos("Pago eliminado: " + mes + ".");
        } else {
            eliminarPagoError.textContent = await leerMensajeDeError(respuesta);
            eliminarPagoError.classList.remove("d-none");
        }
    } catch (error) {
        eliminarPagoError.textContent = "No se pudo conectar con el servidor.";
        eliminarPagoError.classList.remove("d-none");
    } finally {
        btnConfirmarEliminarPago.disabled = false;
    }
});

// Si la ventana se abrio directo en el formulario, el cursor queda en el monto
modalPagosElemento.addEventListener("shown.bs.modal", () => {
    if (!formPago.classList.contains("d-none")) {
        inputPagoMonto.focus();
    }
});

// Al cerrarse, se olvida el estado de esa sesion
modalPagosElemento.addEventListener("hidden.bs.modal", () => {
    socioDePagos = null;
    pagoEnEdicionId = null;
    pagoPorEliminar = null;
    volverALista = false;
    pagosDelSocio.clear();
});

// ---------- Pestaña Pagos: pagos de todos los socios ----------

const selectPagosMes = document.getElementById("pagos-filtro-mes");
const selectPagosAnio = document.getElementById("pagos-filtro-anio");
const selectPagosCriterio = document.getElementById("pagos-filtro-criterio");
const btnMesAnterior = document.getElementById("btn-mes-anterior");
const btnMesSiguiente = document.getElementById("btn-mes-siguiente");
const todosPagosError = document.getElementById("todos-pagos-error");
const todosPagosDescripcion = document.getElementById("todos-pagos-descripcion");
const tablaTodosPagos = document.getElementById("tabla-todos-pagos");
const todosPagosVacio = document.getElementById("todos-pagos-vacio");
const totalCobrado = document.getElementById("total-cobrado");
const totalEfectivo = document.getElementById("total-efectivo");
const totalTransferencia = document.getElementById("total-transferencia");
const totalCantidad = document.getElementById("total-cantidad");

// Listas de mes y de año del filtro
MESES.forEach((nombre, indice) => {
    const opcion = document.createElement("option");
    opcion.value = String(indice + 1);
    opcion.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    selectPagosMes.appendChild(opcion);
});
for (let anio = anioActual - 3; anio <= anioActual + 1; anio++) {
    asegurarAnio(anio, selectPagosAnio);
}
establecerMesFiltro(mesActualIso());

function establecerMesFiltro(fechaIso) {
    const [anio, mes] = fechaIso.split("-").map(Number);
    asegurarAnio(anio, selectPagosAnio);
    selectPagosAnio.value = String(anio);
    selectPagosMes.value = String(mes);
}

// Mes elegido en formato "2026-10"
function mesSeleccionado() {
    return selectPagosAnio.value + "-" + dosDigitos(selectPagosMes.value);
}

async function cargarPagosDelMes() {
    const parametros = new URLSearchParams({
        mes: mesSeleccionado(),
        criterio: selectPagosCriterio.value
    });

    try {
        const respuesta = await fetch("/pagos?" + parametros.toString());
        if (!respuesta.ok) {
            throw new Error("el servidor respondió " + respuesta.status);
        }
        pintarPagosDelMes(await respuesta.json());
        todosPagosError.classList.add("d-none");
    } catch (error) {
        todosPagosError.textContent = "No se pudieron cargar los pagos (" + error.message + ").";
        todosPagosError.classList.remove("d-none");
    }
}

function pintarPagosDelMes(datos) {
    totalCobrado.textContent = formatearMonto(datos.total);
    totalEfectivo.textContent = formatearMonto(datos.totalEfectivo);
    totalTransferencia.textContent = formatearMonto(datos.totalTransferencia);
    totalCantidad.textContent = String(datos.cantidad);

    const nombreMes = formatearMes(mesSeleccionado() + "-01");
    todosPagosDescripcion.textContent = datos.criterio === "cobro"
        ? "Pagos recibidos durante " + nombreMes + " (según la fecha en que se cobraron)."
        : "Pagos correspondientes a la cuota de " + nombreMes + " (aunque se hayan cobrado en otro mes).";

    tablaTodosPagos.replaceChildren();
    for (const pago of datos.pagos) {
        const fila = document.createElement("tr");
        fila.appendChild(crearCelda(String(pago.socioId)));
        fila.appendChild(crearCelda(pago.apellidos + ", " + pago.nombres));
        fila.appendChild(crearCelda(formatearMes(pago.mesPagado)));
        fila.appendChild(crearCelda(formatearFecha(pago.fechaPago)));
        fila.appendChild(crearCelda(MEDIOS[pago.medioPago] || pago.medioPago));

        const celdaMonto = crearCelda(formatearMonto(pago.monto));
        celdaMonto.classList.add("text-end");
        fila.appendChild(celdaMonto);

        tablaTodosPagos.appendChild(fila);
    }
    todosPagosVacio.classList.toggle("d-none", datos.pagos.length > 0);
}

// Pasa al mes anterior (-1) o siguiente (+1)
function moverMes(cantidad) {
    establecerMesFiltro(sumarMeses(mesSeleccionado() + "-01", cantidad));
    cargarPagosDelMes();
}

btnMesAnterior.addEventListener("click", () => moverMes(-1));
btnMesSiguiente.addEventListener("click", () => moverMes(1));
selectPagosMes.addEventListener("change", cargarPagosDelMes);
selectPagosAnio.addEventListener("change", cargarPagosDelMes);
selectPagosCriterio.addEventListener("change", cargarPagosDelMes);

// ---------- Importar socios desde un Excel ----------

const TAMANIO_MAXIMO_EXCEL = 5 * 1024 * 1024; // 5 MB (igual que el limite del servidor)
const inputAptoImportar = document.getElementById("importar-apto-fisico");
const btnImportarExcel = document.getElementById("btn-importar-excel");
const modalImportar = new bootstrap.Modal(document.getElementById("modal-importar"));
const inputArchivoExcel = document.getElementById("importar-archivo");
const inputFechaAlta = document.getElementById("importar-fecha-alta");
const importarError = document.getElementById("importar-error");
const importarInforme = document.getElementById("importar-informe");
const importarLeyenda = document.getElementById("importar-leyenda");
const informeNuevos = document.getElementById("informe-nuevos");
const informeExistentes = document.getElementById("informe-existentes");
const informeErrores = document.getElementById("informe-errores");
const detalleErrores = document.getElementById("detalle-errores");
const detalleOmitidos = document.getElementById("detalle-omitidos");
const tablaInformeErrores = document.getElementById("tabla-informe-errores");
const tablaInformeOmitidos = document.getElementById("tabla-informe-omitidos");
const btnRevisar = document.getElementById("btn-revisar-importacion");
const btnConfirmarImportacion = document.getElementById("btn-confirmar-importacion");

function abrirImportacion() {
    inputAptoImportar.checked = true;
    inputArchivoExcel.value = "";
    inputFechaAlta.value = hoyIso();
    reiniciarInforme();
    modalImportar.show();
}

// Oculta el informe y el boton "Importar": hay que volver a revisar el archivo
function reiniciarInforme() {
    importarError.classList.add("d-none");
    importarInforme.classList.add("d-none");
    btnConfirmarImportacion.classList.add("d-none");
}

function mostrarErrorImportar(texto) {
    importarError.textContent = texto;
    importarError.classList.remove("d-none");
}

// Envia el archivo al servidor. guardar=false: solo revisa; guardar=true: crea los socios.
// Devuelve el informe, o null si hubo un problema (el mensaje ya queda en pantalla).
async function enviarExcel(guardar) {
    const archivo = inputArchivoExcel.files[0];
    if (!archivo) {
        mostrarErrorImportar("Elegí un archivo de Excel.");
        return null;
    }
    if (archivo.size > TAMANIO_MAXIMO_EXCEL) {
        mostrarErrorImportar("El archivo es demasiado grande (máximo 5 MB).");
        return null;
    }

    const formulario = new FormData();
    formulario.append("archivo", archivo);

    const parametros = new URLSearchParams({guardar: String(guardar)});
    if (inputFechaAlta.value) {
        parametros.set("aptoFisico", String(inputAptoImportar.checked));
        parametros.set("fechaAlta", inputFechaAlta.value);
    }

    try {
        // No se indica Content-Type: el navegador lo completa solo para los archivos
        const respuesta = await fetch("/importacion/socios?" + parametros.toString(),
            {method: "POST", body: formulario});

        if (!respuesta.ok) {
            mostrarErrorImportar(await leerMensajeDeError(respuesta));
            return null;
        }
        return await respuesta.json();
    } catch (error) {
        mostrarErrorImportar("No se pudo conectar con el servidor.");
        return null;
    }
}

function pintarInforme(informe) {
    informeNuevos.textContent = informe.nuevos;
    informeExistentes.textContent = informe.existentes;
    informeErrores.textContent = informe.conErrores;

    rellenarAvisos(tablaInformeErrores, informe.errores);
    rellenarAvisos(tablaInformeOmitidos, informe.omitidos);
    detalleErrores.classList.toggle("d-none", informe.errores.length === 0);
    detalleOmitidos.classList.toggle("d-none", informe.omitidos.length === 0);
    detalleErrores.open = informe.errores.length > 0;

    importarLeyenda.textContent = "Se leyeron " + informe.filasLeidas + " filas. Todavía no se guardó nada.";
    importarInforme.classList.remove("d-none");

    if (informe.nuevos > 0) {
        btnConfirmarImportacion.textContent =
            "Importar " + informe.nuevos + (informe.nuevos === 1 ? " socio" : " socios");
        btnConfirmarImportacion.classList.remove("d-none");
    }
}

function rellenarAvisos(cuerpoTabla, avisos) {
    cuerpoTabla.replaceChildren();
    for (const aviso of avisos) {
        const fila = document.createElement("tr");
        fila.appendChild(crearCelda(String(aviso.fila)));
        fila.appendChild(crearCelda(aviso.mensaje));
        cuerpoTabla.appendChild(fila);
    }
}

btnImportarExcel.addEventListener("click", abrirImportacion);

// Si cambia el archivo o la fecha, el informe anterior ya no vale
inputArchivoExcel.addEventListener("change", reiniciarInforme);
inputFechaAlta.addEventListener("change", reiniciarInforme);

btnRevisar.addEventListener("click", async () => {
    reiniciarInforme();
    btnRevisar.disabled = true;
    try {
        const informe = await enviarExcel(false);
        if (informe) {
            pintarInforme(informe);
        }
    } finally {
        btnRevisar.disabled = false;
    }
});

btnConfirmarImportacion.addEventListener("click", async () => {
    btnConfirmarImportacion.disabled = true; // evita importar dos veces con un doble clic
    btnRevisar.disabled = true;
    try {
        const resultado = await enviarExcel(true);
        if (resultado) {
            modalImportar.hide();
            mostrarExito("Importación terminada: " + resultado.nuevos + " socios nuevos, "
                + resultado.existentes + " ya existían y " + resultado.conErrores + " filas con errores.");
            await cargarSocios();
        }
    } finally {
        btnConfirmarImportacion.disabled = false;
        btnRevisar.disabled = false;
    }
});

// ---------- Exportar a Excel e imprimir ----------

const btnExportarSocios = document.getElementById("btn-exportar-socios");
const btnExportarPagos = document.getElementById("btn-exportar-pagos");
const impresionTitulo = document.getElementById("impresion-titulo");
const impresionDetalle = document.getElementById("impresion-detalle");

// Descarga un archivo pedido por GET sin salir de la pagina.
// Si el servidor responde con un error, se muestra el mensaje con la funcion "mostrarFallo".
async function descargarExcel(url, nombreArchivo, mostrarFallo) {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) {
            mostrarFallo(await leerMensajeDeError(respuesta));
            return;
        }

        const archivo = await respuesta.blob();
        const direccion = URL.createObjectURL(archivo);

        const enlace = document.createElement("a");
        enlace.href = direccion;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        // Se libera la direccion temporal un poco despues, cuando el navegador ya empezo a descargar
        setTimeout(() => URL.revokeObjectURL(direccion), 10000);
    } catch (error) {
        mostrarFallo("No se pudo conectar con el servidor.");
    }
}

// Cobranza y Socios: se exporta lo que se ve (mismo buscador, filtro y orden)
btnExportarSocios.addEventListener("click", () => {
    const parametros = new URLSearchParams({
        filtro: selectFiltro.value,
        orden: selectOrden.value
    });
    const texto = inputBuscar.value.trim();
    if (texto) {
        parametros.set("buscar", texto);
    }
    descargarExcel("/socios/estado/exportar?" + parametros.toString(),
        "socios-" + hoyIso() + ".xlsx", mostrarError);
});

// Pagos: se exporta el mes elegido
btnExportarPagos.addEventListener("click", () => {
    const parametros = new URLSearchParams({
        mes: mesSeleccionado(),
        criterio: selectPagosCriterio.value
    });
    descargarExcel("/pagos/exportar?" + parametros.toString(),
        "pagos-" + mesSeleccionado() + ".xlsx", (texto) => {
            todosPagosError.textContent = texto;
            todosPagosError.classList.remove("d-none");
        });
});

// ----- Imprimir -----

const NOMBRES_DE_VISTA = {cobranza: "Cobranza", socios: "Listado de socios"};

function textoElegido(select) {
    return select.options[select.selectedIndex].textContent;
}

// Completa el titulo que solo se ve en el papel. Se ejecuta tambien con Ctrl+P.
function prepararImpresion() {
    const hoy = formatearFecha(hoyIso());

    if (vista === "pagos") {
        impresionTitulo.textContent = "Pagos de " + formatearMes(mesSeleccionado() + "-01");
        impresionDetalle.textContent = textoElegido(selectPagosCriterio) + " · Impreso el " + hoy;
        return;
    }

    const partes = ["Mostrar: " + textoElegido(selectFiltro), "Orden: " + textoElegido(selectOrden)];
    const texto = inputBuscar.value.trim();
    if (texto) {
        partes.push("Búsqueda: " + texto);
    }
    partes.push("Impreso el " + hoy);

    impresionTitulo.textContent = NOMBRES_DE_VISTA[vista];
    impresionDetalle.textContent = partes.join(" · ");
}

window.addEventListener("beforeprint", prepararImpresion);

for (const boton of document.querySelectorAll(".btn-imprimir")) {
    boton.addEventListener("click", () => window.print());
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

// Copia de seguridad: descarga un Excel con todos los socios y todos los pagos
document.getElementById("btn-copia-seguridad").addEventListener("click", () => {
    descargarExcel("/backup/exportar", "copia-de-seguridad-" + hoyIso() + ".xlsx", mostrarError);
});

// Cerrar sesion: avisa al servidor y vuelve a la pantalla de login
document.getElementById("btn-cerrar-sesion").addEventListener("click", async () => {
    try {
        await fetch("/logout", {method: "POST"});
    } finally {
        window.location.href = "/login.html";
    }
});

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
        case "cobrar":
            abrirCobro(socio);
            break;
        case "pagos":
            abrirHistorial(socio);
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