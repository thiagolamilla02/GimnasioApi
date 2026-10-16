package com.gimnasio.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ManejadorDeErrores {

    @ExceptionHandler(SocioNoEncontradoException.class)
    public ProblemDetail noEncontrado(SocioNoEncontradoException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(DniDuplicadoException.class)
    public ProblemDetail dniDuplicado(DniDuplicadoException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail datosInvalidos(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errores.put(e.getField(), e.getDefaultMessage()));

        ProblemDetail respuesta = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Hay datos invalidos");
        respuesta.setProperty("errores", errores);
        return respuesta;
    }

    @ExceptionHandler(PagoDuplicadoException.class)
    public ProblemDetail pagoDuplicado(PagoDuplicadoException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(PagoNoEncontradoException.class)
    public ProblemDetail pagoNoEncontrado(PagoNoEncontradoException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(SocioConPagosException.class)
    public ProblemDetail socioConPagos(SocioConPagosException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    }
}