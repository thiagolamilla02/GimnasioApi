package com.gimnasio.api.exception;

public class ParametroInvalidoException extends RuntimeException {
    
    public ParametroInvalidoException(String parametro, String valor, String permitidos) {
        super("Valor invalido '" + valor + "' para '" + parametro
                + "'. Valores permitidos: " + permitidos);
    }
}
