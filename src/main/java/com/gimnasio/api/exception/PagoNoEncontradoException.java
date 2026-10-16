package com.gimnasio.api.exception;

public class PagoNoEncontradoException extends RuntimeException {

    public PagoNoEncontradoException(Long id) {
        super("No existe el pago " + id + " para ese socio");
    }
}