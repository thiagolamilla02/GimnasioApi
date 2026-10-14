package com.gimnasio.api.repository;

import com.gimnasio.api.model.Pago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface IPagoRepository extends JpaRepository<Pago, Long> {

    List<Pago> FindBySocioIdOrderByMesPagadoDesc(Long SocioId);

    boolean existsBySocioIdAndMesPagado(Long SocioId, LocalDate mesPagado);

    boolean existsBySocioId(Long SocioId);
}
