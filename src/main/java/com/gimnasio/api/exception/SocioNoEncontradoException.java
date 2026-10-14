package com.gimnasio.api.exception;

public class SocioNoEncontradoException extends RuntimeException{

    public SocioNoEncontradoException(Long id) {
        super("No existe un socio con id " + id);
    }
}
