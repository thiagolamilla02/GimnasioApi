package com.gimnasio.api.dto;

import java.util.List;

public record ImportacionResponse(
        boolean guardado,        // false = solo se reviso el archivo, no se guardo nada
        int filasLeidas,
        int nuevos,
        int existentes,
        int conErrores,
        String fechaAlta,
        List<ImportacionAviso> errores,
        List<ImportacionAviso> omitidos
) {}