// Generación de documentos imprimibles (recibo de maestra y constancia de pedido).
// Se guardan como PDF usando la opción "Guardar como PDF" del diálogo de impresión
// del navegador — no dependen de librerías externas.

function folioFormateado(folio) {
  return 'REC-' + String(folio).padStart(5, '0');
}

function folioPedidoFormateado(folio) {
  return 'PED-' + String(folio).padStart(5, '0');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str == null ? '' : str);
  return div.innerHTML;
}

function plantillaDocumento({ titulo, colegio, folioTexto, datos, filas, firmaIzq, firmaDer, pieExtra }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(folioTexto)} - ${escapeHtml(titulo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitulo { color: #555; margin: 0 0 24px; font-size: 14px; }
  .encabezado { display: flex; justify-content: space-between; border-bottom: 2px solid #2c3e50; padding-bottom: 16px; margin-bottom: 20px; }
  .folio { text-align: right; }
  .folio strong { font-size: 18px; color: #2c3e50; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 24px; font-size: 14px; }
  .datos div span.etiqueta { display: block; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: .03em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 14px; }
  th { text-align: left; background: #2c3e50; color: #fff; padding: 8px 10px; font-size: 12px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; }
  .centro { text-align: center; }
  .firmas { display: flex; justify-content: space-between; margin-top: 56px; }
  .firma { width: 45%; text-align: center; }
  .linea { border-top: 1px solid #333; margin-bottom: 6px; padding-top: 6px; font-size: 13px; }
  .pie { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="encabezado">
    <div>
      <h1>${escapeHtml(colegio)}</h1>
      <p class="subtitulo">${escapeHtml(titulo)}</p>
    </div>
    <div class="folio">
      <span>Folio</span><br>
      <strong>${escapeHtml(folioTexto)}</strong>
    </div>
  </div>

  <div class="datos">${datos}</div>

  <table>
    <thead><tr><th>Artículo</th><th class="centro">Cantidad</th><th class="centro">Unidad</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="3" class="centro">Sin artículos</td></tr>'}</tbody>
  </table>

  <div class="firmas">
    <div class="firma"><div class="linea">${firmaIzq.nombre}</div>${firmaIzq.rol}</div>
    <div class="firma"><div class="linea">${firmaDer.nombre}</div>${firmaDer.rol}</div>
  </div>

  ${pieExtra || ''}
  <p class="pie">Generado el ${new Date().toLocaleString('es-MX')}</p>
</body>
</html>`;
}

function filasDeItems(items, campoCantidad) {
  return items
    .filter(it => (it[campoCantidad] || 0) > 0)
    .map(it => {
      const mat = MATERIALS.find(m => m.id === it.materialId);
      const nombre = mat ? mat.nombre : it.materialId;
      const unidad = mat ? mat.unidad : '';
      return `<tr><td>${escapeHtml(nombre)}</td><td class="centro">${it[campoCantidad]}</td><td class="centro">${escapeHtml(unidad)}</td></tr>`;
    }).join('');
}

// Recibo individual: coordinadora entrega a una maestra.
function construirReciboHTML(request, colegio) {
  const fecha = new Date(request.deliveredAt);
  const fechaStr = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const datos = `
    <div><span class="etiqueta">Sección</span>${escapeHtml(request.sectionName)}</div>
    <div><span class="etiqueta">Quincena</span>${escapeHtml(request.quincena)}</div>
    <div><span class="etiqueta">Fecha de entrega</span>${fechaStr} - ${horaStr}</div>
    <div><span class="etiqueta">Entregado por</span>${escapeHtml(request.deliveredBy || '')}</div>`;

  return plantillaDocumento({
    titulo: 'Recibo de entrega de material de papelería',
    colegio,
    folioTexto: folioFormateado(request.receiptFolio),
    datos,
    filas: filasDeItems(request.items, 'cantidadEntregada'),
    firmaIzq: { nombre: escapeHtml(request.deliveredBy || ''), rol: 'Entregó (Coordinación)' },
    firmaDer: { nombre: escapeHtml(request.receivedBy || request.teacherName || ''), rol: 'Recibió (Maestra)' },
  });
}

// Constancia de pedido consolidado: administradora entrega en bloque a la coordinadora.
function construirConstanciaPedidoHTML(pedido, colegio) {
  const fecha = new Date(pedido.receivedAt);
  const fechaStr = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const solicitudes = getRequestsByPedido(pedido.id);
  const secciones = solicitudes.map(r => escapeHtml(r.sectionName)).sort().join(', ');
  const totales = pedidoTotales(pedido);
  const filas = MATERIALS
    .filter(m => totales[m.id] > 0)
    .map(m => `<tr><td>${escapeHtml(m.nombre)}</td><td class="centro">${totales[m.id]}</td><td class="centro">${escapeHtml(m.unidad)}</td></tr>`)
    .join('');

  const datos = `
    <div><span class="etiqueta">Quincena</span>${escapeHtml(pedido.quincena)}</div>
    <div><span class="etiqueta">Secciones incluidas</span>${solicitudes.length}</div>
    <div><span class="etiqueta">Fecha de entrega</span>${fechaStr} - ${horaStr}</div>
    <div><span class="etiqueta">Entregado por</span>${escapeHtml(pedido.deliveredByAdmin || '')}</div>`;

  return plantillaDocumento({
    titulo: 'Constancia de entrega de pedido consolidado',
    colegio,
    folioTexto: folioPedidoFormateado(pedido.folio),
    datos,
    filas,
    firmaIzq: { nombre: escapeHtml(pedido.deliveredByAdmin || ''), rol: 'Entregó (Administración)' },
    firmaDer: { nombre: escapeHtml(pedido.receivedBy || ''), rol: 'Recibió (Coordinación)' },
    pieExtra: `<p class="ayuda-pie" style="font-size:12px;color:#777;">Secciones incluidas en este pedido: ${secciones || '—'}</p>`,
  });
}

function abrirParaImprimir(html) {
  const ventana = window.open('', '_blank');
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para generar el documento.');
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.onload = () => { ventana.focus(); ventana.print(); };
}

function abrirReciboParaImprimir(request, colegio) {
  abrirParaImprimir(construirReciboHTML(request, colegio));
}

function abrirConstanciaPedidoParaImprimir(pedido, colegio) {
  abrirParaImprimir(construirConstanciaPedidoHTML(pedido, colegio));
}
