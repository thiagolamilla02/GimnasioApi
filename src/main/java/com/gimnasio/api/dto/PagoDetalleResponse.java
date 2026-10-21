package com.gimnasio.api.dto;

import com.gimnasio.api.model.Pago;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PagoDetalleResponse(
        Long id,
        Long socioId,
        String apellidos,
        String nombres,
        LocalDate mesPagado,
        LocalDate fechaPago,
        BigDecimal monto,
        Pago.MedioPago medioPago
) {}