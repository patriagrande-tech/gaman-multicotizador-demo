# Demo conceptual del multicotizador Gaman

Alcance actualizado: propuesta de plataforma para 4.000 productores, cuentas individuales, permisos, cartera central y cotizador. Ver `plataforma.html`. Estos componentes centrales son objetivos de implementación: esta demo estática no autentica usuarios, no comparte datos entre dispositivos ni acredita capacidad para 4.000 cuentas. El plan técnico rector vive en el repositorio privado `gaman-multicotizador/docs/proyecto-plataforma.md`.

Sitio: https://patriagrande-tech.github.io/gaman-multicotizador-demo/

La navegación de las tres pantallas se genera desde `build_navigation.py`: ejecutar `python build_navigation.py` al cambiar destinos. El HTML generado funciona sin depender de JavaScript para navegar. Validación de destinos, anclas y menú móvil: `python -m unittest test_navigation -v`.

Recorrido: cargar ejemplo completo o consultar una patente ficticia (AB123CD / ABC123), completar el riesgo, elegir compañías y escenario, simular resultados, seleccionar hasta tres ofertas, comparar y preparar una propuesta imprimible/PDF. El historial permite retomar borradores y cambiar estados de seguimiento. Los datos se guardan solo en localStorage de cada navegador y pueden borrarse desde la pantalla.

Todos los precios, compañías, patentes y coberturas son ficticios. No hay consultas a proveedores, envío de propuestas, emisión, autenticación ni sincronización entre usuarios. Usar únicamente datos de ejemplo. Los ramos adicionales y las funcionalidades futuras están identificados como propuestas. Las ofertas de ejemplo no son equivalentes por el solo nombre del plan.

Cartera: `cartera.html` permite importar XLSX/XLS/CSV localmente (2 MB, 500 filas, encabezados en primera fila), elegir hoja, mapear columnas y confirmar solo filas válidas. Duplicados por compañía + ramo + póliza no se sobrescriben. Las fechas aceptan AAAA-MM-DD o DD/MM/AAAA. Incluye ficha, vencimientos, tareas y registro local de movimientos. No constituye un sistema de gestión con usuarios, respaldos o permisos; usar datos ficticios o anonimizados. Las fórmulas se leen por el valor guardado y no se recalculan. La situación de vencimiento no informa pago ni confirma renovación.

La lectura se realiza con SheetJS CE 0.20.3, conservado en `vendor/` con su licencia, descargado de https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. No se envían los archivos a un servidor. Pruebas de importación y fechas: `node --test portfolio.test.mjs`.

Para desarrollar: servir esta carpeta por HTTP, por ejemplo `python -m http.server 8080`. Abrir http://127.0.0.1:8080. Comprobaciones de lógica: `node --test features.test.mjs`.

Definición funcional confirmada: en la futura plataforma la fuente principal de cartera serán las compañías con el acceso de organizador de Gaman; cada productor verá exclusivamente sus pólizas y asegurados. El importador de esta demo es una herramienta auxiliar y no implementa esa sincronización ni aislamiento multiusuario.
