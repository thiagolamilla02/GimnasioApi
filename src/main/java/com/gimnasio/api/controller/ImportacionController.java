package com.gimnasio.api.controller;

import com.gimnasio.api.dto.ImportacionResponse;
import com.gimnasio.api.service.IImportacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/importacion")
public class ImportacionController {

    @Autowired
    private IImportacionService importacionServ;

    // guardar=false (por defecto): solo revisa el archivo y devuelve el informe
    // guardar=true: ademas crea los socios nuevos
    @PostMapping("/socios")
    public ImportacionResponse importarSocios(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(defaultValue = "false") boolean guardar,
            @RequestParam(required = false) String fechaAlta,
            @RequestParam(defaultValue = "true") boolean aptoFisico) {
        return importacionServ.importarSocios(archivo, guardar, fechaAlta, aptoFisico);
    }
}