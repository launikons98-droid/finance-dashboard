function renderSummary() {
    const container = document.getElementById('summary-content');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const periods = [...appData.salary].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (periods.length === 0) {
        container.innerHTML = '<div class="card"><p>Нет добавленных зарплатных периодов.</p></div>';
        return;
    }

    let html = '';
    periods.forEach(salary => {
        const periodStart = salary.date;
        const periodEnd = salary.nextSalaryDate;
        if (!periodStart || !periodEnd) return; // пропускаем некорректные

        // Подработки внутри периода (дата >= начала и < конца)
        const sideIncome = appData.sideJobs
            .filter(j => j.date >= periodStart && j.date < periodEnd)
            .reduce((sum, j) => sum + j.amount, 0);
        const totalIncome = salary.amount + sideIncome;

        // Обязательные расходы из плана за месяц начала периода
        const startDate = new Date(periodStart);
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const plan = appData.yearlyPlans[year]?.[month];
        const mandatoryTotal = plan?.mandatory?.reduce((sum, m) => sum + m.amount, 0) || 0;

        const daysTotal = Math.round((new Date(periodEnd) - new Date(periodStart)) / (1000 * 60 * 60 * 24));
        const remainingBudget = totalIncome - mandatoryTotal;
        const dailyBudget = daysTotal > 0 ? Math.round(remainingBudget / daysTotal) : 0;

        // Прогресс дней (сколько прошло от начала до сегодня)
        let daysPassed = 0;
        if (today >= periodStart && today < periodEnd) {
            daysPassed = Math.round((new Date(today) - new Date(periodStart)) / (1000 * 60 * 60 * 24));
        } else if (today >= periodEnd) {
            daysPassed = daysTotal; // период завершён
        }
        const progressPercent = daysTotal > 0 ? Math.min(100, (daysPassed / daysTotal) * 100) : 0;

        // Определяем статус периода для цвета рамки
        let statusClass = '';
        if (today >= periodStart && today < periodEnd) statusClass = 'active-period';
        else if (today < periodStart) statusClass = 'future-period';
        else statusClass = 'past-period';

        html += `
            <div class="card period-card ${statusClass}">
                <div class="card-header">
                    <span class="card-title">📅 ${periodStart} – ${periodEnd}</span>
                    <span style="font-size:14px; color:var(--text-secondary);">${daysTotal} дн.</span>
                </div>
                <div class="summary-cards">
                    <div class="summary-item">
                        <div class="icon">💵</div><div class="label">Доход</div>
                        <div class="value accent-green">${totalIncome.toLocaleString()} ₽</div>
                    </div>
                    <div class="summary-item">
                        <div class="icon">📅</div><div class="label">Обязательные</div>
                        <div class="value accent-blue">${mandatoryTotal.toLocaleString()} ₽</div>
                    </div>
                    <div class="summary-item">
                        <div class="icon">🏦</div><div class="label">Остаток</div>
                        <div class="value">${remainingBudget.toLocaleString()} ₽</div>
                    </div>
                    <div class="summary-item">
                        <div class="icon">🎯</div><div class="label">В день</div>
                        <div class="value accent-cyan">${dailyBudget.toLocaleString()} ₽</div>
                    </div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress" style="height:10px;">
                        <div class="progress-fill green" style="width:${progressPercent}%;"></div>
                    </div>
                    <div class="progress-labels">
                        <span>Прошло: ${daysPassed} дн.</span>
                        <span>Осталось: ${daysTotal - daysPassed} дн.</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}