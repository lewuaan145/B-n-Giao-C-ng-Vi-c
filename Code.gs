/**
 * CÔNG VIỆC HẰNG NGÀY — Backend API (Google Apps Script)
 * ---------------------------------------------------------
 * Sheet "QL_Data"  : trạng thái checklist định kỳ theo ngày. Cột: Ngay | Thu | ChecklistJSON | CapNhatLuc
 * Sheet "QL_Items" : từng mục CTKM / Deadline / Phát sinh, gắn theo ngày riêng.
 *                    Cột: ID | Ngay | Loai | NoiDung | XongChua | TaoLuc
 * Sheet "CauHinh"  : danh sách các mục checklist định kỳ hiện hành (mỗi dòng 1 mục, cột A, từ dòng 2)
 *
 * Deploy: Extensions > Apps Script > dán file này > Deploy > New deployment
 *         Type: Web app | Execute as: Me | Who has access: Anyone
 *         Copy URL, dán vào app (màn Cài đặt trong app, hoặc config.js)
 */

const DATA_SHEET = 'QL_Data';
const ITEMS_SHEET = 'QL_Items';
const CONFIG_SHEET = 'CauHinh';
const DEFAULT_CHECKLIST_ITEMS = ['Chụp ảnh BR', 'Trưng bày hoạt náo', 'Đăng bài Nhóm', 'TK DATE', 'Giá hot'];
const ITEM_TYPES = ['ctkm', 'deadline', 'phatsinh'];

function getSS_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheets_() {
  const ss = getSS_();

  let data = ss.getSheetByName(DATA_SHEET);
  if (!data) {
    data = ss.insertSheet(DATA_SHEET);
    data.appendRow(['Ngay', 'Thu', 'ChecklistJSON', 'CapNhatLuc']);
    data.setFrozenRows(1);
  }

  let items = ss.getSheetByName(ITEMS_SHEET);
  if (!items) {
    items = ss.insertSheet(ITEMS_SHEET);
    items.appendRow(['ID', 'Ngay', 'Loai', 'NoiDung', 'XongChua', 'TaoLuc']);
    items.setFrozenRows(1);
  }

  let config = ss.getSheetByName(CONFIG_SHEET);
  if (!config) {
    config = ss.insertSheet(CONFIG_SHEET);
    config.appendRow(['Mục checklist định kỳ (mỗi dòng 1 mục — sửa/thêm/xoá trực tiếp ở đây)']);
    DEFAULT_CHECKLIST_ITEMS.forEach(item => config.appendRow([item]));
    config.setFrozenRows(1);
  }

  return { data, items, config };
}

function weekdayLabel_(dateObj) {
  const d = dateObj.getDay();
  return d === 0 ? 'CN' : 'Thứ ' + (d + 1);
}

function getConfigItems_() {
  const { config } = ensureSheets_();
  const last = config.getLastRow();
  if (last < 2) return DEFAULT_CHECKLIST_ITEMS.slice();
  const vals = config.getRange(2, 1, last - 1, 1).getValues().flat().filter(v => String(v).trim() !== '');
  return vals.length ? vals : DEFAULT_CHECKLIST_ITEMS.slice();
}

/* ---------------- QL_Data (checklist định kỳ) ---------------- */

function findDataRowByDate_(sheet, dateStr) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const dates = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < dates.length; i++) {
    if (String(dates[i][0]) === dateStr) return i + 2;
  }
  return -1;
}

function readChecklist_(dateStr) {
  const { data } = ensureSheets_();
  const row = findDataRowByDate_(data, dateStr);
  const configItems = getConfigItems_();
  let checklist = configItems.map(item => ({ item, done: false }));

  if (row > 0) {
    const vals = data.getRange(row, 1, 1, 3).getValues()[0];
    try {
      const saved = JSON.parse(vals[2] || '[]');
      const savedMap = {};
      saved.forEach(s => { savedMap[s.item] = s.done; });
      checklist = configItems.map(item => ({ item, done: !!savedMap[item] }));
      saved.forEach(s => {
        if (!configItems.includes(s.item)) checklist.push({ item: s.item, done: !!s.done });
      });
    } catch (e) {}
  }
  return checklist;
}

function saveChecklist_(dateStr, checklist) {
  const { data } = ensureSheets_();
  let row = findDataRowByDate_(data, dateStr);
  const weekday = weekdayLabel_(new Date(dateStr + 'T00:00:00'));
  const rowValues = [dateStr, weekday, JSON.stringify(checklist || []), new Date()];

  if (row > 0) {
    data.getRange(row, 1, 1, 4).setValues([rowValues]);
  } else {
    data.appendRow(rowValues);
    const last = data.getLastRow();
    if (last > 2) data.getRange(2, 1, last - 1, 4).sort({ column: 1, ascending: true });
  }
  return readChecklist_(dateStr);
}

