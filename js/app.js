// Controlador principal de la aplicación (SPA sin frameworks).
//
// Flujo: Maestra solicita -> Coordinadora autoriza y concentra en un solo pedido ->
// Administradora entrega el pedido en bloque a la Coordinadora -> Coordinadora
// reparte a cada maestra generando su recibo electrónico.

const state = {
  view: 'role',
  sectionName: null,
  teacherName: '',
  quincena: null,
  editingRequestId: null,
  coordNombre: '',
  coordQuincena: null,
  coordRequestId: null,
  adminPedidoId: null,
};

const appEl = document.getElementById('app');
const backBtn = document.getElementById('backBtn');

function irA(view, extra) {
  state.view = view;
  Object.assign(state, extra || {});
  render();
  window.scrollTo(0, 0);
}

backBtn.addEventListener('click', () => {
  const rutaAtras = {
    teacherSetup: 'role',
    teacherForm: 'teacherSetup',
    coordLogin: 'role',
    coordDashboard: 'coordLogin',
    coordReview: 'coordDashboard',
    coordDeliver: 'coordDashboard',
    coordHistory: 'coordDashboard',
    adminLogin: 'role',
    adminDashboard: 'adminLogin',
    adminPedidoDetail: 'adminDashboard',
    adminHistory: 'adminDashboard',
    settings: 'adminDashboard',
  };
  irA(rutaAtras[state.view] || 'role');
});

function render() {
  backBtn.classList.toggle('oculto', state.view === 'role');
  switch (state.view) {
    case 'role': return renderRole();
    case 'teacherSetup': return renderTeacherSetup();
    case 'teacherForm': return renderTeacherForm();
    case 'coordLogin': return renderCoordLogin();
    case 'coordDashboard': return renderCoordDashboard();
    case 'coordReview': return renderCoordReview();
    case 'coordDeliver': return renderCoordDeliver();
    case 'coordHistory': return renderCoordHistory();
    case 'adminLogin': return renderAdminLogin();
    case 'adminDashboard': return renderAdminDashboard();
    case 'adminPedidoDetail': return renderAdminPedidoDetail();
    case 'adminHistory': return renderAdminHistory();
    case 'settings': return renderSettings();
    default: return renderRole();
  }
}

function badgeSolicitud(status) {
  if (status === 'entregada') return '<span class="badge entregado">Entregada</span>';
  if (status === 'autorizada') return '<span class="badge autorizada">Autorizada</span>';
  return '<span class="badge pendiente">Pendiente</span>';
}

function badgePedido(status) {
  return status === 'recibido'
    ? '<span class="badge entregado">Recibido de admin.</span>'
    : '<span class="badge autorizada">Enviado a admin.</span>';
}

// ---------- Vista: selección de rol ----------
function renderRole() {
  appEl.innerHTML = `
    <div class="tarjeta centro">
      <h1>Solicitudes de papelería</h1>
      <p class="ayuda">Selecciona tu rol para continuar</p>
      <div class="col gap">
        <button class="btn grande" id="btnMaestra">Soy Maestra</button>
        <button class="btn grande secundario" id="btnCoord">Soy Coordinadora</button>
        <button class="btn grande secundario" id="btnAdmin">Soy Administradora</button>
      </div>
    </div>`;
  document.getElementById('btnMaestra').onclick = () => irA('teacherSetup');
  document.getElementById('btnCoord').onclick = () => irA('coordLogin');
  document.getElementById('btnAdmin').onclick = () => irA('adminLogin');
}

// ================= MAESTRA =================

