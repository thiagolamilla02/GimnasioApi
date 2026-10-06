# Gimnasio API

API REST para gestionar socios y el control de cuotas mensuales de un gimnasio.

## Qué problema resuelve
Reemplaza el control en planillas de Excel: permite ver qué socios deben la cuota
del mes, buscar y filtrar deudores, y registrar pagos.

## Funcionalidades
- Alta, edición y baja de socios
- Registro de pagos mensuales
- Listado de deudores con búsqueda y filtros (más antiguo, más reciente, al día)

## Tecnologías
Java 21 · Spring Boot · Spring Data JPA · H2 / PostgreSQL · Maven · JUnit 5

## Cómo ejecutarlo
1. Clonar el repositorio
2. Ejecutar `./mvnw spring-boot:run`
3. La API queda en http://localhost:8080

## Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| GET | /socios | Lista de socios |
| POST | /socios | Crear socio |

## Pruebas
`./mvnw test`

## Estado del proyecto y próximos pasos
(Lo que está hecho y lo que falta)

## Autor
Thiago Lamilla
