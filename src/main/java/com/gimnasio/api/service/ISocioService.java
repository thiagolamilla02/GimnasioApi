package com.gimnasio.api.service;

import com.gimnasio.api.model.Socio;

import java.util.List;

public interface ISocioService {

    //metodos de socio service

    //lectura de todos los socios
    public List<Socio> getSocios();

    //lectura de un solo socio
    public Socio FindSocio(Long id);

    //alta
    public void saveSocio(Socio socio);

    //borrar
    public void deleteSocio(Long id);

    //modificacion/edicion
    public void updateSocio(Long id, Socio datos);

    //volver a dar de alta a un socio que estaba de baja
    public void altaSocio(Long id);
    //dar de baja a un socio que estaba de alta
    public void bajaSocio(Long id);
}
