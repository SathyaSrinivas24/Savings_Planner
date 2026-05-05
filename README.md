# Personal Savings Tracker 💰

A lightweight, client-side HTML application for tracking daily spending and managing savings with intelligent debt penalty system.

## Overview

This app helps you:
- **Set monthly budget** based on income, basic expenses, and investments
- **Calculate daily spending limit** automatically
- **Track daily expenses** and automatically allocate surplus to savings goals
- **Manage debt** with a 50% penalty system (when you overspend, your next day's limit is halved until debt is repaid)
- **Track multiple months** with history and comparisons
- **Visualize spending trends** and savings growth with charts

## How It Works

### The Core Concept

1. **Monthly Setup**
   - Enter your monthly income
   - Subtract basic expenses and investments
   - The remaining amount is divided by days in the month = **Daily Spending Limit**
   - Example: ₹30,000 remaining ÷ 30 days = ₹1,000/day

2. **Daily Tracking**
   - Enter how much you spent that day
   - If you spent less than the limit, the surplus goes to **Savings Goals** (Emergency, Travel, Investment Account)
   - If you spent more, **Debt is created**

3. **Debt Penalty System** (The Smart Part!)
   - When you create debt, your next day's limit becomes **50% of the base limit**
   - Example: You spent ₹1,500 instead of ₹1,000 (₹500 debt). Tomorrow's limit becomes ₹500.
   - If tomorrow you spend ₹300 (under the reduced limit), you have ₹200 surplus
   - That ₹200 goes toward paying off the ₹500 debt. New debt = ₹300.
   - This continues until debt is fully repaid, then the limit returns to normal
   - Multiple days of underspending can accumulate and pay off debt faster

4. **Savings Allocation**
   - Daily surplus is split among your savings goals (default: 33.33% each)
   - Customize allocation percentages per month

## Features

### 📊 Dashboard & Visualization
- Real-time daily limit and remaining budget display
- Progress bar showing remaining daily budget
- Multi-month spending trend chart
- Savings goal breakdown pie chart
- Detailed month statistics and month history

### 🗂️ Multi-Month Support
- Create unlimited months for tracking multiple periods
- Copy configuration from previous month for quick setup
- View/edit/compare any past month
- Full month history with spending summaries

### 💾 Data Management
- Data stored in browser's LocalStorage (persists across browser sessions)
- Export data as JSON for backup
- Import previously exported data
- All data remains client-side (no server required)

### 🎯 Savings Goals
- Track up to 3 customizable savings goals per month (default: Emergency, Travel, Investment Account)
- Define allocation percentages for surplus distribution
- See real-time breakdown of savings by goal

## Getting Started

### Installation

1. **Download files** to a folder (e.g., `Savings_Planner/`)
   - `index.html` — Main app file
   - `app.js` — Business logic
   - `ui.js` — UI interactions
   - `style.css` — Styling
   - `data.json` — Data template (auto-created)

2. **Open the app**
   - Double-click `index.html` or drag it to your browser
   - Or run a simple HTTP server: `python -m http.server 8000` then visit `http://localhost:8000`

### First Steps

1. **Go to "Month Setup" tab**
2. **Enter your monthly figures**:
   - Total Monthly Income
   - Basic Monthly Expenses (rent, utilities, etc.)
   - Monthly Investments
   - Days in the month
3. **Adjust Savings Goals** if needed (ensure percentages sum to 100%)
4. **Click "Save Configuration"**
5. **Go to "Daily Tracker"** and start logging daily expenses

## Understanding the Debt System

### Example Walkthrough

**Setup**: Monthly Limit = ₹1,000/day, Starting Debt = ₹0

| Day | Limit | Spent | Surplus | Debt Added | New Debt | Savings |
|-----|-------|-------|---------|------------|----------|---------|
| 1   | ₹1000 | ₹800  | ₹200    | ₹0         | ₹0       | ₹200    |
| 2   | ₹1000 | ₹2000 | ₹0      | ₹1000      | ₹1000    | ₹0      |
| 3*  | ₹500  | ₹300  | ₹200    | ₹0         | ₹800     | ₹0      |
| 4*  | ₹500  | ₹400  | ₹100    | ₹0         | ₹700     | ₹0      |
| 5*  | ₹500  | ₹500  | ₹0      | ₹0         | ₹700     | ₹0      |
| 6*  | ₹500  | ₹300  | ₹200    | ₹0         | ₹500     | ₹0      |
| 7*  | ₹500  | ₹500  | ₹0      | ₹0         | ₹500     | ₹0      |
| 8*  | ₹500  | ₹200  | ₹300    | ₹0         | ₹200     | ₹0      |
| 9*  | ₹500  | ₹300  | ₹200    | ₹0         | ₹0       | ₹0      |
| 10  | ₹1000 | ₹800  | ₹200    | ₹0         | ₹0       | ₹200    |

*Days marked with * = 50% penalty (debt active)

**Key Insight**: By the end, you only saved ₹400 total but learned the importance of not overspending!

## Data Schema (JSON)

### Monthly Entry Structure

```json
{
  "months": [
    {
      "id": "2026-04",
      "monthName": "April 2026",
      "income": 30000,
      "basicExpenses": 10000,
      "investments": 5000,
      "daysInMonth": 30,
      "carryoverDebt": 0,
      "savingsGoals": [
        { "name": "Emergency", "percentage": 33.33 },
        { "name": "Travel", "percentage": 33.33 },
        { "name": "Investment Account", "percentage": 33.34 }
      ],
      "dailyEntries": [
        {
          "date": "2026-04-01",
          "expenseAmount": 800,
          "dailyLimit": 1000,
          "debtAccrued": 0,
          "debtRepaid": 0,
          "surplus": 200,
          "savingsAllocation": {
            "Emergency": 66.67,
            "Travel": 66.67,
            "Investment Account": 66.66
          },
          "timestamp": "2026-04-01T10:30:00Z"
        }
      ],
      "totalSavingsAllocated": {
        "Emergency": 66.67,
        "Travel": 66.67,
        "Investment Account": 66.66
      },
      "totalDebt": 0,
      "createdAt": "2026-04-27"
    }
  ],
  "currentMonthId": "2026-04"
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `id` | Month identifier (YYYY-MM format) |
| `income` | Total monthly income (₹) |
| `basicExpenses` | Fixed monthly expenses (₹) |
| `investments` | Monthly investment amount (₹) |
| `daysInMonth` | Number of days in the month |
| `carryoverDebt` | Debt carried from previous month |
| `savingsGoals` | Array of 3 savings goal definitions with percentages |
| `dailyEntries` | Array of daily expense logs |
| `totalDebt` | Current accumulated debt |

## Tips & Tricks

### ✅ Best Practices

1. **Update daily**: Log expenses at the end of each day for accuracy
2. **Review weekly**: Check the Overview tab weekly to spot patterns
3. **Adjust goals**: Modify savings goal percentages if needed (via Month Setup)
4. **Backup monthly**: Export data at month-end for backup
5. **Use history**: Compare months to see spending trends

### ⚙️ Customization

- **Change goal names**: Edit in Month Setup (must sum to 100%)
- **Adjust allocation percentages**: Reallocate surplus distribution per month
- **Copy previous month**: Use "Copy from Previous Month" button to avoid re-entering

### 🐛 Troubleshooting

**Data not saving?**
- Check if browser allows LocalStorage
- Try a different browser (Chrome, Firefox, Safari all supported)
- Export data periodically as backup

**Charts not showing?**
- Ensure you've logged at least one day's expense
- Refresh the browser
- Check browser console for errors (F12 → Console)

**Debt not calculating correctly?**
- Verify you're on the correct month
- Check that expense date matches the calendar
- Refresh and try adding expense again

## Technical Details

### Technology Stack

- **HTML5** — Semantic markup
- **CSS3** — Modern styling with gradients and flexbox
- **Vanilla JavaScript** — No framework dependencies
- **Chart.js** — Data visualization (CDN)
- **LocalStorage API** — Client-side data persistence

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Storage Limit

- LocalStorage typically allows **5-10 MB** per domain
- App uses ~200KB for typical 1 year of data
- Export regularly to stay within limits

## File Structure

```
Savings_Planner/
├── index.html          # Main HTML file (open this!)
├── app.js              # Business logic & calculations
├── ui.js               # UI interactions & rendering
├── style.css           # Styling
├── data.json           # Template (auto-created on first run)
└── README.md           # This file
```

## License

This is a personal project for managing your own finances. Feel free to modify and customize as needed.

## Questions or Issues?

- Review the "Understanding the Debt System" section above
- Check the console (F12) for any error messages
- Verify JSON structure if importing data
- Try exporting and re-importing data to reset state

---

**Happy saving! 🎯**
