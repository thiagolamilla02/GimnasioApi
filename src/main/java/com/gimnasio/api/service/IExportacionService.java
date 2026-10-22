package com.gimnasio.api.service;

public interface IExportacionService {

    //Excel con la lista de socios y su estado (mismos filtros que la pantalla)
    public byte[] exportarSocios(String buscar, String filtro, String orden);

    //Excel con los pagos de un mes de todos los socios, con totales
    public byte[] exportarPagos(String mes, String criterio);
}