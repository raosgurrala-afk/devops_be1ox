(() => {
  const categories = {
    expense: [
      "Groceries",
      "Housing",
      "Transport",
      "Dining",
      "Bills",
      "Shopping",
      "Health",
      "Entertainment",
      "Education",
      "Personal care",
      "Travel",
      "Other",
    ],
    income: ["Salary", "Freelance", "Investments", "Gifts", "Other income"],
  };
  const categoryColors = {
    Groceries: "#4b9e70",
    Housing: "#e8bc5c",
    Transport: "#6f9ca1",
    Dining: "#e6a16c",
    Bills: "#b7a4d0",
    Shopping: "#83a96d",
    Health: "#dc8b80",
    Entertainment: "#7fa7c9",
    Salary: "#4b9e70",
    Freelance: "#6f9ca1",
    "Other income": "#b7a4d0",
  };
  const categoryIcons = {
    Groceries: ["▧", "tx-grocery"],
    Housing: ["⌂", "tx-home"],
    Transport: ["↗", "tx-travel"],
    Dining: ["◒", "tx-food"],
    Bills: ["ϟ", "tx-other"],
    Shopping: ["◇", "tx-other"],
    Health: ["✚", "tx-health"],
    Entertainment: ["▷", "tx-other"],
    Salary: ["↙", "tx-income"],
    Freelance: ["↙", "tx-income"],
    "Other income": ["↙", "tx-income"],
  };
  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const storageKey = "monee-finance-v1";
  const now = new Date();
  const monthInput = document.querySelector("#monthPicker");
  const todayLabel = document.querySelector("#todayLabel");
  const transactionDialog = document.querySelector("#transactionDialog");
  const transactionForm = document.querySelector("#transactionForm");
  const typeButtons = [...document.querySelectorAll(".type-option")];
  const toast = document.querySelector("#toast");
  let selectedType = "expense";
  let showAll = false;
  let toastTimer;
  let csvRows = [];
  let csvHeaders = [];
  let previousState;

  const pad = (value) => String(value).padStart(2, "0");
  const localDate = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const monthKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const selectedMonth = () => monthInput.value || monthKey(now);

  function makeSeedTransactions() {
    const seed = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthDays = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
      ).getDate();
      const currentDay =
        monthKey(month) === monthKey(now)
          ? Math.max(now.getDate() - 1, 1)
          : monthDays;
      const day = (desired) => pad(Math.min(desired, currentDay, monthDays));
      const add = (
        id,
        name,
        category,
        amount,
        desiredDay,
        type,
        account,
        note = "",
      ) => {
        seed.push({
          id: `${monthKey(month)}-${id}`,
          name,
          category,
          amount,
          date: `${monthKey(month)}-${day(desiredDay)}`,
          type,
          account,
          note,
        });
      };
      add(
        "salary",
        "Monthly salary",
        "Salary",
        82000,
        1,
        "income",
        "Everyday account",
      );
      add(
        "freelance",
        "Design project",
        "Freelance",
        12000,
        2,
        "income",
        "Everyday account",
      );
      add(
        "rent",
        "Monthly rent",
        "Housing",
        18000,
        3,
        "expense",
        "Everyday account",
      );
      add(
        "market",
        "Fresh market",
        "Groceries",
        4800,
        5,
        "expense",
        "Everyday account",
      );
      add(
        "dinner",
        "Dinner with friends",
        "Dining",
        2100,
        7,
        "expense",
        "Cash wallet",
      );
      add(
        "commute",
        "Metro & cabs",
        "Transport",
        1600,
        9,
        "expense",
        "Cash wallet",
      );
      add(
        "utilities",
        "Electricity & internet",
        "Bills",
        3000,
        11,
        "expense",
        "Everyday account",
      );
      add(
        "shopping",
        "Everyday essentials",
        "Shopping",
        2700,
        13,
        "expense",
        "Everyday account",
      );
      add("pharmacy", "Pharmacy", "Health", 800, 15, "expense", "Cash wallet");
      add(
        "coffee",
        "Coffee & snacks",
        "Dining",
        450,
        18,
        "expense",
        "Cash wallet",
      );
    }
    return seed.sort((a, b) => b.date.localeCompare(a.date));
  }

  function readState() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved)
        return { transactions: makeSeedTransactions(), budget: 45000 };
      const state = JSON.parse(saved);
      if (!Array.isArray(state.transactions) || !Number.isFinite(state.budget))
        throw new Error("Saved finance data is invalid.");
      return state;
    } catch (error) {
      console.error("Could not load saved finance data.", error);
      return { transactions: makeSeedTransactions(), budget: 45000 };
    }
  }

  let state = readState();

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("Could not save finance data.", error);
      showToast("Could not save changes in this browser.");
    }
  }

  function money(amount) {
    return currency.format(amount);
  }

  function dateLabel(isoDate) {
    const date = new Date(`${isoDate}T12:00:00`);
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function getMonthTransactions() {
    return state.transactions.filter((item) =>
      item.date.startsWith(selectedMonth()),
    );
  }

  function getMonthTotals(transactions) {
    return transactions.reduce(
      (totals, item) => {
        totals[item.type] += item.amount;
        return totals;
      },
      { income: 0, expense: 0 },
    );
  }

  function renderSummary(monthTransactions) {
    const totals = getMonthTotals(monthTransactions);
    const saved = totals.income - totals.expense;
    const savingsRate = totals.income
      ? Math.round((saved / totals.income) * 100)
      : 0;
    const bank =
      41200 +
      state.transactions
        .filter((item) => item.account === "Everyday account")
        .reduce(
          (balance, item) =>
            balance + (item.type === "income" ? item.amount : -item.amount),
          0,
        );
    const cash =
      40000 +
      state.transactions
        .filter((item) => item.account === "Cash wallet")
        .reduce(
          (balance, item) =>
            balance + (item.type === "income" ? item.amount : -item.amount),
          0,
        );
    document.querySelector("#balanceValue").textContent = money(bank + cash);
    document.querySelector("#incomeValue").textContent = money(totals.income);
    document.querySelector("#expenseValue").textContent = money(totals.expense);
    document.querySelector("#savingsValue").textContent = money(saved);
    document.querySelector("#savingsRate").textContent = `${savingsRate}%`;
    document.querySelector("#savingsProgress").style.width =
      `${Math.max(0, Math.min(100, savingsRate))}%`;
    document.querySelector("#incomeCount").textContent =
      monthTransactions.filter((item) => item.type === "income").length;
    document.querySelector("#expenseCount").textContent =
      monthTransactions.filter((item) => item.type === "expense").length;
    document.querySelector("#donutTotal").textContent = money(totals.expense);
    document.querySelector("#bankBalance").textContent = money(bank);
    document.querySelector("#cashBalance").textContent = money(cash);
  }

  function renderSpending(monthTransactions) {
    const expenses = monthTransactions.filter(
      (item) => item.type === "expense",
    );
    const totals = expenses.reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount;
      return result;
    }, {});
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, item) => sum + item[1], 0);
    const topCategories = sorted.slice(0, 5);
    let position = 0;
    const segments = topCategories.map(([name, amount]) => {
      const start = position;
      position += total ? (amount / total) * 100 : 0;
      return `${categoryColors[name] || "#b3c2b6"} ${start}% ${position}%`;
    });
    if (position < 100) segments.push(`#e7ebe7 ${position}% 100%`);
    document.querySelector("#spendingDonut").style.background = total
      ? `conic-gradient(${segments.join(", ")})`
      : "#edf0ed";
    document.querySelector("#categoryLegend").innerHTML = topCategories.length
      ? topCategories
          .map(
            ([name, amount]) =>
              `<div class="category-item"><span class="category-dot" style="background:${categoryColors[name] || "#b3c2b6"}"></span><span class="category-name">${escapeHtml(name)}</span><span class="category-percent">${Math.round((amount / total) * 100)}%</span></div>`,
          )
          .join("")
      : '<p class="welcome-subtitle">No spending recorded yet.</p>';
  }

  function renderBudget(monthTransactions) {
    const expense = getMonthTotals(monthTransactions).expense;
    const percent = state.budget ? (expense / state.budget) * 100 : 0;
    const capped = Math.min(100, percent);
    const track = document.querySelector(".progress-track");
    track.classList.toggle("warning", percent >= 80 && percent <= 100);
    track.classList.toggle("over", percent > 100);
    document.querySelector("#budgetSpent").textContent = money(expense);
    document.querySelector("#budgetLimit").textContent = money(state.budget);
    document.querySelector("#budgetPercent").textContent =
      `${Math.round(percent)}%`;
    document.querySelector("#budgetProgress").style.width = `${capped}%`;
    const message =
      percent > 100
        ? `You’re ${money(expense - state.budget)} over your budget.`
        : percent >= 80
          ? "You’re getting close to your monthly limit."
          : "You’re on track this month.";
    document.querySelector("#budgetMessage").textContent = message;
    document.querySelector("#budgetSubtitle").textContent =
      percent > 100
        ? "Let’s get back on track."
        : percent >= 80
          ? "You’re getting close."
          : "You’re doing great. Keep it up!";
    document.querySelector(".budget-footnote .tiny-dot").className =
      `tiny-dot ${percent > 100 ? "orange-dot" : "green-dot"}`;
    const categoriesSpent = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        result[item.category] = (result[item.category] || 0) + item.amount;
        return result;
      }, {});
    const top = Object.entries(categoriesSpent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    document.querySelector("#budgetCategories").innerHTML = top.length
      ? top
          .map(
            ([name, amount]) =>
              `<div class="budget-category"><span>${escapeHtml(name)}</span><strong>${money(amount)}</strong></div>`,
          )
          .join("")
      : '<p class="welcome-subtitle">Add expenses to see your top categories.</p>';
  }

  function renderCashflow() {
    const month = selectedMonth();
    const [year, monthNumber] = month.split("-").map(Number);
    const monthLabels = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(year, monthNumber - 1 - offset, 1);
      monthLabels.push({
        key: monthKey(date),
        label: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
      });
    }
    const values = monthLabels.map(({ key, label }) => {
      const totals = getMonthTotals(
        state.transactions.filter((item) => item.date.startsWith(key)),
      );
      return { label, income: totals.income, expense: totals.expense };
    });
    const max = Math.max(
      1,
      ...values.flatMap(({ income, expense }) => [income, expense]),
    );
    document.querySelector("#cashflowChart").innerHTML = values
      .map(({ label, income, expense }) => {
        const incomeHeight = Math.max(income ? 4 : 0, (income / max) * 88);
        const expenseHeight = Math.max(expense ? 4 : 0, (expense / max) * 88);
        return `<div class="flow-month"><div class="flow-bars"><span class="flow-bar" title="Income ${money(income)}" style="height:${incomeHeight}px"></span><span class="flow-bar expense" title="Expenses ${money(expense)}" style="height:${expenseHeight}px"></span></div><span>${label}</span></div>`;
      })
      .join("");
  }

  function renderTransactions() {
    const query = document
      .querySelector("#searchInput")
      .value.trim()
      .toLowerCase();
    const type = document.querySelector("#typeFilter").value;
    const transactions = getMonthTransactions()
      .filter((item) => type === "all" || item.type === type)
      .filter((item) =>
        `${item.name} ${item.category} ${item.account} ${item.note}`
          .toLowerCase()
          .includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const visible = showAll ? transactions : transactions.slice(0, 6);
    document.querySelector("#transactionRows").innerHTML = visible
      .map((item) => {
        const [icon, iconClass] = categoryIcons[item.category] || [
          "◇",
          item.type === "income" ? "tx-income" : "tx-other",
        ];
        const amount = `${item.type === "income" ? "+" : "−"}${money(item.amount)}`;
        return `<tr><td><div class="transaction-name"><span class="transaction-icon ${iconClass}" aria-hidden="true">${icon}</span><span class="transaction-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.account)}</small></span></div></td><td><span class="category-pill">${escapeHtml(item.category)}</span></td><td>${dateLabel(item.date)}</td><td>${escapeHtml(item.account)}</td><td class="transaction-amount ${item.type}">${amount}</td><td><button class="delete-transaction" data-delete="${escapeHtml(item.id)}" type="button" aria-label="Delete ${escapeHtml(item.name)}">×</button></td></tr>`;
      })
      .join("");
    document.querySelector("#emptyState").hidden = transactions.length > 0;
    document.querySelector("#transactionCount").textContent =
      `Showing ${visible.length} of ${transactions.length} transactions`;
    document.querySelector("#showAllButton").hidden = transactions.length <= 6;
    document.querySelector("#showAllButton").innerHTML = showAll
      ? "Show fewer <span>↑</span>"
      : "View all transactions <span>→</span>";
  }

  function render() {
    const monthTransactions = getMonthTransactions();
    const [year, month] = selectedMonth().split("-").map(Number);
    document.querySelector(".breadcrumb strong").textContent = "Overview";
    document.querySelector("#budgetInput").value = state.budget;
    document.querySelector("#budgetTitle").textContent =
      `${new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(year, month - 1, 1))} budget`;
    renderSummary(monthTransactions);
    renderSpending(monthTransactions);
    renderBudget(monthTransactions);
    renderCashflow();
    renderTransactions();
  }

  function showToast(message, undo) {
    clearTimeout(toastTimer);
    toast.replaceChildren(document.createTextNode(message));
    if (undo) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Undo";
      button.addEventListener(
        "click",
        () => {
          if (previousState) state = previousState;
          persist();
          render();
          toast.classList.remove("visible");
        },
        { once: true },
      );
      toast.append(button);
    }
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
  }

  function updateCategoryOptions() {
    const select = document.querySelector("#categoryInput");
    select.innerHTML = categories[selectedType]
      .map((category) => `<option>${escapeHtml(category)}</option>`)
      .join("");
  }

  function openTransaction() {
    updateCategoryOptions();
    document.querySelector("#dateInput").value = localDate(now);
    transactionDialog.showModal();
    requestAnimationFrame(() => document.querySelector("#amountInput").focus());
  }

  function setTransactionType(type) {
    selectedType = type;
    typeButtons.forEach((button) => {
      const active = button.dataset.type === type;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateCategoryOptions();
  }

  function checkBudgetAlert(previousExpense, nextExpense) {
    const previousPercent = (previousExpense / state.budget) * 100;
    const nextPercent = (nextExpense / state.budget) * 100;
    if (nextPercent > 100 && previousPercent <= 100)
      showToast("You’ve reached 100% of your monthly budget.");
    else if (nextPercent >= 80 && previousPercent < 80)
      showToast("Heads up: you’ve used 80% of your monthly budget.");
  }

  function addTransaction(transaction) {
    const before = getMonthTotals(getMonthTransactions()).expense;
    previousState = structuredClone(state);
    state.transactions.push(transaction);
    persist();
    render();
    if (transaction.type === "expense")
      checkBudgetAlert(before, getMonthTotals(getMonthTransactions()).expense);
    else showToast("Transaction added.", true);
  }

  function downloadCsv() {
    const header = ["date", "amount", "type", "category", "account", "note"];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      header.join(","),
      ...state.transactions.map((item) =>
        header.map((field) => quote(item[field])).join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `monee-transactions-${localDate(now)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Your CSV export is ready.");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"' && quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field.trim());
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[index + 1] === "\n") index += 1;
        row.push(field.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    if (field || row.length) {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
    }
    return rows;
  }

  function guessColumn(headers, keywords) {
    return headers.findIndex((header) =>
      keywords.some((word) => header.toLowerCase().includes(word)),
    );
  }

  function renderImportMapping() {
    const mapping = document.querySelector("#importMapping");
    const mappings = [
      ["date", "Date", ["date", "time"]],
      ["amount", "Amount", ["amount", "value", "total", "sum"]],
      ["category", "Category", ["category", "type"]],
      [
        "note",
        "Note",
        ["note", "description", "merchant", "name", "memo", "details"],
      ],
    ];
    const selectors = mappings
      .map(([key, label, words]) => {
        const selectedIndex =
          key === "category"
            ? csvHeaders.findIndex((header) =>
                header.toLowerCase().includes("category"),
              )
            : key === "note"
              ? guessColumn(csvHeaders, words)
              : guessColumn(csvHeaders, words);
        const options = [
          '<option value="">Not included</option>',
          ...csvHeaders.map(
            (header, index) =>
              `<option value="${index}" ${selectedIndex === index ? "selected" : ""}>${escapeHtml(header)}</option>`,
          ),
        ];
        return `<label>${label}<select data-column="${key}" ${key === "date" || key === "amount" ? "required" : ""}>${options.join("")}</select></label>`;
      })
      .join("");
    const preview = csvRows
      .slice(1, 4)
      .map((row) => row.slice(0, 5).map(escapeHtml).join(" · "))
      .join("<br>");
    mapping.innerHTML = `<h3>Map columns and preview</h3><div class="mapping-grid">${selectors}</div><div class="import-preview">${preview}</div>`;
    mapping.hidden = false;
    document.querySelector("#importSubmit").disabled = false;
  }

  function getMappedImportTransactions() {
    const columns = Object.fromEntries(
      [...document.querySelectorAll("[data-column]")].map((select) => [
        select.dataset.column,
        select.value === "" ? -1 : Number(select.value),
      ]),
    );
    const imported = [];
    const errors = [];
    csvRows.slice(1).forEach((row, index) => {
      const rawAmount = Number(
        String(row[columns.amount] || "").replace(/[₹,\s]/g, ""),
      );
      const rawDate = String(row[columns.date] || "").trim();
      if (!Number.isFinite(rawAmount) || rawAmount === 0 || !rawDate) {
        errors.push(index + 2);
        return;
      }
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) {
        errors.push(index + 2);
        return;
      }
      const category =
        columns.category < 0
          ? "Other"
          : row[columns.category]?.trim() || "Other";
      const explicitType = row.find(
        (cell, cellIndex) =>
          cellIndex !== columns.date &&
          /^(income|expense|credit|debit)$/i.test(cell.trim()),
      );
      const type = explicitType
        ? /^(income|credit)$/i.test(explicitType.trim())
          ? "income"
          : "expense"
        : rawAmount < 0
          ? "expense"
          : "income";
      const amount = Math.abs(rawAmount);
      const note = columns.note < 0 ? "" : row[columns.note]?.trim() || "";
      const formattedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      const duplicate = state.transactions.some(
        (item) =>
          item.date === formattedDate &&
          item.amount === amount &&
          item.note === note,
      );
      if (duplicate) return;
      imported.push({
        id: `import-${Date.now()}-${index}`,
        name: note || category,
        category: categories[type].includes(category)
          ? category
          : type === "expense"
            ? "Other"
            : "Other income",
        amount,
        date: formattedDate,
        type,
        account: "Everyday account",
        note,
      });
    });
    return { imported, errors };
  }

  monthInput.value = monthKey(now);
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  document.querySelector("#welcomeGreeting").textContent = `${greeting}, Alex`;
  todayLabel.textContent = `YOUR FINANCES AT A GLANCE · ${new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(now).toUpperCase()}`;
  render();
  updateCategoryOptions();

  document
    .querySelectorAll("[data-open-transaction]")
    .forEach((button) => button.addEventListener("click", openTransaction));
  document.querySelectorAll("[data-close-dialog]").forEach((button) =>
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeDialog).close();
    }),
  );
  typeButtons.forEach((button) =>
    button.addEventListener("click", () =>
      setTransactionType(button.dataset.type),
    ),
  );
  monthInput.addEventListener("change", render);
  document
    .querySelector("#searchInput")
    .addEventListener("input", renderTransactions);
  document
    .querySelector("#typeFilter")
    .addEventListener("change", renderTransactions);
  document.querySelector("#showAllButton").addEventListener("click", () => {
    showAll = !showAll;
    renderTransactions();
  });
  document
    .querySelector("#transactionRows")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete]");
      if (!button) return;
      previousState = structuredClone(state);
      state.transactions = state.transactions.filter(
        (item) => item.id !== button.dataset.delete,
      );
      persist();
      render();
      showToast("Transaction deleted.", true);
    });
  transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(transactionForm);
    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      document.querySelector("#amountInput").focus();
      return;
    }
    const category = String(formData.get("category"));
    const note = String(formData.get("note")).trim();
    addTransaction({
      id: `transaction-${Date.now()}`,
      name: note || category,
      category,
      amount,
      date: String(formData.get("date")),
      type: selectedType,
      account: String(formData.get("account")),
      note,
    });
    transactionForm.reset();
    setTransactionType("expense");
    transactionDialog.close();
  });
  document.querySelectorAll("[data-scroll]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .getElementById(button.dataset.scroll)
        .scrollIntoView({ behavior: "smooth" });
    }),
  );
  document
    .querySelector("#editBudget")
    .addEventListener("click", () =>
      document.querySelector("#budgetDialog").showModal(),
    );
  document
    .querySelector("#editBudgetLink")
    .addEventListener("click", () =>
      document.querySelector("#budgetDialog").showModal(),
    );
  document.querySelector("#budgetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(document.querySelector("#budgetInput").value);
    if (!Number.isFinite(amount) || amount < 1) return;
    state.budget = amount;
    persist();
    render();
    document.querySelector("#budgetDialog").close();
    showToast("Monthly budget updated.");
  });
  document
    .querySelector("#exportButton")
    .addEventListener("click", downloadCsv);
  document
    .querySelector("#footerExport")
    .addEventListener("click", downloadCsv);
  document.querySelector("#importButton").addEventListener("click", () => {
    document.querySelector("#importDialog").showModal();
  });
  document
    .querySelector("#csvFile")
    .addEventListener("change", async (event) => {
      const file = event.target.files[0];
      const error = document.querySelector("#importError");
      const mapping = document.querySelector("#importMapping");
      error.hidden = true;
      mapping.hidden = true;
      document.querySelector("#importSubmit").disabled = true;
      if (!file) return;
      try {
        csvRows = parseCsv(await file.text());
        if (csvRows.length < 2)
          throw new Error(
            "This file needs a header row and at least one transaction.",
          );
        csvHeaders = csvRows[0];
        if (
          guessColumn(csvHeaders, ["date", "time"]) < 0 ||
          guessColumn(csvHeaders, ["amount", "value", "total", "sum"]) < 0
        ) {
          throw new Error(
            "Couldn’t find date and amount columns. Make sure your CSV has headers for both.",
          );
        }
        renderImportMapping();
      } catch (importError) {
        error.textContent = importError.message;
        error.hidden = false;
      }
    });
  document.querySelector("#importForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const { imported, errors } = getMappedImportTransactions();
    if (!imported.length) {
      const error = document.querySelector("#importError");
      error.textContent = errors.length
        ? `No valid transactions found. Check the date and amount in rows ${errors.join(", ")}.`
        : "No new transactions to import; all rows may already exist.";
      error.hidden = false;
      return;
    }
    state.transactions.push(...imported);
    persist();
    render();
    document.querySelector("#importDialog").close();
    document.querySelector("#importForm").reset();
    document.querySelector("#importMapping").hidden = true;
    showToast(
      `${imported.length} transaction${imported.length === 1 ? "" : "s"} imported${errors.length ? ` · ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : ""}.`,
    );
  });
  document
    .querySelector("#addAccount")
    .addEventListener("click", () =>
      showToast("Account setup is coming soon."),
    );
  document.querySelector("#menuToggle").addEventListener("click", () => {
    const active = document
      .querySelector(".sidebar")
      .classList.toggle("mobile-open");
    document
      .querySelector(".sidebar")
      .setAttribute("aria-expanded", String(active));
  });
  document.querySelectorAll(".nav-link").forEach((link) =>
    link.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-link")
        .forEach((item) => item.classList.toggle("active", item === link));
      document.querySelector(".breadcrumb strong").textContent =
        link.textContent
          .replace(link.querySelector(".nav-icon").textContent, "")
          .trim();
      document.querySelector(".sidebar").classList.remove("mobile-open");
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (
      event.key.toLowerCase() === "n" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement.tagName,
      ) &&
      !transactionDialog.open &&
      !document.querySelector("#importDialog").open &&
      !document.querySelector("#budgetDialog").open
    ) {
      event.preventDefault();
      openTransaction();
    }
    if (event.key === "Escape")
      document.querySelector(".sidebar").classList.remove("mobile-open");
  });
})();
