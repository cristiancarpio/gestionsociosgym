// ============================================================
//  GymAdmin — Google Apps Script (Code.gs)
//  Pegá TODO este código en tu proyecto de Apps Script
// ============================================================

const SPREADSHEET_ID = ''; // Dejalo vacío: el script usa el Sheet donde está publicado

// ── Cabeceras de cada hoja ──────────────────────────────────
const HEADERS = {
  Socios:  ['ID','Nombre','DNI','Telefono','Plan','Monto','Inicio','Vencimiento','Estado','Notas'],
  Stock:   ['ID','Nombre','Categoria','Precio','Stock','Costo'],
  Ventas:  ['ID','Fecha','Producto','Cantidad','Precio','Total'],
  Alertas: ['ID','Fecha','Nombre','Plan','Vencimiento']
};

// ── Utilidad: obtener o crear una hoja ─────────────────────
function getSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.getRange(1, 1, 1, HEADERS[name].length)
      .setBackground('#e8ff47')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Leer toda una hoja como array de objetos ───────────────
function sheetToObjects(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];           // solo cabecera o vacío
  const keys = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    keys.forEach((k, i) => { obj[k] = row[i]; });
    return obj;
  });
}

// ── doGet: devuelve todos los datos (llamada GET desde la app) ─
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'get_all') {
    try {
      const socios  = sheetToObjects(getSheet('Socios'),  HEADERS.Socios);
      const stock   = sheetToObjects(getSheet('Stock'),   HEADERS.Stock);
      const ventas  = sheetToObjects(getSheet('Ventas'),  HEADERS.Ventas);

      const result = ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: { Socios: socios, Stock: stock, Ventas: ventas } }))
        .setMimeType(ContentService.MimeType.JSON);

      return result;
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Default: ping de estado
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'GymAdmin API activa' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── doPost: recibe cambios desde la app ─────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    if (action === 'sync_socios') {
      syncSocios(payload.data);
      return jsonOk({ synced: payload.data.length });
    }

    if (action === 'sync_stock') {
      syncStock(payload.data);
      return jsonOk({ synced: payload.data.length });
    }

    if (action === 'sync_ventas') {
      syncVentas(payload.data);
      return jsonOk({ synced: payload.data.length });
    }

    if (action === 'sync_alerta') {
      guardarAlerta(payload.data);
      return jsonOk({});
    }

    return jsonOk({ message: 'Acción desconocida: ' + action });

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Sync Socios ─────────────────────────────────────────────
function syncSocios(records) {
  if (!records || !records.length) return;
  const sheet   = getSheet('Socios');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');

  // Crear mapa de filas existentes: ID → rowIndex (1-based, sin cabecera)
  const rowMap = {};
  for (let i = 1; i < data.length; i++) {
    rowMap[String(data[i][idCol])] = i + 1; // +1 porque las filas del sheet empiezan en 1
  }

  records.forEach(rec => {
    const row = buildSocioRow(rec, headers);
    const existingRow = rowMap[String(rec.id || rec.ID)];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

function buildSocioRow(rec, headers) {
  return headers.map(h => {
    switch (h) {
      case 'ID':          return rec.id          || rec.ID          || '';
      case 'Nombre':      return rec.nombre       || rec.Nombre      || '';
      case 'DNI':         return rec.dni          || rec.DNI         || '';
      case 'Telefono':    return rec.telefono     || rec.Telefono    || '';
      case 'Plan':        return rec.plan         || rec.Plan        || '';
      case 'Monto':       return rec.monto        || rec.Monto       || '';
      case 'Inicio':      return rec.inicio       || rec.Inicio      || '';
      case 'Vencimiento': return rec.vencimiento  || rec.Vencimiento || '';
      case 'Estado':      return rec.status       || rec.Estado      || '';
      case 'Notas':       return rec.notas        || rec.Notas       || '';
      default:            return '';
    }
  });
}

// ── Sync Stock ──────────────────────────────────────────────
function syncStock(records) {
  if (!records || !records.length) return;
  const sheet   = getSheet('Stock');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');

  const rowMap = {};
  for (let i = 1; i < data.length; i++) {
    rowMap[String(data[i][idCol])] = i + 1;
  }

  records.forEach(rec => {
    const row = headers.map(h => {
      switch (h) {
        case 'ID':        return rec.id        || '';
        case 'Nombre':    return rec.nombre     || '';
        case 'Categoria': return rec.categoria  || '';
        case 'Precio':    return rec.precio     || '';
        case 'Stock':     return rec.stock      || '';
        case 'Costo':     return rec.costo      || '';
        default:          return '';
      }
    });
    const existingRow = rowMap[String(rec.id)];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

// ── Sync Ventas ─────────────────────────────────────────────
function syncVentas(records) {
  if (!records || !records.length) return;
  const sheet   = getSheet('Ventas');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');

  const existingIds = new Set(data.slice(1).map(r => String(r[idCol])));

  records.forEach(rec => {
    if (existingIds.has(String(rec.id))) return; // no duplicar ventas
    const row = headers.map(h => {
      switch (h) {
        case 'ID':        return rec.id        || '';
        case 'Fecha':     return rec.fecha      || '';
        case 'Producto':  return rec.producto   || '';
        case 'Cantidad':  return rec.cantidad   || '';
        case 'Precio':    return rec.precio     || '';
        case 'Total':     return rec.total      || '';
        default:          return '';
      }
    });
    sheet.appendRow(row);
  });
}

// ── Guardar Alerta de Acceso Denegado ───────────────────────
function guardarAlerta(rec) {
  if (!rec) return;
  const sheet   = getSheet('Alertas');
  const headers = HEADERS.Alertas;
  const row     = headers.map(h => {
    switch (h) {
      case 'ID':          return rec.id          || 'a' + Date.now();
      case 'Fecha':       return rec.fecha        || new Date().toLocaleString('es-AR');
      case 'Nombre':      return rec.nombre       || '';
      case 'Plan':        return rec.plan         || '';
      case 'Vencimiento': return rec.vencimiento  || '';
      default:            return '';
    }
  });
  sheet.appendRow(row);
}

// ── Helper: respuesta JSON ok ──────────────────────────────
function jsonOk(extra) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ ok: true }, extra)))
    .setMimeType(ContentService.MimeType.JSON);
}
