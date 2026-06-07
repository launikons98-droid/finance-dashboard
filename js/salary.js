function renderSalary() {
    const container = document.getElementById('salary-content');
    if (!container) return;
    const items = [...appData.salary].sort((a,b) => new Date(b.date) - new Date(a.date));
    let html = `<div class="card"><div class="card-header"><span class="card-title">💵 Зарплата</span><button onclick="openSalaryModal()">➕ Добавить</button></div>`;
    if (items.length === 0) html += '<p style="color:var(--text-secondary);">Нет записей.</p>';
    else {
        html += '<div class="records-header"><span>Дата ЗП</span><span>Следующая ЗП</span><span>Сумма</span></div>';
        items.forEach(item => {
            html += `
                <div class="record-row" onclick="openSalaryModal('${item.id}')">
                    <span>${item.date}</span>
                    <span>${item.nextSalaryDate || '—'}</span>
                    <span style="text-align:right;">${item.amount.toLocaleString()} ₽</span>
                </div>`;
        });
    }
    html += '</div>';
    container.innerHTML = html;
}

function openSalaryModal(id = null) {
    const item = id ? appData.salary.find(s => s.id === id) : null;
    window._modalContext = { type: 'salary', id: id };
    document.getElementById('modal-title').textContent = id ? 'Редактировать зарплату' : 'Добавить зарплату';
    document.getElementById('modal-delete-btn').style.display = id ? 'inline-block' : 'none';
    document.getElementById('modal-fields').innerHTML = `
        <div class="field"><label>Дата получения</label><input type="date" id="modal-date" value="${item?.date || ''}"></div>
        <div class="field"><label>Дата следующей ЗП</label><input type="date" id="modal-nextdate" value="${item?.nextSalaryDate || ''}"></div>
        <div class="field"><label>Сумма</label><input type="number" id="modal-amount" value="${item?.amount || ''}"></div>
    `;
    document.getElementById('modal-overlay').classList.add('active');
}

function saveSalary() {
    const date = document.getElementById('modal-date').value;
    const nextDate = document.getElementById('modal-nextdate').value;
    const amount = parseFloat(document.getElementById('modal-amount').value) || 0;
    if (!date || amount <= 0) { alert('Заполните дату и сумму'); return; }
    const id = window._modalContext.id;
    if (id) {
        const item = appData.salary.find(s => s.id === id);
        if (item) { item.date = date; item.nextSalaryDate = nextDate; item.amount = amount; }
    } else {
        appData.salary.push({ id: Date.now().toString(), date, nextSalaryDate: nextDate, amount });
    }
    closeModal();
    saveData();
}

function deleteSalary() {
    if (!confirm('Удалить запись?')) return;
    appData.salary = appData.salary.filter(s => s.id !== window._modalContext.id);
    closeModal();
    saveData();
}