function renderTeacherSetup() {
  const settings = getSettings();
  const opciones = settings.sections.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>Datos de la solicitud</h2>
      <label>Sección
        <select id="selSeccion">${opciones}</select>
      </label>
      <label>Tu nombre
        <input type="text" id="inpNombre" placeholder="Nombre de la maestra" value="${escapeHtml(state.teacherName || '')}">
      </label>
      <label>Quincena
        <input type="text" id="inpQuincena" value="${escapeHtml(quincenaActual())}">
      </label>
      <button class="btn grande" id="btnContinuar" style="margin-top:16px;">Continuar</button>
    </div>`;

  document.getElementById('btnContinuar').onclick = () => {
    const sectionName = document.getElementById('selSeccion').value;
    const teacherName = document.getElementById('inpNombre').value.trim();
    const quincena = document.getElementById('inpQuincena').value.trim();
    if (!teacherName) { alert('Escribe tu nombre.'); return; }
    if (!quincena) { alert('Escribe la quincena.'); return; }

    const existente = getRequests().find(r => r.sectionName === sectionName && r.quincena === quincena);
    irA('teacherForm', {
      sectionName, teacherName, quincena,
      editingRequestId: existente ? existente.id : null,
    });
  };
}

function renderTeacherForm() {
  const existente = state.editingRequestId ? getRequest(state.editingRequestId) : null;
  const editable = !existente || existente.status === 'pendiente';

  const cantidadesPrevias = {};
  if (existente) existente.items.forEach(it => { cantidadesPrevias[it.materialId] = it.cantidad; });

  const filas = MATERIALS.map(m => `
    <tr>
      <td>${escapeHtml(m.nombre)}</td>
      <td class="centro">${escapeHtml(m.unidad)}</td>
      <td class="centro">
        <input type="number" min="0" step="1" class="inputCantidad" data-id="${m.id}"
          value="${cantidadesPrevias[m.id] || 0}" ${editable ? '' : 'disabled'}>
      </td>
    </tr>`).join('');

  let aviso = '';
  if (existente && existente.status === 'pendiente') {
    aviso = '<p class="aviso aviso-info">Ya existe una solicitud para esta sección y quincena. Puedes editarla mientras la coordinadora no la autorice.</p>';
  } else if (existente && existente.status === 'autorizada') {
    aviso = '<p class="aviso">La coordinadora ya autorizó esta solicitud y está integrada en el pedido a administración. Ya no se puede editar.</p>';
  } else if (existente && existente.status === 'entregada') {
    aviso = `<p class="aviso aviso-ok">Esta solicitud ya fue entregada por ${escapeHtml(existente.deliveredBy || 'la coordinadora')}. Folio ${folioFormateado(existente.receiptFolio)}.</p>`;
  }

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>${escapeHtml(state.sectionName)} — ${escapeHtml(state.quincena)}</h2>
      <p class="ayuda">Maestra: ${escapeHtml(state.teacherName)} ${existente ? badgeSolicitud(existente.status) : ''}</p>
      ${aviso}
      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Artículo</th><th>Unidad</th><th>Cantidad</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <label>Notas (opcional)
        <textarea id="inpNotas" ${editable ? '' : 'disabled'}>${escapeHtml((existente && existente.notas) || '')}</textarea>
      </label>
      ${editable ? `<button class="btn grande" id="btnEnviar" style="margin-top:16px;">${existente ? 'Actualizar solicitud' : 'Enviar solicitud'}</button>` : ''}
    </div>`;

  if (editable) {
    document.getElementById('btnEnviar').onclick = () => {
      const items = Array.from(document.querySelectorAll('.inputCantidad'))
        .map(inp => ({ materialId: inp.dataset.id, cantidad: parseInt(inp.value, 10) || 0 }))
        .filter(it => it.cantidad > 0);

      if (items.length === 0) { alert('Agrega al menos un artículo con cantidad mayor a 0.'); return; }

      const now = Date.now();
      const request = existente || {
        id: genId('r'),
        sectionName: state.sectionName,
        quincena: state.quincena,
        status: 'pendiente',
        createdAt: now,
        pedidoId: null,
        receiptFolio: null,
      };
      request.teacherName = state.teacherName;
      request.items = items;
      request.notas = document.getElementById('inpNotas').value.trim();
      request.updatedAt = now;

      saveRequest(request);
      irA('teacherForm', { editingRequestId: request.id, sectionName: request.sectionName, quincena: request.quincena, teacherName: request.teacherName });
      alert('Solicitud guardada correctamente.');
    };
  }
}

// ================= COORDINADORA =================

