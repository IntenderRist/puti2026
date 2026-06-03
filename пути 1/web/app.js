const DATA_PATH = 'data/ats.json';
const STORAGE_KEY = 'guide_database_v1';
const SESSION_KEY = 'guide_user_session_v1';
const USERS = [
  { username: 'user', password: 'user123', role: 'user', label: 'Обычный пользователь' },
  { username: 'admin', password: 'admin123', role: 'admin', label: 'Администратор' }
];

const state = {
  entries: [],
  activeEntry: null,
  section: 'home',
  searchQuery: '',
  user: null,
  mapReady: false,
  map: null,
  mapMarker: null
};

const DEFAULT_FIELDS = [
  'index', 'Объект', 'Поме-щение', 'Расположение', '№ ком', 'Доп. Ключи', 'телефон', 'Узел', 'Автоматы', 'Примечание'
];

function createId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseEntries(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.entries)) {
      return raw.entries;
    }
    const arrays = Object.values(raw).filter(Array.isArray);
    if (arrays.length === 1) {
      return arrays[0];
    }
    return arrays.flat();
  }
  return [];
}

async function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
        return parsed.entries;
      }
    } catch (error) {
      console.warn('Не удалось прочитать сохранённые данные', error);
    }
  }

  try {
    const response = await fetch(DATA_PATH);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки данных: ${response.status}`);
    }
    const json = await response.json();
    const entries = parseEntries(json);
    saveDatabase(entries);
    return entries;
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    showToast('Не удалось загрузить базу данных. Проверьте файл data/ats.json.', 'danger');
    return [];
  }
}

function saveDatabase(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, savedAt: Date.now() }));
}

function saveSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function restoreSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getFieldList(entries) {
  const keys = new Set(DEFAULT_FIELDS);
  entries.forEach(entry => Object.keys(entry).forEach(key => keys.add(key)));
  return Array.from(keys);
}

function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.classList.remove('toast--hidden');
  setTimeout(() => {
    toast.classList.add('toast--hidden');
  }, 2600);
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function formatEntryTitle(entry) {
  return entry['Объект'] || entry['Поме-щение'] || entry['Расположение'] || `Объект ${entry.index || ''}`;
}

function buildNav() {
  const nav = document.getElementById('topnav');
  if (!nav) return;
  nav.innerHTML = '';

  const navItems = [
    { section: 'home', label: 'Главная' },
    { section: 'search', label: 'Поиск' }
  ];
  if (state.user?.role === 'admin') {
    navItems.push({ section: 'admin', label: 'Администрирование' });
  }

  navItems.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    if (state.section === item.section) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => navigate(item.section));
    nav.appendChild(button);
  });
}

function updateUserStatus() {
  const status = document.getElementById('user-status');
  const authButton = document.getElementById('auth-button');
  if (!status || !authButton) return;

  if (state.user) {
    status.textContent = `${state.user.label} (${state.user.role})`;
    authButton.textContent = 'Выйти';
    authButton.onclick = () => {
      state.user = null;
      saveSession(null);
      showToast('Вы вышли из системы');
      render();
    };
  } else {
    status.textContent = 'Неавторизованный доступ';
    authButton.textContent = 'Войти';
    authButton.onclick = openLoginModal;
  }
}

function navigate(section) {
  state.section = section;
  window.location.hash = section;
  render();
}

function openModal(contentHtml) {
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  if (!modal || !modalContent) return;
  modalContent.innerHTML = contentHtml;
  modal.classList.remove('modal--hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.classList.add('modal--hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function openLoginModal() {
  openModal(`
    <div class="section-header">
      <div>
        <h2>Вход в систему</h2>
        <p>Авторизуйтесь как обычный пользователь или администратор.</p>
      </div>
    </div>
    <form id="login-form" class="panel">
      <div class="input-group">
        <label for="login-username">Имя пользователя</label>
        <input id="login-username" name="username" type="text" autocomplete="username" required />
      </div>
      <div class="input-group">
        <label for="login-password">Пароль</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required />
      </div>
      <div class="panel__toolbar">
        <button class="button button--primary" type="submit">Войти</button>
      </div>
      <div class="details-field">
        <div class="details-field__label">Тестовые учетные записи</div>
        <div class="details-field__value">user / user123 и admin / admin123</div>
      </div>
    </form>
  `);

  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) {
      showToast('Неправильное имя или пароль', 'danger');
      return;
    }
    state.user = { username: user.username, role: user.role, label: user.label };
    saveSession(state.user);
    closeModal();
    showToast(`Выполнен вход как ${user.label}`);
    render();
  });
}

function buildHome() {
  const total = state.entries.length;
  const addresses = new Set(state.entries.map(entry => entry['Объект'] || entry['Расположение'] || '').filter(Boolean)).size;
  const phoneCount = state.entries.filter(entry => entry['телефон']).length;

  return `
    <div class="section-header">
      <div>
        <h2>Главная</h2>
        <p>Единый интерфейс справочника для поиска адресов, просмотра объектов, работы с данными и управления доступом.</p>
      </div>
      <button class="button button--primary" type="button" onclick="navigate('search')">Перейти к поиску</button>
    </div>
    <div class="stats-grid">
      <div class="card stats-card stats-card--expandable">
        <div class="stats-card__value">${total}</div>
        <div class="stats-card__label">Объекты в базе</div>
        <div class="stats-card__description">Общее количество записей со всеми адресами, контактами и дополнительной информацией, хранящимися в справочнике.</div>
      </div>
      <div class="card stats-card stats-card--expandable">
        <div class="stats-card__value">${addresses}</div>
        <div class="stats-card__label">Уникальные адреса</div>
        <div class="stats-card__description">Количество различных адресов в базе. Может быть меньше, чем объектов, если несколько контактов относятся к одному адресу.</div>
      </div>
      <div class="card stats-card stats-card--expandable">
        <div class="stats-card__value">${phoneCount}</div>
        <div class="stats-card__label">Средства связи</div>
        <div class="stats-card__description">Количество записей с указанными телефонными номерами. Используется для быстрого поиска по контактам.</div>
      </div>
      <div class="card stats-card stats-card--expandable">
        <div class="stats-card__value">${state.user ? state.user.role : 'Гость'}</div>
        <div class="stats-card__label">Текущая роль</div>
        <div class="stats-card__description">Ваша текущая роль в системе определяет доступные функции. Администратор может редактировать данные, пользователь только просматривает.</div>
      </div>
    </div>
    <div class="card">
      <div class="card__header">
        <div>
          <h3 class="card__title">Краткое описание основных функций</h3>
          <p class="card__subtitle">Введите данные, чтобы быстро найти информацию и поделиться ею с коллегами.</p>
        </div>
      </div>
      <div class="card__body">
        <div class="details-field">
          <div class="details-field__label">Поиск</div>
          <div class="details-field__value">Быстрый поиск по названию, адресу, номерам и контактным данным.</div>
        </div>
        <div class="details-field">
          <div class="details-field__label">Администрирование</div>
          <div class="details-field__value">Добавление, редактирование и удаление записей в базе данных.</div>
        </div>
        <div class="details-field">
          <div class="details-field__label">Доступные роли</div>
          <div class="details-field__value">Обычный доступ позволит только просмотр, администратор может редактировать.</div>
        </div>
      </div>
    </div>
  `;
}

function matchEntry(entry, query) {
  const text = Object.values(entry).map(value => String(value || '').toLowerCase()).join(' ');
  return text.includes(query.toLowerCase());
}

function highlightMatches(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function createResultCard(entry) {
  const query = state.searchQuery;
  const title = formatEntryTitle(entry);
  const subtitle = entry['Расположение'] || entry['Поме-щение'] || entry['Объект'] || 'Дополнительная информация';
  const phone = entry['телефон'] ? `<div class="details-field__value"><strong>Телефон:</strong> ${highlightMatches(entry['телефон'], query)}</div>` : '';
  return `
    <button type="button" class="card card--clickable" onclick='selectEntry("${entry.__id}")'>
      <div class="card__header">
        <div>
          <h3 class="card__title">${highlightMatches(title, query)}</h3>
          <p class="card__subtitle">${highlightMatches(subtitle, query)}</p>
        </div>
      </div>
      <div class="card__body">
        ${phone}
      </div>
    </button>
  `;
}

function renderSearch() {
  const query = state.searchQuery;
  const results = query ? state.entries.filter(entry => matchEntry(entry, query)) : state.entries;
  const resultCards = results.map(entry => createResultCard(entry)).join('');
  const active = state.activeEntry || results[0] || null;
  if (!state.activeEntry && active) {
    state.activeEntry = active;
  }
  const activePanel = active ? renderDetailPanel(active) : '<div class="map-fallback">Выберите запись для просмотра подробной информации и карты.</div>';
  return `
    <div class="section-header">
      <div>
        <h2>Поиск объектов в справочнике</h2>
        <p>Найдите запись по любому полю данных. Выберите интересующий объект слева, чтобы посмотреть подробности.</p>
      </div>
      <button class="button button--primary" type="button" onclick="focusSearch()">Начать поиск</button>
    </div>
    <div class="card panel">
      <div class="input-group">
        <label for="global-search">Поиск по всем полям</label>
        <input id="global-search" type="search" placeholder="Введите название, адрес или телефон" value="${escapeHtml(query)}" autocomplete="off" />
      </div>
    </div>
    <div class="section-grid">
      <div class="panel">
        <div class="panel__toolbar">
          <div class="details-field__value">Результаты: ${results.length} ${results.length === 1 ? 'запись' : 'записей'}</div>
        </div>
        <div class="card-grid" id="search-results-grid">
          ${resultCards}
        </div>
      </div>
      <div class="panel details-panel">
        ${activePanel}
      </div>
    </div>
  `;
}

function renderDetailPanel(entry) {
  const fieldKeys = Object.keys(entry).filter(key => key !== '__id' && !/^ext_\d+$/.test(key));
  const fieldRows = fieldKeys
    .filter(key => entry[key] && entry[key] !== '*')
    .map(key => `
      <div class="details-field">
        <div class="details-field__label">${escapeHtml(key)}</div>
        <div class="details-field__value">${escapeHtml(String(entry[key]))}</div>
      </div>
    `)
    .join('');
  const actions = state.user?.role === 'admin' ? `
    <div class="details-actions">
      <button class="action-pill" type="button" onclick='openEntryForm("${entry.__id}")'>Редактировать</button>
      <button class="action-pill" type="button" onclick='deleteEntry("${entry.__id}")'>Удалить</button>
    </div>
  ` : '';
  setTimeout(() => showEntryOnMap(entry), 50);
  const address = entry['Объект'] || entry['Расположение'] || entry['Поме-щение'] || 'Адрес неизвестен';
  return `
    <div class="details-panel">
      <div class="card__header">
        <div>
          <h3 class="card__title">${escapeHtml(formatEntryTitle(entry))}</h3>
          <p class="card__subtitle">Полная информация об объекте</p>
        </div>
      </div>
      <div class="details-fields">
        ${fieldRows}
      </div>
      ${actions}
      <div class="map-card">
        <div class="map-overlay">${escapeHtml(address)}</div>
        <div id="map-panel"></div>
      </div>
    </div>
  `;
}

function buildAdmin() {
  if (state.user?.role !== 'admin') {
    return `
      <div class="section-header">
        <div>
          <h2>Только для администраторов</h2>
          <p>Недостаточно прав для доступа к этому разделу.</p>
        </div>
      </div>
      <div class="card">
        <div class="details-field__value">Извините, вам нужно авторизоваться как администратор для доступа к этому разделу.</div>
      </div>
    `;
  }
  const rows = state.entries.map(entry => `
    <tr>
      <td>${escapeHtml(String(entry.index || ''))}</td>
      <td>${escapeHtml(String(entry['Объект'] || ''))}</td>
      <td>${escapeHtml(String(entry['Поме-щение'] || ''))}</td>
      <td>${escapeHtml(String(entry['Узел'] || ''))}</td>
      <td>${escapeHtml(String(entry['телефон'] || ''))}</td>
      <td>
        <button class="button button--ghost" type="button" onclick='openEntryForm("${entry.__id}")'>Изменить</button>
        <button class="button button--ghost" type="button" onclick='deleteEntry("${entry.__id}")'>Удалить</button>
      </td>
    </tr>
  `).join('');
  return `
    <div class="section-header">
      <div>
        <h2>Администрирование базы</h2>
        <p>Здесь можно добавлять, редактировать и удалять записи в базе данных.</p>
      </div>
      <button class="button button--primary" type="button" onclick="openEntryForm()">Добавить запись</button>
    </div>
    <div class="card panel">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Объект</th>
              <th>Помещение</th>
              <th>Узел</th>
              <th>Телефон</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function render() {
  buildNav();
  updateUserStatus();
  const root = document.getElementById('app-root');
  if (!root) return;
  let html = '';
  if (state.section === 'search') {
    html = renderSearch();
  } else if (state.section === 'admin') {
    html = buildAdmin();
  } else {
    html = buildHome();
  }
  root.innerHTML = html;
  attachSearchHandler();
  attachModalControls();
  if (state.section === 'search') {
    initMap();
  }
}

function updateSearchResults() {
  const query = state.searchQuery;
  const results = query ? state.entries.filter(entry => matchEntry(entry, query)) : state.entries;
  
  const resultCards = results.map(entry => createResultCard(entry)).join('');
  const active = state.activeEntry || results[0] || null;
  if (!state.activeEntry && active) {
    state.activeEntry = active;
  }
  
  const resultsGrid = document.getElementById('search-results-grid');
  if (resultsGrid) {
    resultsGrid.innerHTML = resultCards;
  }
  
  const resultsCount = document.querySelector('.panel__toolbar .details-field__value');
  if (resultsCount) {
    resultsCount.textContent = `Результаты: ${results.length} ${results.length === 1 ? 'запись' : 'записей'}`;
  }
  
  const detailsPanel = document.querySelector('.details-panel');
  if (detailsPanel) {
    const activePanel = active ? renderDetailPanel(active) : '<div class="map-fallback">Выберите запись для просмотра подробной информации и карты.</div>';
    detailsPanel.innerHTML = activePanel;
  }
}

function attachSearchHandler() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', event => {
    state.searchQuery = event.target.value.trim();
    updateSearchResults();
  });
}

