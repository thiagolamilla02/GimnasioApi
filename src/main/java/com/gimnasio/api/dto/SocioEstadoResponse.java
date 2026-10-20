package com.gimnasio.api.dto;

import java.time.LocalDate;

public record SocioEstadoResponse(
        Long id,
        String apellidos,
        String nombres,
        String dni,
        String telefono,
        String domicilio,
        boolean aptoFisico,
        boolean activo,
        LocalDate ultimoMesPagado,
        boolean debe,
        long mesesAdeudados
) {}