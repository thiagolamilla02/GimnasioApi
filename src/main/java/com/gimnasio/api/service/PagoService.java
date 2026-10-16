package com.gimnasio.api.service;

import com.gimnasio.api.exception.PagoDuplicadoException;
import com.gimnasio.api.exception.PagoNoEncontradoException;
import com.gimnasio.api.model.Pago;
import com.gimnasio.api.model.Socio;
import com.gimnasio.api.repository.IPagoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class PagoService implements IPagoService {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    @Autowired
    IPagoRepository pagoRepo;

    @Autowired
    ISocioService socioServ;

    @Override
    public List<Pago> getPagosDeSocio(Long socioId) {
        socioServ.FindSocio(socioId); // si el socio no existe, lanza el 404
        return pagoRepo.findBySocioIdOrderByMesPagadoDesc(socioId);
    }

    @Override
    public Pago findPago(Long socioId, Long pagoId) {
        socioServ.FindSocio(socioId); // 404 si el socio no existe
        return pagoRepo.findByIdAndSocioId(pagoId, socioId)
                .orElseThrow(() -> new PagoNoEncontradoException(pagoId));
    }

    @Override
    @Transactional
    public Pago savePago(Long socioId, Pago pago) {
        // 1. El socio debe existir (si no, 404)
        Socio socio = socioServ.FindSocio(socioId);

        // 2. Normalizamos el mes al dia 1 (si mandan 2026-10-15, queda 2026-10-01)
        LocalDate mes = pago.getMesPagado().withDayOfMonth(1);
        pago.setMesPagado(mes);

        // 3. No se puede pagar dos veces el mismo mes
        if (pagoRepo.existsBySocioIdAndMesPagado(socioId, mes)) {
            throw new PagoDuplicadoException(mes);
        }

        // 4. Si no mandan fecha de pago, es hoy
        if (pago.getFechaPago() == null) {
            pago.setFechaPago(LocalDate.now(ZONA));
        }

        pago.setId(null);      // ignoramos un id que venga en el cuerpo
        pago.setSocio(socio);  // el socio sale de la URL, no del JSON
        return pagoRepo.save(pago);
    }

    @Override
    @Transactional
    public Pago updatePago(Long socioId, Long pagoId, Pago datos) {
        // 1. Buscamos el pago (debe existir y ser de ese socio)
        Pago pago = findPago(socioId, pagoId);

        // 2. Normalizamos el mes y verificamos que no choque con OTRO pago
        LocalDate mes = datos.getMesPagado().withDayOfMonth(1);
        if (pagoRepo.existsBySocioIdAndMesPagadoAndIdNot(socioId, mes, pagoId)) {
            throw new PagoDuplicadoException(mes);
        }

        // 3. Copiamos solo los campos editables
        pago.setMesPagado(mes);
        pago.setMonto(datos.getMonto());
        pago.setMedioPago(datos.getMedioPago());
        if (datos.getFechaPago() != null) {
            pago.setFechaPago(datos.getFechaPago());
        }

        // el id y el socio NO se tocan
        return pagoRepo.save(pago);
    }

    @Override
    @Transactional
    public void deletePago(Long socioId, Long pagoId) {
        Pago pago = findPago(socioId, pagoId);
        pagoRepo.delete(pago);
    }
}