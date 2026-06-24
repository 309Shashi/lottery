/* The closing number remains in the book, except when the book ends with a hyphen. */
function ticketStats(index) {
  const row = state.tickets[index];
  const entry = state.entries[index] || {};
  const opening = String(entry.open ?? '').trim();
  const closing = String(entry.close ?? '').trim();
  const max = ticketMax(index);
  const numeric = value => /^\d+$/.test(value);
  const withinRange = value => Number(value) >= 0 && Number(value) <= max;
  const result = sold => ({ sold, amount: sold * (Number(row.price) || 0), invalid: false, max });

  if (opening === '-' && closing === '-') return { ...result(0), emptyBook: true };
  if (opening === '' && closing === '') return result(0);

  // The book ended today: count the opening number and every number after it.
  if (numeric(opening) && closing === '-') {
    if (!withinRange(opening)) return { ...result(0), invalid: true, message: `Numbers must be from 0 to ${max}.` };
    return result(max - Number(opening) + 1);
  }

  // A new book began today: the closing ticket remains, so count 0 up to it.
  if (opening === '-' && numeric(closing)) {
    if (!withinRange(closing)) return { ...result(0), invalid: true, message: `Numbers must be from 0 to ${max}.` };
    return result(Number(closing));
  }

  if (!numeric(opening) || !numeric(closing)) {
    return { ...result(0), invalid: true, message: 'Use whole numbers, or - for a book transition.' };
  }
  if (!withinRange(opening) || !withinRange(closing)) {
    return { ...result(0), invalid: true, message: `Numbers must be from 0 to ${max}.` };
  }
  if (Number(closing) < Number(opening)) {
    return { ...result(0), invalid: true, message: 'Closing number must be the same as or greater than opening number.' };
  }
  // The closing ticket remains in the book, so it is not included.
  return result(Number(closing) - Number(opening));
}

renderTickets();
renderFinance();