/* ---------------- QL_Items (CTKM / Deadline / Phát sinh) ---------------- */

function findItemRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function getItemsForDate_(dateStr) {
  const { items } = ensureSheets_();
  const last = items.getLastRow();
  const result = { ctkm: [], deadline: [], phatsinh: [] };
  if (last < 2) return result;
  const vals = items.getRange(2, 1, last - 1, 6).getValues();
  vals.forEach(v => {
    const [id, date, type, text, done] = v;
    if (String(date) === dateStr && result[type]) {
      result[type].push({ id: String(id), text, done: !!done });
    }
  });
  return result;
}

function addItem_(dateStr, type, text) {
  if (ITEM_TYPES.indexOf(type) === -1) throw new Error('Loại không hợp lệ: ' + type);
  const { items } = ensureSheets_();
  const id = Utilities.getUuid().slice(0, 8);
  items.appendRow([id, dateStr, type, text, false, new Date()]);
  return { id, date: dateStr, type, text, done: false };
}

function toggleItem_(id, done) {
  const { items } = ensureSheets_();
  const row = findItemRow_(items, id);
  if (row < 0) throw new Error('Không tìm thấy mục: ' + id);
  items.getRange(row, 5, 1, 1).setValue(!!done);
  return { id, done: !!done };
}

function deleteItem_(id) {
  const { items } = ensureSheets_();
  const row = findItemRow_(items, id);
  if (row < 0) throw new Error('Không tìm thấy mục: ' + id);
  items.deleteRow(row);
  return { id, deleted: true };
}

/* ---------------- ngày tổng hợp cho lịch sử ---------------- */

function listRecentDates_(limit) {
  const { data, items } = ensureSheets_();
  const dateSet = {};

  const lastData = data.getLastRow();
  if (lastData >= 2) {
    data.getRange(2, 1, lastData - 1, 1).getValues().forEach(v => { dateSet[String(v[0])] = true; });
  }
  const lastItems = items.getLastRow();
  if (lastItems >= 2) {
    items.getRange(2, 2, lastItems - 1, 1).getValues().forEach(v => { dateSet[String(v[0])] = true; });
  }

  const dates = Object.keys(dateSet).sort().reverse().slice(0, limit || 7);
  return dates.map(d => {
    const checklist = readChecklist_(d);
    const done = checklist.filter(c => c.done).length;
    const dayItems = getItemsForDate_(d);
    const summaryParts = []
      .concat(dayItems.ctkm.map(i => i.text))
      .concat(dayItems.deadline.map(i => i.text))
      .concat(dayItems.phatsinh.map(i => i.text));
    return {
      date: d,
      weekday: weekdayLabel_(new Date(d + 'T00:00:00')),
      checklistDone: done,
      checklistTotal: checklist.length,
      summary: summaryParts.join(' — ')
    };
  });
}

/* ---------------- HTTP handlers ---------------- */

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  ensureSheets_();
  const action = (e.parameter.action || '').toLowerCase();
  try {
    if (action === 'config') {
      return jsonOut_({ ok: true, items: getConfigItems_() });
    }
    if (action === 'day') {
      const dateStr = e.parameter.date;
      if (!dateStr) return jsonOut_({ ok: false, error: 'Thiếu tham số date' });
      return jsonOut_({
        ok: true,
        checklist: readChecklist_(dateStr),
        weekday: weekdayLabel_(new Date(dateStr + 'T00:00:00')),
        items: getItemsForDate_(dateStr)
      });
    }
    if (action === 'recent') {
      const limit = parseInt(e.parameter.limit, 10) || 7;
      return jsonOut_({ ok: true, entries: listRecentDates_(limit) });
    }
    return jsonOut_({ ok: false, error: 'Action không hợp lệ' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  ensureSheets_();
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'saveChecklist') {
      return jsonOut_({ ok: true, checklist: saveChecklist_(payload.date, payload.checklist) });
    }
    if (action === 'addItem') {
      return jsonOut_({ ok: true, item: addItem_(payload.date, payload.type, payload.text) });
    }
    if (action === 'toggleItem') {
      return jsonOut_({ ok: true, result: toggleItem_(payload.id, payload.done) });
    }
    if (action === 'deleteItem') {
      return jsonOut_({ ok: true, result: deleteItem_(payload.id) });
    }
    return jsonOut_({ ok: false, error: 'Action không hợp lệ: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