function attachModalControls() {
  const backdrop = document.getElementById('modal-backdrop');
  const closeButton = document.getElementById('modal-close');
  if (backdrop) backdrop.onclick = closeModal;
  if (closeButton) closeButton.onclick = closeModal;
}

function focusSearch() {
  const input = document.getElementById('global-search');
  if (input) input.focus();
}

function selectEntry(id) {
  const entry = state.entries.find(item => item.__id === id);
  if (!entry) return;
  state.activeEntry = entry;
  render();
}

function openEntryForm(entryId = '') {
  const editing = Boolean(entryId);
  const entry = editing ? state.entries.find(item => item.__id === entryId) : {};
  const fields = getFieldList([entry]);
  const fieldsHtml = fields
    .filter(key => key !== '__id' && !/^ext_\d+$/.test(key))
    .map(key => `
    <div class="input-group">
      <label for="field-${encodeURIComponent(key)}">${escapeHtml(key)}</label>
      <input id="field-${encodeURIComponent(key)}" name="${escapeHtml(key)}" value="${escapeHtml(entry[key] || '')}" />
    </div>
  `).join('');
  openModal(`
    <div class="section-header">
      <div>
        <h2>${editing ? 'Редактирование записи' : 'Добавление новой записи'}</h2>
        <p>Заполните поля и нажмите сохранить. Данные сохранятся автоматически.</p>
      </div>
    </div>
    <form id="entry-form" class="panel">
      ${fieldsHtml}
      <div class="panel__toolbar">
        <button class="button button--primary" type="submit">Сохранить</button>
        <button class="button button--ghost" type="button" id="cancel-entry">Отмена</button>
      </div>
    </form>
  `);
  const form = document.getElementById('entry-form');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const newEntry = {};
    const filteredFields = fields.filter(key => key !== '__id' && !/^ext_\d+$/.test(key));
    filteredFields.forEach(key => {
      const value = formData.get(key);
      if (value !== null && String(value).trim() !== '') {
        newEntry[key] = String(value).trim();
      }
    });
    if (editing) {
      newEntry.__id = entry.__id;
      const index = state.entries.findIndex(item => item.__id === entry.__id);
      if (index >= 0) {
        state.entries[index] = newEntry;
      }
      showToast('Запись обновлена');
    } else {
      newEntry.__id = createId();
      state.entries.unshift(newEntry);
      showToast('Запись добавлена');
    }
    saveDatabase(state.entries);
    closeModal();
    render();
  });
  const cancelButton = document.getElementById('cancel-entry');
  if (cancelButton) cancelButton.onclick = closeModal;
}

