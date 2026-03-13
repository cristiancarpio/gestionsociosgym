// ============================================================
// GymAdmin — Google Apps Script
// Pegá este código en: Extensions > Apps Script
// Luego: Deploy > New deployment > Web App
//   - Execute as: Me
//   - Who has access: Anyone
// ============================================================

const SHEET_SOCIOS = 'Socios';
const SHEET_VENTAS = 'Ventas';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;
    if (action === 'sync_socios') return handleSyncSocios(payload.data);
    if (action === 'sync_ventas') return handleSyncVentas(payload.data);
    if (action === 'get_all')     return handleGetAll();
    return resp({ ok: false, error: 'Acción desconocida: ' + action });
  } catch(err) {
    return resp({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return handleGetAll();
}

// ── SOCIOS ──────────────────────────────────────────────────
function handleSyncSocios(rows) {
  const headers = ['ID','Fecha Registro','Nombre','DNI','Teléfono','Email',
                   'Plan','Monto','Fecha Pago','Vencimiento','Estado','Notas'];
  const sheet = getOrCreateSheet(SHEET_SOCIOS, headers);
  rows.forEach(s => upsertRow(sheet, s.id, [
    s.id, s.fecha_registro, s.nombre, s.dni, s.telefono, s.email,
    s.plan, s.monto, s.fecha_pago, s.vencimiento, s.status, s.notas
  ]));
  return resp({ ok: true, synced: rows.length });
}

// ── VENTAS ───────────────────────────────────────────────────
function handleSyncVentas(rows) {
  const headers = ['ID','Fecha','Socio','Plan','Monto','Vencimiento anterior','Nuevo vencimiento','Notas'];
  const sheet = getOrCreateSheet(SHEET_VENTAS, headers);
  rows.forEach(v => {
    const data   = sheet.getDataRange().getValues();
    const exists = data.some(row => row[0] === v.id);
    if (!exists) sheet.appendRow([v.id, v.fecha, v.socio, v.plan, v.monto, '', '', v.notas || '']);
  });
  return resp({ ok: true, synced: rows.length });
}

// ── GET ALL ──────────────────────────────────────────────────
function handleGetAll() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};

  [SHEET_SOCIOS, SHEET_VENTAS].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) { result[name] = []; return; }
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) { result[name] = []; return; }

    // Find the real header row: the row where first cell is exactly 'ID'
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === 'ID') { headerIdx = i; break; }
    }
    if (headerIdx < 0 || headerIdx >= data.length - 1) { result[name] = []; return; }

    const headers = data[headerIdx].map(h => String(h).trim());
    result[name]  = data.slice(headerIdx + 1)
      .filter(row => row[0] && String(row[0]).trim() !== '')
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
        return obj;
      });
  });

  return resp({ ok: true, data: result });
}

// ── HELPERS ──────────────────────────────────────────────────
function getOrCreateSheet(name, headers) {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a1a1a')
      .setFontColor('#e8ff47');
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Sheet exists — make sure it has an 'ID' header row somewhere
  const data = sheet.getDataRange().getValues();
  const hasHeader = data.some(row => String(row[0]).trim() === 'ID');
  if (!hasHeader) {
    // Prepend headers at top
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
  // Find header row index
  let headerIdx = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'ID') { headerIdx = i; break; }
  }
  const startRow = headerIdx >= 0 ? headerIdx + 1 : 1;
  // Update if exists
  for (let i = startRow; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  }
  // Insert new
  sheet.appendRow(rowData);
}

function resp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
