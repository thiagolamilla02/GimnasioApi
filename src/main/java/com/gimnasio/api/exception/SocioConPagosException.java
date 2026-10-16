package com.gimnasio.api.exception;

public class SocioConPagosException extends RuntimeException {

    public SocioConPagosException(Long id) {
        super("El socio " + id + " tiene pagos registrados. Dalo de baja para conservar "
                + "su historial, o elimina tambien sus pagos con ?eliminarPagos=true");
    }
}
