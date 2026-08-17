// Capa de almacenamiento: Firestore compartido en la nube, con sincronización en
// tiempo real (todos los roles ven los mismos datos, en cualquier dispositivo).
//
// Colecciones:
//   config/settings   (doc único) { claveAdmin, claveCoordinadora, nombreColegio, sections }
//   config/counters   (doc único) { nextFolio, nextPedidoFolio }
//   requests          (una por solicitud de maestra)
//   pedidos           (uno por pedido consolidado enviado a administración)
//
// Flujo de datos:
//   1) Cada maestra crea una "solicitud" (request) por sección/quincena. status: 'pendiente'.
//   2) La coordinadora revisa y autoriza cada solicitud (puede ajustar cantidades).
//      status pasa a 'autorizada' y se guarda cantidadAutorizada por artículo.
//   3) La coordinadora concentra todas las solicitudes autorizadas de la quincena en
//      UN SOLO "pedido" y lo envía a la administradora. status del pedido: 'enviado'.
//   4) La administradora prepara todo y lo entrega en bloque a la coordinadora.
//      status del pedido pasa a 'recibido'.
//   5) La coordinadora reparte a cada maestra lo correspondiente y genera su recibo
//      electrónico individual. La solicitud pasa a status 'entregada'.

let db = { settings: null, requests: [], pedidos: [] };
const ready = { settings: false, requests: false, pedidos: false };
const listeners = [];
let initError = null;

function onDataChange(cb) { listeners.push(cb); }
function notify() { listeners.forEach(cb => cb()); }
function isReady() { return ready.settings && ready.requests && ready.pedidos; }
function getInitError() { return initError; }

function stripId(obj) {
  const { id, ...rest } = obj;
  return rest;
}

function initApp() {
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const fdb = firebase.firestore();

  auth.signInAnonymously().catch(err => {
    initError = 'No se pudo autenticar con Firebase: ' + err.message +
      '. Revisa que el proveedor "Anónimo" esté habilitado en Authentication → Método de acceso.';
    notify();
  });

  auth.onAuthStateChanged(user => {
    if (!user) return;

    fdb.doc('config/settings').onSnapshot(snap => {
      if (snap.exists) {
        db.settings = snap.data();
      } else {
        db.settings = { ...DEFAULT_SETTINGS };
        fdb.doc('config/settings').set(DEFAULT_SETTINGS).catch(() => {});
      }
      ready.settings = true;
      notify();
    }, err => { initError = 'Error leyendo ajustes: ' + err.message; notify(); });

    fdb.collection('requests').onSnapshot(snap => {
      db.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      ready.requests = true;
      notify();
    }, err => { initError = 'Error leyendo solicitudes: ' + err.message; notify(); });

    fdb.collection('pedidos').onSnapshot(snap => {
      db.pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      ready.pedidos = true;
      notify();
    }, err => { initError = 'Error leyendo pedidos: ' + err.message; notify(); });
  });
}

function fs() { return firebase.firestore(); }

function getSettings() {
  return db.settings || DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  fs().doc('config/settings').set(settings);
}

// ---------- Solicitudes (por maestra / sección / quincena) ----------

function getRequests() {
  return db.requests;
}

function getRequest(id) {
  return db.requests.find(r => r.id === id) || null;
}

function saveRequest(request) {
  fs().collection('requests').doc(request.id).set(stripId(request));
}

function genId(prefix) {
  return (prefix || 'r') + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function nextFolio() {
  const ref = fs().doc('config/counters');
  return fs().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = (snap.exists && snap.data().nextFolio) || 1;
    tx.set(ref, { nextFolio: current + 1 }, { merge: true });
    return current;
  });
}

async function nextPedidoFolio() {
  const ref = fs().doc('config/counters');
  return fs().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = (snap.exists && snap.data().nextPedidoFolio) || 1;
    tx.set(ref, { nextPedidoFolio: current + 1 }, { merge: true });
    return current;
  });
}

// ---------- Pedidos consolidados (coordinadora -> administradora) ----------

function getPedidos() {
  return db.pedidos;
}

function getPedido(id) {
  return db.pedidos.find(p => p.id === id) || null;
}

function savePedido(pedido) {
  fs().collection('pedidos').doc(pedido.id).set(stripId(pedido));
}

// Solicitudes autorizadas de una quincena que todavía no forman parte de ningún pedido.
function solicitudesListasParaPedido(quincena) {
  return getRequests().filter(r => r.quincena === quincena && r.status === 'autorizada' && !r.pedidoId);
}

// Concentra en UN SOLO pedido (por quincena) todas las solicitudes autorizadas pendientes
// de envío. Si ya existe un pedido abierto (status 'enviado') para esa quincena, se le
// agregan las nuevas solicitudes autorizadas en vez de crear uno nuevo.
async function enviarPedidoConsolidado(quincena, coordinadoraNombre) {
  const pendientes = solicitudesListasParaPedido(quincena);
  if (pendientes.length === 0) return null;

  const now = Date.now();
  let pedido = db.pedidos.find(p => p.quincena === quincena && p.status === 'enviado');

  if (!pedido) {
    const folio = await nextPedidoFolio();
    pedido = {
      id: genId('p'),
      folio,
      quincena,
      requestIds: [],
      status: 'enviado',
      createdAt: now,
      createdBy: coordinadoraNombre,
      sentAt: now,
      updatedAt: now,
    };
  }

  const batch = fs().batch();
  pendientes.forEach(r => {
    r.pedidoId = pedido.id;
    r.updatedAt = now;
    batch.set(fs().collection('requests').doc(r.id), stripId(r));
    pedido.requestIds.push(r.id);
  });
  pedido.updatedAt = now;
  batch.set(fs().collection('pedidos').doc(pedido.id), stripId(pedido));

  await batch.commit();
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
  const payload = { settings: db.settings, requests: db.requests, pedidos: db.pedidos };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
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

// Fusiona un respaldo importado (de la versión anterior con localStorage, o de otro
// export) hacia Firestore, sin duplicar ni borrar lo existente.
async function importarJSON(fileContent) {
  const incoming = JSON.parse(fileContent);
  const batch = fs().batch();
  let agregadas = 0, actualizadas = 0, pedidosAgregados = 0, pedidosActualizados = 0;

  if (incoming.settings) {
    batch.set(fs().doc('config/settings'), { ...db.settings, ...incoming.settings }, { merge: true });
  }

  (incoming.requests || []).forEach(incReq => {
    const local = getRequest(incReq.id);
    if (local) {
      if ((incReq.updatedAt || 0) > (local.updatedAt || 0)) {
        batch.set(fs().collection('requests').doc(incReq.id), stripId(incReq));
        actualizadas++;
      }
    } else {
      batch.set(fs().collection('requests').doc(incReq.id), stripId(incReq));
      agregadas++;
    }
  });

  (incoming.pedidos || []).forEach(incPed => {
    const local = getPedido(incPed.id);
    if (local) {
      if ((incPed.updatedAt || 0) > (local.updatedAt || 0)) {
        batch.set(fs().collection('pedidos').doc(incPed.id), stripId(incPed));
        pedidosActualizados++;
      }
    } else {
      batch.set(fs().collection('pedidos').doc(incPed.id), stripId(incPed));
      pedidosAgregados++;
    }
  });

  await batch.commit();
  return { agregadas, actualizadas, pedidosAgregados, pedidosActualizados, total: db.requests.length + agregadas };
}
