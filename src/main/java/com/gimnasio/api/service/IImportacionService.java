package com.gimnasio.api.service;

import com.gimnasio.api.dto.ImportacionResponse;
import org.springframework.web.multipart.MultipartFile;

public interface IImportacionService {

    //lee un Excel y crea los socios nuevos (guardar = false: solo revisa, no guarda nada)
    public ImportacionResponse importarSocios(MultipartFile archivo, boolean guardar,
                                              String fechaAlta, boolean aptoFisico);
}