const formLogin = document.getElementById("form-login");
const inputUsuario = document.getElementById("usuario");
const inputClave = document.getElementById("clave");
const btnIngresar = document.getElementById("btn-ingresar");
const errorLogin = document.getElementById("login-error");

function mostrarErrorLogin(texto) {
    errorLogin.textContent = texto;
    errorLogin.classList.remove("d-none");
}

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    errorLogin.classList.add("d-none");

    const usuario = inputUsuario.value.trim();
    const clave = inputClave.value;
    if (!usuario || !clave) {
        mostrarErrorLogin("Ingresá el usuario y la contraseña.");
        return;
    }

    btnIngresar.disabled = true;
    try {
        // Spring Security espera los campos "username" y "password" en formato de formulario
        const respuesta = await fetch("/login", {
            method: "POST",
            body: new URLSearchParams({username: usuario, password: clave})
        });

        if (respuesta.ok) {
            window.location.href = "/";
        } else if (respuesta.status === 401) {
            mostrarErrorLogin("Usuario o contraseña incorrectos.");
            inputClave.value = "";
            inputClave.focus();
        } else if (respuesta.status === 403) {
            mostrarErrorLogin("La página caducó. Recargala (Ctrl+F5) e intentá de nuevo.");
        } else {
            mostrarErrorLogin("No se pudo iniciar sesión (código " + respuesta.status + ").");
        }
    } catch (error) {
        mostrarErrorLogin("No se pudo conectar con el servidor.");
    } finally {
        btnIngresar.disabled = false;
    }
});