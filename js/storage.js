// Capa de almacenamiento: guarda todo en localStorage del navegador.
//
// Flujo de datos:
//   1) Cada maestra crea una "solicitud" (request) por sección/quincena. status: 'pendiente'.
//   2) La coordinadora revisa y autoriza cada solicitud (puede ajustar cantidades).
//      status pasa a 'autorizada' y se guarda cantidadAutorizada por artículo.
//   3) La coordinadora concentra todas las solicitudes autorizadas de la quincena en
//      UN SOLO "pedido" (order) y lo envía a la administradora. status del pedido: 'enviado'.
//   4) La administradora prepara todo y lo entrega en bloque a la coordinadora.
//      status del pedido pasa a 'recibido'.
//   5) La coordinadora reparte a cada maestra lo correspondiente y genera su recibo
//      electrónico individual. La solicitud pasa a status 'entregada'.
//
// Estructura persistida bajo STORAGE_KEY:
// { settings, requests: [...], pedidos: [...], nextFolio, nextPedidoFolio }

const STORAGE_KEY = 'papeleria_app_v1';

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = { settings: { ...DEFAULT_SETTINGS }, requests: [], pedidos: [], nextFolio: 1, nextPedidoFolio: 1 };
    saveDB(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
    if (!parsed.settings.claveCoordinadora) parsed.settings.claveCoordinadora = DEFAULT_SETTINGS.claveCoordinadora;
    if (!parsed.requests) parsed.requests = [];
    if (!parsed.pedidos) parsed.pedidos = [];
    if (!parsed.nextFolio) parsed.nextFolio = 1;
    if (!parsed.nextPedidoFolio) parsed.nextPedidoFolio = 1;
    return parsed;
  } catch (e) {
    console.error('Datos corruptos en localStorage, reiniciando.', e);
    const initial = { settings: { ...DEFAULT_SETTINGS }, requests: [], pedidos: [], nextFolio: 1, nextPedidoFolio: 1 };
    saveDB(initial);
    return initial;
  }
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function getSettings() {
  return loadDB().settings;
}

function saveSettings(settings) {
  const db = loadDB();
  db.settings = settings;
  saveDB(db);
}

// ---------- Solicitudes (por maestra / sección / quincena) ----------

function getRequests() {
  return loadDB().requests;
}

function getRequest(id) {
  return getRequests().find(r => r.id === id) || null;
}

function saveRequest(request) {
  const db = loadDB();
  const idx = db.requests.findIndex(r => r.id === request.id);
  if (idx >= 0) db.requests[idx] = request; else db.requests.push(request);
  saveDB(db);
}

function genId(prefix) {
  return (prefix || 'r') + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nextFolio() {
  const db = loadDB();
  const folio = db.nextFolio || 1;
  db.nextFolio = folio + 1;
  saveDB(db);
  return folio;
}

function nextPedidoFolio() {
  const db = loadDB();
  const folio = db.nextPedidoFolio || 1;
  db.nextPedidoFolio = folio + 1;
  saveDB(db);
  return folio;
}

// ---------- Pedidos consolidados (coordinadora -> administradora) ----------

function getPedidos() {
  return loadDB().pedidos;
}

function getPedido(id) {
  return getPedidos().find(p => p.id === id) || null;
}

function savePedido(pedido) {
  const db = loadDB();
  const idx = db.pedidos.findIndex(p => p.id === pedido.id);
  if (idx >= 0) db.pedidos[idx] = pedido; else db.pedidos.push(pedido);
  saveDB(db);
}

// Solicitudes autorizadas de una quincena que todavía no forman parte de ningún pedido.
function solicitudesListasParaPedido(quincena) {
  return getRequests().filter(r => r.quincena === quincena && r.status === 'autorizada' && !r.pedidoId);
}

// Concentra en UN SOLO pedido (por quincena) todas las solicitudes autorizadas pendientes
// de envío. Si ya existe un pedido abierto (status 'enviado') para esa quincena, se le
// agregan las nuevas solicitudes autorizadas en vez de crear uno nuevo.
function enviarPedidoConsolidado(quincena, coordinadoraNombre) {
  const pendientes = solicitudesListasParaPedido(quincena);
  if (pendientes.length === 0) return null;

  const db = loadDB();
  const now = Date.now();
  let pedido = db.pedidos.find(p => p.quincena === quincena && p.status === 'enviado');

  if (!pedido) {
    pedido = {
      id: genId('p'),
      folio: nextPedidoFolio(),
      quincena,
      requestIds: [],
      status: 'enviado',
      createdAt: now,
      createdBy: coordinadoraNombre,
      sentAt: now,
      updatedAt: now,
    };
  }

  pendientes.forEach(r => {
    r.pedidoId = pedido.id;
    r.updatedAt = now;
    saveRequest(r);
    pedido.requestIds.push(r.id);
  });
  pedido.updatedAt = now;

  savePedido(pedido);
  return pedido;
}

function getRequestsByPedido(pedidoId) {
  return getRequests().filter(r => r.pedidoId === pedidoId);
}

// Totales consolidados (por artículo) de un pedido, según lo autorizado por la coordinadora.
function pedidoTotales(pedido) {
  const totales = {};
  getRequestsByPedido(pedido.id).forEach(r => {
    r.items.forEach(it => {
      const cant = it.cantidadAutorizada != null ? it.cantidadAutorizada : it.cantidad;
      totales[it.materialId] = (totales[it.materialId] || 0) + cant;
    });
  });
  return totales;
}

function pedidosPorEstatus(status) {
  return getPedidos().filter(p => p.status === status).sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---------- Quincenas ----------

function quincenaActual(date) {
  const d = date || new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mitad = d.getDate() <= 15 ? '1ra' : '2da';
  return `${mitad} quincena de ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function listaQuincenasDisponibles() {
  const requests = getRequests();
  const set = new Set(requests.map(r => r.quincena));
  set.add(quincenaActual());
  return Array.from(set).sort().reverse();
}

// ---------- Respaldo ----------

function exportarJSON() {
  const db = loadDB();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `respaldo_papeleria_${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importarJSON(fileContent) {
  const incoming = JSON.parse(fileContent);
  const db = loadDB();

  if (incoming.settings) db.settings = { ...db.settings, ...incoming.settings };

  let agregadas = 0, actualizadas = 0;
  (incoming.requests || []).forEach(incReq => {
    const idx = db.requests.findIndex(r => r.id === incReq.id);
    if (idx >= 0) {
      if ((incReq.updatedAt || 0) > (db.requests[idx].updatedAt || 0)) { db.requests[idx] = incReq; actualizadas++; }
    } else {
      db.requests.push(incReq); agregadas++;
    }
  });

  let pedidosAgregados = 0, pedidosActualizados = 0;
  (incoming.pedidos || []).forEach(incPed => {
    const idx = db.pedidos.findIndex(p => p.id === incPed.id);
    if (idx >= 0) {
      if ((incPed.updatedAt || 0) > (db.pedidos[idx].updatedAt || 0)) { db.pedidos[idx] = incPed; pedidosActualizados++; }
    } else {
      db.pedidos.push(incPed); pedidosAgregados++;
    }
  });

  if (incoming.nextFolio && incoming.nextFolio > (db.nextFolio || 1)) db.nextFolio = incoming.nextFolio;
  if (incoming.nextPedidoFolio && incoming.nextPedidoFolio > (db.nextPedidoFolio || 1)) db.nextPedidoFolio = incoming.nextPedidoFolio;

  saveDB(db);
  return { agregadas, actualizadas, pedidosAgregados, pedidosActualizados, total: db.requests.length };
}
