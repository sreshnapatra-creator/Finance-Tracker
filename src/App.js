import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import './App.css';

const TRANSACTIONS_KEY = 'fintrack-transactions';
const BUDGET_KEY = 'fintrack-budget';

const CHART_COLORS = [
  '#5145e5',
  '#15966a',
  '#e15e69',
  '#4389d4',
  '#df8750',
  '#8b62d9',
  '#d9a227',
];

const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Entertainment',
  'Salary',
  'Freelance',
  'Other',
];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function readTransactions() {
  try {
    const saved = localStorage.getItem(TRANSACTIONS_KEY);

    if (saved === null) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => {
        return (
          item &&
          item.id !== undefined &&
          typeof item.title === 'string' &&
          Number.isFinite(Number(item.amount)) &&
          Number(item.amount) > 0 &&
          ['income', 'expense'].includes(item.type) &&
          typeof item.date === 'string'
        );
      })
      .map((item) => ({
        ...item,
        amount: Number(item.amount),
        category: item.category || 'Other',
      }));
  } catch (error) {
    console.error('Could not load transactions:', error);
    return [];
  }
}

function readBudget() {
  try {
    const saved = localStorage.getItem(BUDGET_KEY);
    const value = Number(saved);

    return saved !== null && Number.isFinite(value) && value > 0
      ? value
      : 15000;
  } catch {
    return 15000;
  }
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function monthKey(dateString) {
  return String(dateString || '').slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  });
}

