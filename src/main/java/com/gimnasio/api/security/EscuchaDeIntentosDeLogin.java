package com.gimnasio.api.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.stereotype.Component;

// Spring Security avisa cada vez que un login falla o tiene exito; aca se cuentan
@Component
public class EscuchaDeIntentosDeLogin {

    @Autowired
    LimitadorDeIntentos limitador;

    @EventListener
    public void alFallar(AuthenticationFailureBadCredentialsEvent evento) {
        limitador.registrarFallo(evento.getAuthentication().getName());
    }

    @EventListener
    public void alIngresar(AuthenticationSuccessEvent evento) {
        limitador.registrarExito(evento.getAuthentication().getName());
    }
}