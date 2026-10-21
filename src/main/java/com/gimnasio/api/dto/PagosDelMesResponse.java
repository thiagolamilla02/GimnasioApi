package com.gimnasio.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record PagosDelMesResponse(
        String mes,
        String criterio,
        int cantidad,
        BigDecimal total,
        BigDecimal totalEfectivo,
        BigDecimal totalTransferencia,
        List<PagoDetalleResponse> pagos
) {}