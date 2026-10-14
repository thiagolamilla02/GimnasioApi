package com.gimnasio.api.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "socios")
@Getter
@Setter
public class Socio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombres;

    @NotBlank(message = "El apellido es obligatorio")
    private String apellidos;

    @NotBlank(message = "El Dni es obligatorio")
    @Pattern(regexp = "\\d{7,8}", message = "El DNI debe tener 7 u 8 numeros, sin puntos")
    @Column(unique = true)
    private String dni;

    @Basic
    private String domicilio;

    private String telefono;

    private boolean aptoFisico;

    private LocalDate fechaAlta;

    private boolean activo = true;

    public Socio() {
    }

    public Socio(boolean aptoFisico, String dni, String domicilio, Long id, LocalDate fechaAlta, String nombres, String telefono, String apellidos, boolean activo) {
        this.aptoFisico = aptoFisico;
        this.dni = dni;
        this.domicilio = domicilio;
        this.id = id;
        this.fechaAlta = fechaAlta;
        this.nombres = nombres;
        this.telefono = telefono;
        this.apellidos = apellidos;
        this.activo = activo;
    }
}
