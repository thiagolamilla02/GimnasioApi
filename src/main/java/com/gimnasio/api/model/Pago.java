package com.gimnasio.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(
        name = "pagos",
        uniqueConstraints = @UniqueConstraint(columnNames = {"socio_id", "mes_pagado"})
)
public class Pago {

    public enum MedioPago {
        EFECTIVO,
        TRANSFERENCIA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // El socio viene de la URL (/socios/{id}/pagos), no del cuerpo del JSON
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "socio_id")
    private Socio socio;

    // Mes que se esta pagando: siempre el dia 1 (2026-10-01 = octubre 2026)
    @NotNull(message = "El mes pagado es obligatorio")
    private LocalDate mesPagado;

    // Dia en que efectivamente pago (si no viene, se completa con la fecha de hoy)
    private LocalDate fechaPago;

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor a cero")
    @Column(precision = 12, scale = 2)
    private BigDecimal monto;

    @NotNull(message = "El medio de pago es obligatorio")
    @Enumerated(EnumType.STRING)
    private MedioPago medioPago;

    // Para que el JSON muestre "socioId" en lugar de todo el objeto socio
    @JsonProperty("socioId")
    public Long getSocioId() {
        return socio != null ? socio.getId() : null;
    }

    public Pago() {
    }

    public Pago(LocalDate fechaPago, Socio socio, BigDecimal monto, LocalDate mesPagado, MedioPago medioPago, Long id) {
        this.fechaPago = fechaPago;
        this.socio = socio;
        this.monto = monto;
        this.mesPagado = mesPagado;
        this.medioPago = medioPago;
        this.id = id;
    }
}