package com.gimnasio.api.exception;

import java.time.LocalDate;

public class PagoDuplicadoException extends RuntimeException {

    public PagoDuplicadoException(LocalDate mesPagado) {
        super("Ya existe un pago registrado para el mes " + mesPagado.getMonthValue()
                + "/" + mesPagado.getYear());
    }
}