function renderCoordLogin() {
  appEl.innerHTML = `
    <div class="tarjeta centro">
      <h2>Acceso de coordinadora</h2>
      <label>Tu nombre
        <input type="text" id="inpNombreCoord" placeholder="Nombre de la coordinadora" value="${escapeHtml(state.coordNombre || '')}">
      </label>
      <label>Clave de acceso
        <input type="password" id="inpClave" placeholder="Clave">
      </label>
      <button class="btn grande" id="btnEntrar" style="margin-top:16px;">Entrar</button>
    </div>`;

  const intentar = () => {
    const nombre = document.getElementById('inpNombreCoord').value.trim();
    const clave = document.getElementById('inpClave').value;
    if (!nombre) { alert('Escribe tu nombre.'); return; }
    if (clave === getSettings().claveCoordinadora) {
      irA('coordDashboard', { coordNombre: nombre, coordQuincena: quincenaActual() });
    } else {
      alert('Clave incorrecta.');
    }
  };
  document.getElementById('btnEntrar').onclick = intentar;
  document.getElementById('inpClave').addEventListener('keydown', e => { if (e.key === 'Enter') intentar(); });
}

function renderCoordDashboard() {
  const quincenas = listaQuincenasDisponibles();
  if (!state.coordQuincena) state.coordQuincena = quincenas[0];
  const quincenaSel = state.coordQuincena;

  const todas = getRequests().filter(r => r.quincena === quincenaSel);
  const pendientes = todas.filter(r => r.status === 'pendiente');
  const listasParaPedido = solicitudesListasParaPedido(quincenaSel);

  const filasSolicitudes = todas
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName))
    .map(r => `<tr>
      <td>${escapeHtml(r.sectionName)}</td>
      <td>${escapeHtml(r.teacherName)}</td>
      <td class="centro">${r.items.length}</td>
      <td class="centro">${badgeSolicitud(r.status)}</td>
      <td class="centro"><button class="btn chico" data-req="${r.id}">${r.status === 'pendiente' ? 'Revisar' : 'Ver'}</button></td>
    </tr>`).join('');

  const pedidosQuincena = getPedidos().filter(p => p.quincena === quincenaSel).sort((a, b) => b.folio - a.folio);
  const filasPedidos = pedidosQuincena.map(p => {
    const pendientesEntrega = getRequestsByPedido(p.id).filter(r => r.status === 'autorizada').length;
    return `<tr>
      <td>${folioPedidoFormateado(p.folio)}</td>
      <td class="centro">${getRequestsByPedido(p.id).length}</td>
      <td class="centro">${badgePedido(p.status)}</td>
      <td class="centro">${p.status === 'recibido' ? (pendientesEntrega + ' por repartir') : '—'}</td>
    </tr>`;
  }).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <div class="fila-entre">
        <h2>Panel de coordinación</h2>
        <button class="btn chico secundario" id="btnHistorial">Historial de recibos</button>
      </div>
      <p class="ayuda">Coordinadora: ${escapeHtml(state.coordNombre)}</p>

      <label>Quincena
        <select id="selQuincena">
          ${quincenas.map(q => `<option value="${escapeHtml(q)}" ${q === quincenaSel ? 'selected' : ''}>${escapeHtml(q)}</option>`).join('')}
        </select>
      </label>

      <h3>Solicitudes de las maestras</h3>
      ${pendientes.length ? `<p class="aviso aviso-info">${pendientes.length} solicitud(es) esperando revisión y autorización.</p>` : ''}
      ${filasSolicitudes ? `
        <div class="tabla-scroll">
          <table>
            <thead><tr><th>Sección</th><th>Maestra</th><th>Artículos</th><th>Estatus</th><th></th></tr></thead>
            <tbody>${filasSolicitudes}</tbody>
          </table>
        </div>` : '<p class="ayuda">Sin solicitudes registradas todavía.</p>'}

      <h3>Pedido consolidado a administración</h3>
      <p class="ayuda">Todas las solicitudes autorizadas de la quincena se concentran en un solo pedido para enviarlo a la administradora.</p>
      ${listasParaPedido.length ? `
        <button class="btn grande" id="btnEnviarPedido">Concentrar y enviar pedido (${listasParaPedido.length} sección/es autorizadas pendientes de envío)</button>
      ` : '<p class="ayuda">No hay solicitudes autorizadas pendientes de enviar.</p>'}

      ${filasPedidos ? `
        <div class="tabla-scroll" style="margin-top:16px;">
          <table>
            <thead><tr><th>Pedido</th><th class="centro">Secciones</th><th class="centro">Estatus</th><th class="centro">Por repartir</th></tr></thead>
            <tbody>${filasPedidos}</tbody>
          </table>
        </div>` : ''}
    </div>`;

  document.getElementById('selQuincena').onchange = (e) => irA('coordDashboard', { coordQuincena: e.target.value });
  document.getElementById('btnHistorial').onclick = () => irA('coordHistory');

  const btnEnviarPedido = document.getElementById('btnEnviarPedido');
  if (btnEnviarPedido) {
    btnEnviarPedido.onclick = () => {
      const pedido = enviarPedidoConsolidado(quincenaSel, state.coordNombre);
      if (pedido) {
        alert(`Pedido ${folioPedidoFormateado(pedido.folio)} enviado a administración con ${pedido.requestIds.length} sección(es).`);
        irA('coordDashboard', { coordQuincena: quincenaSel });
      }
    };
  }

  document.querySelectorAll('[data-req]').forEach(btn => {
    btn.onclick = () => {
      const req = getRequest(btn.dataset.req);
      if (req.status === 'pendiente') {
        irA('coordReview', { coordRequestId: req.id });
      } else if (req.status === 'autorizada') {
        const pedido = req.pedidoId ? getPedido(req.pedidoId) : null;
        if (pedido && pedido.status === 'recibido') {
          irA('coordDeliver', { coordRequestId: req.id });
        } else {
          alert('Esta solicitud ya está autorizada. Falta que administración entregue el pedido consolidado antes de poder repartirla a la maestra.');
        }
      } else {
        abrirReciboParaImprimir(req, getSettings().nombreColegio);
      }
    };
  });
}

function renderCoordReview() {
  const request = getRequest(state.coordRequestId);
  if (!request) { irA('coordDashboard'); return; }

  const filas = request.items.map(it => {
    const mat = MATERIALS.find(m => m.id === it.materialId);
    return `<tr>
      <td>${escapeHtml(mat ? mat.nombre : it.materialId)}</td>
      <td class="centro">${it.cantidad}</td>
      <td class="centro">
        <input type="number" min="0" step="1" class="inputAutorizada" data-id="${it.materialId}" value="${it.cantidad}">
      </td>
      <td class="centro">${escapeHtml(mat ? mat.unidad : '')}</td>
    </tr>`;
  }).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>${escapeHtml(request.sectionName)} — ${escapeHtml(request.quincena)}</h2>
      <p class="ayuda">Solicitado por: ${escapeHtml(request.teacherName)}${request.notas ? ' · Notas: ' + escapeHtml(request.notas) : ''}</p>

      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Artículo</th><th class="centro">Solicitado</th><th class="centro">A autorizar</th><th class="centro">Unidad</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <button class="btn grande" id="btnAutorizar">Autorizar solicitud</button>
    </div>`;

  document.getElementById('btnAutorizar').onclick = () => {
    request.items.forEach(it => {
      const input = document.querySelector(`.inputAutorizada[data-id="${it.materialId}"]`);
      it.cantidadAutorizada = parseInt(input.value, 10) || 0;
    });
    request.status = 'autorizada';
    request.authorizedAt = Date.now();
    request.authorizedBy = state.coordNombre;
    request.updatedAt = request.authorizedAt;
    saveRequest(request);
    irA('coordDashboard', { coordQuincena: request.quincena });
  };
}

