// ============================================================
//  GymAdmin — Google Apps Script
//  Pegá este código en tu Google Apps Script y re-publicá
//  como "Nueva implementación → Aplicación web"
// ============================================================

const SHEET_NAME_SOCIOS  = 'Socios';
const SHEET_NAME_ALERTAS = 'Alertas';
const SHEET_NAME_STOCK   = 'Stock';
const SHEET_NAME_VENTAS  = 'Ventas';

// ── HEADERS ──
const HEADERS_SOCIOS  = ['ID','Nombre','DNI','Teléfono','Email','Plan','Monto','Fecha Pago','Vencimiento','Notas','Fecha Registro','Estado'];
const HEADERS_ALERTAS = ['ID','Fecha','Nombre','Plan','Vencimiento','Leída'];
const HEADERS_STOCK   = ['ID','Nombre','Cantidad','Precio','Categoría'];
const HEADERS_VENTAS  = ['ID','Fecha','Producto','Cantidad','Total','Método'];

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a1a').setFontColor('#e8ff47').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── GET — returns JSON (and supports JSONP via ?callback=xxx) ──
function doGet(e) {
  const params   = e.parameter || {};
  const action   = params.action || 'get_all';
  const callback = params.callback || null;   // JSONP support

  let result;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'get_all') {
      const sheetSocios  = getOrCreateSheet(ss, SHEET_NAME_SOCIOS,  HEADERS_SOCIOS);
      const sheetAlertas = getOrCreateSheet(ss, SHEET_NAME_ALERTAS, HEADERS_ALERTAS);

      result = {
        ok: true,
        data: {
          Socios:  sheetToArray(sheetSocios),
          Alertas: sheetToArray(sheetAlertas)
        }
      };
    } else {
      result = { ok: false, error: 'Unknown action' };
    }
  } catch(err) {
    result = { ok: false, error: err.message };
  }

  const json = JSON.stringify(result);

  // If JSONP requested, wrap in callback
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST — writes data ──
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' });
  }

  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const action = payload.action;

  try {
    if (action === 'sync_socios') {
      const sheet = getOrCreateSheet(ss, SHEET_NAME_SOCIOS, HEADERS_SOCIOS);
      upsertRows(sheet, HEADERS_SOCIOS, payload.data || []);
      return jsonResponse({ ok: true });
    }

    if (action === 'sync_alerta') {
      const sheet = getOrCreateSheet(ss, SHEET_NAME_ALERTAS, HEADERS_ALERTAS);
      const d = payload.data;
      sheet.appendRow([d.id, d.fecha, d.nombre, d.plan, d.vencimiento, 'no']);
      return jsonResponse({ ok: true });
    }

    if (action === 'sync_stock') {
      const sheet = getOrCreateSheet(ss, SHEET_NAME_STOCK, HEADERS_STOCK);
      upsertRows(sheet, HEADERS_STOCK, payload.data || []);
      return jsonResponse({ ok: true });
    }

    if (action === 'sync_ventas') {
      const sheet = getOrCreateSheet(ss, SHEET_NAME_VENTAS, HEADERS_VENTAS);
      const rows  = payload.data || [];
      rows.forEach(v => sheet.appendRow([v.id, v.fecha, v.producto, v.cantidad, v.total, v.metodo]));
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch(err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── HELPERS ──

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function upsertRows(sheet, headers, records) {
  if (!records.length) return;

  const data     = sheet.getDataRange().getValues();
  const hdrs     = data[0] || headers;
  const idCol    = hdrs.indexOf('ID');
  const existMap = {};

  // Build map of existing row indices by ID
  data.slice(1).forEach((row, i) => {
    const id = String(row[idCol] || '').trim();
    if (id) existMap[id] = i + 2; // 1-indexed, +1 for header
  });

  records.forEach(record => {
    const id  = String(record.id || record.ID || '').trim();
    const row = headers.map(h => {
      // Map camelCase keys to header names
      const keyMap = {
        'ID': record.id, 'Nombre': record.nombre, 'DNI': record.dni,
        'Teléfono': record.telefono, 'Email': record.email, 'Plan': record.plan,
        'Monto': record.monto, 'Fecha Pago': record.fecha_pago,
        'Vencimiento': record.vencimiento, 'Notas': record.notas,
        'Fecha Registro': record.fecha_registro,
        'Estado': record.status || calcStatus(record.vencimiento)
      };
      return keyMap[h] !== undefined ? keyMap[h] : (record[h] || '');
    });

    if (id && existMap[id]) {
      sheet.getRange(existMap[id], 1, 1, headers.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

function calcStatus(vencimiento) {
  if (!vencimiento) return 'pendiente';
  try {
    const d   = new Date(vencimiento);
    const now = new Date();
    now.setHours(0,0,0,0);
    return d >= now ? 'vigente' : 'vencido';
  } catch(e) {
    return 'pendiente';
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
