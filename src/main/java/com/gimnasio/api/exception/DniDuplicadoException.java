package com.gimnasio.api.exception;

public class DniDuplicadoException extends RuntimeException{
    public DniDuplicadoException(String dni) {
        super("ya existe un socio con DNI " + dni);
    }
}
