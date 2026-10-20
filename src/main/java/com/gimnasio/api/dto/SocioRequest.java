package com.gimnasio.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SocioRequest(

        @NotBlank(message = "El apellido es obligatorio")
        String apellidos,

        @NotBlank(message = "El nombre es obligatorio")
        String nombres,

        @NotBlank(message = "El DNI es obligatorio")
        @Pattern(regexp = "\\d{7,8}", message = "El DNI debe tener 7 u 8 numeros, sin puntos")
        String dni,

        String domicilio,

        String telefono,

        // Boolean (con mayuscula) y no boolean: asi, si no viene, queda en null en vez de fallar
        Boolean aptoFisico
) {}