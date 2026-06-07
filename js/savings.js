function renderSavings() {
    const container = document.getElementById('savings-content');
    if (!container) return;
    const items = appData.savings;
    let html = '<div class="card"><div class="card-header"><span class="card-title">🏦 Накопления</span><button onclick="openSavingModal()">➕ Добавить</button></div>';
    if (items.length === 0) html += '<p style="color:var(--text-secondary);">Нет целей.</p>';
    else {
        html += items.map(s => {
            const balance = parseFloat(s.currentBalance) || 0;
            const target = parseFloat(s.targetAmount) || 1;
            const percent = Math.min(100, (balance / target) * 100);
            return `
                <div class="card">
                    <div class="card-header"><span class="card-title">${escapeHtml(s.name)}</span><button class="delete-btn" onclick="deleteSaving('${s.id}')">🗑️</button></div>
                    ${s.desc ? `<p style="color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(s.desc)}</p>` : ''}
                    <div class="row">
                        <div class="field"><label>Накоплено:</label><input type="number" value="${balance}" onchange="updateSavingBalance('${s.id}', parseFloat(this.value))"></div>
                        <span style="color:var(--text-secondary); font-size:14px;">из ${target.toLocaleString()} ₽</span>
                    </div>
                    <div class="progress"><div class="progress-fill green" style="width:${percent}%"></div></div>
                    <div style="margin-top:15px; display:flex; gap:10px; align-items:center;">
                        <input type="number" placeholder="Сумма" id="deposit-amount-${s.id}" style="width:100px;">
                        <button onclick="addDeposit('${s.id}')">➕ Пополнить</button>
                    </div>
                    <div class="log">${renderDepositLog(s.deposits)}</div>
                </div>
            `;
        }).join('');
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderDepositLog(deposits) {
    if (!deposits || deposits.length === 0) return '<div style="color:var(--text-secondary);">Нет пополнений</div>';
    const sorted = [...deposits].sort((a,b) => new Date(b.date) - new Date(a.date));
    return sorted.map(d => {
        const date = new Date(d.date);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
        return `<div class="log-entry"><span>${dateStr} ${timeStr}</span> <span>+${d.amount.toLocaleString()} ₽</span></div>`;
    }).join('');
}

function addDeposit(savingId) {
    const input = document.getElementById(`deposit-amount-${savingId}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return alert('Введите сумму');
    const saving = appData.savings.find(s => s.id === savingId);
    if (!saving) return;
    saving.deposits = saving.deposits || [];
    saving.deposits.push({ date: new Date().toISOString(), amount });
    saving.currentBalance = (parseFloat(saving.currentBalance) || 0) + amount;
    input.value = '';
    saveData();
}

function updateSavingBalance(savingId, newBalance) {
    const saving = appData.savings.find(s => s.id === savingId);
    if (saving) { saving.currentBalance = Math.max(0, parseFloat(newBalance) || 0); saveData(); }
}

function deleteSaving(savingId) {
    if (!confirm('Удалить цель?')) return;
    appData.savings = appData.savings.filter(s => s.id !== savingId);
    saveData();
}

function openSavingModal(id = null) {
    const item = id ? appData.savings.find(s => s.id === id) : null;
    window._modalContext = { type: 'saving', id: id };
    document.getElementById('modal-title').textContent = id ? 'Редактировать цель' : 'Добавить цель';
    document.getElementById('modal-delete-btn').style.display = id ? 'inline-block' : 'none';
    document.getElementById('modal-fields').innerHTML = `
        <div class="field"><label>Название</label><input type="text" id="modal-name" value="${escapeHtml(item?.name || '')}"></div>
        <div class="field"><label>Описание</label><input type="text" id="modal-desc" value="${escapeHtml(item?.desc || '')}"></div>
        <div class="field"><label>Целевая сумма</label><input type="number" id="modal-target" value="${item?.targetAmount || ''}"></div>
    `;
    document.getElementById('modal-overlay').classList.add('active');
}

function saveSaving() {
    const name = document.getElementById('modal-name').value.trim();
    const desc = document.getElementById('modal-desc').value.trim();
    const target = parseFloat(document.getElementById('modal-target').value) || 0;
    if (!name || target <= 0) { alert('Заполните название и сумму'); return; }
    const id = window._modalContext.id;
    if (id) {
        const saving = appData.savings.find(s => s.id === id);
        if (saving) { saving.name = name; saving.desc = desc; saving.targetAmount = target; }
    } else {
        appData.savings.push({ id: Date.now().toString(), name, desc, targetAmount: target, currentBalance: 0, deposits: [] });
    }
    closeModal();
    saveData();
}

function deleteSavingFromModal() {
    if (!confirm('Удалить цель?')) return;
    appData.savings = appData.savings.filter(s => s.id !== window._modalContext.id);
    closeModal();
    saveData();
}