function App() {
  const [transactions, setTransactions] = useState(readTransactions);
     const [activeSection, setActiveSection] = useState('overview');
  const [monthlyBudget, setMonthlyBudget] = useState(readBudget);
  const [budgetInput, setBudgetInput] = useState(() =>
    String(readBudget())
  );

  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: today(),
  });

  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formMessage, setFormMessage] = useState('');
  const [budgetMessage, setBudgetMessage] = useState('');

  // Save transactions whenever the list changes.
  useEffect(() => {
    try {
      localStorage.setItem(
        TRANSACTIONS_KEY,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error('Could not save transactions:', error);
      setFormMessage('Could not save transactions in this browser.');
    }
  }, [transactions]);

  // Save the monthly budget.
  useEffect(() => {
    try {
      localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
    } catch (error) {
      console.error('Could not save budget:', error);
      setBudgetMessage('Could not save the budget in this browser.');
    }
  }, [monthlyBudget]);

  const thisMonth = today().slice(0, 7);

  const currentMonthTransactions = useMemo(
    () =>
      transactions.filter(
        (item) => monthKey(item.date) === thisMonth
      ),
    [transactions, thisMonth]
  );

  // Overall financial totals.
  const totalIncome = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = totalIncome - totalExpenses;

  // Current month's totals.
  const monthlyIncome = currentMonthTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const monthlyExpenses = currentMonthTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const budgetRemaining = monthlyBudget - monthlyExpenses;

  const budgetPercentage =
    monthlyBudget > 0
      ? (monthlyExpenses / monthlyBudget) * 100
      : 0;

  const safeBudgetPercentage = Math.min(budgetPercentage, 100);

  // Search and filter transactions.
  const filteredTransactions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return [...transactions]
      .filter((item) => {
        const title = String(item.title || '').toLowerCase();

        const matchesSearch = title.includes(search);

        const matchesCategory =
          categoryFilter === 'All' ||
          item.category === categoryFilter;

        const matchesType =
          typeFilter === 'All' || item.type === typeFilter;

        const matchesFrom = !dateFrom || item.date >= dateFrom;
        const matchesTo = !dateTo || item.date <= dateTo;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesFrom &&
          matchesTo
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    transactions,
    searchTerm,
    categoryFilter,
    typeFilter,
    dateFrom,
    dateTo,
  ]);

  // Expense breakdown for the pie chart.
  const categoryChartData = useMemo(() => {
    const totals = {};

    currentMonthTransactions
      .filter((item) => item.type === 'expense')
      .forEach((item) => {
        const category = item.category || 'Other';

        totals[category] =
          (totals[category] || 0) + Number(item.amount);
      });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value,
    }));
  }, [currentMonthTransactions]);

  // Income and expenses for the previous six calendar months.
  const monthlyChartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;

      months.push({
        key,
        month: monthLabel(key),
        income: 0,
        expenses: 0,
      });
    }

    const lookup = Object.fromEntries(
      months.map((item) => [item.key, item])
    );

    transactions.forEach((item) => {
      const key = monthKey(item.date);

      if (lookup[key]) {
        if (item.type === 'income') {
          lookup[key].income += Number(item.amount);
        } else {
          lookup[key].expenses += Number(item.amount);
        }
      }
    });

    return months;
  }, [transactions]);

  // Update the transaction form.
  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'type' &&
      value === 'income' &&
      previous.category === 'Food'
        ? { category: 'Salary' }
        : {}),
    }));

    setFormMessage('');
  }

  // Add a new transaction or update an existing one.
  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.title.trim()) {
      setFormMessage('Please enter a transaction description.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormMessage('Please enter an amount greater than zero.');
      return;
    }

    if (!form.date) {
      setFormMessage('Please select a date.');
      return;
    }

    const transaction = {
      id:
        editingId !== null
          ? editingId
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: form.title.trim(),
      amount,
      type: form.type,
      category: form.category,
      date: form.date,
    };

    if (editingId !== null) {
      setTransactions((previous) =>
        previous.map((item) =>
          String(item.id) === String(editingId)
            ? transaction
            : item
        )
      );

      setFormMessage('Transaction updated successfully.');
    } else {
      setTransactions((previous) => [
        transaction,
        ...previous,
      ]);

      setFormMessage('Transaction added successfully.');
    }

    setForm({
      title: '',
      amount: '',
      type: 'expense',
      category: 'Food',
      date: today(),
    });

    setEditingId(null);
  }

  // Load a transaction into the form for editing.
  function startEdit(transaction) {
    setEditingId(transaction.id);

    setForm({
      title: transaction.title,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
    });

    setFormMessage('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Cancel editing.
  function cancelEdit() {
    setEditingId(null);

    setForm({
      title: '',
      amount: '',
      type: 'expense',
      category: 'Food',
      date: today(),
    });

    setFormMessage('');
  }

  // FIXED: Delete immediately without a confirmation popup.
  function deleteTransaction(id) {
    setTransactions((previous) =>
      previous.filter(
        (item) => String(item.id) !== String(id)
      )
    );

    if (String(editingId) === String(id)) {
      cancelEdit();
    }

    setFormMessage('Transaction deleted.');
  }

  // Save the monthly budget.
  function saveBudget(event) {
    event.preventDefault();

    const value = Number(budgetInput);

    if (
      budgetInput.trim() === '' ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setBudgetMessage(
        'Enter a monthly budget greater than zero.'
      );
      return;
    }

    setMonthlyBudget(value);
    setBudgetInput(String(value));
    setBudgetMessage('Monthly budget saved successfully.');
  }

  // Reset all transaction filters.
  function clearFilters() {
    setSearchTerm('');
    setCategoryFilter('All');
    setTypeFilter('All');
    setDateFrom('');
    setDateTo('');
  }

  // Export transactions as a CSV file.
  function exportCSV() {
    const header = [
      'Description',
      'Amount',
      'Type',
      'Category',
      'Date',
    ];

    const rows = filteredTransactions.map((item) => [
      item.title,
      item.amount,
      item.type,
      item.category,
      item.date,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'fintrack-transactions.csv';

    document.body.appendChild(link);
link.click();
link.remove();

setTimeout(() => {
  URL.revokeObjectURL(url);
}, 1000);
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="brand">FinTrack.</h2>

        <p className="menu-label">MAIN MENU</p>

       <a
  className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
  href="#overview"
  onClick={() => setActiveSection('overview')}
>
  ▦ &nbsp; Overview
</a>

<a
  className={`nav-item ${activeSection === 'transactions' ? 'active' : ''}`}
  href="#transactions"
  onClick={() => setActiveSection('transactions')}
>
  ↔ &nbsp; Transactions
</a>

<a
  className={`nav-item ${activeSection === 'budget' ? 'active' : ''}`}
  href="#budget"
  onClick={() => setActiveSection('budget')}
>
  ◎ &nbsp; Budget
</a>

<a
  className={`nav-item ${activeSection === 'reports' ? 'active' : ''}`}
  href="#reports"
  onClick={() => setActiveSection('reports')}
>
  ▥ &nbsp; Reports
</a>

        <div className="sidebar-bottom">
          <strong>FinTrack Personal</strong>
          <br />
          Track your money, make it count.
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar" id="overview">
          <div>
            <span className="eyebrow">
              PERSONAL FINANCE DASHBOARD
            </span>

            <h1>Overview</h1>

            <p className="subtitle">
              Here is your financial summary.
            </p>
          </div>

          <div className="profile" title="FinTrack user">
            FT
          </div>
        </header>

        {/* Financial summary cards */}
        <section
          className="summary-grid"
          aria-label="Financial summary"
        >
          <article className="summary-card balance-card">
            <p>Total Balance</p>
            <h2>{formatMoney(balance)}</h2>
            <span>Income minus expenses · all time</span>
          </article>

          <article className="summary-card">
            <p>Total Income</p>
            <h2>{formatMoney(totalIncome)}</h2>
            <span className="positive">
              All recorded income
            </span>
          </article>

          <article className="summary-card">
            <p>Total Expenses</p>
            <h2>{formatMoney(totalExpenses)}</h2>
            <span className="negative">
              All recorded expenses
            </span>
          </article>
        </section>

        {/* Add or edit transaction */}
        <section className="panel add-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {editingId !== null
                  ? 'Edit Transaction'
                  : 'Add a Transaction'}
              </h2>

              <p>
                Record income or expenses to keep your dashboard
                up to date.
              </p>
            </div>
          </div>

          <form
            className="transaction-form"
            onSubmit={handleSubmit}
          >
            <label>
              Description
              <input
                name="title"
                type="text"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Groceries"
                maxLength="80"
                required
              />
            </label>

            <label>
              Amount (₹)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleFormChange}
                placeholder="e.g. 500"
                required
              />
            </label>

            <label>
              Type
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Category
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />
            </label>

            <div className="form-actions">
              <button className="add-button" type="submit">
                {editingId !== null
                  ? 'Save Changes'
                  : 'Add Transaction'}
              </button>

              {editingId !== null && (
                <button
                  className="cancel-button"
                  type="button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {formMessage && (
            <p className="form-message" role="status">
              {formMessage}
            </p>
          )}
        </section>

        {/* Monthly budget and snapshot */}
        <section className="content-grid" id="budget">
          <article className="panel budget-panel">
            <div className="panel-heading">
              <div>
                <h2>Monthly Budget</h2>

                <p>
                  {new Date().toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="budget-symbol">₹</div>
            </div>

            <form
              className="budget-form"
              onSubmit={saveBudget}
            >
              <label
                className="sr-only"
                htmlFor="monthly-budget"
              >
                Monthly budget amount
              </label>

              <input
                id="monthly-budget"
                type="number"
                min="1"
                step="0.01"
                value={budgetInput}
                onChange={(event) => {
                  setBudgetInput(event.target.value);
                  setBudgetMessage('');
                }}
                placeholder="Set monthly budget"
                required
              />

              <button type="submit">Save Budget</button>
            </form>

            <div className="budget-total">
              <h2>{formatMoney(monthlyExpenses)}</h2>
              <span>
                of {formatMoney(monthlyBudget)} spent
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={Math.min(
                Math.round(budgetPercentage),
                100
              )}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Monthly budget used"
            >
              <div
                className={`progress-fill ${
                  budgetPercentage >= 100
                    ? 'over-budget'
                    : ''
                }`}
                style={{
                  width: `${safeBudgetPercentage}%`,
                }}
              />
            </div>

            <p className="budget-caption">
              {Math.round(budgetPercentage)}% of your monthly
              budget used
            </p>

            {budgetPercentage >= 100 ? (
              <div className="budget-warning">
                You have reached or exceeded your budget by{' '}
                {formatMoney(
                  Math.max(0, monthlyExpenses - monthlyBudget)
                )}
                .
              </div>
            ) : (
              <div className="budget-success">
                {formatMoney(Math.max(0, budgetRemaining))}{' '}
                remaining for this month.
              </div>
            )}

            {budgetMessage && (
              <p className="form-message" role="status">
                {budgetMessage}
              </p>
            )}

            <div className="budget-footer">
              <span>Monthly income</span>
              <strong className="income">
                {formatMoney(monthlyIncome)}
              </strong>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>Monthly Snapshot</h2>
                <p>For the current month</p>
              </div>
            </div>

            <div className="snapshot-row">
              <span>Income</span>
              <strong className="income">
                {formatMoney(monthlyIncome)}
              </strong>
            </div>

            <div className="snapshot-row">
              <span>Expenses</span>
              <strong className="expense">
                {formatMoney(monthlyExpenses)}
              </strong>
            </div>

            <div className="snapshot-row">
              <span>Net savings</span>
              <strong
                className={
                  monthlyIncome - monthlyExpenses >= 0
                    ? 'income'
                    : 'expense'
                }
              >
                {formatMoney(monthlyIncome - monthlyExpenses)}
              </strong>
            </div>

            <div className="snapshot-note">
              Add transactions with dates in this month to update
              this snapshot and the charts.
            </div>
          </article>
        </section>

        {/* Charts and reports */}
        <section className="charts-grid" id="reports">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Expenses by Category</h2>
                <p>Current month spending breakdown</p>
              </div>
            </div>

            {categoryChartData.length === 0 ? (
              <div className="chart-empty">
                No expenses recorded this month yet.
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={42}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            CHART_COLORS[
                              index % CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => formatMoney(value)}
                    />

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Monthly Report</h2>
                <p>Income vs expenses · last 6 months</p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{
                    top: 8,
                    right: 8,
                    left: 0,
                    bottom: 4,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={48}
                  />

                  <Tooltip
                    formatter={(value) => formatMoney(value)}
                  />

                  <Legend />

                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#15966a"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#e15e69"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        {/* Transaction list, filters, and delete button */}
        <section
          className="panel transactions-panel"
          id="transactions"
        >
          <div className="panel-heading transactions-heading">
            <div>
              <h2>Transactions</h2>
              <p>
                Search, filter, edit, delete, or export your records.
              </p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={exportCSV}
            >
              Export CSV
            </button>
          </div>

          <div className="filter-controls">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search descriptions..."
              aria-label="Search transactions"
            />

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              aria-label="Filter by category"
            >
              <option value="All">All categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              aria-label="Filter by type"
            >
              <option value="All">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <label className="date-filter">
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                aria-label="Start date"
              />
            </label>

            <label className="date-filter">
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                aria-label="End date"
              />
            </label>

            <button
              className="clear-button"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="empty-message">
              {transactions.length === 0
                ? 'No transactions yet. Add your first transaction above.'
                : 'No transactions match these filters.'}
            </p>
          ) : (
            <div className="transaction-list">
              {filteredTransactions.map((item) => (
                <div className="transaction-row" key={item.id}>
                  <div
                    className={`transaction-icon ${
                      item.type === 'income'
                        ? 'income-icon'
                        : ''
                    } ${(item.category || 'other').toLowerCase()}`}
                  >
                    {item.type === 'income' ? '+' : '−'}
                  </div>

                  <div className="transaction-info">
                    <strong>{item.title}</strong>

                    <span>
                      {item.category || 'Other'} ·{' '}
                      {new Date(
                        `${item.date}T00:00:00`
                      ).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <strong
                    className={`amount ${
                      item.type === 'income'
                        ? 'income'
                        : 'expense'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '−'}
                    {formatMoney(item.amount)}
                  </strong>

                  <button
                    className="edit-button"
                    type="button"
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.title}`}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => deleteTransaction(item.id)}
                    aria-label={`Delete ${item.title}`}
                    title="Delete transaction"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="transaction-count">
            Showing {filteredTransactions.length} of{' '}
            {transactions.length} transactions
          </p>
        </section>

        <footer className="footer-text">
          FinTrack · Personal Finance Management · Your data is
          stored in this browser.
        </footer>
      </main>
    </div>
  );
}

export default App; 