function renderCoordDeliver() {
  const request = getRequest(state.coordRequestId);
  if (!request) { irA('coordDashboard'); return; }

  const filas = request.items.map(it => {
    const mat = MATERIALS.find(m => m.id === it.materialId);
    const autorizada = it.cantidadAutorizada != null ? it.cantidadAutorizada : it.cantidad;
    return `<tr>
      <td>${escapeHtml(mat ? mat.nombre : it.materialId)}</td>
      <td class="centro">${autorizada}</td>
      <td class="centro">
        <input type="number" min="0" step="1" class="inputEntregada" data-id="${it.materialId}" value="${autorizada}">
      </td>
      <td class="centro">${escapeHtml(mat ? mat.unidad : '')}</td>
    </tr>`;
  }).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>${escapeHtml(request.sectionName)} — ${escapeHtml(request.quincena)}</h2>
      <p class="ayuda">Solicitado por: ${escapeHtml(request.teacherName)}</p>

      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Artículo</th><th class="centro">Autorizado</th><th class="centro">A entregar</th><th class="centro">Unidad</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <label>Entregado por (coordinadora)
        <input type="text" id="inpEntregadoPor" value="${escapeHtml(state.coordNombre)}">
      </label>
      <label>Recibido por (maestra)
        <input type="text" id="inpRecibidoPor" value="${escapeHtml(request.teacherName)}">
      </label>
      <button class="btn grande" id="btnEntregar" style="margin-top:8px;">Confirmar entrega y generar recibo</button>
    </div>`;

  document.getElementById('btnEntregar').onclick = () => {
    const entregadoPor = document.getElementById('inpEntregadoPor').value.trim();
    const recibidoPor = document.getElementById('inpRecibidoPor').value.trim();
    if (!entregadoPor) { alert('Escribe el nombre de quien entrega.'); return; }
    if (!recibidoPor) { alert('Escribe el nombre de quien recibe.'); return; }

    request.items.forEach(it => {
      const input = document.querySelector(`.inputEntregada[data-id="${it.materialId}"]`);
      it.cantidadEntregada = parseInt(input.value, 10) || 0;
    });
    request.status = 'entregada';
    request.deliveredAt = Date.now();
    request.updatedAt = request.deliveredAt;
    request.deliveredBy = entregadoPor;
    request.receivedBy = recibidoPor;
    request.receiptFolio = nextFolio();

    saveRequest(request);
    abrirReciboParaImprimir(request, getSettings().nombreColegio);
    irA('coordDashboard', { coordQuincena: request.quincena });
  };
}

function renderCoordHistory() {
  const entregadas = getRequests()
    .filter(r => r.status === 'entregada')
    .sort((a, b) => b.deliveredAt - a.deliveredAt);

  const filas = entregadas.map(r => `
    <tr>
      <td>${folioFormateado(r.receiptFolio)}</td>
      <td>${escapeHtml(r.sectionName)}</td>
      <td>${escapeHtml(r.quincena)}</td>
      <td>${new Date(r.deliveredAt).toLocaleDateString('es-MX')}</td>
      <td class="centro"><button class="btn chico" data-id="${r.id}">Ver recibo</button></td>
    </tr>`).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>Historial de recibos entregados</h2>
      ${filas ? `
        <div class="tabla-scroll">
          <table>
            <thead><tr><th>Folio</th><th>Sección</th><th>Quincena</th><th>Fecha</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>` : '<p class="ayuda">Aún no se han repartido recibos.</p>'}
    </div>`;

  document.querySelectorAll('[data-id]').forEach(btn => {
    btn.onclick = () => abrirReciboParaImprimir(getRequest(btn.dataset.id), getSettings().nombreColegio);
  });
}

