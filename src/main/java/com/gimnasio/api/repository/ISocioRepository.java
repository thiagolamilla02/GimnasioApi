package com.gimnasio.api.repository;

import com.gimnasio.api.model.Socio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ISocioRepository extends JpaRepository <Socio, Long>{

    Optional<Socio> findByDni(String dni);
}
