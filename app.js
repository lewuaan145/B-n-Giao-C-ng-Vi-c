(function () {
  'use strict';

  const LS_KEY = 'cvhn_api_url';

  const dateInput = document.getElementById('date-input');
  const prevBtn = document.getElementById('prev-day');
  const nextBtn = document.getElementById('next-day');
  const todayBtn = document.getElementById('today-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const weekdayLabel = document.getElementById('weekday-label');
  const checklistList = document.getElementById('checklist-list');
  const progressPill = document.getElementById('progress-pill');
  const addChecklistItemBtn = document.getElementById('add-checklist-item-btn');
  const saveChecklistBtn = document.getElementById('save-checklist-btn');
  const statusBanner = document.getElementById('status-banner');
  const historyList = document.getElementById('history-list');

  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsUrlInput = document.getElementById('settings-url-input');
  const settingsSaveBtn = document.getElementById('settings-save-btn');
  const settingsCloseBtn = document.getElementById('settings-close-btn');

  const itemSections = Array.from(document.querySelectorAll('.item-section')).map(el => ({
    type: el.dataset.type,
    el,
    list: el.querySelector('[data-role="list"]'),
    pill: el.querySelector('[data-role="pill"]'),
    addBtn: el.querySelector('[data-role="add-btn"]'),
    addForm: el.querySelector('[data-role="add-form"]'),
    addText: el.querySelector('[data-role="add-text"]'),
    addDate: el.querySelector('[data-role="add-date"]'),
    addConfirm: el.querySelector('[data-role="add-confirm"]'),
    addCancel: el.querySelector('[data-role="add-cancel"]')
  }));

  let currentChecklist = [];
  let currentItems = { ctkm: [], deadline: [], phatsinh: [] };
  let bannerTimer = null;

  function apiUrl() {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && stored.trim()) return stored.trim();
    if (typeof API_URL === 'string' && API_URL.indexOf('PASTE_') !== 0) return API_URL.trim();
    return '';
  }

  function configured() {
    return apiUrl() !== '';
  }

  function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function fromDateStr(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function todayStr() { return toDateStr(new Date()); }

  function showBanner(text, type) {
    clearTimeout(bannerTimer);
    statusBanner.textContent = text;
    statusBanner.className = 'status-banner ' + type;
    if (type !== 'error') bannerTimer = setTimeout(() => statusBanner.classList.add('hidden'), 2600);
  }

  function apiGet(params) {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${apiUrl()}?${qs}`).then(r => r.json());
  }
  function apiPost(payload) {
    return fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
  }

  /* ---------------- settings ---------------- */
  function openSettings() {
    settingsUrlInput.value = localStorage.getItem(LS_KEY) || (configured() ? apiUrl() : '');
    settingsOverlay.classList.remove('hidden');
  }
  function closeSettings() { settingsOverlay.classList.add('hidden'); }

  settingsBtn.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);
  settingsSaveBtn.addEventListener('click', () => {
    const val = settingsUrlInput.value.trim();
    if (val) localStorage.setItem(LS_KEY, val);
    closeSettings();
    loadDay(dateInput.value || todayStr());
    loadHistory();
  });

  /* ---------------- recurring checklist ---------------- */
  function renderChecklist() {
    checklistList.innerHTML = '';
    let done = 0;
    currentChecklist.forEach((entry, idx) => {
      if (entry.done) done++;
      const li = document.createElement('li');
      li.className = 'checklist-item' + (entry.done ? ' done' : '') + (entry.custom ? ' custom' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!entry.done;
      cb.id = 'item-' + idx;
      cb.addEventListener('change', () => { currentChecklist[idx].done = cb.checked; renderChecklist(); });

      const label = document.createElement('label');
      label.htmlFor = 'item-' + idx;
      label.textContent = entry.item;

      li.appendChild(cb);
      li.appendChild(label);

      if (entry.custom) {
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'remove-item-btn';
        rm.textContent = 'Xoá';
        rm.addEventListener('click', () => { currentChecklist.splice(idx, 1); renderChecklist(); });
        li.appendChild(rm);
      }
      checklistList.appendChild(li);
    });
    const total = currentChecklist.length;
    progressPill.textContent = `${done}/${total}`;
    progressPill.classList.toggle('complete', total > 0 && done === total);
  }

  addChecklistItemBtn.addEventListener('click', () => {
    const text = prompt('Nội dung việc phát sinh cho ngày này (thuộc công việc định kỳ):');
    if (text && text.trim()) {
      currentChecklist.push({ item: text.trim(), done: false, custom: true });
      renderChecklist();
    }
  });

  saveChecklistBtn.addEventListener('click', () => {
    if (!configured()) { showBanner('Chưa cấu hình link Apps Script — bấm ⚙ Cài đặt để dán link.', 'error'); return; }
    saveChecklistBtn.disabled = true;
    apiPost({
      action: 'saveChecklist',
      date: dateInput.value,
      checklist: currentChecklist.map(c => ({ item: c.item, done: c.done }))
    }).then(res => {
      saveChecklistBtn.disabled = false;
      if (!res.ok) { showBanner('Lưu thất bại: ' + res.error, 'error'); return; }
      showBanner('Đã lưu công việc định kỳ.', 'ok');
      loadHistory();
    }).catch(err => { saveChecklistBtn.disabled = false; showBanner('Không kết nối được API: ' + err, 'error'); });
  });

  /* ---------------- ctkm / deadline / phatsinh item sections ---------------- */
  function renderItemSection(section) {
    const list = currentItems[section.type] || [];
    section.list.innerHTML = '';
    let done = 0;
    if (!list.length) {
      section.list.innerHTML = '<li class="item-empty">Chưa có mục nào cho ngày này.</li>';
    }
    list.forEach(entry => {
      if (entry.done) done++;
      const li = document.createElement('li');
      li.className = 'checklist-item' + (entry.done ? ' done' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!entry.done;
      cb.addEventListener('change', () => toggleItem(section.type, entry.id, cb.checked));

      const label = document.createElement('label');
      label.textContent = entry.text;

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'remove-item-btn';
      rm.textContent = 'Xoá';
      rm.addEventListener('click', () => deleteItem(section.type, entry.id));

      li.appendChild(cb);
      li.appendChild(label);
      li.appendChild(rm);
      section.list.appendChild(li);
    });
    section.pill.textContent = String(list.length);
    section.pill.classList.toggle('complete', list.length > 0 && done === list.length);
  }

  function renderAllItemSections() {
    itemSections.forEach(renderItemSection);
  }

  function toggleItem(type, id, done) {
    if (!configured()) { showBanner('Chưa cấu hình link Apps Script — bấm ⚙ Cài đặt để dán link.', 'error'); return; }
    // optimistic update
    const entry = currentItems[type].find(i => i.id === id);
    if (entry) entry.done = done;
    renderAllItemSections();
    apiPost({ action: 'toggleItem', id, done }).then(res => {
      if (!res.ok) showBanner('Cập nhật thất bại: ' + res.error, 'error');
      else loadHistory();
    }).catch(err => showBanner('Không kết nối được API: ' + err, 'error'));
  }

  function deleteItem(type, id) {
    if (!configured()) { showBanner('Chưa cấu hình link Apps Script — bấm ⚙ Cài đặt để dán link.', 'error'); return; }
    if (!confirm('Xoá mục này?')) return;
    currentItems[type] = currentItems[type].filter(i => i.id !== id);
    renderAllItemSections();
    apiPost({ action: 'deleteItem', id }).then(res => {
      if (!res.ok) showBanner('Xoá thất bại: ' + res.error, 'error');
      else loadHistory();
    }).catch(err => showBanner('Không kết nối được API: ' + err, 'error'));
  }

  itemSections.forEach(section => {
    section.addBtn.addEventListener('click', () => {
      section.addForm.classList.remove('hidden');
      section.addDate.value = dateInput.value || todayStr();
      section.addText.focus();
    });
    section.addCancel.addEventListener('click', () => {
      section.addForm.classList.add('hidden');
      section.addText.value = '';
    });
    section.addConfirm.addEventListener('click', () => {
      const text = section.addText.value.trim();
      const date = section.addDate.value || todayStr();
      if (!text) { section.addText.focus(); return; }
      if (!configured()) { showBanner('Chưa cấu hình link Apps Script — bấm ⚙ Cài đặt để dán link.', 'error'); return; }

      apiPost({ action: 'addItem', date, type: section.type, text }).then(res => {
        if (!res.ok) { showBanner('Thêm thất bại: ' + res.error, 'error'); return; }
        section.addText.value = '';
        section.addForm.classList.add('hidden');
        if (date === dateInput.value) {
          currentItems[section.type].push(res.item);
          renderItemSection(section);
        } else {
          showBanner(`Đã thêm cho ngày ${date}.`, 'ok');
        }
        loadHistory();
      }).catch(err => showBanner('Không kết nối được API: ' + err, 'error'));
    });
  });

  /* ---------------- load day / history ---------------- */
  function loadDay(dateStr) {
    dateInput.value = dateStr;
    weekdayLabel.textContent = 'Đang tải…';
    if (!configured()) {
      showBanner('Chưa cấu hình link Apps Script — bấm ⚙ Cài đặt để dán link.', 'error');
      weekdayLabel.textContent = '—';
      currentChecklist = [];
      currentItems = { ctkm: [], deadline: [], phatsinh: [] };
      renderChecklist();
      renderAllItemSections();
      return;
    }
    apiGet({ action: 'day', date: dateStr }).then(res => {
      if (!res.ok) { showBanner('Lỗi tải dữ liệu: ' + res.error, 'error'); return; }
      weekdayLabel.textContent = res.weekday + (dateStr === todayStr() ? ' · Hôm nay' : '');
      currentChecklist = res.checklist.map(c => ({ item: c.item, done: c.done, custom: false }));
      currentItems = res.items;
      renderChecklist();
      renderAllItemSections();
    }).catch(err => showBanner('Không kết nối được API: ' + err, 'error'));
  }

  function loadHistory() {
    if (!configured()) return;
    apiGet({ action: 'recent', limit: 7 }).then(res => {
      if (!res.ok) return;
      historyList.innerHTML = '';
      if (!res.entries.length) {
        historyList.innerHTML = '<p class="history-empty">Chưa có dữ liệu nào được lưu.</p>';
        return;
      }
      res.entries.forEach(e => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const left = document.createElement('div');
        left.className = 'history-item-left';
        const dateEl = document.createElement('div');
        dateEl.className = 'history-date';
        dateEl.textContent = `${e.date} · ${e.weekday}`;
        const summaryEl = document.createElement('div');
        summaryEl.className = 'history-summary';
        summaryEl.textContent = e.summary || 'Không có ghi chú';
        left.appendChild(dateEl);
        left.appendChild(summaryEl);

        const progress = document.createElement('span');
        progress.className = 'history-progress';
        progress.textContent = `${e.checklistDone}/${e.checklistTotal}`;

        div.appendChild(left);
        div.appendChild(progress);
        div.addEventListener('click', () => { loadDay(e.date); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        historyList.appendChild(div);
      });
    });
  }

  prevBtn.addEventListener('click', () => {
    const d = fromDateStr(dateInput.value); d.setDate(d.getDate() - 1); loadDay(toDateStr(d));
  });
  nextBtn.addEventListener('click', () => {
    const d = fromDateStr(dateInput.value); d.setDate(d.getDate() + 1); loadDay(toDateStr(d));
  });
  todayBtn.addEventListener('click', () => loadDay(todayStr()));
  dateInput.addEventListener('change', () => loadDay(dateInput.value));

  // init — always opens on today's date
  if (!configured()) openSettings();
  loadDay(todayStr());
  loadHistory();
})();
