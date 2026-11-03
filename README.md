# Demo conceptual del multicotizador Gaman

Sitio: https://patriagrande-tech.github.io/gaman-multicotizador-demo/

Recorrido: cargar ejemplo completo o consultar una patente ficticia (AB123CD / ABC123), completar el riesgo, elegir compañías y escenario, simular resultados, seleccionar hasta tres ofertas, comparar y preparar una propuesta imprimible/PDF. El historial permite retomar borradores y cambiar estados de seguimiento. Los datos se guardan solo en localStorage de cada navegador y pueden borrarse desde la pantalla.

Todos los precios, compañías, patentes y coberturas son ficticios. No hay consultas a proveedores, envío de propuestas, emisión, autenticación ni sincronización entre usuarios. Usar únicamente datos de ejemplo. Los ramos adicionales y las funcionalidades futuras están identificados como propuestas. Las ofertas de ejemplo no son equivalentes por el solo nombre del plan.

Para desarrollar: servir esta carpeta por HTTP, por ejemplo `python -m http.server 8080`. Abrir http://127.0.0.1:8080. Comprobaciones de lógica: `node --test features.test.mjs`.
