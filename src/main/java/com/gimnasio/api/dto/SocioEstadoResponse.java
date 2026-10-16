package com.gimnasio.api.dto;

import java.time.LocalDate;

public record SocioEstadoResponse(
        Long id,
        String apellido,
        String nombre,
        String dni,
        String telefono,
        boolean activo,
        LocalDate ultimoMesPagado,
        boolean debe,
        long mesesAdeudados
) {}