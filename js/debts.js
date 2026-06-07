function setDebtFilter(filter) {
    currentDebtFilter = filter;
    document.getElementById('filter-active-btn').classList.toggle('active', filter === 'active');
    document.getElementById('filter-archived-btn').classList.toggle('active', filter === 'archived');
    renderDebts();
}

function getFilteredDebts() {
    return currentDebtFilter === 'active' ? appData.debts.filter(d => !d.archived) : appData.debts.filter(d => d.archived);
}

function renderDebts() {
    const container = document.getElementById('debts-content');
    if (!container) return;
    const debts = getFilteredDebts();
    let html = `<div class="filter-bar">
        <button id="filter-active-btn" class="tab-btn ${currentDebtFilter==='active'?'active':''}" style="border-radius:8px; padding:6px 18px;" onclick="setDebtFilter('active')">Активные</button>
        <button id="filter-archived-btn" class="tab-btn ${currentDebtFilter==='archived'?'active':''}" style="border-radius:8px; padding:6px 18px;" onclick="setDebtFilter('archived')">📦 Архив</button>
    </div>`;
    if (debts.length === 0) {
        html += '<p style="color:var(--text-secondary);">Нет долгов.</p>';
    } else {
        html += debts.map(debt => {
            const paid = Math.max(0, debt.initialAmount - debt.currentRemain);
            const percent = debt.initialAmount > 0 ? Math.min(100, (paid / debt.initialAmount) * 100) : 0;
            const isArchived = debt.archived;
            return `
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">${escapeHtml(debt.name)}</span>
                        <div style="display:flex; gap:8px;">
                            ${isArchived 
                                ? '<button class="success" onclick="restoreDebt(\'' + debt.id + '\')">📤</button>'
                                : '<button class="secondary" onclick="archiveDebt(\'' + debt.id + '\')">📥</button>'}
                        </div>
                    </div>
                    ${debt.desc ? `<p style="color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(debt.desc)}</p>` : ''}
                    <div class="row">
                        <div class="field"><label>Остаток:</label><input type="number" value="${debt.currentRemain}" onchange="updateDebtRemain('${debt.id}', parseFloat(this.value))" ${isArchived ? 'disabled' : ''}></div>
                        <span style="color:var(--text-secondary); font-size:14px;">из ${debt.initialAmount.toLocaleString()} ₽</span>
                    </div>
                    <div class="progress"><div class="progress-fill blue" style="width:${percent}%"></div></div>
                    <div style="font-size:13px; color:var(--text-secondary);">Погашено: ${percent.toFixed(1)}%</div>
                    ${!isArchived ? `
                    <div style="margin-top:15px; display:flex; gap:10px; align-items:center;">
                        <input type="number" placeholder="Сумма" id="payment-amount-${debt.id}" style="width:100px;">
                        <select id="payment-type-${debt.id}"><option value="planned">Плановое</option><option value="extra">Досрочное</option></select>
                        <button onclick="addDebtPayment('${debt.id}')">➕ Платёж</button>
                    </div>` : ''}
                    <div class="log">${renderDebtLog(debt.payments)}</div>
                </div>
            `;
        }).join('');
    }
    html += `<button onclick="openDebtModal()" style="margin-top:15px;">➕ Добавить долг</button>`;
    container.innerHTML = html;
}

function renderDebtLog(payments) {
    if (!payments || payments.length === 0) return '<div style="color:var(--text-secondary);">Нет платежей</div>';
    const sorted = [...payments].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.map(p => {
        const d = new Date(p.date);
        const dateStr = d.toLocaleDateString('ru-RU');
        const timeStr = d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
        const typeLabel = p.type === 'extra' ? 'Досрочное' : 'Плановое';
        const color = p.type === 'extra' ? 'var(--green)' : 'var(--accent)';
        return `<div class="log-entry"><span>${dateStr} ${timeStr} <span style="color:${color};">${typeLabel}</span></span> <span>-${p.amount.toLocaleString()} ₽</span></div>`;
    }).join('');
}

function archiveDebt(debtId) { const debt = appData.debts.find(d => d.id === debtId); if (debt) { debt.archived = true; saveData(); } }
function restoreDebt(debtId) { const debt = appData.debts.find(d => d.id === debtId); if (debt) { debt.archived = false; saveData(); } }

function addDebtPayment(debtId) {
    const amountInput = document.getElementById(`payment-amount-${debtId}`);
    const typeSelect = document.getElementById(`payment-type-${debtId}`);
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) return alert('Введите сумму');
    const type = typeSelect.value;
    const debt = appData.debts.find(d => d.id === debtId);
    if (!debt) return;
    debt.payments.push({ date: new Date().toISOString(), amount, type });
    debt.currentRemain = Math.max(0, debt.currentRemain - amount);
    amountInput.value = '';
    saveData();
}

function updateDebtRemain(debtId, newRemain) { const debt = appData.debts.find(d => d.id === debtId); if (debt) { debt.currentRemain = Math.max(0, parseFloat(newRemain) || 0); saveData(); } }

function openDebtModal(id = null) {
    const item = id ? appData.debts.find(d => d.id === id) : null;
    window._modalContext = { type: 'debt', id: id };
    document.getElementById('modal-title').textContent = id ? 'Редактировать долг' : 'Добавить долг';
    document.getElementById('modal-delete-btn').style.display = id ? 'inline-block' : 'none';
    document.getElementById('modal-fields').innerHTML = `
        <div class="field"><label>Название</label><input type="text" id="modal-name" value="${escapeHtml(item?.name || '')}"></div>
        <div class="field"><label>Описание</label><input type="text" id="modal-desc" value="${escapeHtml(item?.desc || '')}"></div>
        <div class="field"><label>Сумма долга</label><input type="number" id="modal-amount" value="${item?.initialAmount || ''}"></div>
    `;
    document.getElementById('modal-overlay').classList.add('active');
}

function saveDebt() {
    const name = document.getElementById('modal-name').value.trim();
    const desc = document.getElementById('modal-desc').value.trim();
    const amount = parseFloat(document.getElementById('modal-amount').value) || 0;
    if (!name || amount <= 0) { alert('Заполните название и сумму'); return; }
    const id = window._modalContext.id;
    if (id) {
        const debt = appData.debts.find(d => d.id === id);
        if (debt) { debt.name = name; debt.desc = desc; debt.initialAmount = amount; debt.currentRemain = amount; }
    } else {
        appData.debts.push({ id: Date.now().toString(), name, desc, initialAmount: amount, currentRemain: amount, payments: [], archived: false });
    }
    closeModal();
    saveData();
}

function deleteDebt() {
    if (!confirm('Удалить долг?')) return;
    appData.debts = appData.debts.filter(d => d.id !== window._modalContext.id);
    closeModal();
    saveData();
}