package com.gimnasio.api.service;

import com.gimnasio.api.dto.PagoDetalleResponse;
import com.gimnasio.api.dto.PagosDelMesResponse;
import com.gimnasio.api.dto.SocioEstadoResponse;
import com.gimnasio.api.model.Pago;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@Service
public class ExportacionService implements IExportacionService {

    @Autowired
    ISocioService socioServ;

    @Autowired
    IPagoService pagoServ;

    // ---------- Socios ----------

    @Override
    public byte[] exportarSocios(String buscar, String filtro, String orden) {
        // Misma consulta que la pantalla: lo que se ve es lo que se descarga
        List<SocioEstadoResponse> socios = socioServ.getSociosConEstado(buscar, filtro, orden);

        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Socios");
            CellStyle estiloEncabezado = crearEstiloEncabezado(libro);
            CellStyle estiloMes = crearEstiloConFormato(libro, "mmmm yyyy");

            escribirEncabezado(hoja, estiloEncabezado,
                    new String[]{"ID", "Apellidos", "Nombres", "DNI", "Teléfono", "Domicilio",
                            "Apto físico", "Estado", "Meses adeudados", "Último mes pagado"},
                    new int[]{8, 22, 22, 13, 16, 32, 12, 16, 16, 20});

            int numeroFila = 1;
            for (SocioEstadoResponse socio : socios) {
                Row fila = hoja.createRow(numeroFila++);
                fila.createCell(0).setCellValue(socio.id().doubleValue());
                fila.createCell(1).setCellValue(socio.apellidos());
                fila.createCell(2).setCellValue(socio.nombres());
                fila.createCell(3).setCellValue(socio.dni());       // como texto, sin separadores de miles
                fila.createCell(4).setCellValue(socio.telefono());
                fila.createCell(5).setCellValue(socio.domicilio());
                fila.createCell(6).setCellValue(socio.aptoFisico() ? "Sí" : "No");
                fila.createCell(7).setCellValue(textoEstado(socio));
                fila.createCell(8).setCellValue(socio.mesesAdeudados());
                escribirFecha(fila, 9, socio.ultimoMesPagado(), estiloMes);
            }

            hoja.createFreezePane(0, 1); // la fila de titulos queda fija al bajar
            hoja.setAutoFilter(new CellRangeAddress(0, Math.max(numeroFila - 1, 0), 0, 9));

            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el archivo de Excel.", e);
        }
    }

    private String textoEstado(SocioEstadoResponse socio) {
        if (!socio.activo()) {
            return "Baja";
        }
        if (!socio.debe()) {
            return "Al día";
        }
        return socio.mesesAdeudados() == 1 ? "Debe 1 mes" : "Debe " + socio.mesesAdeudados() + " meses";
    }

    // ---------- Pagos ----------

    @Override
    public byte[] exportarPagos(String mes, String criterio) {
        PagosDelMesResponse datos = pagoServ.getPagosDelMes(mes, criterio);
        List<PagoDetalleResponse> pagos = datos.pagos();
        int cantidad = pagos.size();

        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Pagos");
            CellStyle estiloEncabezado = crearEstiloEncabezado(libro);
            CellStyle estiloMes = crearEstiloConFormato(libro, "mmmm yyyy");
            CellStyle estiloFecha = crearEstiloConFormato(libro, "dd/mm/yyyy");
            CellStyle estiloMonto = crearEstiloConFormato(libro, "\"$\" #,##0.00");
            CellStyle estiloNegrita = crearEstiloNegrita(libro);

            escribirEncabezado(hoja, estiloEncabezado,
                    new String[]{"ID socio", "Apellidos", "Nombres", "Mes pagado", "Fecha de pago",
                            "Medio de pago", "Monto"},
                    new int[]{10, 22, 22, 18, 16, 18, 16});

            int numeroFila = 1;
            for (PagoDetalleResponse pago : pagos) {
                Row fila = hoja.createRow(numeroFila++);
                fila.createCell(0).setCellValue(pago.socioId().doubleValue());
                fila.createCell(1).setCellValue(pago.apellidos());
                fila.createCell(2).setCellValue(pago.nombres());
                escribirFecha(fila, 3, pago.mesPagado(), estiloMes);
                escribirFecha(fila, 4, pago.fechaPago(), estiloFecha);
                fila.createCell(5).setCellValue(nombreMedio(pago.medioPago()));

                Cell monto = fila.createCell(6);
                monto.setCellValue(pago.monto().doubleValue());
                monto.setCellStyle(estiloMonto);
            }

            // Totales con formulas de Excel (si se corrige un monto, se recalculan solos).
            // Los pagos estan en las filas 2 a (cantidad + 1) de Excel; los totales, dos filas mas abajo.
            String montos = "G2:G" + (cantidad + 1);
            String medios = "F2:F" + (cantidad + 1);
            int filaTotales = cantidad + 2; // indice (desde 0): deja una fila vacia despues del ultimo pago

            escribirTotal(hoja, filaTotales, "Total",
                    cantidad > 0 ? "SUM(" + montos + ")" : null, estiloNegrita, estiloMonto);
            escribirTotal(hoja, filaTotales + 1, "Efectivo",
                    cantidad > 0 ? "SUMIF(" + medios + ",\"Efectivo\"," + montos + ")" : null,
                    estiloNegrita, estiloMonto);
            escribirTotal(hoja, filaTotales + 2, "Transferencia",
                    cantidad > 0 ? "SUMIF(" + medios + ",\"Transferencia\"," + montos + ")" : null,
                    estiloNegrita, estiloMonto);
            escribirTotal(hoja, filaTotales + 3, "Cantidad de pagos",
                    cantidad > 0 ? "COUNT(" + montos + ")" : null, estiloNegrita, null);

            hoja.createFreezePane(0, 1);
            if (cantidad > 0) {
                hoja.setAutoFilter(new CellRangeAddress(0, cantidad, 0, 6));
            }
            libro.setForceFormulaRecalculation(true); // Excel calcula las formulas al abrir

            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo generar el archivo de Excel.", e);
        }
    }

    private String nombreMedio(Pago.MedioPago medio) {
        if (medio == null) {
            return "";
        }
        return medio == Pago.MedioPago.EFECTIVO ? "Efectivo" : "Transferencia";
    }

    // ---------- Ayudas para armar las hojas ----------

    private void escribirEncabezado(Sheet hoja, CellStyle estilo, String[] titulos, int[] anchos) {
        Row fila = hoja.createRow(0);
        for (int i = 0; i < titulos.length; i++) {
            Cell celda = fila.createCell(i);
            celda.setCellValue(titulos[i]);
            celda.setCellStyle(estilo);
            // Ancho fijo (en caracteres): autoSizeColumn necesita fuentes del sistema y puede fallar en un servidor
            hoja.setColumnWidth(i, anchos[i] * 256);
        }
    }

    private void escribirFecha(Row fila, int columna, LocalDate fecha, CellStyle estilo) {
        Cell celda = fila.createCell(columna);
        if (fecha != null) {
            celda.setCellValue(fecha);
            celda.setCellStyle(estilo);
        }
    }

    private void escribirTotal(Sheet hoja, int indiceFila, String titulo, String formula,
                               CellStyle estiloTitulo, CellStyle estiloValor) {
        Row fila = hoja.createRow(indiceFila);

        Cell etiqueta = fila.createCell(5);
        etiqueta.setCellValue(titulo);
        etiqueta.setCellStyle(estiloTitulo);

        Cell valor = fila.createCell(6);
        if (formula == null) {
            valor.setCellValue(0); // sin pagos: no hay rango que sumar
        } else {
            valor.setCellFormula(formula);
        }
        if (estiloValor != null) {
            valor.setCellStyle(estiloValor);
        }
    }

    private CellStyle crearEstiloEncabezado(Workbook libro) {
        Font fuente = libro.createFont();
        fuente.setBold(true);
        fuente.setColor(IndexedColors.WHITE.getIndex());

        CellStyle estilo = libro.createCellStyle();
        estilo.setFont(fuente);
        estilo.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return estilo;
    }

    private CellStyle crearEstiloNegrita(Workbook libro) {
        Font fuente = libro.createFont();
        fuente.setBold(true);

        CellStyle estilo = libro.createCellStyle();
        estilo.setFont(fuente);
        return estilo;
    }

    private CellStyle crearEstiloConFormato(Workbook libro, String formato) {
        CellStyle estilo = libro.createCellStyle();
        estilo.setDataFormat(libro.createDataFormat().getFormat(formato));
        return estilo;
    }
}