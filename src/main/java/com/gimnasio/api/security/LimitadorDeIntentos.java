package com.gimnasio.api.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Cuenta los intentos de login fallidos por usuario y bloquea temporalmente al llegar al limite
@Component
public class LimitadorDeIntentos {

    private static final int MAX_FALLOS = 5;
    private static final Duration ESPERA = Duration.ofMinutes(15);
    private static final int MAX_USUARIOS_RECORDADOS = 1000;

    private record Registro(int fallos, Instant ultimoFallo, Instant bloqueadoHasta) {}

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();

    public boolean estaBloqueado(String usuario) {
        Registro registro = registros.get(normalizar(usuario));
        return registro != null
                && registro.bloqueadoHasta() != null
                && Instant.now().isBefore(registro.bloqueadoHasta());
    }

    public void registrarFallo(String usuario) {
        if (registros.size() > MAX_USUARIOS_RECORDADOS) {
            limpiar();
        }
        registros.compute(normalizar(usuario), (k, actual) -> {
            Instant ahora = Instant.now();
            // si el ultimo fallo fue hace mas de 15 minutos, se empieza a contar de nuevo
            boolean empezarDeNuevo = actual == null || actual.ultimoFallo().plus(ESPERA).isBefore(ahora);
            int fallos = empezarDeNuevo ? 1 : actual.fallos() + 1;
            Instant bloqueo = fallos >= MAX_FALLOS ? ahora.plus(ESPERA) : null;
            return new Registro(fallos, ahora, bloqueo);
        });
    }

    public void registrarExito(String usuario) {
        registros.remove(normalizar(usuario));
    }

    // Evita que la memoria crezca sin limite si alguien prueba miles de usuarios inventados
    private void limpiar() {
        Instant ahora = Instant.now();
        registros.values().removeIf(r -> r.ultimoFallo().plus(ESPERA).isBefore(ahora));
        if (registros.size() > MAX_USUARIOS_RECORDADOS) {
            registros.clear();
        }
    }

    private String normalizar(String usuario) {
        return usuario == null ? "" : usuario.trim().toLowerCase();
    }
}