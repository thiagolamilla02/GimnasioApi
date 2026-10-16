package com.gimnasio.api.dto;

import java.time.LocalDate;

public record UltimoPagoDto(Long socioId, LocalDate ultimoMes) {}