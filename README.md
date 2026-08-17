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

## Dónde viven los datos

Los datos se guardan en **Firebase Firestore** (base de datos en la nube), no en el
navegador de cada quien. Esto significa que maestras, coordinadora y administradora
ven los mismos datos en tiempo real, desde cualquier dispositivo (celular, tablet,
computadora), sin necesidad de exportar/importar nada.

La app se identifica ante Firebase con una sesión anónima automática (sin pedir
registro a las usuarias) y la configuración pública del proyecto vive en
[`js/firebase-config.js`](js/firebase-config.js) — esos valores no son secretos,
la seguridad real la dan las reglas de Firestore.

### Reglas de seguridad de Firestore

En Firebase Console → Firestore Database → pestaña "Reglas":

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Esto permite leer/escribir solo a quienes pasaron por la autenticación anónima de
la app (bloquea accesos directos a la base de datos desde fuera de la app).

### Respaldo

Desde *Ajustes → Exportar respaldo (.json)* puedes descargar una copia de todos los
datos en cualquier momento, por seguridad.