// ================= ADMINISTRADORA =================

function renderAdminLogin() {
  appEl.innerHTML = `
    <div class="tarjeta centro">
      <h2>Acceso de administradora</h2>
      <label>Clave de acceso
        <input type="password" id="inpClave" placeholder="Clave">
      </label>
      <button class="btn grande" id="btnEntrar" style="margin-top:16px;">Entrar</button>
    </div>`;

  const intentar = () => {
    const clave = document.getElementById('inpClave').value;
    if (clave === getSettings().claveAdmin) {
      irA('adminDashboard');
    } else {
      alert('Clave incorrecta.');
    }
  };
  document.getElementById('btnEntrar').onclick = intentar;
  document.getElementById('inpClave').addEventListener('keydown', e => { if (e.key === 'Enter') intentar(); });
}

function renderAdminDashboard() {
  const porEntregar = pedidosPorEstatus('enviado');

  const filas = porEntregar.map(p => {
    const totales = pedidoTotales(p);
    const numArticulos = Object.keys(totales).length;
    return `<tr>
      <td>${folioPedidoFormateado(p.folio)}</td>
      <td>${escapeHtml(p.quincena)}</td>
      <td class="centro">${getRequestsByPedido(p.id).length}</td>
      <td class="centro">${numArticulos}</td>
      <td>${escapeHtml(p.createdBy || '')}</td>
      <td class="centro"><button class="btn chico" data-id="${p.id}">Ver / Entregar</button></td>
    </tr>`;
  }).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <div class="fila-entre">
        <h2>Panel de administración</h2>
        <div class="row gap">
          <button class="btn chico secundario" id="btnHistorial">Historial</button>
          <button class="btn chico secundario" id="btnAjustes">Ajustes</button>
        </div>
      </div>

      <h3>Pedidos consolidados por entregar a coordinación</h3>
      ${filas ? `
        <div class="tabla-scroll">
          <table>
            <thead><tr><th>Pedido</th><th>Quincena</th><th class="centro">Secciones</th><th class="centro">Artículos</th><th>Enviado por</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>` : '<p class="ayuda">No hay pedidos pendientes de entrega. La coordinadora aún no ha enviado ninguno, o ya se entregaron todos.</p>'}
    </div>`;

  document.getElementById('btnHistorial').onclick = () => irA('adminHistory');
  document.getElementById('btnAjustes').onclick = () => irA('settings');
  document.querySelectorAll('[data-id]').forEach(btn => {
    btn.onclick = () => irA('adminPedidoDetail', { adminPedidoId: btn.dataset.id });
  });
}

function renderAdminPedidoDetail() {
  const pedido = getPedido(state.adminPedidoId);
  if (!pedido) { irA('adminDashboard'); return; }
  const yaEntregado = pedido.status === 'recibido';

  const totales = pedidoTotales(pedido);
  const filas = MATERIALS
    .filter(m => totales[m.id] > 0)
    .map(m => `<tr><td>${escapeHtml(m.nombre)}</td><td class="centro">${totales[m.id]}</td><td class="centro">${escapeHtml(m.unidad)}</td></tr>`)
    .join('');

  const solicitudes = getRequestsByPedido(pedido.id).sort((a, b) => a.sectionName.localeCompare(b.sectionName));
  const filasSecciones = solicitudes.map(r => `<tr><td>${escapeHtml(r.sectionName)}</td><td>${escapeHtml(r.teacherName)}</td></tr>`).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>${folioPedidoFormateado(pedido.folio)} — ${escapeHtml(pedido.quincena)}</h2>
      <p class="ayuda">Enviado por la coordinadora: ${escapeHtml(pedido.createdBy || '')}</p>

      <h3>Total consolidado a preparar</h3>
      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Artículo</th><th class="centro">Cantidad</th><th class="centro">Unidad</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <h3>Secciones incluidas (${solicitudes.length})</h3>
      <div class="tabla-scroll">
        <table>
          <thead><tr><th>Sección</th><th>Maestra</th></tr></thead>
          <tbody>${filasSecciones}</tbody>
        </table>
      </div>

      ${yaEntregado ? `
        <p class="aviso aviso-ok">Entregado el ${new Date(pedido.receivedAt).toLocaleString('es-MX')} por ${escapeHtml(pedido.deliveredByAdmin)} a ${escapeHtml(pedido.receivedBy)}.</p>
        <button class="btn grande" id="btnReimprimir">Volver a imprimir constancia</button>
      ` : `
        <label>Entregado por (administradora)
          <input type="text" id="inpEntregadoPor" placeholder="Tu nombre">
        </label>
        <label>Recibido por (coordinadora)
          <input type="text" id="inpRecibidoPor" value="${escapeHtml(pedido.createdBy || '')}">
        </label>
        <button class="btn grande" id="btnEntregar" style="margin-top:8px;">Confirmar entrega a coordinación</button>
      `}
    </div>`;

  if (yaEntregado) {
    document.getElementById('btnReimprimir').onclick = () => abrirConstanciaPedidoParaImprimir(pedido, getSettings().nombreColegio);
  } else {
    document.getElementById('btnEntregar').onclick = () => {
      const entregadoPor = document.getElementById('inpEntregadoPor').value.trim();
      const recibidoPor = document.getElementById('inpRecibidoPor').value.trim();
      if (!entregadoPor) { alert('Escribe el nombre de quien entrega.'); return; }
      if (!recibidoPor) { alert('Escribe el nombre de quien recibe.'); return; }

      pedido.status = 'recibido';
      pedido.receivedAt = Date.now();
      pedido.updatedAt = pedido.receivedAt;
      pedido.deliveredByAdmin = entregadoPor;
      pedido.receivedBy = recibidoPor;
      savePedido(pedido);

      abrirConstanciaPedidoParaImprimir(pedido, getSettings().nombreColegio);
      irA('adminDashboard');
    };
  }
}

