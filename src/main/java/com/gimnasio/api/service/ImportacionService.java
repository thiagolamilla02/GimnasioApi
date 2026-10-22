package com.gimnasio.api.service;

import com.gimnasio.api.dto.ImportacionAviso;
import com.gimnasio.api.dto.ImportacionResponse;
import com.gimnasio.api.exception.ArchivoInvalidoException;
import com.gimnasio.api.exception.ParametroInvalidoException;
import com.gimnasio.api.model.Socio;
import com.gimnasio.api.repository.ISocioRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ImportacionService implements IImportacionService {

    @Autowired
    ISocioRepository socioRepo;

    private static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final int MAX_FILAS = 2000;
    private static final int FILAS_BUSQUEDA_ENCABEZADO = 20;

    // Nombre de columna (normalizado) -> campo del socio
    private static final Map<String, String> ALIAS = Map.ofEntries(
            Map.entry("apellido", "apellidos"),
            Map.entry("apellidos", "apellidos"),
            Map.entry("nombre", "nombres"),
            Map.entry("nombres", "nombres"),
            Map.entry("dni", "dni"),
            Map.entry("documento", "dni"),
            Map.entry("domicilio", "domicilio"),
            Map.entry("direccion", "domicilio"),
            Map.entry("telefono", "telefono"),
            Map.entry("tel", "telefono"),
            Map.entry("celular", "telefono")
    );
    private static final Set<String> OBLIGATORIAS = Set.of("apellidos", "nombres", "dni");

    // Hoja donde estan los datos, fila de los encabezados y en que columna esta cada campo
    private record Tabla(Sheet hoja, int filaEncabezado, Map<String, Integer> columnas) {}

    @Override
    @Transactional
    public ImportacionResponse importarSocios(MultipartFile archivo, boolean guardar, String fechaAltaTexto) {
        validarArchivo(archivo);
        LocalDate fechaAlta = leerFechaAlta(fechaAltaTexto);

        try (Workbook libro = abrir(archivo)) {
            Tabla tabla = buscarTabla(libro);
            return procesar(tabla, guardar, fechaAlta);
        } catch (IOException e) {
            throw new ArchivoInvalidoException("No se pudo leer el archivo.");
        }
    }

    // ---------- Proceso principal ----------

    private ImportacionResponse procesar(Tabla tabla, boolean guardar, LocalDate fechaAlta) {
        Sheet hoja = tabla.hoja();
        Map<String, Integer> columnas = tabla.columnas();

        if (hoja.getLastRowNum() > MAX_FILAS) {
            throw new ArchivoInvalidoException("El archivo tiene demasiadas filas (maximo " + MAX_FILAS + ").");
        }

        // DNI que ya estan cargados en el sistema (DNI -> id del socio)
        Map<String, Long> dniExistentes = socioRepo.findAll().stream()
                .collect(Collectors.toMap(Socio::getDni, Socio::getId, (a, b) -> a));
        // DNI ya vistos en este archivo (DNI -> numero de fila)
        Map<String, Integer> filaDeCadaDni = new HashMap<>();

        List<Socio> nuevos = new ArrayList<>();
        List<ImportacionAviso> errores = new ArrayList<>();
        List<ImportacionAviso> omitidos = new ArrayList<>();
        int filasLeidas = 0;

        for (int i = tabla.filaEncabezado() + 1; i <= hoja.getLastRowNum(); i++) {
            Row fila = hoja.getRow(i);
            if (filaVacia(fila, columnas)) {
                continue;
            }

            filasLeidas++;
            int numeroFila = i + 1; // el numero que la persona ve en Excel
            List<String> problemas = new ArrayList<>();

            String apellidos = textoDe(valorDe(celda(fila, columnas, "apellidos")));
            String nombres = textoDe(valorDe(celda(fila, columnas, "nombres")));
            String dni = leerDni(valorDe(celda(fila, columnas, "dni")), problemas);
            String domicilio = textoDe(valorDe(celda(fila, columnas, "domicilio")));
            String telefono = leerTelefono(valorDe(celda(fila, columnas, "telefono")), problemas);

            if (apellidos == null) {
                problemas.add("falta el apellido");
            }
            if (nombres == null) {
                problemas.add("falta el nombre");
            }
            if (dni != null) {
                Integer filaPrevia = filaDeCadaDni.putIfAbsent(dni, numeroFila);
                if (filaPrevia != null) {
                    problemas.add("el DNI esta repetido (ya aparece en la fila " + filaPrevia + ")");
                }
            }

            if (!problemas.isEmpty()) {
                errores.add(new ImportacionAviso(numeroFila,
                        primeraMayuscula(String.join("; ", problemas)) + "."));
                continue;
            }

            if (dniExistentes.containsKey(dni)) {
                omitidos.add(new ImportacionAviso(numeroFila,
                        "Ya existe un socio con ese DNI (ID " + dniExistentes.get(dni) + "). Se omite."));
                continue;
            }

            Socio socio = new Socio();
            socio.setApellidos(apellidos);
            socio.setNombres(nombres);
            socio.setDni(dni);
            socio.setDomicilio(domicilio);
            socio.setTelefono(telefono);
            socio.setAptoFisico(false); // el Excel no trae este dato
            socio.setActivo(true);
            socio.setFechaAlta(fechaAlta);
            nuevos.add(socio);
        }

        if (guardar && !nuevos.isEmpty()) {
            socioRepo.saveAll(nuevos);
        }

        return new ImportacionResponse(guardar, filasLeidas, nuevos.size(), omitidos.size(),
                errores.size(), fechaAlta.toString(), errores, omitidos);
    }

    // ---------- Archivo y hoja ----------

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ArchivoInvalidoException("No se recibio ningun archivo.");
        }
        String nombre = archivo.getOriginalFilename() == null ? "" : archivo.getOriginalFilename().toLowerCase();
        if (!nombre.endsWith(".xlsx") && !nombre.endsWith(".xls")) {
            throw new ArchivoInvalidoException("El archivo debe ser un Excel (.xlsx o .xls).");
        }
    }

    private Workbook abrir(MultipartFile archivo) {
        try {
            return WorkbookFactory.create(archivo.getInputStream());
        } catch (Exception e) {
            throw new ArchivoInvalidoException(
                    "No se pudo leer el archivo. Verifica que sea un Excel valido y que no tenga contraseña.");
        }
    }

    private LocalDate leerFechaAlta(String texto) {
        if (texto == null || texto.isBlank()) {
            return LocalDate.now(ZONA);
        }
        try {
            return LocalDate.parse(texto.trim());
        } catch (DateTimeParseException e) {
            throw new ParametroInvalidoException("fechaAlta", texto, "formato AAAA-MM-DD");
        }
    }

    // Busca, en cualquier hoja, la primera fila de encabezados que tenga Apellido, Nombres y DNI
    private Tabla buscarTabla(Workbook libro) {
        for (Sheet hoja : libro) {
            int primera = Math.max(hoja.getFirstRowNum(), 0);
            int ultima = Math.min(hoja.getLastRowNum(), primera + FILAS_BUSQUEDA_ENCABEZADO);

            for (int i = primera; i <= ultima; i++) {
                Row fila = hoja.getRow(i);
                if (fila == null) {
                    continue;
                }
                Map<String, Integer> columnas = leerEncabezados(fila);
                if (columnas.keySet().containsAll(OBLIGATORIAS)) {
                    return new Tabla(hoja, i, columnas);
                }
            }
        }
        throw new ArchivoInvalidoException("No se encontraron los encabezados. El archivo debe tener columnas "
                + "llamadas Apellido, Nombres y DNI (y, si las tiene, Domicilio y Telefono).");
    }

    private Map<String, Integer> leerEncabezados(Row fila) {
        Map<String, Integer> columnas = new HashMap<>();
        for (Cell celda : fila) {
            if (valorDe(celda) instanceof String texto) {
                String campo = ALIAS.get(normalizar(texto));
                if (campo != null) {
                    columnas.putIfAbsent(campo, celda.getColumnIndex());
                }
            }
        }
        return columnas;
    }

    // ---------- Lectura de celdas ----------

    private Cell celda(Row fila, Map<String, Integer> columnas, String campo) {
        Integer columna = columnas.get(campo);
        return columna == null ? null : fila.getCell(columna);
    }

    private boolean filaVacia(Row fila, Map<String, Integer> columnas) {
        if (fila == null) {
            return true;
        }
        for (Integer columna : columnas.values()) {
            if (textoDe(valorDe(fila.getCell(columna))) != null) {
                return false;
            }
        }
        return true;
    }

    // Devuelve un String, un Double o null (si la celda esta vacia o tiene un error)
    private Object valorDe(Cell celda) {
        if (celda == null) {
            return null;
        }
        CellType tipo = celda.getCellType();
         if (tipo == CellType.FORMULA) {
            tipo = celda.getCachedFormulaResultType();
        }
        return switch (tipo) {
            case STRING -> celda.getStringCellValue();
            case NUMERIC -> Double.valueOf(celda.getNumericCellValue());
            case BOOLEAN -> String.valueOf(celda.getBooleanCellValue());
            default -> null;
        };
    }

    // ---------- Limpieza de datos ----------

    // Texto sin espacios de mas; si queda vacio, null
    private String textoDe(Object valor) {
        if (valor == null) {
            return null;
        }
        String texto = valor instanceof Double numero ? numeroComoTexto(numero) : valor.toString();
        texto = texto.replaceAll("[\\s\\u00A0]+", " ").strip();
        return texto.isEmpty() ? null : texto;
    }

    private String numeroComoTexto(double numero) {
        return numero == Math.floor(numero) ? String.valueOf((long) numero) : String.valueOf(numero);
    }

    // DNI: numero de Excel o texto con puntos, comas o espacios. Debe quedar de 7 u 8 numeros.
    private String leerDni(Object valor, List<String> problemas) {
        if (valor == null || valor.toString().isBlank()) {
            problemas.add("falta el DNI");
            return null;
        }

        String digitos;
        if (valor instanceof Double numero) {
            if (numero != Math.floor(numero)) {
                problemas.add("DNI no valido");
                return null;
            }
            digitos = String.valueOf(numero.longValue());
        } else {
            digitos = valor.toString().replaceAll("[\\s\\u00A0.,-]", "");
        }

        if (!digitos.matches("\\d{7,8}")) {
            problemas.add("DNI no valido (debe tener 7 u 8 numeros)");
            return null;
        }
        return digitos;
    }

    // Telefono: solo los numeros (sin guiones, espacios ni parentesis)
    private String leerTelefono(Object valor, List<String> problemas) {
        if (valor == null) {
            return null;
        }

        String digitos = valor instanceof Double numero
                ? String.valueOf(numero.longValue())
                : valor.toString().replaceAll("\\D", "");

        if (digitos.isEmpty()) {
            return null;
        }
        if (digitos.length() > 15) {
            problemas.add("telefono con demasiados numeros (¿hay dos telefonos en la misma celda?)");
            return null;
        }
        return digitos;
    }

    // "Apellido " -> "apellido"; "DNI ." -> "dni"; "Teléfono" -> "telefono"
    private String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]", "");
    }

    private String primeraMayuscula(String texto) {
        return texto.isEmpty() ? texto : Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }
}
