package com.gimnasio.api.controller;

import com.gimnasio.api.model.Socio;
import com.gimnasio.api.service.ISocioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/socios")
public class SocioController {

    @Autowired
    private ISocioService iSocioServ;

    @GetMapping
    public List<Socio> getSocios() {
        return iSocioServ.getSocios();
    }

    @GetMapping("/{id}")
    public Socio findSocio(@PathVariable Long id) {
        return iSocioServ.FindSocio(id);
    }

    @PostMapping
    public ResponseEntity<Socio> saveSocio(@Valid @RequestBody Socio socio) {
        iSocioServ.saveSocio(socio);
        // despues de guardar, JPA completa el id en el mismo objeto
        return ResponseEntity.created(URI.create("/socios/" + socio.getId())).body(socio);
    }

    @PutMapping("/{id}")
    public Socio updateSocio(@PathVariable Long id, @Valid @RequestBody Socio datos) {
        iSocioServ.updateSocio(id, datos);
        return iSocioServ.FindSocio(id); // devolvemos el socio ya actualizado
    }

    // borra el socio
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSocio(@PathVariable Long id) {
        iSocioServ.deleteSocio(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/alta")
    public ResponseEntity<Void> altaSocio(@PathVariable Long id) {
        iSocioServ.altaSocio(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/baja")
    public ResponseEntity<Void> bajaSocio(@PathVariable Long id) {
        iSocioServ.bajaSocio(id);
        return ResponseEntity.noContent().build();
    }
}