function renderAdminHistory() {
  const entregados = pedidosPorEstatus('recibido');
  const filas = entregados.map(p => `
    <tr>
      <td>${folioPedidoFormateado(p.folio)}</td>
      <td>${escapeHtml(p.quincena)}</td>
      <td class="centro">${getRequestsByPedido(p.id).length}</td>
      <td>${new Date(p.receivedAt).toLocaleDateString('es-MX')}</td>
      <td class="centro"><button class="btn chico" data-id="${p.id}">Ver constancia</button></td>
    </tr>`).join('');

  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>Historial de pedidos entregados</h2>
      ${filas ? `
        <div class="tabla-scroll">
          <table>
            <thead><tr><th>Pedido</th><th>Quincena</th><th class="centro">Secciones</th><th>Fecha</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>` : '<p class="ayuda">Aún no se han registrado entregas.</p>'}
    </div>`;

  document.querySelectorAll('[data-id]').forEach(btn => {
    btn.onclick = () => abrirConstanciaPedidoParaImprimir(getPedido(btn.dataset.id), getSettings().nombreColegio);
  });
}

// ---------- Ajustes (administradora) ----------
function renderSettings() {
  const settings = getSettings();
  appEl.innerHTML = `
    <div class="tarjeta">
      <h2>Ajustes</h2>

      <label>Nombre del colegio
        <input type="text" id="inpColegio" value="${escapeHtml(settings.nombreColegio)}">
      </label>

      <label>Clave de acceso de administradora
        <input type="text" id="inpClaveAdmin" value="${escapeHtml(settings.claveAdmin)}">
      </label>

      <label>Clave de acceso de coordinadora
        <input type="text" id="inpClaveCoord" value="${escapeHtml(settings.claveCoordinadora)}">
      </label>

      <label>Secciones (una por línea)
        <textarea id="inpSecciones" rows="10">${escapeHtml(settings.sections.join('\n'))}</textarea>
      </label>

      <button class="btn grande" id="btnGuardarAjustes">Guardar ajustes</button>

      <hr class="separador">

      <h3>Respaldo de datos</h3>
      <p class="ayuda">Como la app guarda los datos en este navegador, exporta un respaldo periódicamente
        y si usas varios equipos, importa los archivos de cada uno para consolidarlos aquí.</p>
      <div class="row gap">
        <button class="btn secundario" id="btnExportar">Exportar respaldo (.json)</button>
        <label class="btn secundario archivo">
          Importar respaldo
          <input type="file" id="inpImportar" accept="application/json" style="display:none;">
        </label>
      </div>
    </div>`;

  document.getElementById('btnGuardarAjustes').onclick = () => {
    const nombreColegio = document.getElementById('inpColegio').value.trim() || 'Colegio';
    const claveAdmin = document.getElementById('inpClaveAdmin').value.trim() || settings.claveAdmin;
    const claveCoordinadora = document.getElementById('inpClaveCoord').value.trim() || settings.claveCoordinadora;
    const sections = document.getElementById('inpSecciones').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    saveSettings({ nombreColegio, claveAdmin, claveCoordinadora, sections: sections.length ? sections : settings.sections });
    alert('Ajustes guardados.');
  };

  document.getElementById('btnExportar').onclick = exportarJSON;
  document.getElementById('inpImportar').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const resultado = importarJSON(reader.result);
        alert(`Importación completa: ${resultado.agregadas} solicitudes nuevas, ${resultado.actualizadas} actualizadas; ${resultado.pedidosAgregados} pedidos nuevos, ${resultado.pedidosActualizados} actualizados.`);
        render();
      } catch (err) {
        alert('El archivo no es un respaldo válido.');
      }
    };
    reader.readAsText(file);
  };
}

render();
