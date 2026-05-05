// ============================================================
// SAVINGS TRACKER APP - CORE BUSINESS LOGIC
// ============================================================

class SavingsApp {
    constructor() {
        this.data = {
            months: [],
            currentMonthId: null
        };
        this.currentMonth = null;
        this.loadData();
    }

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================

    loadData() {
        const stored = localStorage.getItem('savingsData');
        if (stored) {
            try {
                this.data = JSON.parse(stored);
                
                if (this.data.months && Array.isArray(this.data.months)) {
                    this.normalizeAllMonths();
                }
                
                if (this.data.currentMonthId) {
                    this.currentMonth = this.data.months.find(m => m.id === this.data.currentMonthId);
                }
            } catch (e) {
                console.error('Error loading data:', e);
                this.initializeDefaultData();
            }
        } else {
            this.initializeDefaultData();
        }
    }

    saveData() {
        localStorage.setItem('savingsData', JSON.stringify(this.data));
    }

    initializeDefaultData() {
        const now = new Date();
        const monthId = this.getMonthId(now);
        this.data = {
            months: [this.createNewMonth(now)],
            currentMonthId: monthId
        };
        this.currentMonth = this.data.months[0];
        this.saveData();
    }

    getMonthId(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    getMonthName(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    /**
     * Get today's date in local timezone (YYYY-MM-DD format)
     * This prevents timezone issues with toISOString()
     */
    getLocalDateString(date = null) {
        const d = date || new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    createNewMonth(date) {
        const monthId = this.getMonthId(date);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        return {
            id: monthId,
            monthName: this.getMonthName(date),
            income: 0,
            expenseItems: [], // Detailed expense breakdown - each item has type: "expense" or "category"
            basicExpenses: 0, // Total basic expenses (auto-calculated from items with type: "expense")
            categoryAllocations: 0, // Total category allocations (auto-calculated from items with type: "category")
            investments: 0,
            daysInMonth: daysInMonth,
            carryoverDebt: 0,
            penaltyPercentage: 50, // User-configurable penalty percentage for debt
            savingsGoals: [
                { name: 'Emergency', percentage: 33.33 },
                { name: 'Travel', percentage: 33.33 },
                { name: 'Investment Account', percentage: 33.34 }
            ],
            dailyEntries: [],
            totalSavingsAllocated: {
                'Emergency': 0,
                'Travel': 0,
                'Investment Account': 0
            },
            totalDebt: 0,
            // Investments Tracking
            monthlyInvestments: {
                allocatedAmount: 0,
                investedAmount: 0,
                remainingAmount: 0,
                previousMonthCarryover: 0,
                investments: [] // Array of {name, units, amount, total}
            },
            dailyExpenseInvestments: {
                availableAmount: 0,
                investedAmount: 0,
                remainingAmount: 0,
                previousMonthCarryover: 0,
                investments: [] // Array of {name, units, amount, total}
            },
            createdAt: new Date().toISOString().split('T')[0]
        };
    }

    ensureInvestmentStructures(month) {
        if (!month.monthlyInvestments) {
            month.monthlyInvestments = {
                allocatedAmount: parseFloat(month.investments) || 0,
                investedAmount: 0,
                remainingAmount: 0,
                previousMonthCarryover: 0,
                investments: []
            };
        }

        if (!month.dailyExpenseInvestments) {
            month.dailyExpenseInvestments = {
                availableAmount: 0,
                investedAmount: 0,
                remainingAmount: 0,
                previousMonthCarryover: 0,
                investments: []
            };
        }

        // Ensure expenseItems is an array and add type field if missing
        if (!Array.isArray(month.expenseItems)) {
            month.expenseItems = [];
        }

        // Migrate old data - add type field to existing items
        month.expenseItems.forEach(item => {
            if (!item.type) {
                item.type = 'expense'; // Default to basic expense
            }
        });

        month.monthlyInvestments.investments = month.monthlyInvestments.investments || [];
        month.dailyExpenseInvestments.investments = month.dailyExpenseInvestments.investments || [];
        month.monthlyInvestments.allocatedAmount = parseFloat(month.monthlyInvestments.allocatedAmount) || parseFloat(month.investments) || 0;
        month.monthlyInvestments.previousMonthCarryover = parseFloat(month.monthlyInvestments.previousMonthCarryover) || 0;
        month.dailyExpenseInvestments.previousMonthCarryover = parseFloat(month.dailyExpenseInvestments.previousMonthCarryover) || 0;
    }

    normalizeAllMonths() {
        this.data.months.forEach(month => {
            this.ensureInvestmentStructures(month);
            this.recalculateInvestmentStatsForMonth(month);
        });
    }

    // ============================================================
    // MONTH OPERATIONS
    // ============================================================

    addMonth(date) {
        const monthId = this.getMonthId(date);
        if (this.data.months.find(m => m.id === monthId)) {
            return false; // Month already exists
        }

        const previousMonth = this.getPreviousMonthBefore(monthId);
        if (previousMonth) {
            this.recalculateInvestmentStatsForMonth(previousMonth);
        }

        const newMonth = this.createNewMonth(date);
        if (previousMonth) {
            newMonth.investments = previousMonth.investments || 0;
            newMonth.monthlyInvestments.allocatedAmount = previousMonth.investments || 0;
            newMonth.monthlyInvestments.previousMonthCarryover = previousMonth.monthlyInvestments?.remainingAmount || 0;
            newMonth.dailyExpenseInvestments.previousMonthCarryover = previousMonth.dailyExpenseInvestments?.remainingAmount || 0;
            this.recalculateInvestmentStatsForMonth(newMonth);
        }
        this.data.months.push(newMonth);
        this.data.months.sort((a, b) => a.id.localeCompare(b.id));
        this.setCurrentMonth(monthId);
        this.saveData();
        return true;
    }

    getPreviousMonthBefore(monthId) {
        return this.data.months
            .filter(month => month.id < monthId)
            .sort((a, b) => b.id.localeCompare(a.id))[0] || null;
    }

    setCurrentMonth(monthId) {
        const month = this.data.months.find(m => m.id === monthId);
        if (month) {
            this.currentMonth = month;
            this.data.currentMonthId = monthId;
            this.saveData();
        }
    }

    copyMonthConfig(sourceMonthId, targetMonthId) {
        const source = this.data.months.find(m => m.id === sourceMonthId);
        const target = this.data.months.find(m => m.id === targetMonthId);

        if (!source || !target) return false;
        this.recalculateInvestmentStatsForMonth(source);

        target.income = source.income;
        target.expenseItems = JSON.parse(JSON.stringify(source.expenseItems || []));
        target.basicExpenses = source.basicExpenses;
        target.categoryAllocations = source.categoryAllocations || 0;
        target.investments = source.investments;
        target.penaltyPercentage = source.penaltyPercentage || 50;
        target.savingsGoals = JSON.parse(JSON.stringify(source.savingsGoals));
        // Don't copy debt carry-over
        target.carryoverDebt = 0;
        target.dailyEntries = [];
        target.totalSavingsAllocated = {
            'Emergency': 0,
            'Travel': 0,
            'Investment Account': 0
        };
        target.totalDebt = 0;

        // Carry over investments remaining amounts to next month
        target.monthlyInvestments = {
            allocatedAmount: source.investments || source.monthlyInvestments?.allocatedAmount || 0,
            investedAmount: 0,
            remainingAmount: 0,
            previousMonthCarryover: source.monthlyInvestments?.remainingAmount || 0,
            investments: []
        };

        target.dailyExpenseInvestments = {
            availableAmount: 0,
            investedAmount: 0,
            remainingAmount: 0,
            previousMonthCarryover: source.dailyExpenseInvestments?.remainingAmount || 0,
            investments: []
        };

        this.recalculateInvestmentStatsForMonth(target);
        this.saveData();
        return true;
    }

    getInvestmentGoalNames(month = this.currentMonth) {
        if (!month || !Array.isArray(month.savingsGoals)) return [];
        return month.savingsGoals
            .map(goal => goal.name)
            .filter(name => name.toLowerCase().includes('investment'));
    }

    getDailyInvestmentAllocationFromEntries(month = this.currentMonth) {
        if (!month) return 0;
        const investmentGoals = this.getInvestmentGoalNames(month);
        return (month.dailyEntries || []).reduce((total, entry) => {
            const allocation = entry.savingsAllocation || {};
            return total + investmentGoals.reduce((sum, goalName) => {
                return sum + (parseFloat(allocation[goalName]) || 0);
            }, 0);
        }, 0);
    }

    // ============================================================
    // CALCULATIONS
    // ============================================================

    getAvailableAmount() {
        if (!this.currentMonth) return 0;
        
        // Get base available amount
        let available = (
            this.currentMonth.income -
            this.currentMonth.basicExpenses -
            this.currentMonth.investments
        );
        
        // Add remaining amounts from category allocations
        const categoryRemaining = this.getTotalCategoryRemaining();
        
        // Add remaining monthly investment amounts if any
        const monthlyInvestmentRemaining = this.currentMonth.monthlyInvestments?.remainingAmount || 0;
        
        return available + categoryRemaining + monthlyInvestmentRemaining;
    }

    /**
     * Calculate total remaining amount across all category allocations
     */
    getTotalCategoryRemaining() {
        if (!this.currentMonth || !Array.isArray(this.currentMonth.expenseItems)) {
            return 0;
        }
        
        let totalRemaining = 0;
        this.currentMonth.expenseItems.forEach(item => {
            if (item.type === 'category') {
                const remaining = this.getCategoryRemaining(item);
                totalRemaining += remaining;
            }
        });
        
        return totalRemaining;
    }

    /**
     * Calculate remaining amount for a specific category item
     */
    getCategoryRemaining(categoryItem) {
        if (!categoryItem || categoryItem.type !== 'category') return 0;
        
        // For now, categories don't have individual expenses tracking
        // They just have allocated amounts that can be spent throughout the month
        // In a future enhancement, we could add expense tracking per category
        return categoryItem.amount || 0;
    }

    getBaseDailyLimit() {
        if (!this.currentMonth) return 0;
        const available = this.getAvailableAmount();
        return available / this.currentMonth.daysInMonth;
    }

    getCurrentDebt() {
        if (!this.currentMonth) return 0;
        let totalDebt = this.currentMonth.carryoverDebt;
        this.currentMonth.dailyEntries.forEach(entry => {
            totalDebt += entry.debtAccrued || 0;
            totalDebt -= entry.debtRepaid || 0;
        });
        return Math.max(0, totalDebt);
    }

    /**
     * Calculate today's daily limit considering debt
     * If debt exists: limit = baseDailyLimit * (penaltyPercentage / 100)
     * If no debt: limit = baseDailyLimit
     */
    getTodayDailyLimit(dateStr = null) {
        const baseDailyLimit = this.getBaseDailyLimit();
        const debt = this.getCurrentDebt();
        const penaltyPercent = this.currentMonth?.penaltyPercentage || 50;

        if (debt > 0) {
            return baseDailyLimit * (penaltyPercent / 100);
        }
        return baseDailyLimit;
    }

    /**
     * Get today's remaining budget (limit - spent today)
     */
    getTodayRemaining(dateStr = null) {
        if (!this.currentMonth) return 0;

        const today = dateStr || this.getLocalDateString();
        const todayEntry = this.currentMonth.dailyEntries.find(e => e.date === today);

        const limit = this.getTodayDailyLimit(today);
        const spent = todayEntry ? todayEntry.expenseAmount : 0;

        return Math.max(0, limit - spent);
    }

    /**
     * Process daily expense
     * Returns: { surplus, debtAccrued, newTotalDebt }
     */
    processDailyExpense(dateStr, expenseAmount) {
        const baseDailyLimit = this.getBaseDailyLimit();
        const currentDebt = this.getCurrentDebt();
        const penaltyPercent = this.currentMonth?.penaltyPercentage || 50;

        // Determine today's allowance
        let todayLimit = baseDailyLimit;
        if (currentDebt > 0) {
            todayLimit = baseDailyLimit * (penaltyPercent / 100);
        }

        let surplus = 0;
        let debtAccrued = 0;
        let debtRepaid = 0;

        if (expenseAmount <= todayLimit) {
            // Spending within limit
            surplus = todayLimit - expenseAmount;
        } else {
            // Overspending
            const overage = expenseAmount - todayLimit;
            debtAccrued = overage;
        }

        // If there's existing debt and surplus today, apply surplus to debt first
        if (currentDebt > 0 && surplus > 0) {
            if (surplus >= currentDebt) {
                debtRepaid = currentDebt;
                surplus = surplus - currentDebt;
            } else {
                debtRepaid = surplus;
                surplus = 0;
            }
        }

        const newTotalDebt = currentDebt - debtRepaid + debtAccrued;

        return {
            surplus: Math.max(0, surplus),
            debtAccrued: debtAccrued,
            debtRepaid: debtRepaid,
            newTotalDebt: Math.max(0, newTotalDebt),
            todayLimit: todayLimit
        };
    }

    /**
     * Allocate surplus to savings goals based on percentages
     */
    allocateSurplus(surplus) {
        const allocation = {};
        if (!this.currentMonth || surplus <= 0) {
            this.currentMonth.savingsGoals.forEach(goal => {
                allocation[goal.name] = 0;
            });
            return allocation;
        }

        this.currentMonth.savingsGoals.forEach(goal => {
            allocation[goal.name] = (surplus * goal.percentage) / 100;
        });

        return allocation;
    }

    // ============================================================
    // DAILY ENTRY MANAGEMENT
    // ============================================================

    addDailyEntry(dateStr, expenseAmount) {
        if (!this.currentMonth) return false;

        // Check if entry exists for this date and add to it (allow multiple entries)
        let existingEntry = this.currentMonth.dailyEntries.find(e => e.date === dateStr);
        const totalExpenseForDate = existingEntry 
            ? existingEntry.expenseAmount + expenseAmount 
            : expenseAmount;

        this.currentMonth.dailyEntries = this.currentMonth.dailyEntries.filter(
            e => e.date !== dateStr
        );

        // Process the total expense for this date
        const result = this.processDailyExpense(dateStr, totalExpenseForDate);

        // Allocate surplus to goals
        const allocation = this.allocateSurplus(result.surplus);

        // Add new entry with cumulative amount
        const entry = {
            date: dateStr,
            expenseAmount: totalExpenseForDate,
            dailyLimit: result.todayLimit,
            debtAccrued: result.debtAccrued,
            debtRepaid: result.debtRepaid,
            surplus: result.surplus,
            savingsAllocation: allocation,
            timestamp: new Date().toISOString()
        };

        this.currentMonth.dailyEntries.push(entry);

        // Sort by date
        this.currentMonth.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

        // Update total savings allocated
        this.updateTotalSavingsAllocated();

        this.recalculateCurrentInvestmentStats();

        this.saveData();
        return entry;
    }

    updateTotalSavingsAllocated() {
        if (!this.currentMonth) return;

        const totals = {
            'Emergency': 0,
            'Travel': 0,
            'Investment Account': 0
        };

        this.currentMonth.dailyEntries.forEach(entry => {
            Object.keys(entry.savingsAllocation || {}).forEach(goalName => {
                if (totals.hasOwnProperty(goalName)) {
                    totals[goalName] += entry.savingsAllocation[goalName];
                }
            });
        });

        this.currentMonth.totalSavingsAllocated = totals;
    }

    getEntryByDate(dateStr) {
        if (!this.currentMonth) return null;
        return this.currentMonth.dailyEntries.find(e => e.date === dateStr);
    }

    getRecentEntries(days = 7) {
        if (!this.currentMonth) return [];

        // Calculate cutoff date using local date string (YYYY-MM-DD format)
        const today = new Date();
        const cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const cutoffStr = this.getLocalDateString(cutoffDate);

        return this.currentMonth.dailyEntries.filter(entry => {
            // Use string comparison to avoid timezone issues
            return entry.date >= cutoffStr;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }

    getTodayEntry() {
        const today = new Date().toISOString().split('T')[0];
        return this.getEntryByDate(today);
    }

    // ============================================================
    // MONTH STATISTICS
    // ============================================================

    getMonthStats() {
        if (!this.currentMonth) {
            return {
                totalSpent: 0,
                totalSaved: 0,
                daysLogged: 0,
                currentDebt: 0,
                savingsBreakdown: {}
            };
        }

        let totalSpent = 0;
        this.currentMonth.dailyEntries.forEach(entry => {
            totalSpent += entry.expenseAmount;
        });

        let totalSaved = 0;
        Object.values(this.currentMonth.totalSavingsAllocated).forEach(amount => {
            totalSaved += amount;
        });

        return {
            totalSpent: totalSpent,
            totalSaved: totalSaved,
            daysLogged: this.currentMonth.dailyEntries.length,
            currentDebt: this.getCurrentDebt(),
            savingsBreakdown: this.currentMonth.totalSavingsAllocated
        };
    }

    /**
     * Check if current month is properly configured for daily tracking
     * Requires: income > 0 and daysInMonth > 0
     */
    isMonthConfigured() {
        if (!this.currentMonth) return false;
        return this.currentMonth.income > 0 && this.currentMonth.daysInMonth > 0;
    }

    /**
     * Get total spent up to current date only (not future dates)
     */
    getTotalSpentUpToToday() {
        if (!this.currentMonth) return 0;
        
        const today = this.getLocalDateString();
        let totalSpent = 0;
        
        this.currentMonth.dailyEntries.forEach(entry => {
            if (entry.date <= today) {
                totalSpent += entry.expenseAmount;
            }
        });
        
        return totalSpent;
    }

    /**
     * Get spending for last 7 days (from current date backwards)
     */
    getRecentSevenDaysSpent() {
        if (!this.currentMonth) return 0;

        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const startDate = this.getLocalDateString(sevenDaysAgo);
        const endDate = this.getLocalDateString(today);

        let totalSpent = 0;
        this.currentMonth.dailyEntries.forEach(entry => {
            if (entry.date >= startDate && entry.date <= endDate) {
                totalSpent += entry.expenseAmount;
            }
        });

        return totalSpent;
    }

    /**
     * Set current month to system month automatically
     * Check if month changed and update currentMonthId
     */
    setCurrentMonthAutomatically() {
        const today = new Date();
        const currentMonthId = this.getMonthId(today);
        
        // If month changed, update it
        if (this.data.currentMonthId !== currentMonthId) {
            const monthExists = this.data.months.find(m => m.id === currentMonthId);
            if (!monthExists) {
                // Auto-create current month if doesn't exist
                this.addMonth(today);
            } else {
                this.setCurrentMonth(currentMonthId);
            }
        }
    }

    /**
     * Get stats for a specific month by monthId
     */
    getMonthStatsForMonth(monthId) {
        const month = this.data.months.find(m => m.id === monthId);
        if (!month) {
            return {
                totalSpent: 0,
                totalSaved: 0,
                daysLogged: 0,
                currentDebt: 0,
                savingsBreakdown: {}
            };
        }

        let totalSpent = 0;
        (month.dailyEntries || []).forEach(entry => {
            totalSpent += entry.expenseAmount;
        });

        let totalSaved = 0;
        Object.values(month.totalSavingsAllocated || {}).forEach(amount => {
            totalSaved += amount;
        });

        return {
            totalSpent: totalSpent,
            totalSaved: totalSaved,
            daysLogged: (month.dailyEntries || []).length,
            currentDebt: month.totalDebt || 0,
            savingsBreakdown: month.totalSavingsAllocated || {}
        };
    }

    // ============================================================
    // EXPENSE ITEMS MANAGEMENT
    // ============================================================

    addExpenseItem(name, amount, type = 'expense') {
        if (!this.currentMonth) return false;

        const item = {
            name: name.trim(),
            amount: parseFloat(amount) || 0,
            type: type, // 'expense' or 'category'
            addedAt: new Date().toISOString()
        };

        if (!this.currentMonth.expenseItems) {
            this.currentMonth.expenseItems = [];
        }

        this.currentMonth.expenseItems.push(item);
        this.updateExpenseTotals();
        this.saveData();
        return true;
    }

    removeExpenseItem(index) {
        if (!this.currentMonth || !this.currentMonth.expenseItems) return false;

        this.currentMonth.expenseItems.splice(index, 1);
        this.updateExpenseTotals();
        this.saveData();
        return true;
    }

    updateExpenseItem(index, name, amount, type = null) {
        if (!this.currentMonth || !this.currentMonth.expenseItems || index < 0 || index >= this.currentMonth.expenseItems.length) {
            return false;
        }

        this.currentMonth.expenseItems[index].name = name.trim();
        this.currentMonth.expenseItems[index].amount = parseFloat(amount) || 0;
        if (type !== null) {
            this.currentMonth.expenseItems[index].type = type;
        }
        this.updateExpenseTotals();
        this.saveData();
        return true;
    }

    updateExpenseTotals() {
        if (!this.currentMonth) return;

        let basicExpenses = 0;
        let categoryAllocations = 0;

        if (this.currentMonth.expenseItems && Array.isArray(this.currentMonth.expenseItems)) {
            this.currentMonth.expenseItems.forEach(item => {
                const amount = parseFloat(item.amount) || 0;
                if (item.type === 'category') {
                    categoryAllocations += amount;
                } else {
                    basicExpenses += amount;
                }
            });
        }

        this.currentMonth.basicExpenses = basicExpenses;
        this.currentMonth.categoryAllocations = categoryAllocations;
    }

    getExpenseItems(type = null) {
        if (!this.currentMonth || !this.currentMonth.expenseItems) {
            return [];
        }
        
        if (type) {
            return this.currentMonth.expenseItems.filter(item => item.type === type);
        }
        
        return this.currentMonth.expenseItems;
    }

    // ============================================================
    // INVESTMENTS MANAGEMENT
    // ============================================================

    addMonthlyInvestment(name, units, amount) {
        if (!this.currentMonth || !this.currentMonth.monthlyInvestments) {
            return false;
        }

        const investment = this.createInvestmentRecord(name, units, amount);
        const totalAvailable = this.getMonthlyInvestmentAvailable();

        if (investment.total > totalAvailable) {
            return { success: false, message: `Only ₹${totalAvailable.toFixed(2)} is available for monthly investments.` };
        }

        this.currentMonth.monthlyInvestments.investments.push(investment);
        this.updateMonthlyInvestmentStats();
        this.saveData();
        return { success: true };
    }

    deleteMonthlyInvestment(index) {
        if (!this.currentMonth || !this.currentMonth.monthlyInvestments) {
            return false;
        }

        if (index >= 0 && index < this.currentMonth.monthlyInvestments.investments.length) {
            this.currentMonth.monthlyInvestments.investments.splice(index, 1);
            this.updateMonthlyInvestmentStats();
            this.saveData();
            return true;
        }

        return false;
    }

    addDailyInvestment(name, units, amount) {
        if (!this.currentMonth || !this.currentMonth.dailyExpenseInvestments) {
            return false;
        }

        const investment = this.createInvestmentRecord(name, units, amount);
        const totalAvailable = this.getDailyInvestmentAvailable();

        if (investment.total > totalAvailable) {
            return { success: false, message: `Only ₹${totalAvailable.toFixed(2)} is available from daily investment surplus.` };
        }

        this.currentMonth.dailyExpenseInvestments.investments.push(investment);
        this.updateDailyInvestmentStats();
        this.saveData();
        return { success: true };
    }

    createInvestmentRecord(name, units, amount) {
        const parsedUnits = parseFloat(units) || 0;
        const parsedAmount = parseFloat(amount) || 0;
        return {
            name: name.trim(),
            units: parsedUnits,
            amount: parsedAmount,
            total: parsedUnits * parsedAmount,
            addedAt: new Date().toISOString()
        };
    }

    getMonthlyInvestmentAvailable() {
        const monthly = this.currentMonth?.monthlyInvestments;
        if (!monthly) return 0;
        this.updateMonthlyInvestmentStats();
        return monthly.remainingAmount;
    }

    getDailyInvestmentAvailable() {
        const daily = this.currentMonth?.dailyExpenseInvestments;
        if (!daily) return 0;
        this.updateDailyInvestmentStats();
        return daily.remainingAmount;
    }

    deleteDailyInvestment(index) {
        if (!this.currentMonth || !this.currentMonth.dailyExpenseInvestments) {
            return false;
        }

        if (index >= 0 && index < this.currentMonth.dailyExpenseInvestments.investments.length) {
            this.currentMonth.dailyExpenseInvestments.investments.splice(index, 1);
            this.updateDailyInvestmentStats();
            this.saveData();
            return true;
        }

        return false;
    }

    updateMonthlyInvestmentStats() {
        if (!this.currentMonth || !this.currentMonth.monthlyInvestments) {
            return;
        }

        const monthly = this.currentMonth.monthlyInvestments;
        let totalInvested = 0;

        if (monthly.investments && Array.isArray(monthly.investments)) {
            monthly.investments.forEach(inv => {
                totalInvested += parseFloat(inv.total) || (parseFloat(inv.units) * parseFloat(inv.amount));
            });
        }

        monthly.investedAmount = totalInvested;
        
        // Calculate remaining: allocated + carryover - invested
        const totalAvailable = monthly.allocatedAmount + monthly.previousMonthCarryover;
        monthly.remainingAmount = totalAvailable - totalInvested;

        // Ensure remaining is not negative
        if (monthly.remainingAmount < 0) {
            monthly.remainingAmount = 0;
        }
    }

    updateDailyInvestmentStats() {
        if (!this.currentMonth || !this.currentMonth.dailyExpenseInvestments) {
            return;
        }

        const daily = this.currentMonth.dailyExpenseInvestments;
        let totalInvested = 0;

        if (daily.investments && Array.isArray(daily.investments)) {
            daily.investments.forEach(inv => {
                totalInvested += parseFloat(inv.total) || (parseFloat(inv.units) * parseFloat(inv.amount));
            });
        }

        daily.availableAmount = this.getDailyInvestmentAllocationFromEntries();
        daily.investedAmount = totalInvested;
        
        // Calculate remaining: available + carryover - invested
        const totalAvailable = daily.availableAmount + daily.previousMonthCarryover;
        daily.remainingAmount = totalAvailable - totalInvested;

        // Ensure remaining is not negative
        if (daily.remainingAmount < 0) {
            daily.remainingAmount = 0;
        }
    }

    /**
     * Update daily investments available amount from daily surplus
     * This is called after daily expense processing
     */
    addToDailyInvestmentAvailable(amount) {
        if (!this.currentMonth || !this.currentMonth.dailyExpenseInvestments) {
            return;
        }

        this.currentMonth.dailyExpenseInvestments.availableAmount += parseFloat(amount);
        this.updateDailyInvestmentStats();
    }

    recalculateCurrentInvestmentStats() {
        this.recalculateInvestmentStatsForMonth(this.currentMonth);
    }

    recalculateInvestmentStatsForMonth(month) {
        if (!month) return;

        const previousCurrentMonth = this.currentMonth;
        this.currentMonth = month;
        this.ensureInvestmentStructures(month);
        this.updateMonthlyInvestmentStats();
        this.updateDailyInvestmentStats();
        this.currentMonth = previousCurrentMonth;
    }

    /**
     * Set the monthly investments allocated amount from monthly budget
     * This should be called when setting up the month or updating config
     */
    setMonthlyInvestmentAllocated(amount) {
        if (!this.currentMonth || !this.currentMonth.monthlyInvestments) {
            return;
        }

        this.currentMonth.monthlyInvestments.allocatedAmount = parseFloat(amount);
        this.updateMonthlyInvestmentStats();
    }

    // ============================================================
    // MONTH CONFIGURATION
    // ============================================================

    updateMonthConfig(config) {
        if (!this.currentMonth) return false;

        this.currentMonth.income = parseFloat(config.income) || 0;
        // basicExpenses is auto-calculated from expenseItems
        this.currentMonth.investments = parseFloat(config.investments) || 0;
        this.currentMonth.daysInMonth = parseInt(config.daysInMonth) || 30;
        this.currentMonth.penaltyPercentage = parseFloat(config.penaltyPercentage) || 50;
        this.currentMonth.savingsGoals = config.savingsGoals || this.currentMonth.savingsGoals;

        // Update monthly investments allocated amount
        this.setMonthlyInvestmentAllocated(this.currentMonth.investments);
        this.updateDailyInvestmentStats();

        this.saveData();
        return true;
    }

    // ============================================================
    // EXPORT/IMPORT
    // ============================================================

    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonString) {
        try {
            const newData = JSON.parse(jsonString);
            if (newData.months && Array.isArray(newData.months)) {
                this.data = newData;
                this.normalizeAllMonths();
                if (this.data.currentMonthId) {
                    this.currentMonth = this.data.months.find(m => m.id === this.data.currentMonthId);
                }
                this.saveData();
                return true;
            }
        } catch (e) {
            console.error('Error importing data:', e);
        }
        return false;
    }
}

// Initialize the app
const app = new SavingsApp();
