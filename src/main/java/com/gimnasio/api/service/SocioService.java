package com.gimnasio.api.service;

import com.gimnasio.api.dto.SocioEstadoResponse;
import com.gimnasio.api.exception.DniDuplicadoException;
import com.gimnasio.api.exception.ParametroInvalidoException;
import com.gimnasio.api.exception.SocioConPagosException;
import com.gimnasio.api.exception.SocioNoEncontradoException;
import com.gimnasio.api.model.Socio;
import com.gimnasio.api.repository.IPagoRepository;
import com.gimnasio.api.repository.ISocioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.gimnasio.api.dto.UltimoPagoDto;

import java.text.Normalizer;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class SocioService implements ISocioService {

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");

    @Autowired
    ISocioRepository socioRepo;

    @Autowired
    IPagoRepository pagoRepo;

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
    public void deleteSocio(Long id, boolean eliminarPagos) {
        Socio socio = FindSocio(id); // 404 si no existe

        if (pagoRepo.existsBySocioId(id)) {
            if (!eliminarPagos) {
                throw new SocioConPagosException(id);
            }
            pagoRepo.deleteBySocioId(id); // primero los pagos...
        }

        socioRepo.delete(socio);    // ...y despues el socio
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

    @Override
    public List<SocioEstadoResponse> getSociosConEstado(String buscar, String filtro, String orden) {
        LocalDate mesActual = LocalDate.now(ZONA).withDayOfMonth(1);

        // Una sola consulta: ultimo mes pagado de cada socio
        Map<Long, LocalDate> ultimoPorSocio = pagoRepo.findUltimoPagoPorSocio().stream()
                .collect(Collectors.toMap(UltimoPagoDto::socioId, UltimoPagoDto::ultimoMes));

        // Validamos filtro y orden ANTES de procesar (si son invalidos, 400)
        Predicate<SocioEstadoResponse> cumpleFiltro = predicadoDeFiltro(filtro);
        Comparator<SocioEstadoResponse> comparador = comparadorDeOrden(orden);
        List<String> palabras = palabrasDeBusqueda(buscar);

        return getSocios().stream()
                .map(socio -> armarEstado(socio, ultimoPorSocio.get(socio.getId()), mesActual))
                .filter(cumpleFiltro)
                .filter(estado -> coincideConBusqueda(estado, palabras))
                .sorted(comparador)
                .toList();
    }

    private SocioEstadoResponse armarEstado(Socio socio, LocalDate ultimoMesPagado, LocalDate mesActual) {
        long mesesAdeudados = 0;

        if (socio.isActivo()) {
            // Primer mes que todavia no cubrio: el siguiente a su ultimo pago,
            // o el mes en que se dio de alta si nunca pago
            LocalDate primerMesImpago;
            if (ultimoMesPagado != null) {
                primerMesImpago = ultimoMesPagado.plusMonths(1);
            } else if (socio.getFechaAlta() != null) {
                primerMesImpago = socio.getFechaAlta().withDayOfMonth(1);
            } else {
                primerMesImpago = mesActual;
            }

            mesesAdeudados = Math.max(0L, ChronoUnit.MONTHS.between(primerMesImpago, mesActual) + 1);
        }

        return new SocioEstadoResponse(
                socio.getId(),
                socio.getApellidos(),
                socio.getNombres(),
                socio.getDni(),
                socio.getTelefono(),
                socio.isActivo(),
                ultimoMesPagado,
                mesesAdeudados > 0,
                mesesAdeudados
        );
    }

    private Predicate<SocioEstadoResponse> predicadoDeFiltro(String filtro) {
        return switch (filtro.toLowerCase()) {
            case "activos" -> SocioEstadoResponse::activo;
            case "deudores" -> SocioEstadoResponse::debe;
            case "al-dia" -> estado -> estado.activo() && !estado.debe();
            case "bajas" -> estado -> !estado.activo();
            case "todos" -> estado -> true;
            default -> throw new ParametroInvalidoException("filtro", filtro,
                    "activos, deudores, al-dia, bajas, todos");
        };
    }

    private Comparator<SocioEstadoResponse> comparadorDeOrden(String orden) {
        Comparator<SocioEstadoResponse> porApellido = Comparator
                .comparing((SocioEstadoResponse s) -> normalizar(s.apellido()))
                .thenComparing(s -> normalizar(s.nombre()));

        return switch (orden.toLowerCase()) {
            case "apellido" -> porApellido;
            // el que mas meses debe, primero (los que estan al dia, con 0, quedan al final)
            case "moroso-antiguo" -> Comparator
                    .comparingLong(SocioEstadoResponse::mesesAdeudados).reversed()
                    .thenComparing(porApellido);
            // los deudores con menos meses primero; los que estan al dia, al final
            case "moroso-reciente" -> Comparator
                    .comparing((SocioEstadoResponse s) -> s.debe() ? 0 : 1)
                    .thenComparingLong(SocioEstadoResponse::mesesAdeudados)
                    .thenComparing(porApellido);
            default -> throw new ParametroInvalidoException("orden", orden,
                    "apellido, moroso-antiguo, moroso-reciente");
        };
    }

    private List<String> palabrasDeBusqueda(String buscar) {
        if (buscar == null || buscar.isBlank()) {
            return List.of();
        }
        return Arrays.asList(normalizar(buscar).trim().split("\\s+"));
    }

    // Todas las palabras buscadas deben aparecer en "apellido nombre dni"
    private boolean coincideConBusqueda(SocioEstadoResponse estado, List<String> palabras) {
        if (palabras.isEmpty()) {
            return true;
        }
        String texto = normalizar(estado.apellido() + " " + estado.nombre() + " " + estado.dni());
        return palabras.stream().allMatch(texto::contains);
    }

    // Pasa a minusculas y quita tildes: "García" -> "garcia"
    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase();
    }
}
