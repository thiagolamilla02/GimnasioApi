package com.gimnasio.api.controller;

import com.gimnasio.api.dto.SocioEstadoResponse;
import com.gimnasio.api.dto.SocioRequest;
import com.gimnasio.api.model.Socio;
import com.gimnasio.api.service.ISocioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/socios")
public class SocioController {

    @Autowired
    private ISocioService iSocioServ;

    @GetMapping("/estado")
    public List<SocioEstadoResponse> getSociosConEstado(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "activos") String filtro,
            @RequestParam(defaultValue = "apellido") String orden) {
        return iSocioServ.getSociosConEstado(buscar, filtro, orden);
    }

    @GetMapping
    public List<Socio> getSocios() {
        return iSocioServ.getSocios();
    }

    @GetMapping("/{id}")
    public Socio findSocio(@PathVariable Long id) {
        return iSocioServ.FindSocio(id);
    }

    @PostMapping
    public ResponseEntity<Socio> saveSocio(@Valid @RequestBody SocioRequest datos) {
        Socio socio = aSocio(datos);
        iSocioServ.saveSocio(socio);
        // despues de guardar, JPA completa el id en el mismo objeto
        return ResponseEntity.created(URI.create("/socios/" + socio.getId())).body(socio);
    }

    @PutMapping("/{id}")
    public Socio updateSocio(@PathVariable Long id, @Valid @RequestBody SocioRequest datos) {
        iSocioServ.updateSocio(id, aSocio(datos));
        return iSocioServ.FindSocio(id); // devolvemos el socio ya actualizado
    }

    // Convierte lo que llega de la API en una entidad Socio
    private Socio aSocio(SocioRequest datos) {
        Socio socio = new Socio();
        socio.setApellidos(datos.apellidos());
        socio.setNombres(datos.nombres());
        socio.setDni(datos.dni());
        socio.setDomicilio(datos.domicilio());
        socio.setTelefono(datos.telefono());
        socio.setAptoFisico(Boolean.TRUE.equals(datos.aptoFisico()));
        return socio;
    }

    // borra el socio y los pagos
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSocio(@PathVariable Long id,
                                            @RequestParam(defaultValue = "false") boolean eliminarPagos) {
        iSocioServ.deleteSocio(id, eliminarPagos);
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
