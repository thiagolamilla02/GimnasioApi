package com.gimnasio.api.repository;

import com.gimnasio.api.dto.UltimoPagoDto;
import com.gimnasio.api.model.Pago;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IPagoRepository extends JpaRepository<Pago, Long> {

    @EntityGraph(attributePaths = "socio")
    List<Pago> findBySocioIdOrderByMesPagadoDesc(Long SocioId);

    // Un pago, pero solo si pertenece a ese socio
    @EntityGraph(attributePaths = "socio")
    Optional<Pago> findByIdAndSocioId(Long id, Long socioId);

    boolean existsBySocioIdAndMesPagado(Long SocioId, LocalDate mesPagado);

    boolean existsBySocioId(Long SocioId);

    // Para editar: ¿otro pago del mismo socio ya usa ese mes? (ignora el propio)
    boolean existsBySocioIdAndMesPagadoAndIdNot(Long socioId, LocalDate mesPagado, Long id);

    // Elimina todos los pagos de un socio
    void deleteBySocioId(Long socioId);

    // Una sola consulta: el ultimo mes pagado de cada socio que tiene pagos
    @Query("select new com.gimnasio.api.dto.UltimoPagoDto(p.socio.id, max(p.mesPagado)) "
            + "from Pago p group by p.socio.id")
    List<UltimoPagoDto> findUltimoPagoPorSocio();
}

