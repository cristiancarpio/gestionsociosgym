// ============================================================
// GymAdmin — Google Apps Script
// Pegá este código en: Extensions > Apps Script
// Luego: Deploy > New deployment > Web App
//   - Execute as: Me
//   - Who has access: Anyone
// Copiá la URL y pegala en index.html como APPS_SCRIPT_URL
// ============================================================

const SHEET_SOCIOS    = 'Socios';
const SHEET_STOCK     = 'Stock';
const SHEET_VENTAS    = 'Ventas';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    if (action === 'sync_socios')  return handleSyncSocios(payload.data);
    if (action === 'sync_stock')   return handleSyncStock(payload.data);
    if (action === 'sync_ventas')  return handleSyncVentas(payload.data);
    if (action === 'get_all')      return handleGetAll();

    return resp({ ok: false, error: 'Acción desconocida: ' + action });
  } catch(err) {
    return resp({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return handleGetAll();
}

// ---- SOCIOS ----
function handleSyncSocios(rows) {
  const sheet = getOrCreateSheet(SHEET_SOCIOS, [
    'ID','Fecha Registro','Nombre','DNI','Teléfono','Email',
    'Plan','Monto','Fecha Pago','Vencimiento','Estado','Notas'
  ]);
  rows.forEach(s => upsertRow(sheet, s.id, [
    s.id, s.fecha_registro, s.nombre, s.dni, s.telefono, s.email,
    s.plan, s.monto, s.fecha_pago, s.vencimiento, s.status, s.notas
  ]));
  return resp({ ok: true, synced: rows.length });
}

// ---- STOCK ----
function handleSyncStock(rows) {
  const sheet = getOrCreateSheet(SHEET_STOCK, [
    'ID','Nombre','Categoría','Variante','Precio','Stock','Mínimo','Costo'
  ]);
  rows.forEach(p => upsertRow(sheet, p.id, [
    p.id, p.nombre, p.cat, p.variante, p.precio, p.stock, p.min, p.costo
  ]));
  return resp({ ok: true, synced: rows.length });
}

// ---- VENTAS ----
function handleSyncVentas(rows) {
  const sheet = getOrCreateSheet(SHEET_VENTAS, [
    'ID','Fecha','Producto','Categoría','Variante','Cantidad','Precio Unit.','Total'
  ]);
  rows.forEach(v => {
    // Ventas solo se agregan, no se actualizan
    const data = sheet.getDataRange().getValues();
    const exists = data.some(row => row[0] === v.id);
    if (!exists) {
      sheet.appendRow([v.id, v.fecha, v.nombre, v.cat, v.variante, v.qty, v.precio, v.total]);
    }
  });
  return resp({ ok: true, synced: rows.length });
}

// ---- GET ALL (carga inicial) ----
function handleGetAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};

  [SHEET_SOCIOS, SHEET_STOCK, SHEET_VENTAS].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) { result[name] = []; return; }
    const data  = sheet.getDataRange().getValues();
    if (data.length < 2) { result[name] = []; return; }
    const headers = data[0];
    result[name]  = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  });

  return resp({ ok: true, data: result });
}

// ---- HELPERS ----
function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a1a1a')
      .setFontColor('#e8ff47');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertRow(sheet, id, rowData) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  }
  sheet.appendRow(rowData);
}

function resp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
