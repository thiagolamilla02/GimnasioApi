package com.gimnasio.api.controller;

import com.gimnasio.api.dto.PagosDelMesResponse;
import com.gimnasio.api.service.IPagoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/pagos")
public class PagosGlobalesController {

    @Autowired
    private IPagoService pagoServ;

    // Ejemplos: /pagos  |  /pagos?mes=2026-10  |  /pagos?mes=2026-10&criterio=periodo
    @GetMapping
    public PagosDelMesResponse getPagosDelMes(
            @RequestParam(required = false) String mes,
            @RequestParam(defaultValue = "cobro") String criterio) {
        return pagoServ.getPagosDelMes(mes, criterio);
    }
}