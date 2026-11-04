# Demo conceptual del multicotizador Gaman

Alcance actualizado: propuesta de plataforma para 4.000 productores, cuentas individuales, permisos, cartera central y cotizador. Ver `plataforma.html`. Estos componentes centrales son objetivos de implementación: esta demo estática no autentica usuarios, no comparte datos entre dispositivos ni acredita capacidad para 4.000 cuentas. El plan técnico rector vive en el repositorio privado `gaman-multicotizador/docs/proyecto-plataforma.md`.

Sitio: https://patriagrande-tech.github.io/gaman-multicotizador-demo/

Diseño basado en el sitio de Grupo Gaman (Lexend Deca/Inter, grafito, azul #2563eb y navy #032b77), en un único `styles.css`. Encabezado, logo y menús de las tres pantallas se generan desde `build_navigation.py`: ejecutar `python build_navigation.py` al cambiar destinos. El HTML generado funciona sin depender de JavaScript para navegar. Validación de destinos, anclas y menú móvil: `python -m unittest test_navigation -v`.

Los enlaces entre páginas llevan la misma versión de publicación y los CSS/JS usan huellas de contenido para evitar mezclar recursos viejos. Prueba de navegador del recorrido cotizador → cartera → tareas → cotizador: con Chrome y el paquete Python `playwright`, servir en puerto 8089 y ejecutar `python qa_navigation.py`. La variable opcional `GAMAN_QA_URL` permite validar la publicación. Las capturas quedan en `qa-artifacts/` (ignorado por Git).

El selector de escenarios (respuestas parciales o con error) se muestra agregando `?escenarios` a la URL del cotizador.

Portada (`index.html`): ingreso con usuario y contraseña deshabilitado hasta la etapa de plataforma, y elección de perfil para la demo: productor (cotizador, cartera, ficha de cliente), organizador (solo los productores de su organización) o equipo Gaman (toda la red). El perfil se guarda en el navegador y define el menú. `red.html` es el panel de red, `productor.html` y `cliente.html` las fichas. La red es ficticia y determinística (`network.mjs`): 2.140 productores, 40 PEG, 26 InHouse, 24 socios federales y 58 organizadores.

Cotizador (`cotizador.html`): la patente se formatea al escribir y busca sola al completarse (ejemplos AB123CD, ABC123, AD456FG; cualquier otra patente válida devuelve un vehículo simulado coherente con su año); catálogo ficticio año → marca → modelo → versión con valor de referencia (`vehicles.mjs`); uso Particular y vigencia desde hoy por defecto; código postal con localidad; GNC, rastreador, pago e IVA en Más opciones; el pie indica qué falta; borrador automático; resultados por cobertura o por compañía y aviso si se cambian datos después de cotizar. Planes, adicionales (alarma, grúa, ajuste automático, RC ampliada, países limítrofes, refacturación mensual/semestral, medio de pago) y desglose de precio (cuota, premio anual, prima de tarifa, pago contado, N° de cotización) siguen la estructura del contrato de cotización de Federación Patronal 2.1.1; los valores son ficticios. Tests: `node --test vehicles.test.mjs features.test.mjs`.

Recorrido anterior del cotizador: cargar ejemplo completo o consultar una patente ficticia (AB123CD / ABC123), completar el riesgo, elegir compañías y escenario, simular resultados, seleccionar hasta tres ofertas, comparar y preparar una propuesta imprimible/PDF. El historial permite retomar borradores y cambiar estados de seguimiento. Los datos se guardan solo en localStorage de cada navegador y pueden borrarse desde la pantalla.

Todos los precios, compañías, patentes y coberturas son ficticios. No hay consultas a proveedores, envío de propuestas, emisión, autenticación ni sincronización entre usuarios. Usar únicamente datos de ejemplo. Los ramos adicionales y las funcionalidades futuras están identificados como propuestas. Las ofertas de ejemplo no son equivalentes por el solo nombre del plan.

Cartera: `cartera.html` permite importar XLSX/XLS/CSV localmente (2 MB, 500 filas, encabezados en primera fila), elegir hoja, mapear columnas y confirmar solo filas válidas. Duplicados por compañía + ramo + póliza no se sobrescriben. Las fechas aceptan AAAA-MM-DD o DD/MM/AAAA. Incluye ficha, vencimientos, tareas y registro local de movimientos. No constituye un sistema de gestión con usuarios, respaldos o permisos; usar datos ficticios o anonimizados. Las fórmulas se leen por el valor guardado y no se recalculan. La situación de vencimiento no informa pago ni confirma renovación.

La lectura se realiza con SheetJS CE 0.20.3, conservado en `vendor/` con su licencia, descargado de https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. No se envían los archivos a un servidor. Pruebas de importación y fechas: `node --test portfolio.test.mjs`.

Para desarrollar: servir esta carpeta por HTTP, por ejemplo `python -m http.server 8080`. Abrir http://127.0.0.1:8080. Comprobaciones de lógica: `node --test features.test.mjs`.

Definición funcional confirmada: en la futura plataforma la fuente principal de cartera serán las compañías con el acceso de organizador de Gaman; cada productor verá exclusivamente sus pólizas y asegurados. El importador de esta demo es una herramienta auxiliar y no implementa esa sincronización ni aislamiento multiusuario.