function showQr() {
  const rawUrl = $('siteUrl').value.trim();
  const area = $('qrArea');
  if (!rawUrl) {
    area.classList.add('hidden');
    return;
  }
  try {
    const qrUrl = new URL(rawUrl);
    qrUrl.searchParams.set('new', '1');
    $('qrImage').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl.toString())}`;
    area.classList.remove('hidden');
  } catch {
    area.classList.add('hidden');
  }
}

$('siteUrl').oninput = showQr;
$('settingsButton').onclick = () => {
  $('settingsDialog').showModal();
  renderSettings();
  showQr();
};
$('resetButton').onclick = () => {
  if (!window.confirm("Reset all of today's entered ticket and cash values? Ticket prices will stay saved.")) return;
  state.entries = {};
  state.details = {};
  state.registerCash = '';
  $('reportDate').value = localDate();
  updateReportDay();
  save();
  renderTickets();
  renderFinance();
};
window.addEventListener('beforeunload', event => {
  event.preventDefault();
  event.returnValue = '';
});

let activeTicketInput = null;

function showTicketKeypad(input) {
  activeTicketInput = input;
  $('ticketKeypad').classList.remove('hidden');
}

function hideTicketKeypad() {
  activeTicketInput = null;
  $('ticketKeypad').classList.add('hidden');
}

$('ticketKeypad').addEventListener('pointerdown', event => event.preventDefault());
$('ticketKeypad').addEventListener('click', event => {
  const key = event.target.dataset.key;
  if (!key || !activeTicketInput) return;
  if (key === 'hide') {
    hideTicketKeypad();
    return;
  }
  if (key === 'next') {
    const fields = [...document.querySelectorAll('.ticket-list .opening, .ticket-list .closing')];
    const position = fields.indexOf(activeTicketInput);
    if (position >= 0 && position < fields.length - 1) fields[position + 1].focus();
    else hideTicketKeypad();
    return;
  }
  if (key === 'back') activeTicketInput.value = activeTicketInput.value.slice(0, -1);
  else if (key === '-') activeTicketInput.value = activeTicketInput.value === '-' ? '' : '-';
  else activeTicketInput.value = activeTicketInput.value === '-' ? key : `${activeTicketInput.value}${key}`;
  activeTicketInput.dispatchEvent(new Event('input', { bubbles: true }));
});
document.addEventListener('pointerdown', event => {
  if (!activeTicketInput) return;
  if (event.target.closest('#ticketKeypad, .opening, .closing')) return;
  hideTicketKeypad();
});

function updateTicketCard(card, index) {
  const stats = ticketStats(index);
  card.querySelector('.ticket-amount').textContent = money(stats.amount);
  card.querySelector('.ticket-sold').textContent = stats.emptyBook ? 'No tickets' : `${stats.sold} sold`;
}

function renderTickets() {
  const list = $('ticketList');
  list.innerHTML = '';
  const unpriced = state.tickets.some(ticket => !Number(ticket.price));
  $('priceNotice').classList.toggle('hidden', !unpriced);
  $('priceNotice').textContent = 'Some ticket prices are not set yet. Tap settings to add them before counting.';

  state.tickets.forEach((ticket, index) => {
    const node = $('ticketTemplate').content.cloneNode(true);
    const card = node.querySelector('.ticket-card');
    const stats = ticketStats(index);
    const opening = node.querySelector('.opening');
    const closing = node.querySelector('.closing');

    node.querySelector('.ticket-name').textContent = ticket.name || `Ticket ${index + 1}`;
    node.querySelector('.ticket-price').textContent = Number(ticket.price) ? `${money(ticket.price)} each · numbers 0–${stats.max}` : 'Price not set';
    opening.value = (state.entries[index] || {}).open ?? '';
    closing.value = (state.entries[index] || {}).close ?? '';
    updateTicketCard(card, index);

    [opening, closing].forEach(input => {
      input.readOnly = true;
      input.inputMode = 'none';
      input.onfocus = () => showTicketKeypad(input);
      input.oninput = () => {
        state.entries[index] = state.entries[index] || {};
        state.entries[index][input === opening ? 'open' : 'close'] = input.value;
        save();
        updateTicketCard(card, index);
        renderFinance();
      };
    });
    list.append(node);
  });
  updateTotals();
}

function finalTotal() {
  const sales = state.tickets.reduce((total, _, index) => total + ticketStats(index).amount, 0);
  const rules = [['instances1', -1], ['instances2', -1], ['sales1', 1], ['sales2', 1], ['cashes1', -1], ['cashes2', -1], ['pullTabs', -1]];
  return sales + rules.reduce((total, [key, sign]) => total + sign * (Number(state.details[key]) || 0), 0);
}

function formulaText() {
  const sales = state.tickets.reduce((total, _, index) => total + ticketStats(index).amount, 0);
  const total = (...keys) => money(keys.reduce((sum, key) => sum + (Number(state.details[key]) || 0), 0));
  return `Scratch off sales (${money(sales)}) − Instances (${total('instances1', 'instances2')}) + Sales (${total('sales1', 'sales2')}) − Cashes (${total('cashes1', 'cashes2')}) − Pull tabs (${total('pullTabs')})`;
}

function updateLedger() {
  const scratch = state.tickets.reduce((total, _, index) => total + ticketStats(index).amount, 0);
  const instances = (Number(state.details.instances1) || 0) + (Number(state.details.instances2) || 0);
  const sales = (Number(state.details.sales1) || 0) + (Number(state.details.sales2) || 0);
  const cashes = (Number(state.details.cashes1) || 0) + (Number(state.details.cashes2) || 0);
  const pullTabs = Number(state.details.pullTabs) || 0;
  const afterInstances = scratch - instances;
  const afterSales = afterInstances + sales;
  const afterCashes = afterSales - cashes;
  $('ledgerScratch').textContent = money(scratch);
  $('ledgerInstances').textContent = `− ${money(instances)}`;
  $('ledgerAfterInstances').textContent = money(afterInstances);
  $('ledgerSales').textContent = `+ ${money(sales)}`;
  $('ledgerAfterSales').textContent = money(afterSales);
  $('ledgerCashes').textContent = `− ${money(cashes)}`;
  $('ledgerAfterCashes').textContent = money(afterCashes);
  $('ledgerPullTabs').textContent = `− ${money(pullTabs)}`;
  $('expectedCash').textContent = money(afterCashes - pullTabs);
}

function renderFinance() {
  const box = $('adjustmentList');
  box.innerHTML = '';
  const details = [['instances1', 'Instances 1'], ['instances2', 'Instances 2'], ['sales1', 'Sales 1'], ['sales2', 'Sales 2'], ['cashes1', 'Cashes 1'], ['cashes2', 'Cashes 2'], ['pullTabs', 'Pull tabs']];

  details.forEach(([key, label]) => {
    const row = document.createElement('div');
    row.className = 'adjustment detail-row';
    row.innerHTML = `<label for="${key}">${label}</label><div class="money-input"><span>$</span><input id="${key}" aria-label="${label}" inputmode="decimal" enterkeyhint="next" type="number" min="0" step="0.01" placeholder="0.00"></div>`;
    const input = row.querySelector('input');
    input.value = state.details[key] || '';
    input.oninput = () => {
      state.details[key] = input.value;
      save();
      updateLedger();
    };
    box.append(row);
  });
  updateTotals();
  updateLedger();
  renderPrintWorksheet();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderPrintWorksheet() {
  const scratch = state.tickets.reduce((total, _, index) => total + ticketStats(index).amount, 0);
  const instances = (Number(state.details.instances1) || 0) + (Number(state.details.instances2) || 0);
  const sales = (Number(state.details.sales1) || 0) + (Number(state.details.sales2) || 0);
  const cashes = (Number(state.details.cashes1) || 0) + (Number(state.details.cashes2) || 0);
  const pullTabs = Number(state.details.pullTabs) || 0;
  const afterInstances = scratch - instances;
  const afterSales = afterInstances + sales;
  const afterCashes = afterSales - cashes;
  const rows = state.tickets.map((ticket, index) => {
    const entry = state.entries[index] || {};
    const stats = ticketStats(index);
    const opening = entry.open ?? '';
    const closing = entry.close ?? '';
    const sold = stats.invalid || (opening === '' && closing === '') ? '' : stats.sold;
    const amount = stats.invalid || (opening === '' && closing === '') ? '' : money(stats.amount);
    return `<tr><td>${index + 1}</td><td>${money(ticket.price)}</td><td>${escapeHtml(opening)}</td><td>${escapeHtml(closing)}</td><td>${sold}</td><td>${amount}</td></tr>`;
  }).join('');
  const row = (label, value, style = '') => `<div class="print-ledger-row ${style}"><span>${label}</span><b>${value}</b></div>`;
  $('printWorksheet').innerHTML = `<div class="print-title">Clifton Mini Mart Daily POS Worksheet</div><div class="print-meta"><span>DATE: ${escapeHtml($('reportDate').value)}</span><span>DAY: ${escapeHtml($('reportDay').textContent)}</span></div><table class="print-table"><thead><tr><th>S.No</th><th>Dollar</th><th>Open</th><th>Close</th><th>Sold</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="print-footer"><div class="print-ledger">${row('Scratch off sales', money(scratch))}${row('- Instances', money(instances))}${row('Balance', money(afterInstances), 'balance')}${row('+ Sales', money(sales))}${row('Balance', money(afterSales), 'balance')}${row('- Cashes', money(cashes))}${row('Balance', money(afterCashes), 'balance')}${row('- Pull tabs', money(pullTabs))}${row('Final total', money(afterCashes - pullTabs), 'final')}</div></div>`;
}

$('printReport').onclick = () => {
  renderPrintWorksheet();
  window.print();
};

renderTickets();
renderFinance();
