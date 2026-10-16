package com.gimnasio.api.controller;

import com.gimnasio.api.model.Pago;
import com.gimnasio.api.service.IPagoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/socios/{socioId}/pagos")
public class PagoController {

    @Autowired
    private IPagoService pagoServ;

    @GetMapping
    public List<Pago> getPagosDeSocio(@PathVariable Long socioId) {
        return pagoServ.getPagosDeSocio(socioId);
    }

    @GetMapping("/{pagoId}")
    public Pago findPago(@PathVariable Long socioId, @PathVariable Long pagoId) {
        return pagoServ.findPago(socioId, pagoId);
    }

    @PostMapping
    public ResponseEntity<Pago> savePago(@PathVariable Long socioId,
                                         @Valid @RequestBody Pago pago) {
        Pago creado = pagoServ.savePago(socioId, pago);
        return ResponseEntity
                .created(URI.create("/socios/" + socioId + "/pagos/" + creado.getId()))
                .body(creado);
    }

    @PutMapping("/{pagoId}")
    public Pago updatePago(@PathVariable Long socioId,
                           @PathVariable Long pagoId,
                           @Valid @RequestBody Pago datos) {
        return pagoServ.updatePago(socioId, pagoId, datos);
    }

    @DeleteMapping("/{pagoId}")
    public ResponseEntity<Void> deletePago(@PathVariable Long socioId,
                                           @PathVariable Long pagoId) {
        pagoServ.deletePago(socioId, pagoId);
        return ResponseEntity.noContent().build();
    }
}


