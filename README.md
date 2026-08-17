# Solicitudes de papelería

Aplicación web (sin servidor) para el seguimiento de solicitudes quincenales de
material de papelería, con tres roles: **Maestra**, **Coordinadora** y **Administradora**.

## Flujo de trabajo

1. **Maestras**: cada una captura su solicitud quincenal por sección (cantidades
   sobre el catálogo fijo de materiales). Puede editarla mientras no sea autorizada.
2. **Coordinadora**: revisa cada solicitud, la **autoriza** (puede ajustar cantidades)
   y luego **concentra todas las solicitudes autorizadas de la quincena en un solo
   pedido** para enviarlo a la administradora.
3. **Administradora**: ve el pedido consolidado (total por artículo, para comprar/
   preparar) y, cuando tiene todo listo, lo **entrega en bloque a la coordinadora**,
   generando una constancia de entrega.
4. **Coordinadora**: una vez que recibió el pedido completo de administración,
   **reparte a cada maestra** lo que le corresponde y genera su **recibo electrónico
   individual** (uno por sección).

Cada entrega (administración → coordinación, y coordinación → maestra) genera un
documento imprimible con folio, fecha y firmas, listo para "Guardar como PDF" desde
el diálogo de impresión del navegador — no depende de internet ni de librerías externas.

## Cómo usarla

Abre `index.html` en un navegador, o sube la carpeta tal cual a un hosting estático
(GitHub Pages, Netlify, Vercel, hosting compartido, etc.). Es solo HTML/CSS/JS, no
necesita instalación ni base de datos.

- **Soy Maestra**: elige tu sección, tu nombre y la quincena, y captura cantidades.
- **Soy Coordinadora**: entra con tu nombre y la clave de coordinadora (por defecto
  `coord123`). Autoriza solicitudes, envía el pedido consolidado y reparte recibos.
- **Soy Administradora**: entra con la clave de administradora (por defecto
  `admin123`). Ve los pedidos consolidados pendientes y confírmalos al entregarlos.

## Ajustes

Desde el panel de administradora → *Ajustes* puedes cambiar:
- Nombre del colegio (aparece en los documentos).
- Clave de acceso de administradora y de coordinadora.
- Lista de secciones (una por línea).

El catálogo de artículos de papelería está definido en [`js/data.js`](js/data.js)
si necesitas agregar o quitar materiales.

## Importante: dónde viven los datos

Esta app guarda todo en el **almacenamiento local del navegador** (localStorage)
del equipo donde se usa — no hay servidor ni base de datos compartida. Esto significa:

- Si maestras, coordinadora y administradora usan **el mismo equipo/navegador**
  (por ejemplo, una computadora en la dirección), todo funciona de forma automática
  y consolidada.
- Si usan **equipos distintos**, cada uno tendrá sus propios datos por separado.
  Para consolidarlos, usa *Ajustes → Exportar respaldo (.json)* en cada equipo y
  luego *Importar respaldo* en el equipo central — la importación fusiona los datos
  sin duplicar ni borrar lo existente.
- Se recomienda exportar un respaldo periódicamente (por quincena) por seguridad,
  ya que borrar el historial/caché del navegador borraría los datos guardados.

Si más adelante quieres que todos los equipos vean los mismos datos en tiempo real
automáticamente (sin exportar/importar), se necesitaría agregar una base de datos
en la nube (por ejemplo Firebase) — el código está organizado para poder añadir eso
después sin rehacer la interfaz.
