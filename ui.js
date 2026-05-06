// ============================================================
// SAVINGS TRACKER APP - UI & INTERACTIONS
// ============================================================

class SavingsUI {
    constructor() {
        this.charts = {
            spending: null,
            savings: null,
            expenses: null,
            fileSpending: null,
            fileSavings: null,
            fileExpenses: null
        };
        this.loadedData = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentMonthAutomatically();
        this.setTodayDate();
        this.render();
        this.updateHeaderVisibility('daily-tracker'); // Show appropriate buttons on load
    }

    // ============================================================
    // SETUP & RENDER
    // ============================================================

    setTodayDate() {
        // Use local date, not UTC date (toISOString() causes timezone issues)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayLocal = `${year}-${month}-${day}`;
        
        const dateInput = document.getElementById('expenseDate');
        dateInput.value = todayLocal;
        dateInput.max = todayLocal; // Only allow current date or past dates
    }

    /**
     * Set current month to system month automatically
     * Check if month changed and update currentMonthId
     */
    setCurrentMonthAutomatically() {
        const today = new Date();
        const currentMonthId = app.getMonthId(today);
        const previousMonthId = app.data.currentMonthId;
        
        // If month changed, update it
        if (previousMonthId !== currentMonthId) {
            const previousMonth = app.data.months.find(m => m.id === previousMonthId)
                || app.getPreviousMonthBefore(currentMonthId);
            this.autoExportPreviousMonth(previousMonth, currentMonthId);

            const monthExists = app.data.months.find(m => m.id === currentMonthId);
            if (!monthExists) {
                // Auto-create current month if doesn't exist
                app.addMonth(today);
            } else {
                app.setCurrentMonth(currentMonthId);
            }
        }
    }

    autoExportPreviousMonth(previousMonth, currentMonthId) {
        if (!previousMonth) return;

        const exportKey = `autoExportedPreviousMonth:${previousMonth.id}:for:${currentMonthId}`;
        if (localStorage.getItem(exportKey)) return;

        localStorage.setItem(exportKey, 'true');
        this.downloadJSON(
            {
                exportedAt: new Date().toISOString(),
                reason: 'Automatic export when month changed',
                month: previousMonth
            },
            `savings-${previousMonth.id}-auto-export.json`
        );
    }

    render() {
        this.renderMonthSelector();
        this.renderDailyTracker();
        this.renderMonthSetup();
        this.renderMonthOverview();
        this.renderInvestments();
        this.renderHistory();
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Month Selector
        document.getElementById('monthSelector').addEventListener('change', (e) => {
            app.setCurrentMonth(e.target.value);
            this.render();
        });

        // New Month Button
        document.getElementById('newMonthBtn').addEventListener('click', () => this.showNewMonthModal());

        // Expense Form
        document.getElementById('expenseForm').addEventListener('submit', (e) => this.handleExpenseSubmit(e));

        // Expense Date Change - Update entries display
        document.getElementById('expenseDate').addEventListener('change', () => {
            const selectedDate = document.getElementById('expenseDate').value;
            document.getElementById('selectedDateLabel').textContent = selectedDate === app.getLocalDateString()
                ? "Today's"
                : `${selectedDate}'s`;
            this.renderSelectedDateEntry(selectedDate);
            this.renderEntriesForSelectedDate();
        });

        // Month Setup Form
        document.getElementById('monthSetupForm').addEventListener('submit', (e) => this.handleMonthSetup(e));
        ['income', 'investments', 'daysInMonth', 'applyFlexibleCarryForward'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', () => this.updateCalculatedValues());
            if (input) input.addEventListener('change', () => this.updateCalculatedValues());
        });

        // Add Expense Item Button
        document.getElementById('addExpenseItemBtn').addEventListener('click', () => this.handleAddExpenseItem());

        // Copy from Previous
        document.getElementById('copyFromPrevBtn').addEventListener('click', () => this.copyFromPreviousMonth());

        // Export Button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());

        // File Loading
        document.getElementById('loadFileBtn').addEventListener('click', () => this.handleFileLoad());
        document.getElementById('fileMonthSelect').addEventListener('change', (e) => this.handleFileMonthSelect(e.target.value));

