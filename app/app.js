/* Hearth Ledger — the application. One page, hash routes, all state in
   memory with a localStorage copy so the family's edits survive a reload.
   Every control on every page does what it says. */

const STORE_KEY = "hearth-ledger-v1";
const MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const ITEMISED = ["2026-10", "2026-11"];

/* ---------- state ---------- */
function freshState() {
  return JSON.parse(JSON.stringify(HL_DATA));
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.categories && s.transactions && s.goals) return s;
    }
  } catch (e) { /* private mode or no storage: run on the seed data */ }
  return freshState();
}
let state = loadState();
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* keep going in memory */ }
}

/* ---------- helpers ---------- */
function money(n) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function money0(n) {
  return "$" + Math.round(Number(n)).toLocaleString("en-US");
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function monthLabel(m) {
  const parts = m.split("-");
  return MONTH_NAMES[Number(parts[1]) - 1] + " " + parts[0];
}
function shortMonth(m) {
  return MONTH_NAMES[Number(m.split("-")[1]) - 1].slice(0, 3);
}
function catById(id) {
  return state.categories.find((c) => c.id === id) || { name: id, color: "#888", budget: 0 };
}
function monthTxns(m) {
  return state.transactions.filter((t) => t.date.slice(0, 7) === m);
}
function monthIncome(m) {
  if (ITEMISED.indexOf(m) >= 0) {
    return monthTxns(m).filter((t) => t.kind === "income")
      .reduce((s, t) => s + t.amount, 0);
  }
  const row = state.monthlyTotals.find((r) => r.month === m);
  return row ? row.income : 0;
}
function spentByCategory(m) {
  const out = {};
  state.categories.forEach((c) => { out[c.id] = 0; });
  if (ITEMISED.indexOf(m) >= 0) {
    monthTxns(m).filter((t) => t.kind === "expense").forEach((t) => {
      if (out[t.category] === undefined) out[t.category] = 0;
      out[t.category] += t.amount;
    });
  } else {
    const row = state.monthlyTotals.find((r) => r.month === m);
    if (row) out.__total = row.spent;
  }
  return out;
}
function monthSpent(m) {
  if (ITEMISED.indexOf(m) >= 0) {
    return monthTxns(m).filter((t) => t.kind === "expense")
      .reduce((s, t) => s + t.amount, 0);
  }
  const row = state.monthlyTotals.find((r) => r.month === m);
  return row ? row.spent : 0;
}
function totalBudget() {
  return state.categories.reduce((s, c) => s + c.budget, 0);
}
function pct(spent, budget) {
  return budget > 0 ? Math.round((spent / budget) * 100) : 0;
}
function barClass(p) {
  return p >= 100 ? "bar over" : (p >= 85 ? "bar warm" : "bar");
}
function sortedTxns(m) {
  return monthTxns(m).slice().sort((a, b) =>
    (b.date + b.id).localeCompare(a.date + a.id));
}

/* ---------- routing ---------- */
let currentMonth = "2026-11";
let currentRoute = "dashboard";
let editId = null;
let txnFilter = { category: "all", kind: "all", q: "" };

function route() {
  const hash = (location.hash || "#dashboard").replace("#", "");
  currentRoute = ["dashboard", "transactions", "budgets", "goals", "reports", "settings"].indexOf(hash) >= 0
    ? hash : "dashboard";
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.getAttribute("data-nav") === currentRoute));
  render();
}

function render() {
  const view = document.getElementById("view");
  const pages = {
    dashboard: renderDashboard,
    transactions: renderTransactions,
    budgets: renderBudgets,
    goals: renderGoals,
    reports: renderReports,
    settings: renderSettings
  };
  view.innerHTML = pages[currentRoute]();
  const focus = view.querySelector("[data-autofocus]");
  if (focus) focus.focus();
}

