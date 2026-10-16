package com.gimnasio.api.service;

import com.gimnasio.api.model.Pago;

import java.util.List;

public interface IPagoService {

    //metodos de pago service

    //lectura de todos los pagos de un socio (del mas reciente al mas antiguo)
    public List<Pago> getPagosDeSocio(Long socioId);

    //registrar un pago de un socio
    public Pago savePago(Long socioId, Pago pago);

    //lectura de un solo pago de un socio
    public Pago findPago(Long socioId, Long pagoId);

    //modificacion/edicion de un pago
    public Pago updatePago(Long socioId, Long pagoId, Pago datos);

    //eliminacion de un pago
    public void deletePago(Long socioId, Long pagoId);
}
