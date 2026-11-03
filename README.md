# Demo conceptual del multicotizador Gaman

Sitio: https://patriagrande-tech.github.io/gaman-multicotizador-demo/

Recorrido: cargar ejemplo completo o consultar una patente ficticia (AB123CD / ABC123), completar el riesgo, elegir compañías y escenario, simular resultados, seleccionar hasta tres ofertas, comparar y preparar una propuesta imprimible/PDF. El historial permite retomar borradores y cambiar estados de seguimiento. Los datos se guardan solo en localStorage de cada navegador y pueden borrarse desde la pantalla.

Todos los precios, compañías, patentes y coberturas son ficticios. No hay consultas a proveedores, envío de propuestas, emisión, autenticación ni sincronización entre usuarios. Usar únicamente datos de ejemplo. Los ramos adicionales y las funcionalidades futuras están identificados como propuestas. Las ofertas de ejemplo no son equivalentes por el solo nombre del plan.

Cartera: `cartera.html` permite importar XLSX/XLS/CSV localmente (2 MB, 500 filas, encabezados en primera fila), elegir hoja, mapear columnas y confirmar solo filas válidas. Duplicados por compañía + ramo + póliza no se sobrescriben. Las fechas aceptan AAAA-MM-DD o DD/MM/AAAA. Incluye ficha, vencimientos, tareas y registro local de movimientos. No constituye un sistema de gestión con usuarios, respaldos o permisos; usar datos ficticios o anonimizados. Las fórmulas se leen por el valor guardado y no se recalculan. La situación de vencimiento no informa pago ni confirma renovación.

La lectura se realiza con SheetJS CE 0.20.3, conservado en `vendor/` con su licencia, descargado de https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. No se envían los archivos a un servidor. Pruebas de importación y fechas: `node --test portfolio.test.mjs`.

Para desarrollar: servir esta carpeta por HTTP, por ejemplo `python -m http.server 8080`. Abrir http://127.0.0.1:8080. Comprobaciones de lógica: `node --test features.test.mjs`.
