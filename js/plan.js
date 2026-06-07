// ===================== ПЛАН ТРАТ (ГОДОВОЙ) – НОВАЯ ВЕРСИЯ =====================
// Глобальные переменные selectedYear, selectedMonthKey уже объявлены в app.js

function getMonthlyPlan(year, month) {
    if (!appData.yearlyPlans[year]) appData.yearlyPlans[year] = {};
    if (!appData.yearlyPlans[year][month]) {
        appData.yearlyPlans[year][month] = { mandatory: [], flexible: [] };
    }
    return appData.yearlyPlans[year][month];
}

function saveMonthlyPlan(year, month, planData) {
    if (!appData.yearlyPlans[year]) appData.yearlyPlans[year] = {};
    appData.yearlyPlans[year][month] = planData;
    saveData();
}

// Основная функция отрисовки всей вкладки
function renderYearly() {
    const container = document.getElementById('plan-content');
    if (!container) return;

    const years = Object.keys(appData.yearlyPlans).sort((a,b) => b.localeCompare(a));
    let html = '<div class="year-grid" id="year-grid">';
    years.forEach(year => {
        const isActive = (year === selectedYear);
        html += `<div class="year-tile ${isActive ? 'active' : ''}" onclick="selectYear('${year}')">${year}</div>`;
    });
    html += `<div class="year-tile add-year" onclick="addNewYear()">+</div></div>`;

    // Если выбран год, показываем месяцы
    if (selectedYear) {
        const monthsData = appData.yearlyPlans[selectedYear] || {};
        const existingMonths = Object.keys(monthsData).sort();
        html += '<div class="card"><div class="card-header"><span class="card-title">📅 ' + selectedYear + '</span><button class="secondary" onclick="closeYearPanel()">✖</button></div>';
        html += '<div class="month-grid">';
        existingMonths.forEach(month => {
            const data = monthsData[month];
            const hasData = (data.mandatory && data.mandatory.length > 0) || (data.flexible && data.flexible.length > 0);
            const isActive = selectedMonthKey === `${selectedYear}-${month}`;
            html += `<div class="month-tile ${hasData ? 'has-data' : ''} ${isActive ? 'active' : ''}" onclick="openMonth('${selectedYear}','${month}')">${month}</div>`;
        });
        html += '</div>';
        html += `<div class="add-month-row">
            <select id="new-month-select" onclick="event.stopPropagation()">
                <option value="">-- Выберите месяц --</option>
                ${getMissingMonthsOptions(selectedYear)}
            </select>
            <button onclick="event.stopPropagation(); addMonthToYear('${selectedYear}')">➕ Добавить месяц</button>
        </div></div>`;
    }

    // Если выбран конкретный месяц, показываем редактор
    if (selectedMonthKey) {
        const [year, month] = selectedMonthKey.split('-');
        html += renderMonthEditor(year, month);
    }

    container.innerHTML = html;
}

function getMissingMonthsOptions(year) {
    const existing = Object.keys(appData.yearlyPlans[year] || {});
    const allMonths = Array.from({length: 12}, (_, i) => String(i+1).padStart(2, '0'));
    const missing = allMonths.filter(m => !existing.includes(m));
    return missing.map(m => `<option value="${m}">${m}</option>`).join('');
}

function selectYear(year) {
    if (selectedYear === year) {
        selectedYear = null;
        selectedMonthKey = null;
    } else {
        selectedYear = year;
        selectedMonthKey = null;
    }
    renderYearly();
}

function closeYearPanel() {
    selectedYear = null;
    selectedMonthKey = null;
    renderYearly();
}

function addMonthToYear(year) {
    const select = document.getElementById('new-month-select');
    if (!select) return;
    const month = select.value;
    if (!month) return alert('Выберите месяц');
    getMonthlyPlan(year, month); // инициализируем пустой план
    selectedMonthKey = `${year}-${month}`;
    renderYearly();
}

function openMonth(year, month) {
    selectedMonthKey = `${year}-${month}`;
    renderYearly();
}