        // Sub-tab Navigation (for Savings Goals & Investments)
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSubTab(e.target.dataset.subtab));
        });

        // Investment Form Handlers
        const addMonthlyInvestBtn = document.getElementById('addMonthlyInvestBtn');
        if (addMonthlyInvestBtn) {
            addMonthlyInvestBtn.addEventListener('click', () => this.handleAddMonthlyInvestment());
        }

        const addDailyInvestBtn = document.getElementById('addDailyInvestBtn');
        if (addDailyInvestBtn) {
            addDailyInvestBtn.addEventListener('click', () => this.handleAddDailyInvestment());
        }

        // Modal Controls
        const modal = document.getElementById('newMonthModal');
        const closeButtons = modal.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeNewMonthModal());
        });

        document.getElementById('createMonthBtn').addEventListener('click', () => this.createNewMonth());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeNewMonthModal();
            }
        });
    }

    switchSubTab(subTabName) {
        // Update active sub-tab button
        document.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-subtab="${subTabName}"]`).classList.add('active');

        // Update active sub-tab content
        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(subTabName).classList.add('active');
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Update header visibility
        this.updateHeaderVisibility(tabName);

        if (tabName === 'month-overview') {
            setTimeout(() => this.updateCharts(), 100);
        }

        if (tabName === 'investment-tracker') {
            this.renderInvestments();
        }
    }

    /**
     * Show/hide header buttons based on active tab
     */
    updateHeaderVisibility(tabName) {
        const newMonthBtn = document.getElementById('newMonthBtn');
        const exportBtn = document.getElementById('exportBtn');
        const monthSelector = document.getElementById('monthSelector');

        // Show new month button only in month-setup
        newMonthBtn.style.display = tabName === 'month-setup' ? 'block' : 'none';

        // Show export button only in month-overview
        exportBtn.style.display = tabName === 'month-overview' ? 'block' : 'none';

        // Make month selector readonly (disabled) in daily-tracker
        monthSelector.disabled = tabName === 'daily-tracker';
    }

    // ============================================================
    // MONTH SELECTOR
    // ============================================================

    renderMonthSelector() {
        const selector = document.getElementById('monthSelector');
        selector.innerHTML = '';

        app.data.months.forEach(month => {
            const option = document.createElement('option');
            option.value = month.id;
            option.textContent = month.monthName;
            if (month.id === app.data.currentMonthId) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }

    showNewMonthModal() {
        document.getElementById('newMonthModal').classList.add('show');
        // Set default to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthStr = nextMonth.toISOString().split('T')[0].slice(0, 7);
        document.getElementById('newMonthSelect').value = monthStr;
    }

    closeNewMonthModal() {
        document.getElementById('newMonthModal').classList.remove('show');
    }

    createNewMonth() {
        const monthStr = document.getElementById('newMonthSelect').value;
        if (!monthStr) {
            alert('Please select a month');
            return;
        }

        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1, 1);

        if (app.addMonth(date)) {
            this.renderMonthSelector();
            this.render();
            this.closeNewMonthModal();
            alert('Month created successfully!');
        } else {
            alert('This month already exists');
        }
    }

    copyFromPreviousMonth() {
        if (!app.currentMonth) return;

        const monthIndex = app.data.months.findIndex(m => m.id === app.currentMonth.id);
        if (monthIndex <= 0) {
            alert('No previous month to copy from');
            return;
        }

        const previousMonth = app.data.months[monthIndex - 1];
        if (app.copyMonthConfig(previousMonth.id, app.currentMonth.id)) {
            this.renderMonthSetup();
            alert('Configuration copied from previous month!');
        }
    }

    // ============================================================
    // DAILY TRACKER
    // ============================================================

    renderDailyTracker() {
        if (!app.currentMonth) return;

        // Check if month is properly configured
        if (!app.isMonthConfigured()) {
            this.disableDailyTrackerForm(true);
            return;
        }

        // Month is configured - enable form
        this.disableDailyTrackerForm(false);
        this.renderExpenseCategoryOptions();

        // Update stats for today (base calculation) - use local date, not UTC
        const todayDate = new Date();
        const today = app.getLocalDateString(todayDate);
        const dailyLimit = app.getTodayDailyLimit();
        const remaining = app.getTodayRemaining();
        const debt = app.getCurrentDebt();
        const penaltyPercent = app.currentMonth?.penaltyPercentage || 50;

        document.getElementById('dailyLimit').textContent = `₹${dailyLimit.toFixed(2)}`;

        const debtNote = debt > 0
            ? ` (${penaltyPercent}% penalty due to ₹${debt.toFixed(2)} debt)`
            : ' (Full limit available)';
        document.getElementById('limitNote').textContent = debtNote;

        document.getElementById('remainingToday').textContent = `₹${remaining.toFixed(2)}`;
        const remainingPercent = dailyLimit > 0 ? (remaining / dailyLimit) * 100 : 0;
        document.getElementById('remainingBar').style.width = remainingPercent + '%';

        document.getElementById('debtStatus').textContent = `₹${debt.toFixed(2)}`;
        document.getElementById('debtNote').textContent = debt > 0
            ? `Active debt - ${penaltyPercent}% penalty applied`
            : 'No debt';

        // Update last 7 days spending
        const sevenDaysSpent = app.getRecentSevenDaysSpent();
        document.getElementById('sevenDaysSpent').textContent = `₹${sevenDaysSpent.toFixed(2)}`;

        // Update labels based on selected date
        const selectedDate = document.getElementById('expenseDate').value;
        const isToday = selectedDate === today;
        document.getElementById('selectedDateLabel').textContent = isToday ? "Today's" : `${selectedDate}'s`;

        // Update today's entry (or selected date entry)
        this.renderSelectedDateEntry(selectedDate);

        // Update entries for selected date
        this.renderEntriesForSelectedDate();
    }

    /**
     * Disable or enable daily tracker form based on configuration status
     */
    disableDailyTrackerForm(disabled) {
        const expenseForm = document.getElementById('expenseForm');
        const dateInput = document.getElementById('expenseDate');
        const categoryInput = document.getElementById('expenseCategory');
        const amountInput = document.getElementById('expenseAmount');
        const submitBtn = expenseForm?.querySelector('button[type="submit"]');
        const statsSection = document.querySelector('.stats-section');
        const entrySection = document.querySelector('.entry-section');

        if (disabled) {
            // Disable all form elements
            dateInput.disabled = true;
            if (categoryInput) categoryInput.disabled = true;
            amountInput.disabled = true;
            if (submitBtn) submitBtn.disabled = true;

            // Show setup message
            const setupMessage = `
                <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #856404; margin: 0 0 10px 0;">⚠️ Setup Required</h3>
                    <p style="margin: 0; color: #856404;">Please go to <strong>Month Setup</strong> tab and set up the month (Income & Days) to enable daily tracking.</p>
                </div>
            `;
            if (entrySection) {
                entrySection.insertAdjacentHTML('beforebegin', setupMessage);
            }

            // Dim the stats section
            if (statsSection) {
                statsSection.style.opacity = '0.5';
                statsSection.style.pointerEvents = 'none';
            }
        } else {
            // Enable all form elements
            dateInput.disabled = false;
            if (categoryInput) categoryInput.disabled = false;
            amountInput.disabled = false;
            if (submitBtn) submitBtn.disabled = false;

            // Remove setup message if exists
            const setupMsg = document.querySelector('[style*="fff3cd"]');
            if (setupMsg) {
                setupMsg.remove();
            }

            // Restore stats section
            if (statsSection) {
                statsSection.style.opacity = '1';
                statsSection.style.pointerEvents = 'auto';
            }
        }
    }

    renderExpenseCategoryOptions() {
        const select = document.getElementById('expenseCategory');
        if (!select) return;

        const selectedValue = select.value || 'daily';
        const categories = app.getExpenseItems();

        select.innerHTML = `
            <option value="daily">Daily Spend</option>
            ${categories.map(item => {
                const name = this.escapeHTML(item.name);
                const remaining = app.getCategoryRemaining(item).toFixed(2);
                return `<option value="${name}">${name} (₹${remaining} left)</option>`;
            }).join('')}
        `;

        if (Array.from(select.options).some(option => option.value === selectedValue)) {
            select.value = selectedValue;
        }
    }

    /**
     * Helper function to render selected date entry
     */
    renderSelectedDateEntry(selectedDate) {
        const entry = app.getEntryByDate(selectedDate);
        const container = document.getElementById('todayEntry');

        if (entry) {
            const allocationStr = Object.entries(entry.savingsAllocation || {})
                .map(([goal, amount]) => `${goal}: ₹${amount.toFixed(2)}`)
                .join(' | ');
            const categoryStr = Object.entries(entry.categoryExpenses || {})
                .filter(([, amount]) => amount > 0)
                .map(([name, amount]) => `${name}: ₹${amount.toFixed(2)}`)
                .join(' | ');

            container.innerHTML = `
                <div>
                    <div class="entry-date">${selectedDate}</div>
                    <div style="color: #f5576c; font-weight: bold;">Daily Spend: ₹${entry.expenseAmount.toFixed(2)}</div>
                    ${categoryStr ? `<div style="color: #667eea; font-weight: bold;">Category Spend: ${categoryStr}</div>` : ''}
                    <div style="color: #666; font-size: 0.9em;">Limit: ₹${entry.dailyLimit.toFixed(2)}</div>
                    ${entry.surplus > 0 ? `<div style="color: #4ade80; font-weight: bold;">Saved: ₹${entry.surplus.toFixed(2)}</div>` : ''}
                    ${entry.debtAccrued > 0 ? `<div style="color: #f5576c;">Debt Added: ₹${entry.debtAccrued.toFixed(2)}</div>` : ''}
                    ${entry.debtRepaid > 0 ? `<div style="color: #4ade80;">Debt Repaid: ₹${entry.debtRepaid.toFixed(2)}</div>` : ''}
                    <div style="font-size: 0.85em; color: #999; margin-top: 8px;">${allocationStr}</div>
                </div>
            `;
        } else {
            const today = app.getLocalDateString();
            const isToday = selectedDate === today;
            const message = isToday ? 'No entry for today yet' : 'No entry for this date';
            container.innerHTML = `<p>${message}</p>`;
        }
    }

    renderRecentEntries() {
        const entries = app.getRecentEntries(7);
        const container = document.getElementById('recentEntries');

        if (entries.length === 0) {
            container.innerHTML = '<p style="color: #999;">No recent entries</p>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <div>
                    <div class="entry-date">${entry.date}</div>
                    <div style="color: #666; font-size: 0.9em;">Spent: ₹${entry.expenseAmount.toFixed(2)} / ₹${entry.dailyLimit.toFixed(2)}</div>
                </div>
                <div class="entry-amount">
                    ${entry.surplus > 0 ? `+₹${entry.surplus.toFixed(2)}` : '-₹' + (entry.debtAccrued).toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render entries for last 7 days (recent entries)
     */
    renderEntriesForSelectedDate() {
        const entries = app.getRecentEntries(7);
        const container = document.getElementById('recentEntries');

        if (entries.length === 0) {
            container.innerHTML = '<p style="color: #999;">No entries in the last 7 days</p>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <div>
                    <div class="entry-date">${entry.date}</div>
                    <div style="color: #f5576c; font-weight: bold;">Daily Spend: ₹${entry.expenseAmount.toFixed(2)}</div>
                    ${this.formatCategoryExpenses(entry)}
                    <div style="color: #666; font-size: 0.9em;">Limit: ₹${entry.dailyLimit.toFixed(2)}</div>
                    ${entry.surplus > 0 ? `<div style="color: #4ade80; font-weight: bold;">Saved: ₹${entry.surplus.toFixed(2)}</div>` : ''}
                    ${entry.debtAccrued > 0 ? `<div style="color: #f5576c;">Debt Added: ₹${entry.debtAccrued.toFixed(2)}</div>` : ''}
                    ${entry.debtRepaid > 0 ? `<div style="color: #4ade80;">Debt Repaid: ₹${entry.debtRepaid.toFixed(2)}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    formatCategoryExpenses(entry) {
        const categoryStr = Object.entries(entry.categoryExpenses || {})
            .filter(([, amount]) => amount > 0)
            .map(([name, amount]) => `${name}: ₹${amount.toFixed(2)}`)
            .join(' | ');

        return categoryStr
            ? `<div style="color: #667eea; font-weight: bold;">Category Spend: ${categoryStr}</div>`
            : '';
    }

    escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    handleExpenseSubmit(e) {
        e.preventDefault();

        // Check if month is configured
        if (!app.isMonthConfigured()) {
            alert('Please set up the month first in the Month Setup tab (Income & Days are required)');
            return;
        }

        const dateStr = document.getElementById('expenseDate').value;
        const categoryName = document.getElementById('expenseCategory')?.value || 'daily';
        const amount = parseFloat(document.getElementById('expenseAmount').value);

        if (!dateStr || !Number.isFinite(amount) || amount <= 0) {
            alert('Please enter valid date and amount');
            return;
        }

        app.addDailyEntry(dateStr, amount, categoryName);
        document.getElementById('expenseForm').reset();
        this.setTodayDate();
        this.renderExpenseCategoryOptions();
        this.renderDailyTracker();
        this.renderMonthOverview();

        alert('Expense recorded successfully!');
    }

    // ============================================================
    // MONTH SETUP
    // ============================================================

    renderMonthSetup() {
        if (!app.currentMonth) return;

        const month = app.currentMonth;
        const flexibleCarryForward = parseFloat(month.flexibleCarryForward?.previousAmount) || 0;
        const displayedIncome = month.flexibleCarryForward?.appliedToIncome
            ? Math.max(0, (parseFloat(month.income) || 0) - flexibleCarryForward)
            : (month.income || '');

        document.getElementById('income').value = displayedIncome;
        document.getElementById('basicExpenses').value = month.basicExpenses || '';
        document.getElementById('investments').value = month.investments || '';
        document.getElementById('daysInMonth').value = month.daysInMonth || 30;

        // Set penalty percentage input
        const penaltyInput = document.getElementById('penaltyPercentage');
        if (penaltyInput) {
            penaltyInput.value = month.penaltyPercentage || 50;
        }

        const applyCarryForward = document.getElementById('applyFlexibleCarryForward');
        if (applyCarryForward) {
            applyCarryForward.checked = Boolean(month.flexibleCarryForward?.appliedToIncome);
        }

        this.renderExpenseItems();
        this.renderSavingsGoalsInput();
        this.updateCalculatedValues();
    }

    renderSavingsGoalsInput() {
        const container = document.getElementById('savingsGoalsContainer');
        if (!container) {
            console.warn('savingsGoalsContainer not found in DOM');
            return;
        }

        const goals = app.currentMonth?.savingsGoals || [];
        console.log('Rendering savings goals:', goals);
        
        if (goals.length === 0) {
            container.innerHTML = '<p style="color: #999; padding: 10px;">No savings goals configured</p>';
            return;
        }

        container.innerHTML = goals.map((goal, index) => `
            <div class="goal-input-row">
                <div class="form-group">
                    <label>Goal Name:</label>
                    <input type="text" class="goal-name" value="${goal.name}" data-index="${index}">
                </div>
                <div class="form-group">
                    <label>Allocation %:</label>
                    <input type="number" min="0" max="100" step="0.01" class="goal-percentage" value="${goal.percentage}" data-index="${index}">
                </div>
            </div>
        `).join('');

        // Add event listeners for dynamic calculation
        document.querySelectorAll('.goal-percentage').forEach(input => {
            input.addEventListener('change', () => this.updateCalculatedValues());
        });
    }

    renderExpenseItems() {
        const container = document.getElementById('expenseItemsList');
        app.updateExpenseTotals();
        const items = app.getExpenseItems();
        const basicExpensesInput = document.getElementById('basicExpenses');
        const categoryAllocationsTotal = document.getElementById('totalCategoryAllocations');

        if (items.length === 0) {
            container.innerHTML = '<p style="color: #999; padding: 10px;">No expense items added yet. Add one using the form above.</p>';
            if (basicExpensesInput) basicExpensesInput.value = '0.00';
            if (categoryAllocationsTotal) categoryAllocationsTotal.textContent = '₹0.00';
            return;
        }

        let basicExpensesTotal = 0;

        container.innerHTML = items.map((item, index) => {
            const amount = parseFloat(item.amount) || 0;
            basicExpensesTotal += amount;

            return `
                <div class="expense-item">
                    <div class="expense-item-name">${item.name}</div>
                    <div class="expense-item-amount">
                        ₹${amount.toFixed(2)}
                        <small style="display: block; color: #667eea;">Remaining: ₹${app.getCategoryRemaining(item).toFixed(2)}</small>
                    </div>
                    <div class="expense-item-actions">
                        <button type="button" class="btn btn-small btn-secondary" onclick="ui.editExpenseItem(${index})">Edit</button>
                        <button type="button" class="btn btn-small btn-danger" onclick="ui.removeExpenseItem(${index})">Remove</button>
                    </div>
                </div>
            `;
        }).join('');

        if (basicExpensesInput) basicExpensesInput.value = basicExpensesTotal.toFixed(2);
        if (categoryAllocationsTotal) categoryAllocationsTotal.textContent = `₹${basicExpensesTotal.toFixed(2)}`;
    }

    handleAddExpenseItem() {
        const nameInput = document.getElementById('newExpenseName');
        const amountInput = document.getElementById('newExpenseAmount');

        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;

        if (!name) {
            alert('Please enter a name');
            return;
        }

        if (amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        app.addExpenseItem(name, amount);
        nameInput.value = '';
        amountInput.value = '';
        this.renderExpenseItems();
        this.renderExpenseCategoryOptions();
        this.updateCalculatedValues();
    }

    removeExpenseItem(index) {
        if (confirm('Are you sure you want to remove this expense item?')) {
            app.removeExpenseItem(index);
            this.renderExpenseItems();
            this.renderExpenseCategoryOptions();
            this.updateCalculatedValues();
        }
    }

    editExpenseItem(index) {
        const items = app.getExpenseItems();
        if (index < 0 || index >= items.length) return;

        const item = items[index];
        const newName = prompt('Edit name:', item.name);
        if (newName === null) return;

        const newAmount = prompt('Edit amount (₹):', item.amount.toString());
        if (newAmount === null) return;

        const amountNum = parseFloat(newAmount);
        if (isNaN(amountNum) || amountNum < 0) {
            alert('Please enter a valid amount');
            return;
        }

        app.updateExpenseItem(index, newName, amountNum);
        this.renderExpenseItems();
        this.renderExpenseCategoryOptions();
        this.updateCalculatedValues();
    }

    updateCalculatedValues() {
        const income = parseFloat(document.getElementById('income').value) || 0;
        const applyFlexibleCarryForward = document.getElementById('applyFlexibleCarryForward')?.checked || false;
        const flexibleCarryForward = parseFloat(app.currentMonth?.flexibleCarryForward?.previousAmount) || 0;
        const effectiveIncome = income + (applyFlexibleCarryForward ? flexibleCarryForward : 0);
        const basicExp = parseFloat(document.getElementById('basicExpenses').value) || 0;
        const investments = parseFloat(document.getElementById('investments').value) || 0;
        const days = parseInt(document.getElementById('daysInMonth').value) || 30;
        const categoryAllocations = app.currentMonth?.categoryAllocations || 0;
        const monthlyInvestmentRemaining = app.currentMonth?.monthlyInvestments?.remainingAmount || 0;

        // Base remaining after basic expenses & investments
        const baseRemaining = effectiveIncome - basicExp - investments;
        
        // Total available including category allocations and investment remaining
        const totalAvailable = baseRemaining + categoryAllocations + monthlyInvestmentRemaining;
        const dailyLimit = totalAvailable / days;

        const carryForwardDisplay = document.getElementById('flexibleCarryForwardAmount');
        const effectiveIncomeDisplay = document.getElementById('effectiveIncome');
        if (carryForwardDisplay) carryForwardDisplay.textContent = `₹${flexibleCarryForward.toFixed(2)}`;
        if (effectiveIncomeDisplay) effectiveIncomeDisplay.textContent = `₹${effectiveIncome.toFixed(2)}`;
        document.getElementById('calcRemaining').textContent = `₹${baseRemaining.toFixed(2)}`;
        document.getElementById('calcCategoryRemaining').textContent = `₹${categoryAllocations.toFixed(2)}`;
        document.getElementById('calcInvestmentRemaining').textContent = `₹${monthlyInvestmentRemaining.toFixed(2)}`;
        document.getElementById('calcDailyLimit').textContent = `₹${dailyLimit.toFixed(2)}`;

        // Display total spend and investment
        const totalSpent = app.getTotalSpentUpToToday();
        const calcTotalSpend = document.getElementById('calcTotalSpend');
        const calcTotalInv = document.getElementById('calcTotalInv');

        if (calcTotalSpend) {
            calcTotalSpend.textContent = `₹${totalSpent.toFixed(2)}`;
        }
        if (calcTotalInv) {
            calcTotalInv.textContent = `₹${investments.toFixed(2)}`;
        }

        document.getElementById('calculatedValues').style.display = 'block';
    }

    handleMonthSetup(e) {
        e.preventDefault();

        const income = parseFloat(document.getElementById('income').value) || 0;
        const basicExpenses = parseFloat(document.getElementById('basicExpenses').value) || 0;
        const investments = parseFloat(document.getElementById('investments').value) || 0;
        const daysInMonth = parseInt(document.getElementById('daysInMonth').value) || 30;
        const penaltyPercentage = parseFloat(document.getElementById('penaltyPercentage')?.value) || 50;
        const applyFlexibleCarryForward = document.getElementById('applyFlexibleCarryForward')?.checked || false;

        const goalRows = Array.from(document.querySelectorAll('.goal-input-row'));
        const savingsGoals = goalRows.length > 0 ? goalRows.map(row => ({
            name: row.querySelector('.goal-name').value,
            percentage: parseFloat(row.querySelector('.goal-percentage').value) || 0
        })) : (app.currentMonth.savingsGoals || []);

        // Validate percentages sum to 100 if there are savings goal rows
        const totalPercent = savingsGoals.reduce((sum, goal) => sum + goal.percentage, 0);
        if (goalRows.length > 0 && Math.abs(totalPercent - 100) > 0.1) {
            alert(`Savings goal percentages must sum to 100%. Current: ${totalPercent.toFixed(2)}%`);
            return;
        }

        const config = {
            income,
            basicExpenses,
            investments,
            daysInMonth,
            penaltyPercentage,
            applyFlexibleCarryForward,
            savingsGoals
        };

        if (app.updateMonthConfig(config)) {
            alert('Configuration saved successfully!');
            this.render();
        }
    }

    // ============================================================
    // MONTH OVERVIEW
    // ============================================================

    renderMonthOverview() {
        if (!app.currentMonth) return;

        const stats = app.getMonthStats();

        // Summary stats
        document.getElementById('totalSpent').textContent = `₹${stats.totalSpent.toFixed(2)}`;
        document.getElementById('totalSaved').textContent = `₹${stats.totalSaved.toFixed(2)}`;
        document.getElementById('daysLogged').textContent = stats.daysLogged;
        document.getElementById('monthDebt').textContent = `₹${stats.currentDebt.toFixed(2)}`;

        // Detail section
        const month = app.currentMonth;
        const available = app.getAvailableAmount();
        const dailyLimit = app.getBaseDailyLimit();

        document.getElementById('detailIncome').textContent = `₹${month.income.toFixed(2)}`;
        document.getElementById('detailBasicExp').textContent = `₹${month.basicExpenses.toFixed(2)}`;
        document.getElementById('detailInv').textContent = `₹${month.investments.toFixed(2)}`;
        document.getElementById('detailAvailable').textContent = `₹${available.toFixed(2)}`;
        document.getElementById('detailDays').textContent = month.daysInMonth;
        document.getElementById('detailDailyLimit').textContent = `₹${dailyLimit.toFixed(2)}`;

        // Goals breakdown
        this.renderGoalsBreakdown();

        // Investments rendering
        this.renderInvestments();

        // Expenses breakdown
        this.renderExpensesBreakdown();

        // Charts
        this.updateCharts();
    }

    renderGoalsBreakdown() {
        const container = document.getElementById('goalsBreakdown');
        const goals = app.currentMonth.savingsGoals || [];
        const breakdown = app.currentMonth.totalSavingsAllocated || {};

        if (goals.length === 0 || Object.values(breakdown).every(v => v === 0)) {
            container.innerHTML = '<p style="color: #999;">No savings allocated yet</p>';
            return;
        }

        container.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <span class="goal-name">${goal.name}</span>
                <span class="goal-amount">₹${(breakdown[goal.name] || 0).toFixed(2)}</span>
            </div>
        `).join('');
    }

    renderInvestments() {
        if (!app.currentMonth) return;

        const month = app.currentMonth;
        const monthly = month.monthlyInvestments || {
            allocatedAmount: 0,
            investedAmount: 0,
            remainingAmount: 0,
            previousMonthCarryover: 0,
            investments: []
        };
        const daily = month.dailyExpenseInvestments || {
            availableAmount: 0,
            investedAmount: 0,
            remainingAmount: 0,
            previousMonthCarryover: 0,
            investments: []
        };

        app.recalculateCurrentInvestmentStats();

        const monthlyAvailable = monthly.allocatedAmount + monthly.previousMonthCarryover;
        const dailyAvailable = daily.availableAmount + daily.previousMonthCarryover;
        const totalAvailable = monthlyAvailable + dailyAvailable;
        const totalInvested = monthly.investedAmount + daily.investedAmount;
        const totalRemaining = monthly.remainingAmount + daily.remainingAmount;

        document.getElementById('investmentTotalAvailable').textContent = `₹${totalAvailable.toFixed(2)}`;
        document.getElementById('investmentTotalInvested').textContent = `₹${totalInvested.toFixed(2)}`;
        document.getElementById('investmentTotalRemaining').textContent = `₹${totalRemaining.toFixed(2)}`;

        document.getElementById('monthlyAllocated').textContent = `₹${monthly.allocatedAmount.toFixed(2)}`;
        document.getElementById('monthlyCarryover').textContent = `₹${monthly.previousMonthCarryover.toFixed(2)}`;
        document.getElementById('monthlyInvested').textContent = `₹${monthly.investedAmount.toFixed(2)}`;
        document.getElementById('monthlyRemaining').textContent = `₹${monthly.remainingAmount.toFixed(2)}`;

        // Render Monthly Investments List
        this.renderMonthlyInvestmentsList(monthly.investments);

        // Update Daily Investments Stats
        document.getElementById('dailyAvailable').textContent = `₹${daily.availableAmount.toFixed(2)}`;
        document.getElementById('dailyCarryover').textContent = `₹${daily.previousMonthCarryover.toFixed(2)}`;
        document.getElementById('dailyInvested').textContent = `₹${daily.investedAmount.toFixed(2)}`;
        document.getElementById('dailyRemaining').textContent = `₹${daily.remainingAmount.toFixed(2)}`;

        // Render Daily Investments List
        this.renderDailyInvestmentsList(daily.investments);
    }

    renderMonthlyInvestmentsList(investments) {
        const container = document.getElementById('monthlyInvestmentsList');
        
        if (!investments || investments.length === 0) {
            container.innerHTML = '<div class="no-investments">No investments added yet</div>';
            return;
        }

        container.innerHTML = investments.map((inv, index) => `
            <div class="investment-item">
                <div class="investment-item-field">
                    <label>Name</label>
                    <span>${inv.name}</span>
                </div>
                <div class="investment-item-field">
                    <label>Units</label>
                    <span>${parseFloat(inv.units).toFixed(2)}</span>
                </div>
                <div class="investment-item-field">
                    <label>Amount (₹)</label>
                    <span>₹${parseFloat(inv.amount).toFixed(2)}</span>
                </div>
                <div class="investment-item-field">
                    <label>Total</label>
                    <span>₹${(parseFloat(inv.total) || (parseFloat(inv.units) * parseFloat(inv.amount))).toFixed(2)}</span>
                </div>
                <button class="investment-item-delete" onclick="ui.deleteMonthlyInvestment(${index})">Delete</button>
            </div>
        `).join('');
    }

    renderDailyInvestmentsList(investments) {
        const container = document.getElementById('dailyInvestmentsList');
        
        if (!investments || investments.length === 0) {
            container.innerHTML = '<div class="no-investments">No investments added yet</div>';
            return;
        }

        container.innerHTML = investments.map((inv, index) => `
            <div class="investment-item">
                <div class="investment-item-field">
                    <label>Name</label>
                    <span>${inv.name}</span>
                </div>
                <div class="investment-item-field">
                    <label>Units</label>
                    <span>${parseFloat(inv.units).toFixed(2)}</span>
                </div>
                <div class="investment-item-field">
                    <label>Amount (₹)</label>
                    <span>₹${parseFloat(inv.amount).toFixed(2)}</span>
                </div>
                <div class="investment-item-field">
                    <label>Total</label>
                    <span>₹${(parseFloat(inv.total) || (parseFloat(inv.units) * parseFloat(inv.amount))).toFixed(2)}</span>
                </div>
                <button class="investment-item-delete" onclick="ui.deleteDailyInvestment(${index})">Delete</button>
            </div>
        `).join('');
    }

    renderExpensesBreakdown() {
        const items = app.getExpenseItems();
        const container = document.getElementById('expensesBreakdown');

        if (!items || items.length === 0) {
            container.innerHTML = '<p style="color: #999;">No expense items configured</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="goal-item">
                <span class="goal-name">${item.name}</span>
                <span class="goal-amount">₹${parseFloat(item.amount).toFixed(2)}</span>
            </div>
        `).join('');
    }

    // ============================================================
    // INVESTMENT HANDLERS
    // ============================================================

    handleAddMonthlyInvestment() {
        const nameInput = document.getElementById('monthlyInvestName');
        const unitsInput = document.getElementById('monthlyInvestUnits');
        const amountInput = document.getElementById('monthlyInvestAmount');

        const name = nameInput.value.trim();
        const units = parseFloat(unitsInput.value) || 0;
        const amount = parseFloat(amountInput.value) || 0;

        if (!name) {
            alert('Please enter an investment name');
            return;
        }

        if (units <= 0 || amount <= 0) {
            alert('Please enter valid values');
            return;
        }

        const result = app.addMonthlyInvestment(name, units, amount);
        if (!result.success) {
            alert(result.message);
            return;
        }
        nameInput.value = '';
        unitsInput.value = '';
        amountInput.value = '';
        this.renderInvestments();
    }

    handleAddDailyInvestment() {
        const nameInput = document.getElementById('dailyInvestName');
        const unitsInput = document.getElementById('dailyInvestUnits');
        const amountInput = document.getElementById('dailyInvestAmount');

        const name = nameInput.value.trim();
        const units = parseFloat(unitsInput.value) || 0;
        const amount = parseFloat(amountInput.value) || 0;

        if (!name) {
            alert('Please enter an investment name');
            return;
        }

        if (units <= 0 || amount <= 0) {
            alert('Please enter valid values');
            return;
        }

        const result = app.addDailyInvestment(name, units, amount);
        if (!result.success) {
            alert(result.message);
            return;
        }
        nameInput.value = '';
        unitsInput.value = '';
        amountInput.value = '';
        this.renderInvestments();
    }

    deleteMonthlyInvestment(index) {
        if (confirm('Are you sure you want to delete this investment?')) {
            app.deleteMonthlyInvestment(index);
            this.renderInvestments();
        }
    }

    deleteDailyInvestment(index) {
        if (confirm('Are you sure you want to delete this investment?')) {
            app.deleteDailyInvestment(index);
            this.renderInvestments();
        }
    }

    updateCharts() {
        this.renderSpendingChart();
        this.renderSavingsChart();
        this.renderExpensesChart();
    }

    renderSpendingChart() {
        const ctx = document.getElementById('spendingChart')?.getContext('2d');
        if (!ctx) return;

        const entries = app.currentMonth.dailyEntries || [];
        const labels = entries.map(e => e.date);
        const spent = entries.map(e => e.expenseAmount);
        const limits = entries.map(e => e.dailyLimit);

        if (this.charts.spending) {
            this.charts.spending.destroy();
        }

        this.charts.spending = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Amount Spent',
                        data: spent,
                        borderColor: '#f5576c',
                        backgroundColor: 'rgba(245, 87, 108, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Daily Limit',
                        data: limits,
                        borderColor: '#667eea',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderDash: [5, 5],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '₹' + value
                        }
                    }
                }
            }
        });
    }

    renderSavingsChart() {
        const ctx = document.getElementById('savingsChart')?.getContext('2d');
        if (!ctx) return;

        const goals = app.currentMonth.savingsGoals || [];
        const breakdown = app.currentMonth.totalSavingsAllocated || {};
        const labels = goals.map(g => g.name);
        const data = labels.map(name => breakdown[name] || 0);

        const colors = [
            'rgba(102, 126, 234, 0.7)',
            'rgba(118, 75, 162, 0.7)',
            'rgba(240, 147, 251, 0.7)'
        ];

        if (this.charts.savings) {
            this.charts.savings.destroy();
        }

        this.charts.savings = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `₹${context.parsed.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderExpensesChart() {
        const ctx = document.getElementById('expensesChart')?.getContext('2d');
        if (!ctx) return;

        const items = app.getExpenseItems();
        if (!items || items.length === 0) return;

        const labels = items.map(item => item.name);
        const data = items.map(item => item.amount);

        const colors = [
            'rgba(245, 87, 108, 0.7)',
            'rgba(102, 126, 234, 0.7)',
            'rgba(240, 147, 251, 0.7)',
            'rgba(118, 75, 162, 0.7)',
            'rgba(74, 222, 128, 0.7)',
            'rgba(251, 191, 36, 0.7)'
        ];

        if (this.charts.expenses) {
            this.charts.expenses.destroy();
        }

        this.charts.expenses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Amount (₹)',
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `₹${context.parsed.x.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '₹' + value
                        }
                    }
                }
            }
        });
    }

    // ============================================================
    // HISTORY
    // ============================================================

    renderHistory() {
        const container = document.getElementById('monthsList');

        if (app.data.months.length === 0) {
            container.innerHTML = '<p>No months yet</p>';
            return;
        }

        container.innerHTML = app.data.months.map(month => {
            const stats = app.getMonthStatsForMonth(month.id);
            const expenseItems = month.expenseItems || [];
            const expenseDetail = expenseItems.length > 0
                ? `<p style="font-size: 0.9em; color: #666;">Expenses: ${expenseItems.map(e => `${e.name} (₹${e.amount})`).join(', ')}</p>`
                : '';

            // Detailed daily entries
            const dailyEntries = month.dailyEntries || [];
            let entriesHTML = '';
            if (dailyEntries.length > 0) {
                entriesHTML = `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                        <p style="font-size: 0.85em; color: #999; margin: 5px 0;"><strong>Daily Entries (${dailyEntries.length} days):</strong></p>
                        <div style="max-height: 150px; overflow-y: auto; font-size: 0.8em;">
                            ${dailyEntries.map(entry => {
                                const debt = entry.debtAccrued > 0 ? ` | Debt: ₹${entry.debtAccrued.toFixed(2)}` : '';
                                const saved = entry.surplus > 0 ? ` | Saved: ₹${entry.surplus.toFixed(2)}` : '';
                                return `<p style="margin: 3px 0; color: #666;">${entry.date}: Spent ₹${entry.expenseAmount.toFixed(2)}${debt}${saved}</p>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="month-card">
                    <div class="month-info">
                        <h4>${month.monthName}</h4>
                        <p><strong>Configuration:</strong> Income: ₹${month.income.toFixed(2)}</p>
                        <p>Basic Expenses: ₹${month.basicExpenses.toFixed(2)} | Investments: ₹${month.investments.toFixed(2)}</p>
                        ${expenseDetail}
                        <p style="margin-top: 10px;"><strong>Totals:</strong> Spent: ₹${stats.totalSpent.toFixed(2)} | Saved: ₹${stats.totalSaved.toFixed(2)} | Debt: ₹${stats.currentDebt.toFixed(2)}</p>
                        ${entriesHTML}
                    </div>
                    <div class="month-actions">
                        <button class="btn btn-secondary" onclick="ui.viewMonth('${month.id}')">View</button>
                        <button class="btn btn-secondary" onclick="ui.editMonth('${month.id}')">Edit</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewMonth(monthId) {
        app.setCurrentMonth(monthId);
        this.render();
        this.switchTab('month-overview');
    }

    editMonth(monthId) {
        app.setCurrentMonth(monthId);
        this.render();
        this.switchTab('month-setup');
    }

    // ============================================================
    // EXPORT/IMPORT
    // ============================================================

    exportData() {
        const dataStr = app.exportData();
        this.downloadJSON(dataStr, `savings-data-${new Date().toISOString().split('T')[0]}.json`);
    }

    downloadJSON(data, filename) {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    // ============================================================
    // FILE IMPORT & COMPARISON
    // ============================================================

    handleFileLoad() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                this.loadedData = jsonData;
                this.displayLoadedFile();
                document.getElementById('fileInfo').style.display = 'block';
                document.getElementById('fileMonthSelector').style.display = 'block';
                document.getElementById('fileOverview').style.display = 'block';
            } catch (error) {
                alert('Invalid JSON file. Please make sure it\'s a valid savings data export.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    displayLoadedFile() {
        if (!this.loadedData || !this.loadedData.months) {
            alert('Invalid data structure');
            return;
        }

        // Update file info
        document.getElementById('loadedFileName').textContent = document.getElementById('fileInput').files[0].name;
        document.getElementById('fileMonthsCount').textContent = this.loadedData.months.length;

        // Get last update time
        const allDates = this.loadedData.months.flatMap(m => [
            m.createdAt,
            ...(m.dailyEntries || []).map(e => e.date)
        ]).sort().reverse();
        document.getElementById('fileLastUpdated').textContent = allDates[0] || 'Unknown';

        // Populate month selector
        const selector = document.getElementById('fileMonthSelect');
        selector.innerHTML = this.loadedData.months.map(month => `
            <option value="${month.id}">${month.monthName}</option>
        `).join('');

        // Load first month by default
        if (this.loadedData.months.length > 0) {
            this.handleFileMonthSelect(this.loadedData.months[0].id);
        }
    }

    handleFileMonthSelect(monthId) {
        if (!this.loadedData || !this.loadedData.months) return;

        const month = this.loadedData.months.find(m => m.id === monthId);
        if (!month) return;

        this.displayFileMonthData(month);
    }

    displayFileMonthData(month) {
        // Update detail section
        document.getElementById('fileMonthName').textContent = month.monthName;
        document.getElementById('fileDetail-Income').textContent = `₹${month.income.toFixed(2)}`;
        document.getElementById('fileDetail-Exp').textContent = `₹${month.basicExpenses.toFixed(2)}`;
        document.getElementById('fileDetail-Inv').textContent = `₹${month.investments.toFixed(2)}`;

        const available = month.income - month.basicExpenses - month.investments;
        document.getElementById('fileDetail-Available').textContent = `₹${available.toFixed(2)}`;
        document.getElementById('fileDetail-Days').textContent = month.daysInMonth;

        const dailyLimit = available / month.daysInMonth;
        document.getElementById('fileDetail-DailyLimit').textContent = `₹${dailyLimit.toFixed(2)}`;
        document.getElementById('fileDetail-DaysLogged').textContent = (month.dailyEntries || []).length;

        // Update stat cards
        document.getElementById('fileIncome').textContent = `₹${month.income.toFixed(2)}`;
        document.getElementById('fileBasicExp').textContent = `₹${month.basicExpenses.toFixed(2)}`;
        document.getElementById('fileInvestments').textContent = `₹${month.investments.toFixed(2)}`;

        // Calculate spent and saved
        let totalSpent = 0;
        (month.dailyEntries || []).forEach(entry => {
            totalSpent += entry.expenseAmount || 0;
        });
        document.getElementById('fileSpent').textContent = `₹${totalSpent.toFixed(2)}`;

        let totalSaved = 0;
        Object.values(month.totalSavingsAllocated || {}).forEach(amount => {
            totalSaved += amount || 0;
        });
        document.getElementById('fileSaved').textContent = `₹${totalSaved.toFixed(2)}`;

        document.getElementById('fileDebt').textContent = `₹${(month.totalDebt || 0).toFixed(2)}`;

        // Render breakdowns and charts
        this.renderFileExpensesBreakdown(month);
        this.renderFileSavingsBreakdown(month);
        this.renderFileCharts(month);
    }

    renderFileExpensesBreakdown(month) {
        const container = document.getElementById('fileExpensesBreakdown');
        const items = month.expenseItems || [];

        if (items.length === 0) {
            container.innerHTML = '<p style="color: #999;">No expense items configured</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="goal-item">
                <span class="goal-name">${item.name}</span>
                <span class="goal-amount">₹${parseFloat(item.amount).toFixed(2)}</span>
            </div>
        `).join('');
    }

    renderFileSavingsBreakdown(month) {
        const container = document.getElementById('fileSavingsBreakdown');
        const breakdown = month.totalSavingsAllocated || {};

        if (Object.values(breakdown).every(v => v === 0)) {
            container.innerHTML = '<p style="color: #999;">No savings allocated yet</p>';
            return;
        }

        container.innerHTML = Object.entries(breakdown).map(([name, amount]) => `
            <div class="goal-item">
                <span class="goal-name">${name}</span>
                <span class="goal-amount">₹${parseFloat(amount).toFixed(2)}</span>
            </div>
        `).join('');
    }

    renderFileCharts(month) {
        this.renderFileSpendingChart(month);
        this.renderFileSavingsChart(month);
        this.renderFileExpensesChart(month);
    }

    renderFileSpendingChart(month) {
        const ctx = document.getElementById('fileSpendingChart')?.getContext('2d');
        if (!ctx) return;

        const entries = month.dailyEntries || [];
        const labels = entries.map(e => e.date);
        const spent = entries.map(e => e.expenseAmount);
        const limits = entries.map(e => e.dailyLimit);

        if (this.charts.fileSpending) {
            this.charts.fileSpending.destroy();
        }

        this.charts.fileSpending = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Amount Spent',
                        data: spent,
                        borderColor: '#f5576c',
                        backgroundColor: 'rgba(245, 87, 108, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Daily Limit',
                        data: limits,
                        borderColor: '#667eea',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderDash: [5, 5],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '₹' + value
                        }
                    }
                }
            }
        });
    }

    renderFileSavingsChart(month) {
        const ctx = document.getElementById('fileSavingsChart')?.getContext('2d');
        if (!ctx) return;

        const breakdown = month.totalSavingsAllocated || {};
        const labels = Object.keys(breakdown);
        const data = Object.values(breakdown);

        const colors = [
            'rgba(102, 126, 234, 0.7)',
            'rgba(118, 75, 162, 0.7)',
            'rgba(240, 147, 251, 0.7)'
        ];

        if (this.charts.fileSavings) {
            this.charts.fileSavings.destroy();
        }

        this.charts.fileSavings = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `₹${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderFileExpensesChart(month) {
        const ctx = document.getElementById('fileExpensesChart')?.getContext('2d');
        if (!ctx) return;

        const items = month.expenseItems || [];
        if (items.length === 0) return;

        const labels = items.map(item => item.name);
        const data = items.map(item => item.amount);

        const colors = [
            'rgba(245, 87, 108, 0.7)',
            'rgba(102, 126, 234, 0.7)',
            'rgba(240, 147, 251, 0.7)',
            'rgba(118, 75, 162, 0.7)',
            'rgba(74, 222, 128, 0.7)',
            'rgba(251, 191, 36, 0.7)'
        ];

        if (this.charts.fileExpenses) {
            this.charts.fileExpenses.destroy();
        }

        this.charts.fileExpenses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Amount (₹)',
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `₹${context.parsed.x.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '₹' + value
                        }
                    }
                }
            }
        });
    }
}

// Add helper method to app for getting stats of any month
SavingsApp.prototype.getMonthStatsForMonth = function(monthId) {
    const month = this.data.months.find(m => m.id === monthId);
    if (!month) {
        return { totalSpent: 0, totalSaved: 0, daysLogged: 0, currentDebt: 0 };
    }

    let totalSpent = 0;
    month.dailyEntries.forEach(entry => {
        totalSpent += entry.expenseAmount;
    });

    let totalSaved = 0;
    Object.values(month.totalSavingsAllocated).forEach(amount => {
        totalSaved += amount;
    });

    return {
        totalSpent: totalSpent,
        totalSaved: totalSaved,
        daysLogged: month.dailyEntries.length,
        currentDebt: month.totalDebt || 0
    };
};

// Initialize UI when DOM is ready
let ui;
document.addEventListener('DOMContentLoaded', () => {
    ui = new SavingsUI();
});