function deleteEntry(entryId) {
  if (!confirm('Удалить запись? Это действие нельзя отменить.')) return;
  const index = state.entries.findIndex(item => item.__id === entryId);
  if (index >= 0) {
    state.entries.splice(index, 1);
    saveDatabase(state.entries);
    if (state.activeEntry?.__id === entryId) {
      state.activeEntry = null;
    }
    showToast('Запись удалена');
    render();
  }
}

function initMap() {
  const panel = document.getElementById('map-panel');
  if (!panel) return;
  if (state.map) return;
  if (window.ymaps) {
    ymaps.ready(() => {
      state.map = new ymaps.Map('map-panel', {
        center: [55.76, 37.64],
        zoom: 10,
        controls: ['zoomControl', 'fullscreenControl']
      });
      state.mapReady = true;
      if (state.activeEntry) {
        showEntryOnMap(state.activeEntry);
      }
    });
  } else {
    panel.innerHTML = '<div class="map-fallback">Карты недоступны. Проверьте подключение.</div>';
  }
}

function showEntryOnMap(entry) {
  if (!entry || !state.mapReady || !state.map) return;
  const panel = document.getElementById('map-panel');
  if (!panel) return;
  const address = entry['Объект'] || entry['Расположение'] || entry['Поме-щение'];
  if (!address) return;
  ymaps.geocode(address, { results: 1 }).then(res => {
    const geoObject = res.geoObjects.get(0);
    if (!geoObject) {
      panel.innerHTML = '<div class="map-fallback">Не удалось показать адрес на карте.</div>';
      return;
    }
    const coords = geoObject.geometry.getCoordinates();
    state.map.setCenter(coords, 14, { checkZoomRange: true });
    if (state.mapMarker) {
      state.map.geoObjects.remove(state.mapMarker);
    }
    state.mapMarker = new ymaps.Placemark(coords, { balloonContent: formatEntryTitle(entry) }, { preset: 'islands#redIcon' });
    state.map.geoObjects.add(state.mapMarker);
  }).catch(() => {
    panel.innerHTML = '<div class="map-fallback">Ошибка при загрузке карты.</div>';
  });
}

window.addEventListener('hashchange', () => {
  state.section = window.location.hash.slice(1) || 'home';
  render();
});

window.selectEntry = selectEntry;
window.openEntryForm = openEntryForm;
window.deleteEntry = deleteEntry;
window.navigate = navigate;

function attachModalControls() {
  const backdrop = document.getElementById('modal-backdrop');
  const closeButton = document.getElementById('modal-close');
  if (backdrop) backdrop.onclick = closeModal;
  if (closeButton) closeButton.onclick = closeModal;
}

(async () => {
  const sessionUser = restoreSession();
  if (sessionUser) {
    state.user = sessionUser;
  }
  const entries = await loadData();
  state.entries = entries.map((entry, idx) => ({ ...entry, __id: entry.__id || createId(), index: entry.index || idx + 1 }));
  state.section = window.location.hash.slice(1) || 'home';
  render();
})();