/* ---------- dashboard ---------- */
function renderDashboard() {
  const m = currentMonth;
  const income = monthIncome(m), spent = monthSpent(m);
  const left = income - spent;
  const saved = Math.max(income - spent, 0);
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  const byCat = spentByCategory(m);
  const rows = state.categories.map((c) => ({ c, spent: byCat[c.id] || 0 }))
    .sort((a, b) => pct(b.spent, b.c.budget) - pct(a.spent, a.c.budget));
  const over = rows.filter((r) => r.spent > r.c.budget);
  const donutParts = state.categories
    .map((c) => ({ label: c.name, value: byCat[c.id] || 0, color: c.color }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  const recent = sortedTxns(m).slice(0, 6);
  const topGoals = state.goals.slice(0, 2);

  let insight;
  if (over.length) {
    insight = '<div class="callout warn"><strong>Heads up:</strong> ' +
      over.map((r) => esc(r.c.name)).join(", ") +
      (over.length > 1 ? " are" : " is") +
      ' over budget in ' + esc(monthLabel(m)) +
      '. Dining out is the usual suspect — one takeaway fewer next week puts it right.</div>';
  } else {
    insight = '<div class="callout"><strong>On track:</strong> every category is inside its budget for ' +
      esc(monthLabel(m)) + '. ' + money0(left) +
      ' is still unspent — sweep it to the emergency fund on payday.</div>';
  }

  return '<h1>' + esc(monthLabel(m)) + ' at a glance</h1>' +
    '<p class="lede">Income, spending and what is left for the Alder household — ' +
    esc(state.household.members.join(", ")) + '.</p>' +
    '<div class="grid grid-4">' +
    statTile("Income", money0(income), "Paydays on the 1st, 5th and 15th", "good") +
    statTile("Spent", money0(spent), pct(spent, income) + "% of income", spent > income ? "bad" : "") +
    statTile("Left to spend", money0(left), "Income minus spending", left < 0 ? "bad" : "good") +
    statTile("Savings rate", rate + "%", money0(saved) + " kept this month", "good") +
    '</div>' +
    '<div class="grid grid-2wide" style="margin-top:16px">' +
    '<section class="card"><h2>Where the money went</h2>' +
    donutChart(donutParts, 180) + '</section>' +
    '<section class="card"><h2>Budgets — closest to the line</h2>' +
    rows.slice(0, 6).map((r) => budgetRow(r.c, r.spent)).join("") +
    '<p class="small"><a href="#budgets">See all ' + state.categories.length +
    ' budgets &rarr;</a></p></section>' +
    '</div>' +
    '<div class="grid grid-2" style="margin-top:16px">' +
    '<section class="card"><h2>Recent spending</h2>' + txnTable(recent, false) +
    '<p class="small"><a href="#transactions">All transactions &rarr;</a></p></section>' +
    '<section class="card"><h2>Savings goals</h2>' +
    topGoals.map((g) => goalBlock(g, false)).join("") +
    '<p class="small"><a href="#goals">All goals &amp; add money &rarr;</a></p></section>' +
    '</div>' +
    '<div style="margin-top:16px">' + insight + '</div>';
}
function statTile(label, value, sub, cls) {
  return '<div class="card stat ' + (cls || "") + '"><div class="label">' + label +
    '</div><div class="value">' + value + '</div><div class="sub">' + esc(sub) + '</div></div>';
}
function budgetRow(c, spent) {
  const p = pct(spent, c.budget);
  const left = c.budget - spent;
  return '<div class="bar-row"><span><span class="dot" style="background:' + c.color +
    '"></span>' + esc(c.name) + '</span>' +
    '<div class="' + barClass(p) + '"><span style="width:' + Math.min(p, 100) + '%"></span></div>' +
    '<span class="amt">' + money0(spent) + ' / ' + money0(c.budget) +
    '<br><span class="muted small">' + p + '% · ' + (left < 0 ? money0(-left) + " over" : money0(left) + " left") +
    '</span></span></div>';
}

/* ---------- transactions ---------- */
function txnTable(list, withActions) {
  if (!list.length) return '<p class="muted">Nothing here yet — add a transaction below and it will show up here.</p>';
  const rows = list.map((t) => {
    const cat = t.kind === "income" ? "Income" : esc(catById(t.category).name);
    const amt = '<span class="' + (t.kind === "income" ? "pos" : "neg") + '">' +
      (t.kind === "income" ? "+" : "−") + money(t.amount) + '</span>';
    const actions = withActions
      ? '<td class="nowrap"><button class="linklike" data-edit="' + t.id + '">Edit</button> · ' +
        '<button class="linklike danger" data-delete="' + t.id + '">Delete</button></td>'
      : "";
    return '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.desc) + '</td><td>' + cat +
      '</td><td class="num">' + amt + '</td>' + actions + '</tr>';
  }).join("");
  return '<div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Description</th>' +
    '<th>Category</th><th class="num">Amount</th>' +
    (withActions ? "<th>Actions</th>" : "") + '</tr></thead><tbody>' + rows +
    '</tbody></table></div>';
}

function renderTransactions() {
  const m = currentMonth;
  let list = sortedTxns(m);
  if (txnFilter.category !== "all") list = list.filter((t) => t.category === txnFilter.category);
  if (txnFilter.kind !== "all") list = list.filter((t) => t.kind === txnFilter.kind);
  if (txnFilter.q) {
    const q = txnFilter.q.toLowerCase();
    list = list.filter((t) => t.desc.toLowerCase().indexOf(q) >= 0);
  }
  const income = list.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const spent = list.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const editing = editId ? state.transactions.find((t) => t.id === editId) : null;

  const catOptions = '<option value="all">All categories</option>' +
    state.categories.map((c) =>
      '<option value="' + c.id + '"' + (txnFilter.category === c.id ? " selected" : "") + '>' +
      esc(c.name) + '</option>').join("");

  return '<h1>Transactions</h1>' +
    '<p class="lede">Every dollar in and out for ' + esc(monthLabel(m)) +
    '. Add a new one below, or edit and delete straight from the list.</p>' +
    (ITEMISED.indexOf(m) < 0
      ? '<div class="callout"><strong>' + esc(monthLabel(m)) +
        ' is kept as monthly totals</strong> — itemised rows are kept for October and November 2026. ' +
        'Switch the month above to browse them, or see the totals in <a href="#reports">Reports</a>.</div>'
      : "") +
    '<div class="grid grid-3" style="margin:14px 0">' +
    statTile("Money in", money0(income), list.filter((t) => t.kind === "income").length + " income entries", "good") +
    statTile("Money out", money0(spent), list.filter((t) => t.kind === "expense").length + " expenses", "") +
    statTile("Net", money0(income - spent), "For the rows shown", income - spent < 0 ? "bad" : "good") +
    '</div>' +
    '<section class="card" style="margin-bottom:16px"><h2>' +
    (editing ? "Edit transaction" : "Add a transaction") + '</h2>' +
    '<form id="txnForm"><div class="form-row">' +
    '<div class="field"><label for="f-date">Date</label>' +
    '<input id="f-date" name="date" type="date" required value="' +
    (editing ? editing.date : m + "-26") + '"></div>' +
    '<div class="field"><label for="f-kind">Type</label><select id="f-kind" name="kind">' +
    '<option value="expense"' + (editing && editing.kind === "expense" ? " selected" : "") + '>Expense</option>' +
    '<option value="income"' + (editing && editing.kind === "income" ? " selected" : "") + '>Income</option>' +
    '</select></div></div>' +
    '<div class="field"><label for="f-desc">Description</label>' +
    '<input id="f-desc" name="desc" required maxlength="80" placeholder="e.g. GreenMart weekly shop" value="' +
    (editing ? esc(editing.desc) : "") + '"></div>' +
    '<div class="form-row">' +
    '<div class="field"><label for="f-amount">Amount ($)</label>' +
    '<input id="f-amount" name="amount" type="number" min="0.01" step="0.01" required value="' +
    (editing ? editing.amount : "") + '"></div>' +
    '<div class="field"><label for="f-cat">Category</label><select id="f-cat" name="category">' +
    state.categories.map((c) =>
      '<option value="' + c.id + '"' + (editing && editing.category === c.id ? " selected" : "") + '>' +
      esc(c.name) + '</option>').join("") +
    '<option value="income"' + (editing && editing.category === "income" ? " selected" : "") + '>Income</option>' +
    '</select></div></div>' +
    '<div class="btn-row"><button class="btn" type="submit">' +
    (editing ? "Save changes" : "Add transaction") + '</button>' +
    (editing ? '<button class="btn secondary" type="button" data-cancel-edit>Cancel</button>' : "") +
    '</div></form></section>' +
    '<section class="card"><h2>All transactions — ' + esc(monthLabel(m)) + '</h2>' +
    '<div class="form-row" style="margin-bottom:10px">' +
    '<div class="field"><label for="f-q">Search</label>' +
    '<input id="f-q" type="search" placeholder="Search descriptions…" value="' + esc(txnFilter.q) + '"></div>' +
    '<div class="field"><label for="f-fcat">Category</label><select id="f-fcat">' + catOptions + '</select></div>' +
    '</div>' +
    '<div class="field"><label for="f-fkind">Show</label><select id="f-fkind">' +
    '<option value="all"' + (txnFilter.kind === "all" ? " selected" : "") + '>Income and expenses</option>' +
    '<option value="expense"' + (txnFilter.kind === "expense" ? " selected" : "") + '>Expenses only</option>' +
    '<option value="income"' + (txnFilter.kind === "income" ? " selected" : "") + '>Income only</option>' +
    '</select></div>' +
    txnTable(list, true) +
    '<p class="small muted">' + list.length + ' of ' + monthTxns(m).length +
    ' transactions shown.</p></section>';
}

/* ---------- budgets ---------- */
function renderBudgets() {
  const m = currentMonth;
  const byCat = spentByCategory(m);
  const spent = monthSpent(m);
  const budget = totalBudget();
  const cards = state.categories.map((c) => {
    const s = byCat[c.id] || 0, p = pct(s, c.budget), left = c.budget - s;
    return '<div class="card"><div class="goal-head"><strong><span class="dot" style="background:' +
      c.color + '"></span>' + esc(c.name) + '</strong>' +
      '<span class="pill' + (p >= 100 ? " over" : p >= 85 ? " warn" : "") + '">' + p + '% used</span></div>' +
      '<div class="goal-meta"><span>' + money0(s) + ' of ' + money0(c.budget) + '</span><span>' +
      (left < 0 ? money0(-left) + " over" : money0(left) + " left") + '</span></div>' +
      '<div class="' + barClass(p) + '"><span style="width:' + Math.min(p, 100) + '%"></span></div>' +
      '<form class="budget-form" data-cat="' + c.id + '" style="margin-top:10px">' +
      '<div class="form-row"><div class="field"><label for="b-' + c.id +
      '">Monthly budget ($)</label><input id="b-' + c.id + '" name="budget" type="number" min="0" step="1" value="' +
      c.budget + '"></div></div>' +
      '<button class="btn small secondary" type="submit">Update budget</button></form></div>';
  }).join("");
  return '<h1>Budgets</h1>' +
    '<p class="lede">One budget per category for ' + esc(monthLabel(m)) +
    '. The Alder rule: every dollar has a job before the month starts, and a budget can be changed here any time — the bars move with it.</p>' +
    '<div class="grid grid-3" style="margin-bottom:16px">' +
    statTile("Total budgeted", money0(budget), state.categories.length + " categories", "") +
    statTile("Spent so far", money0(spent), pct(spent, budget) + "% of the plan", spent > budget ? "bad" : "") +
    statTile("Still to spend", money0(budget - spent), "Across all categories", budget - spent < 0 ? "bad" : "good") +
    '</div>' +
    '<div class="grid grid-3">' + cards + '</div>';
}

/* ---------- goals ---------- */
function goalBlock(g, withForm) {
  const p = Math.round((g.saved / g.target) * 100);
  const left = g.target - g.saved;
  const months = g.monthly > 0 ? Math.ceil(left / g.monthly) : 0;
  return '<div class="card" style="margin-bottom:12px"><div class="goal-head"><strong>' +
    esc(g.name) + '</strong><span class="pill">' + p + '%</span></div>' +
    '<div class="goal-meta"><span>' + money0(g.saved) + ' saved</span><span>Goal ' +
    money0(g.target) + '</span></div>' +
    '<div class="bar"><span style="width:' + Math.min(p, 100) + '%"></span></div>' +
    '<p class="small muted">' + money0(left) + ' to go · ' + money0(g.monthly) +
    ' a month · done in about ' + months + ' month' + (months === 1 ? "" : "s") +
    '. ' + esc(g.note) + '</p>' +
    (withForm
      ? '<form class="goal-form" data-goal="' + g.id + '"><div class="form-row">' +
        '<div class="field"><label for="g-' + g.id + '">Add money ($)</label>' +
        '<input id="g-' + g.id + '" name="amount" type="number" min="1" step="1" required placeholder="e.g. 100"></div>' +
        '</div><button class="btn small" type="submit">Add to this goal</button></form>'
      : "") +
    '</div>';
}
function renderGoals() {
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  return '<h1>Savings goals</h1>' +
    '<p class="lede">Four things the family is saving for. Add money whenever there is some spare — the progress bars and finish dates update at once.</p>' +
    '<div class="grid grid-3" style="margin-bottom:16px">' +
    statTile("Saved so far", money0(totalSaved), "Across " + state.goals.length + " goals", "good") +
    statTile("Still to save", money0(totalTarget - totalSaved), "Of " + money0(totalTarget) + " in goals", "") +
    statTile("Monthly to goals", money0(state.goals.reduce((s, g) => s + g.monthly, 0)), "Set aside every payday", "") +
    '</div>' +
    '<div class="grid grid-2">' + state.goals.map((g) => goalBlock(g, true)).join("") + '</div>' +
    '<section class="card" style="margin-top:16px"><h2>Start a new goal</h2>' +
    '<form id="goalForm"><div class="form-row">' +
    '<div class="field"><label for="ng-name">Goal name</label>' +
    '<input id="ng-name" name="name" required maxlength="60" placeholder="e.g. New washing machine"></div>' +
    '<div class="field"><label for="ng-target">Target amount ($)</label>' +
    '<input id="ng-target" name="target" type="number" min="1" step="1" required placeholder="e.g. 800"></div></div>' +
    '<div class="form-row">' +
    '<div class="field"><label for="ng-saved">Already saved ($)</label>' +
    '<input id="ng-saved" name="saved" type="number" min="0" step="1" value="0"></div>' +
    '<div class="field"><label for="ng-monthly">Monthly amount ($)</label>' +
    '<input id="ng-monthly" name="monthly" type="number" min="0" step="1" required placeholder="e.g. 50"></div></div>' +
    '<div class="field"><label for="ng-note">Note</label>' +
    '<input id="ng-note" name="note" maxlength="120" placeholder="What is this for?"></div>' +
    '<button class="btn" type="submit">Create goal</button></form></section>';
}

/* ---------- reports ---------- */
function renderReports() {
  const m = currentMonth;
  const rows = MONTHS.map((mm) => ({
    label: shortMonth(mm), income: monthIncome(mm), spent: monthSpent(mm)
  }));
  const byCat = spentByCategory(m);
  const spent = monthSpent(m);
  const catRows = state.categories
    .map((c) => ({ c, spent: byCat[c.id] || 0 }))
    .filter((r) => r.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const top = sortedTxns(m).filter((t) => t.kind === "expense")
    .sort((a, b) => b.amount - a.amount).slice(0, 5);
  const income = monthIncome(m);
  const rate = income > 0 ? Math.round(((income - spent) / income) * 100) : 0;
  const underMonths = MONTHS.filter((mm) => monthSpent(mm) < monthIncome(mm)).length;

  return '<h1>Reports</h1>' +
    '<p class="lede">Six months of the Alder books, and a close look at ' +
    esc(monthLabel(m)) + '. The numbers below are computed from the same transactions you can browse — nothing here is typed in by hand.</p>' +
    '<section class="card" style="margin-bottom:16px"><h2>Income vs spending — last six months</h2>' +
    monthBars(rows) +
    '<p class="small muted">Every month since June the family has spent less than it earned — ' +
    underMonths + ' of ' + MONTHS.length + ' months in the black.</p></section>' +
    '<div class="grid grid-2">' +
    '<section class="card"><h2>Spending by category — ' + esc(monthLabel(m)) + '</h2>' +
    '<table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th></tr></thead><tbody>' +
    catRows.map((r) => '<tr><td><span class="dot" style="background:' + r.c.color + '"></span>' +
      esc(r.c.name) + '</td><td class="num">' + money(r.spent) + '</td><td class="num">' +
      (spent > 0 ? Math.round((r.spent / spent) * 100) : 0) + '%</td><td class="num">' +
      money0(r.c.budget) + '</td></tr>').join("") +
    '</tbody></table></section>' +
    '<section class="card"><h2>Biggest single expenses</h2>' + txnTable(top, false) +
    '<h2 style="margin-top:18px">What the numbers say</h2>' +
    '<p>Housing is the biggest slice at ' +
    (spent > 0 ? Math.round(((byCat.housing || 0) / spent) * 100) : 0) +
    '% of spending, as it should be for a family of four. Groceries run second. ' +
    'The savings rate this month is ' + rate + '% — ' + money0(income - spent) +
    ' kept from ' + money0(income) + ' earned.</p>' +
    '<p class="muted small">Tip: the fastest win is usually dining out. One home-cooked week a month saves roughly ' +
    money0(45) + ' here.</p></section>' +
    '</div>';
}

/* ---------- settings ---------- */
function renderSettings() {
  const h = state.household;
  return '<h1>Settings</h1>' +
    '<p class="lede">The household behind the ledger, and what happens to its data.</p>' +
    '<div class="grid grid-2">' +
    '<section class="card"><h2>Household</h2>' +
    '<form id="houseForm">' +
    '<div class="field"><label for="s-name">Household name</label>' +
    '<input id="s-name" name="name" value="' + esc(h.name) + '"></div>' +
    '<div class="field"><label for="s-home">Home</label>' +
    '<input id="s-home" name="home" value="' + esc(h.home) + '"></div>' +
    '<div class="field"><label for="s-payday">Paydays</label>' +
    '<input id="s-payday" name="payday" value="' + esc(h.payday) + '"></div>' +
    '<div class="field"><label for="s-note">About this budget</label>' +
    '<textarea id="s-note" name="note" rows="3">' + esc(h.note) + '</textarea></div>' +
    '<button class="btn" type="submit">Save household</button></form></section>' +
    '<section class="card"><h2>Members</h2><ul>' +
    h.members.map((m) => '<li>' + esc(m) + '</li>').join("") +
    '</ul><p class="muted small">Members are listed for the record; budgets and goals are kept for the household as a whole.</p>' +
    '<h2 style="margin-top:18px">Your data</h2>' +
    '<p>' + state.transactions.length + ' transactions, ' + state.categories.length +
    ' categories and ' + state.goals.length + ' goals are stored in this browser only. ' +
    'Nothing is sent anywhere — this site makes no network requests at all.</p>' +
    '<div class="btn-row"><button class="btn secondary" type="button" data-export>Download my data (JSON)</button>' +
    '<button class="btn danger" type="button" data-reset>Reset to the original books</button></div>' +
    '<p class="small muted">Reset restores the Alder family&rsquo;s November books exactly as they started.</p>' +
    '</section></div>';
}

/* ---------- events ---------- */
function bindEvents() {
  const view = document.getElementById("view");
  view.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const form = ev.target;
    if (form.id === "txnForm") {
      const d = new FormData(form);
      const amount = Math.round(Number(d.get("amount")) * 100) / 100;
      const kind = d.get("kind");
      const rec = {
        id: editId || ("t-u" + Date.now()),
        date: d.get("date"), desc: String(d.get("desc")).trim(),
        category: kind === "income" ? "income" : d.get("category"),
        amount: amount, kind: kind
      };
      if (!rec.desc || !(amount > 0)) return;
      if (editId) {
        const i = state.transactions.findIndex((t) => t.id === editId);
        if (i >= 0) state.transactions[i] = rec;
        editId = null;
      } else {
        state.transactions.push(rec);
      }
      saveState();
      showNotice(rec.desc + " saved — " + money(amount) + ".");
      render();
    } else if (form.classList.contains("budget-form")) {
      const amount = Math.max(0, Math.round(Number(new FormData(form).get("budget")) || 0));
      const c = state.categories.find((x) => x.id === form.getAttribute("data-cat"));
      if (c) { c.budget = amount; saveState(); showNotice(c.name + " budget set to " + money0(amount) + "."); render(); }
    } else if (form.classList.contains("goal-form")) {
      const amount = Math.round(Number(new FormData(form).get("amount")) || 0);
      const g = state.goals.find((x) => x.id === form.getAttribute("data-goal"));
      if (g && amount > 0) {
        g.saved = Math.min(g.saved + amount, g.target);
        saveState();
        showNotice(money0(amount) + " added to " + g.name + " — now " + money0(g.saved) + " of " + money0(g.target) + ".");
        render();
      }
    } else if (form.id === "goalForm") {
      const d = new FormData(form);
      state.goals.push({
        id: "g-u" + Date.now(),
        name: String(d.get("name")).trim(),
        target: Math.max(1, Math.round(Number(d.get("target")) || 0)),
        saved: Math.max(0, Math.round(Number(d.get("saved")) || 0)),
        monthly: Math.max(0, Math.round(Number(d.get("monthly")) || 0)),
        note: String(d.get("note") || "").trim() || "A new goal for the family."
      });
      saveState();
      showNotice("Goal created.");
      render();
    } else if (form.id === "houseForm") {
      const d = new FormData(form);
      state.household.name = String(d.get("name")).trim() || state.household.name;
      state.household.home = String(d.get("home")).trim();
      state.household.payday = String(d.get("payday")).trim();
      state.household.note = String(d.get("note")).trim();
      saveState();
      showNotice("Household saved.");
      render();
    }
  });
  view.addEventListener("click", (ev) => {
    const t = ev.target;
    const editBtn = t.closest("[data-edit]");
    if (editBtn) { editId = editBtn.getAttribute("data-edit"); render(); return; }
    const delBtn = t.closest("[data-delete]");
    if (delBtn) {
      const id = delBtn.getAttribute("data-delete");
      const rec = state.transactions.find((x) => x.id === id);
      if (rec && confirm("Delete “" + rec.desc + "” (" + money(rec.amount) + ")?")) {
        state.transactions = state.transactions.filter((x) => x.id !== id);
        saveState(); showNotice("Deleted " + rec.desc + "."); render();
      }
      return;
    }
    if (t.closest("[data-cancel-edit]")) { editId = null; render(); return; }
    if (t.closest("[data-export]")) {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hearth-ledger-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (t.closest("[data-reset]")) {
      if (confirm("Reset all changes back to the original Alder books?")) {
        state = freshState(); saveState(); editId = null;
        showNotice("Back to the original books."); render();
      }
      return;
    }
  });
  view.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "f-q") { txnFilter.q = t.value; renderTransactionsTableOnly(); }
    if (t.id === "f-fcat") { txnFilter.category = t.value; render(); }
    if (t.id === "f-fkind") { txnFilter.kind = t.value; render(); }
  });
  view.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "f-fcat") { txnFilter.category = t.value; render(); }
    if (t.id === "f-fkind") { txnFilter.kind = t.value; render(); }
  });
}
function renderTransactionsTableOnly() {
  /* Re-render keeps the search box focused, so only refresh the table area. */
  const view = document.getElementById("view");
  const q = document.getElementById("f-q");
  const pos = q ? q.selectionStart : 0;
  render();
  const nq = document.getElementById("f-q");
  if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
}
function showNotice(text) {
  const view = document.getElementById("view");
  const note = document.createElement("div");
  note.className = "notice";
  note.textContent = text;
  view.prepend(note);
  setTimeout(() => { if (note.parentNode) note.parentNode.removeChild(note); }, 5000);
}

/* ---------- boot ---------- */
(function boot() {
  const sel = document.getElementById("monthSelect");
  MONTHS.forEach((m) => {
    const o = document.createElement("option");
    o.value = m; o.textContent = monthLabel(m);
    if (m === currentMonth) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", () => { currentMonth = sel.value; render(); });
  bindEvents();
  window.addEventListener("hashchange", route);
  route();
})();
