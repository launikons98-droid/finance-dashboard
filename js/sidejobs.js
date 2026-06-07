function renderSideJobs() {
    const container = document.getElementById('sidejobs-content');
    if (!container) return;
    const items = [...appData.sideJobs].sort((a,b) => new Date(b.date) - new Date(a.date));
    let html = `<div class="card"><div class="card-header"><span class="card-title">🔧 Подработки</span><button onclick="openSideJobModal()">➕ Добавить</button></div>`;
    if (items.length === 0) html += '<p style="color:var(--text-secondary);">Нет записей.</p>';
    else {
        html += '<div class="records-header"><span>Дата</span><span>Сумма</span><span>Комментарий</span></div>';
        items.forEach(item => {
            html += `
                <div class="record-row" onclick="openSideJobModal('${item.id}')">
                    <span>${item.date}</span>
                    <span style="text-align:right;">${item.amount.toLocaleString()} ₽</span>
                    <span>${escapeHtml(item.comment || '')}</span>
                </div>`;
        });
    }
    html += '</div>';
    container.innerHTML = html;
}

function openSideJobModal(id = null) {
    const item = id ? appData.sideJobs.find(s => s.id === id) : null;
    window._modalContext = { type: 'sidejob', id: id };
    document.getElementById('modal-title').textContent = id ? 'Редактировать подработку' : 'Добавить подработку';
    document.getElementById('modal-delete-btn').style.display = id ? 'inline-block' : 'none';
    document.getElementById('modal-fields').innerHTML = `
        <div class="field"><label>Дата получения</label><input type="date" id="modal-date" value="${item?.date || ''}"></div>
        <div class="field"><label>Сумма</label><input type="number" id="modal-amount" value="${item?.amount || ''}"></div>
        <div class="field"><label>Комментарий</label><input type="text" id="modal-comment" value="${escapeHtml(item?.comment || '')}"></div>
    `;
    document.getElementById('modal-overlay').classList.add('active');
}

function saveSideJob() {
    const date = document.getElementById('modal-date').value;
    const amount = parseFloat(document.getElementById('modal-amount').value) || 0;
    const comment = document.getElementById('modal-comment').value;
    if (!date || amount <= 0) { alert('Заполните дату и сумму'); return; }
    const id = window._modalContext.id;
    if (id) {
        const item = appData.sideJobs.find(s => s.id === id);
        if (item) { item.date = date; item.amount = amount; item.comment = comment; }
    } else {
        appData.sideJobs.push({ id: Date.now().toString(), date, amount, comment });
    }
    closeModal();
    saveData();
}

function deleteSideJob() {
    if (!confirm('Удалить запись?')) return;
    appData.sideJobs = appData.sideJobs.filter(s => s.id !== window._modalContext.id);
    closeModal();
    saveData();
}