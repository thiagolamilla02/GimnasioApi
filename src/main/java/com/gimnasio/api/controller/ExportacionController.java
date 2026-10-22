package com.gimnasio.api.controller;

import com.gimnasio.api.service.IExportacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;

@RestController
public class ExportacionController {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final MediaType EXCEL =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    @Autowired
    private IExportacionService exportacionServ;

    // Mismos parametros que /socios/estado
    @GetMapping("/socios/estado/exportar")
    public ResponseEntity<byte[]> exportarSocios(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "activos") String filtro,
            @RequestParam(defaultValue = "apellido") String orden) {
        byte[] archivo = exportacionServ.exportarSocios(buscar, filtro, orden);
        return descarga(archivo, "socios-" + LocalDate.now(ZONA) + ".xlsx");
    }

    // Mismos parametros que /pagos
    @GetMapping("/pagos/exportar")
    public ResponseEntity<byte[]> exportarPagos(
            @RequestParam(required = false) String mes,
            @RequestParam(defaultValue = "cobro") String criterio) {
        byte[] archivo = exportacionServ.exportarPagos(mes, criterio);
        String periodo = (mes == null || mes.isBlank()) ? LocalDate.now(ZONA).toString().substring(0, 7) : mes;
        return descarga(archivo, "pagos-" + periodo + ".xlsx");
    }

    private ResponseEntity<byte[]> descarga(byte[] archivo, String nombre) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(nombre).build().toString())
                .contentType(EXCEL)
                .body(archivo);
    }
}