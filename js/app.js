// ===================== ХРАНИЛИЩЕ ДАННЫХ =====================
let appData = {
    salary: [],
    sideJobs: [],
    debts: [],
    yearlyPlans: {},
    savings: []
};
let fileHandle = null;

function getDefaultData() {
    return {
        salary: [],
        sideJobs: [],
        debts: [],
        yearlyPlans: {},
        savings: []
    };
}

// ===================== ФАЙЛОВЫЕ ОПЕРАЦИИ =====================
async function pickExistingFile() {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
            multiple: false
        });
        fileHandle = handle;
        await readAndLoad();
        await saveFileHandleToDB(fileHandle);
        hideWelcome();
        renderAll();
    } catch (err) { console.log('Выбор файла отменён', err); }
}

async function createNewFile() {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'finance_data.json',
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
        });
        fileHandle = handle;
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(getDefaultData(), null, 2));
        await writable.close();
        await readAndLoad();
        await saveFileHandleToDB(fileHandle);
        hideWelcome();
        renderAll();
    } catch (err) { console.log('Создание файла отменено', err); }
}

async function reconnectToSavedFile() {
    const savedHandle = await getSavedFileHandle();
    if (!savedHandle) { alert('Сохранённый файл не найден.'); return; }
    try {
        const opts = { mode: 'readwrite' };
        if (await savedHandle.queryPermission(opts) !== 'granted') await savedHandle.requestPermission(opts);
        fileHandle = savedHandle;
        await readAndLoad();
        hideWelcome();
        renderAll();
    } catch (err) { console.error(err); alert('Не удалось открыть файл.'); await clearSavedFileHandle(); }
}

async function readAndLoad() {
    if (!fileHandle) return;
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (text.trim()) {
        try {
            const parsed = JSON.parse(text);
            appData = { ...getDefaultData(), ...parsed };
            appData.salary = appData.salary || [];
            appData.sideJobs = appData.sideJobs || [];
            appData.debts = appData.debts || [];
            appData.yearlyPlans = appData.yearlyPlans || {};
            appData.savings = appData.savings || [];
            appData.debts.forEach(d => { if (d.archived === undefined) d.archived = false; });
        } catch(e) { appData = getDefaultData(); }
    } else { appData = getDefaultData(); await writeFile(); }
}

async function writeFile() {
    if (!fileHandle) return;
    try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(appData, null, 2));
        await writable.close();
    } catch (err) { console.error('Ошибка записи', err); }
}

async function saveData() { await writeFile(); renderAll(); }

// ===================== ИНДЕКСИРОВАННАЯ БД =====================
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FileHandlesDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveFileHandleToDB(handle) {
    const db = await openDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'fileHandle');
    return new Promise(resolve => { tx.oncomplete = resolve; });
}

async function getSavedFileHandle() {
    const db = await openDB();
    return new Promise(resolve => {
        const tx = db.transaction('handles', 'readonly');
        const request = tx.objectStore('handles').get('fileHandle');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function clearSavedFileHandle() {
    const db = await openDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('fileHandle');
    return new Promise(resolve => { tx.oncomplete = resolve; });
}

function hideWelcome() { document.getElementById('welcome-screen').style.display = 'none'; document.getElementById('app-container').style.display = 'block'; }
function showWelcome() { document.getElementById('welcome-screen').style.display = 'flex'; document.getElementById('app-container').style.display = 'none'; }

// ===================== ЗАГРУЗКА ВКЛАДОК =====================
async function loadTabs() {
    const tabs = ['salary', 'sidejobs', 'debts', 'plan', 'savings', 'summary'];
    for (const name of tabs) {
        const container = document.getElementById(`tab-${name}`);
        try {
            // Добавляем случайный параметр, чтобы избежать кэширования
            const response = await fetch(`tabs/${name}.html?v=${Date.now()}`);
            if (response.ok) container.innerHTML = await response.text();
            else container.innerHTML = '<p style="color:var(--text-secondary);">Ошибка загрузки вкладки</p>';
        } catch (e) { container.innerHTML = '<p style="color:var(--text-secondary);">Не удалось загрузить вкладку</p>'; }
    }
    await initApp();
}

async function initApp() {
    const savedHandle = await getSavedFileHandle();
    if (savedHandle) {
        document.getElementById('reconnect-btn').style.display = 'inline-block';
        document.getElementById('welcome-message').innerHTML = 'У вас уже есть сохранённый файл.<br>Нажмите «Подключить сохранённый файл», чтобы продолжить работу.';
    } else {
        document.getElementById('reconnect-btn').style.display = 'none';
        document.getElementById('welcome-message').innerHTML = 'Выберите файл данных, чтобы начать работу.<br>Если файла ещё нет, создайте новый.';
    }
    document.getElementById('reconnect-btn').addEventListener('click', reconnectToSavedFile);
    document.getElementById('pick-file-btn').addEventListener('click', pickExistingFile);
    document.getElementById('create-file-btn').addEventListener('click', createNewFile);
    showWelcome();
}

// ===================== НАВИГАЦИЯ =====================
let currentDebtFilter = 'active';  // используется во вкладке долгов
let selectedYear = null;
let selectedMonthKey = null;

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    renderTab(tabName);
}

function renderTab(tabName) {
    if (tabName === 'salary') renderSalary();
    else if (tabName === 'sidejobs') renderSideJobs();
    else if (tabName === 'debts') renderDebts();
    else if (tabName === 'plan') renderYearly();
    else if (tabName === 'savings') renderSavings();
    else if (tabName === 'summary') renderSummary();
}

// ===================== МОДАЛЬНОЕ ОКНО (общая часть) =====================
const modalOverlay = document.getElementById('modal-overlay');
window._modalContext = {};

function closeModal() { modalOverlay.classList.remove('active'); }

function saveModal() {
    const ctx = window._modalContext;
    if (!ctx) return;
    if (ctx.type === 'salary') saveSalary();
    else if (ctx.type === 'sidejob') saveSideJob();
    else if (ctx.type === 'debt') saveDebt();
    else if (ctx.type === 'saving') saveSaving();
    else if (ctx.type === 'mandatory' || ctx.type === 'flexible') savePlanRecord();
}

function deleteModalRecord() {
    const ctx = window._modalContext;
    if (!ctx) return;
    if (ctx.type === 'salary') deleteSalary();
    else if (ctx.type === 'sidejob') deleteSideJob();
    else if (ctx.type === 'debt') deleteDebt();
    else if (ctx.type === 'saving') deleteSavingFromModal();
    else if (ctx.type === 'mandatory' || ctx.type === 'flexible') deletePlanRecord();
}
document.getElementById('modal-delete-btn').addEventListener('click', deleteModalRecord);

// ===================== УТИЛИТЫ =====================
function renderAll() {
    const activeTab = document.querySelector('.tab-content.active').id;
    if (activeTab === 'tab-salary') renderSalary();
    else if (activeTab === 'tab-sidejobs') renderSideJobs();
    else if (activeTab === 'tab-debts') renderDebts();
    else if (activeTab === 'tab-plan') renderYearly();
    else if (activeTab === 'tab-savings') renderSavings();
    else if (activeTab === 'tab-summary') renderSummary();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================== ЗАПУСК =====================
window.addEventListener('DOMContentLoaded', loadTabs);