// ===================== РЕДАКТОР МЕСЯЦА =====================
function renderMonthEditor(year, month) {
    const plan = getMonthlyPlan(year, month);
    const prefix = `edit-${year}-${month}`;

    // Обязательные платежи
    let mandatoryRows = '';
    plan.mandatory.forEach((item, idx) => {
        mandatoryRows += `
            <tr>
                <td><input type="date" value="${item.date || ''}" data-field="date"></td>
                <td><input type="text" value="${escapeHtml(item.description || '')}" data-field="description"></td>
                <td><input type="number" value="${item.amount || ''}" data-field="amount" style="width:100px;"></td>
                <td><button class="delete-btn" onclick="this.closest('tr').remove()">✕</button></td>
            </tr>`;
    });

    // Гибкие траты
    let flexibleRows = '';
    plan.flexible.forEach((item, idx) => {
        flexibleRows += `
            <tr>
                <td><input type="text" value="${escapeHtml(item.category || '')}" data-field="category"></td>
                <td><input type="number" value="${item.budget || ''}" data-field="budget" style="width:100px;"></td>
                <td><input type="number" value="${item.fact || ''}" data-field="fact" style="width:100px;"></td>
                <td><button class="delete-btn" onclick="this.closest('tr').remove()">✕</button></td>
            </tr>`;
    });

    return `
        <div class="card month-editor" id="${prefix}">
            <div class="card-header">
                <span class="card-title">📅 ${month}.${year}</span>
                <div>
                    <button class="secondary" onclick="cancelMonthEdit()">Отмена</button>
                    <button onclick="saveMonth('${year}','${month}')" style="margin-left:10px;">💾 Сохранить</button>
                </div>
            </div>

            <div class="card" style="margin-top:15px;">
                <div class="card-header"><span class="card-title">💸 Обязательные платежи</span></div>
                <table>
                    <thead><tr><th>Дата</th><th>Назначение</th><th>Сумма</th><th></th></tr></thead>
                    <tbody>${mandatoryRows || '<tr><td colspan="4" style="color:var(--text-secondary);">Нет записей</td></tr>'}</tbody>
                </table>
                <button onclick="addRow(this, 'mandatory')" style="margin-top:8px;">➕ Добавить строку</button>
            </div>

            <div class="card">
                <div class="card-header"><span class="card-title">🛒 Гибкие траты</span></div>
                <table>
                    <thead><tr><th>Категория</th><th>Бюджет</th><th>Факт</th><th></th></tr></thead>
                    <tbody>${flexibleRows || '<tr><td colspan="4" style="color:var(--text-secondary);">Нет записей</td></tr>'}</tbody>
                </table>
                <button onclick="addRow(this, 'flexible')" style="margin-top:8px;">➕ Добавить строку</button>
            </div>
        </div>
    `;
}

// Добавление пустой строки в таблицу
function addRow(button, type) {
    const tbody = button.closest('.card').querySelector('tbody');
    // Убираем заглушку "Нет записей", если она есть
    const placeholder = tbody.querySelector('tr td[colspan]');
    if (placeholder) placeholder.parentElement.remove();

    let rowHtml = '';
    if (type === 'mandatory') {
        rowHtml = `
            <tr>
                <td><input type="date" data-field="date"></td>
                <td><input type="text" data-field="description"></td>
                <td><input type="number" data-field="amount" style="width:100px;"></td>
                <td><button class="delete-btn" onclick="this.closest('tr').remove()">✕</button></td>
            </tr>`;
    } else {
        rowHtml = `
            <tr>
                <td><input type="text" data-field="category"></td>
                <td><input type="number" data-field="budget" style="width:100px;"></td>
                <td><input type="number" data-field="fact" style="width:100px;"></td>
                <td><button class="delete-btn" onclick="this.closest('tr').remove()">✕</button></td>
            </tr>`;
    }
    tbody.insertAdjacentHTML('beforeend', rowHtml);
}

// Сохранение данных из редактора в appData и файл
function saveMonth(year, month) {
    const prefix = `edit-${year}-${month}`;
    const editor = document.getElementById(prefix);
    if (!editor) return;

    // Собираем обязательные платежи
    const mandatory = [];
    const mandatoryTable = editor.querySelectorAll('.card')[0]; // первая карточка после заголовка
    mandatoryTable.querySelectorAll('tbody tr').forEach(row => {
        const date = row.querySelector('[data-field="date"]')?.value || '';
        const desc = row.querySelector('[data-field="description"]')?.value || '';
        const amount = parseFloat(row.querySelector('[data-field="amount"]')?.value) || 0;
        if (desc || amount) {
            mandatory.push({
                id: Date.now().toString() + Math.random(), // временный id, при следующем открытии перезапишется
                date, description: desc, amount
            });
        }
    });

    // Собираем гибкие траты
    const flexible = [];
    const flexibleTable = editor.querySelectorAll('.card')[1]; // вторая карточка
    flexibleTable.querySelectorAll('tbody tr').forEach(row => {
        const category = row.querySelector('[data-field="category"]')?.value || '';
        const budget = parseFloat(row.querySelector('[data-field="budget"]')?.value) || 0;
        const fact = parseFloat(row.querySelector('[data-field="fact"]')?.value) || 0;
        if (category || budget || fact) {
            flexible.push({
                id: Date.now().toString() + Math.random(),
                category, budget, fact
            });
        }
    });

    const newPlan = { mandatory, flexible };
    saveMonthlyPlan(year, month, newPlan);
    // Обновляем отображение, чтобы показать плитки месяцев с has-data
    selectedMonthKey = null; // выходим из редактора, чтобы увидеть сетку месяцев
    renderYearly();
    // Можно снова открыть этот месяц для продолжения, но уже без редактора
    // selectedMonthKey = `${year}-${month}`;
    // renderYearly();
}

function cancelMonthEdit() {
    // Просто выходим из редактора, изменения не сохраняются
    selectedMonthKey = null;
    renderYearly();
}

function addNewYear() {
    const year = prompt('Введите год (например, 2027):', new Date().getFullYear());
    if (year && !isNaN(year)) {
        if (!appData.yearlyPlans[year]) {
            appData.yearlyPlans[year] = {};
            saveData();
            selectedYear = year;
            selectedMonthKey = null;
            renderYearly();
        }
    }
}

// Вспомогательная функция для экранирования HTML (если её ещё нет в области видимости)
// Она уже определена в app.js, поэтому здесь дублировать не нужно.