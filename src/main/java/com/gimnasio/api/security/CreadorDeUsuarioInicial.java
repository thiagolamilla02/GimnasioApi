package com.gimnasio.api.security;

import com.gimnasio.api.model.Usuario;
import com.gimnasio.api.repository.IUsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Al arrancar, si todavia no hay ningun usuario, crea el primero con la clave de ADMIN_CLAVE
@Component
public class CreadorDeUsuarioInicial implements ApplicationRunner {

    private static final int LARGO_MINIMO_CLAVE = 8;

    @Autowired
    IUsuarioRepository usuarioRepo;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Value("${app.admin.usuario}")
    private String nombreUsuario;

    @Value("${app.admin.clave:}")
    private String clave;

    @Override
    public void run(ApplicationArguments args) {
        if (usuarioRepo.count() > 0) {
            return; // ya hay usuario: no hace falta ADMIN_CLAVE
        }
        if (clave == null || clave.length() < LARGO_MINIMO_CLAVE) {
            throw new IllegalStateException("No hay ningun usuario creado. Defini la variable de entorno "
                    + "ADMIN_CLAVE (minimo " + LARGO_MINIMO_CLAVE + " caracteres) para crear el usuario inicial.");
        }

        Usuario usuario = new Usuario();
        usuario.setNombreUsuario(nombreUsuario);
        usuario.setClaveHash(passwordEncoder.encode(clave));
        usuarioRepo.save(usuario);
    }
}