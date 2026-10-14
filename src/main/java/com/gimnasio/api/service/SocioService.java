package com.gimnasio.api.service;

import com.gimnasio.api.exception.DniDuplicadoException;
import com.gimnasio.api.exception.SocioNoEncontradoException;
import com.gimnasio.api.model.Socio;
import com.gimnasio.api.repository.ISocioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class SocioService implements ISocioService {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    @Autowired
    ISocioRepository socioRepo;

    @Override
    public List<Socio> getSocios() {
        return socioRepo.findAll(Sort.by("apellidos", "nombres"));
    }

    @Override
    public Socio FindSocio(Long id) {
        return socioRepo.findById(id)
                .orElseThrow(() -> new SocioNoEncontradoException(id));
    }

    @Override
    @Transactional
    public void saveSocio(Socio socio) {
        validarDniLibre(socio.getDni(), null);
        socio.setId(null); // si el cliente mando un id, lo ignoramos
        if (socio.getFechaAlta() == null) {
            socio.setFechaAlta(LocalDate.now(ZONA));
        }
        socio.setActivo(true);
        socioRepo.save(socio);
    }

    @Override
    @Transactional
    public void deleteSocio(Long id) {
        Socio socio = FindSocio(id);      // si no existe, lanza el 404
        socioRepo.delete(socio);    // borrado definitivo
    }

    @Override
    @Transactional
    public void updateSocio(Long id, Socio datos) {
        // 1. Buscamos el socio existente (si no existe, 404)
        Socio socio = FindSocio(id);

        // 2. Verificamos que ningun OTRO socio tenga ese DNI
        validarDniLibre(datos.getDni(), id);

        // 3. Copiamos solo los campos editables
        socio.setApellidos(datos.getApellidos());
        socio.setNombres(datos.getNombres());
        socio.setDni(datos.getDni());
        socio.setDomicilio(datos.getDomicilio());
        socio.setTelefono(datos.getTelefono());
        socio.setAptoFisico(datos.isAptoFisico());

        // el id, la fechaAlta y el estado activo NO se tocan aca
        socioRepo.save(socio);
    }

    @Override
    @Transactional
    public void altaSocio(Long id) {
        Socio socio = FindSocio(id);
        socio.setActivo(true);
        socioRepo.save(socio);
    }

    @Override
    @Transactional
    public void bajaSocio(Long id) {
        Socio socio = FindSocio(id);
        socio.setActivo(false);
        socioRepo.save(socio);
    }

    // Falla si OTRO socio ya usa ese DNI (idActual es el socio que estamos editando)
    private void validarDniLibre(String dni, Long idActual) {
        socioRepo.findByDni(dni).ifPresent(existente -> {
            if (!existente.getId().equals(idActual)) {
                throw new DniDuplicadoException(dni);
            }
        });
    }
}
