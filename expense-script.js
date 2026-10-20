/* Clean single-file Expense Tracker script
   - Features: transactions list, add/edit/delete, CSV import/export (Papa fallback), side-by-side charts (bar + pie), click-to-open full-page charts
*/
(function(){
  'use strict';

  var transactions = [];
  var currentFilter = 'all';
  var lastDeleted = null;
  var barChart = null;
  var pieChart = null;

  var transactionForm = document.getElementById('transactionForm');
  var descriptionInput = document.getElementById('description');
  var amountInput = document.getElementById('amount');
  var categoryInput = document.getElementById('category');
  var typeInput = document.getElementById('type');
  var dateInput = document.getElementById('date');
  var transactionsList = document.getElementById('transactionsList');
  var totalBalanceEl = document.getElementById('totalBalance');
  var totalIncomeEl = document.getElementById('totalIncome');
  var totalExpenseEl = document.getElementById('totalExpense');
  var filterButtons = document.querySelectorAll('.filter-btn');
  var clearAllBtn = document.getElementById('clearAll');
  var exportCsvBtn = document.getElementById('exportCsv');
  var importCsvBtn = document.getElementById('importCsvBtn');
  var importFileInput = document.getElementById('importFile');
  var toggleChartBtn = document.getElementById('toggleChart');
  // new inputs
  var dueDateInput = document.getElementById('dueDate');
  var invoiceInput = document.getElementById('invoiceNo');
  var currencyInput = document.getElementById('currency');
  var attachmentInput = document.getElementById('attachment');
  var recurringInput = document.getElementById('recurring');
  var recurringCustomWrap = document.getElementById('recurringCustomWrap');
  var recurringCustomNumber = document.getElementById('recurringCustomNumber');
  var recurringCustomUnit = document.getElementById('recurringCustomUnit');
  var manageVendorsBtn = document.getElementById('manageVendors');
  var vendorManager = document.getElementById('vendorManager');
  var vendorListInput = document.getElementById('vendorList');
  var saveVendorsBtn = document.getElementById('saveVendors');
  var cancelVendorsBtn = document.getElementById('cancelVendors');
  var dashboardFaviconInput = document.getElementById('dashboardFaviconInput');
  var localStore = createStorageAdapter('localStorage', 'local storage');
  var sessionStore = createStorageAdapter('sessionStorage', 'session storage');

  function isQuotaExceededError(err){
    return !!(err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014));
  }

  function createStorageAdapter(storageName, friendlyName){
    function getStorage(){
      if(typeof window === 'undefined' || !window[storageName]) throw new Error(friendlyName + ' is unavailable in this browser context.');
      return window[storageName];
    }
    function writeErrorMessage(err){
      if(isQuotaExceededError(err)) return 'Unable to save data because browser storage is full. Export CSV to back up your data and clear some storage space.';
      return 'Unable to save data because ' + friendlyName + ' is unavailable or blocked in this browser.';
    }
    return {
      getItem: function(key){
        try{ return getStorage().getItem(key); }catch(e){ return null; }
      },
      setItem: function(key, value, opts){
        try{ getStorage().setItem(key, value); return true; }catch(e){ if(!opts || opts.notify !== false) showNotification((opts && opts.notifyErrorMessage) || writeErrorMessage(e), 'error'); return false; }
      },
      removeItem: function(key, opts){
        try{ getStorage().removeItem(key); return true; }catch(e){ if(!opts || opts.notify !== false) showNotification((opts && opts.notifyErrorMessage) || ('Unable to update ' + friendlyName + '.'), 'error'); return false; }
      },
      getJSON: function(key, fallback, opts){
        var raw = this.getItem(key);
        if(raw === null || raw === '') return fallback;
        try{ return JSON.parse(raw); }catch(e){
          if(!opts || opts.notify !== false) showNotification((opts && opts.notifyParseErrorMessage) || 'Stored data was corrupted and could not be read.', 'error');
          if(opts && opts.removeIfCorrupt) this.removeItem(key, { notify: false });
          return fallback;
        }
      },
      setJSON: function(key, value, opts){
        try{ return this.setItem(key, JSON.stringify(value), opts); }catch(e){ if(!opts || opts.notify !== false) showNotification((opts && opts.notifyErrorMessage) || 'Unable to prepare data for saving.', 'error'); return false; }
      }
    };
  }

  function init(){ loadTransactions(); setTodayDate(); bindEvents(); updateDisplay(); }
  // apply any pending drill filter after initialization
  (function(){ handleDrillFilterIfAny(); })();
  

  // If user returned from dashboard drill, apply the drill filter
  function handleDrillFilterIfAny(){
    try{
      var drill = sessionStore.getJSON('drill_filter', null, { notifyParseErrorMessage: 'Dashboard filter data was invalid and has been ignored.', removeIfCorrupt: true });
      if(!drill) return;
      sessionStore.removeItem('drill_filter', { notify: false });
      // set view to list and apply filters
      Array.prototype.forEach.call(document.querySelectorAll('.app-tab'), function(b){ b.classList.remove('active'); });
      var listTab = document.querySelector('.app-tab[data-view="list"]'); if(listTab) listTab.classList.add('active');
      Array.prototype.forEach.call(document.querySelectorAll('.form-section, .transactions-section'), function(el){ el.style.display = ''; });
      var chartContainer = document.getElementById('chartContainer'); if(chartContainer) chartContainer.style.display = 'none';
      // set filter -- we will show transactions which fall into the bucket
      var bucket = drill.bucket;
      var range = drill.range || 'month';
      var year = drill.year ? parseInt(drill.year) : null;
      var cat = drill.category || '';
      // compute bucket bounds
      var bounds = bucketToBounds(bucket, range);
      // filter transactions list to those within bounds and optionally category
      var filtered = transactions.filter(function(t){ var d = new Date(t.date || t.timestamp); if(bounds.start && d < bounds.start) return false; if(bounds.end && d > bounds.end) return false; if(cat && cat !== '' && t.category !== cat) return false; return true; });
  // display filtered transactions in the list area
      var listEl = document.getElementById('transactionsList'); if(!listEl) return; if(filtered.length === 0){ listEl.innerHTML = '<div class="empty-state"><p>No transactions match the selected bucket.</p></div>'; return; }
      listEl.innerHTML = filtered.sort(function(a,b){ return new Date(b.date) - new Date(a.date); }).map(createTransactionHTML).join('');
      // attach event handlers again
      Array.prototype.forEach.call(document.querySelectorAll('.delete-btn'), function(btn){ var id = btn.dataset.id; btn.addEventListener('click', function(){ handleDeleteWithUndo(id, btn); }); });
      Array.prototype.forEach.call(document.querySelectorAll('.edit-btn'), function(b){ b.addEventListener('click', function(){ enterEditMode(b.dataset.id); }); });
      Array.prototype.forEach.call(document.querySelectorAll('.view-attach'), function(btn){ btn.addEventListener('click', function(){ var id = btn.dataset.id; var tx = transactions.find(function(t){ return t.id === id; }); if(tx && tx.attachment){ var w = window.open(); if(w){ w.document.write('<iframe src="'+tx.attachment+'" style="border:none;width:100%;height:100%"></iframe>'); } } }); });
      showNotification('Filtered to bucket: '+bucket,'success');
      // show clear and export buttons
      var clearBtn = document.getElementById('clearDrill'); if(clearBtn) clearBtn.style.display='inline-block';
      var expBtn = document.getElementById('exportFiltered'); if(expBtn) expBtn.style.display='inline-block';
    }catch(e){ }
  }

  function bucketToBounds(bucket, range){
    try{
      if(range === 'year'){ var y = parseInt(bucket); var start = new Date(y,0,1); var end = new Date(y+1,0,1); end.setMilliseconds(end.getMilliseconds()-1); return { start: start, end: end }; }
      if(range === 'month'){ var parts = bucket.split('-'); var y = parseInt(parts[0]); var m = parseInt(parts[1]) - 1; var start = new Date(y,m,1); var end = new Date(y,m+1,1); end.setMilliseconds(end.getMilliseconds()-1); return { start: start, end: end }; }
      if(range === 'week'){ var parts = bucket.split('-W'); var y = parseInt(parts[0]); var w = parseInt(parts[1]); // compute ISO week start (Monday)
        var simple = new Date(y,0,1);
        var day = simple.getDay();
        var ISOweekStart = new Date(simple);
        // find first Thursday of the year
        ISOweekStart.setDate(ISOweekStart.getDate() + ((4 - (ISOweekStart.getDay()||7))));
        var week1Start = new Date(ISOweekStart);
        week1Start.setDate(week1Start.getDate() - 3); // Monday of week 1
        var start = new Date(week1Start);
        start.setDate( start.getDate() + (w-1)*7 );
        var end = new Date(start); end.setDate(end.getDate()+7); end.setMilliseconds(end.getMilliseconds()-1);
        return { start: start, end: end }; }
    }catch(e){ }
    return { start: null, end: null };
  }

  // clear drill filter view and restore full list
  function clearDrillFilterView(){ var listEl = document.getElementById('transactionsList'); listEl.innerHTML = ''; updateDisplay(); var clearBtn = document.getElementById('clearDrill'); if(clearBtn) clearBtn.style.display='none'; var expBtn = document.getElementById('exportFiltered'); if(expBtn) expBtn.style.display='none'; }

  // export current filtered view (what's rendered in transactionsList)
  function exportFilteredCSV(){ try{ var listEl = document.getElementById('transactionsList'); if(!listEl) return; // rebuild CSV from currently visible transactions (fall back to full list)
    var visible = Array.prototype.slice.call(listEl.querySelectorAll('.transaction-item')).map(function(el){ var id = el.getAttribute('data-id'); return transactions.find(function(t){ return t.id === id; }); }).filter(Boolean);
    if(visible.length === 0) { showNotification('No visible transactions to export','error'); return; }
    var header = ['id','description','amount','currency','category','productId','invoiceNo','type','status','date','dueDate','recurring','timestamp'];
    var rows = visible.map(function(t){ return header.map(function(h){ return '"' + String(t[h] || '').replace(/"/g,'""') + '"'; }).join(','); });
    var csv = [header.join(',')].concat(rows).join('\n'); var blob = new Blob([csv], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'filtered-transactions-'+new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); showNotification('Filtered export started','success'); }catch(e){ showNotification('Export failed: '+(e&&e.message||e),'error'); }
  }

  function bindEvents(){
    if(transactionForm) transactionForm.addEventListener('submit', onSubmit);
    Array.prototype.forEach.call(filterButtons, function(b){ b.addEventListener('click', onFilter); });
    if(clearAllBtn) clearAllBtn.addEventListener('click', onClearAll);
    if(exportCsvBtn) exportCsvBtn.addEventListener('click', exportCSV);
  var clearDrillBtn = document.getElementById('clearDrill'); if(clearDrillBtn) clearDrillBtn.addEventListener('click', clearDrillFilterView);
  var exportFilteredBtn = document.getElementById('exportFiltered'); if(exportFilteredBtn) exportFilteredBtn.addEventListener('click', exportFilteredCSV);
    if(importCsvBtn && importFileInput){ importCsvBtn.addEventListener('click', function(){ importFileInput.click(); }); importFileInput.addEventListener('change', onFileSelected); }

  // vendor manager
    if(manageVendorsBtn) manageVendorsBtn.addEventListener('click', openVendorManager);
    if(saveVendorsBtn) saveVendorsBtn.addEventListener('click', saveVendors);
    if(cancelVendorsBtn) cancelVendorsBtn.addEventListener('click', function(){ if(vendorManager) vendorManager.style.display='none'; });

    // attachment handling
    if(attachmentInput) attachmentInput.addEventListener('change', onAttachmentSelected);
  if(toggleChartBtn) toggleChartBtn.addEventListener('click', function(){ openSummaryDashboard(transactions); });
  if(dashboardFaviconInput) dashboardFaviconInput.addEventListener('change', onDashboardFaviconSelected);

    document.addEventListener('keydown', function(ev){
      try{
        if(ev.key === 'n' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) descriptionInput && descriptionInput.focus();
        if(ev.key.toLowerCase() === 'e' && ev.ctrlKey && ev.shiftKey){ ev.preventDefault(); exportCSV(); }
        if(ev.key.toLowerCase() === 'i' && ev.ctrlKey && ev.shiftKey){ ev.preventDefault(); if(importFileInput) importFileInput.click(); }
      }catch(e){}
    });

    if(typeInput){ typeInput.addEventListener('change', applyTypeVisibility); applyTypeVisibility(); }
  // recurring UI toggle
  if(recurringInput && recurringCustomWrap){ recurringInput.addEventListener('change', function(){ if(recurringInput.value === 'custom'){ recurringCustomWrap.style.display = 'block'; } else { recurringCustomWrap.style.display = 'none'; } }); }

    Array.prototype.forEach.call(document.querySelectorAll('.app-tab'), function(btn){ btn.addEventListener('click', function(){ Array.prototype.forEach.call(document.querySelectorAll('.app-tab'), function(b){ b.classList.remove('active'); }); btn.classList.add('active'); var view = btn.dataset.view; Array.prototype.forEach.call(document.querySelectorAll('.form-section, .transactions-section'), function(el){ el.style.display = view==='list' ? '' : 'none'; }); var chartContainer = document.getElementById('chartContainer'); if(chartContainer) chartContainer.style.display = view==='charts' ? 'block' : 'none'; if(view === 'charts') renderChart(); }); });
  }

  function onDashboardFaviconSelected(e){ var f = e.target.files && e.target.files[0]; if(!f) return; if(f.size > 500*1024){ showNotification('Icon too large (max 500KB)','error'); e.target.value = ''; return; } var reader = new FileReader(); reader.onload = function(ev){ if(sessionStore.setItem('summary_dashboard_favicon', ev.target.result, { notifyErrorMessage: 'Failed to save icon in session storage.' })) showNotification('Dashboard icon saved (will apply on open)','success'); }; reader.onerror = function(){ showNotification('Failed to read selected icon file.','error'); }; reader.readAsDataURL(f); }

  function applyTypeVisibility(){ var type = (typeInput && typeInput.value) || 'expense'; var catGroup = categoryInput && categoryInput.parentElement; var statusEl = document.getElementById('status'); var statusGroup = statusEl && statusEl.parentElement; if(type === 'income'){ if(catGroup) catGroup.style.display='none'; if(statusGroup) statusGroup.style.display='none'; if(categoryInput) categoryInput.disabled = true; if(statusEl) statusEl.disabled = true; } else { if(catGroup) catGroup.style.display=''; if(statusGroup) statusGroup.style.display=''; if(categoryInput) categoryInput.disabled = false; if(statusEl) statusEl.disabled = false; } }

  function setTodayDate(){ var d = new Date().toISOString().split('T')[0]; if(dateInput) dateInput.value = d; }

  // Vendor manager UI
  function openVendorManager(){ if(!vendorManager || !vendorListInput) return; var items = []; try{ var opts = Array.prototype.slice.call(categoryInput.options); items = opts.map(function(o){ return o.value; }).filter(Boolean); }catch(e){} vendorListInput.value = items.join(','); vendorManager.style.display = 'block'; }

  function saveVendors(){ if(!vendorListInput) return; var raw = vendorListInput.value || ''; var parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean); // rebuild select
    if(categoryInput){ categoryInput.innerHTML = '<option value="">Select Vendor</option>' + parts.map(function(v){ return '<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>'; }).join(''); }
    if(vendorManager) vendorManager.style.display = 'none'; showNotification('Vendors updated','success'); }

  // attachment: read as base64 but cap size to ~200KB
  function onAttachmentSelected(e){ var f = e.target.files && e.target.files[0]; if(!f){ if(attachmentInput) attachmentInput._lastBase64 = null; return; } if(f.size > 200*1024){ if(attachmentInput) attachmentInput._lastBase64 = null; showNotification('Attachment too large (max 200KB)','error'); e.target.value = ''; return; } var reader = new FileReader(); reader.onload = function(ev){ var data = ev.target.result; // keep data URL or base64
      if(typeof data !== 'string'){ if(attachmentInput) attachmentInput._lastBase64 = null; showNotification('Attachment could not be read and was skipped.','error'); return; }
      if(attachmentInput) attachmentInput._lastBase64 = data; showNotification('Attachment ready','success'); }; reader.onerror = function(){ if(attachmentInput) attachmentInput._lastBase64 = null; if(e && e.target) e.target.value = ''; showNotification('Attachment could not be read and was skipped.','error'); }; reader.readAsDataURL(f); }

  // recurring helper: returns next date string in ISO yyyy-mm-dd
  // freq can be: 'weekly', 'monthly', 'quarterly', 'yearly', or custom like 'custom:2:weeks' or 'custom:7:days'
  function nextRecurringDate(dateStr, freq){ try{ var base = new Date(dateStr); if(isNaN(base)) return null; // make a copy
    var d = new Date(base.getTime());
    if(!freq) return null;
    if(freq === 'weekly'){ d.setDate(d.getDate() + 7); return d.toISOString().slice(0,10); }
    if(freq === 'monthly'){ d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,10); }
    if(freq === 'quarterly'){ d.setMonth(d.getMonth()+3); return d.toISOString().slice(0,10); }
    if(freq === 'yearly'){ d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10); }
    // custom format
    if(freq.indexOf && freq.indexOf('custom:') === 0){ var parts = freq.split(':'); if(parts.length >= 3){ var n = parseInt(parts[1]) || 1; var unit = parts[2]; if(unit === 'days'){ d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); } if(unit === 'weeks'){ d.setDate(d.getDate() + (7 * n)); return d.toISOString().slice(0,10); } if(unit === 'months'){ d.setMonth(d.getMonth() + n); return d.toISOString().slice(0,10); } } }
    return null; }catch(e){ return null; } }


  function onSubmit(e){
    e.preventDefault();
    // validate custom recurrence if selected
    try{
      if(recurringInput && recurringInput.value === 'custom'){
        var n = recurringCustomNumber ? parseInt(recurringCustomNumber.value, 10) : NaN;
        if(!isFinite(n) || n < 1){ showNotification('Please enter a valid recurrence interval (integer >= 1)','error'); return; }
        var unit = recurringCustomUnit ? recurringCustomUnit.value : 'days';
        if(['days','weeks','months'].indexOf(unit) === -1){ showNotification('Invalid recurrence unit','error'); return; }
      }
    }catch(e){}
    var attachmentData = null;
    try{ if(attachmentInput && attachmentInput._lastBase64) attachmentData = attachmentInput._lastBase64; }catch(err){}
    var tx = {
      id: generateId(),
      description: descriptionInput ? descriptionInput.value.trim() : '',
      amount: amountInput ? parseFloat(amountInput.value) || 0 : 0,
      category: categoryInput ? categoryInput.value : '',
      type: typeInput ? typeInput.value : 'expense',
      status: (document.getElementById('status') && document.getElementById('status').value) || 'paid',
      productId: (document.getElementById('productId') && document.getElementById('productId').value) || '',
      date: dateInput ? dateInput.value : new Date().toISOString().slice(0,10),
      dueDate: dueDateInput && dueDateInput.value ? dueDateInput.value : '',
      invoiceNo: invoiceInput && invoiceInput.value ? invoiceInput.value.trim() : '',
      currency: currencyInput && currencyInput.value ? currencyInput.value : 'INR',
      attachment: attachmentData || null,
      recurring: (function(){ try{ if(!recurringInput) return 'none'; if(recurringInput.value === 'custom'){ var n = (recurringCustomNumber && parseInt(recurringCustomNumber.value)) || 1; var u = (recurringCustomUnit && recurringCustomUnit.value) || 'days'; return 'custom:'+n+':'+u; } return recurringInput.value || 'none'; }catch(e){ return recurringInput && recurringInput.value ? recurringInput.value : 'none'; } })(),
      timestamp: Date.now()
    };

    if(tx.type === 'expense' && (!tx.category || tx.category.trim() === '')){ showNotification('Please select a vendor/store for expense transactions','error'); return; }

    // Basic duplicate invoice check
    if(tx.invoiceNo){ var exists = transactions.some(function(t){ return t.invoiceNo && t.invoiceNo === tx.invoiceNo; }); if(exists){ if(!confirm('A transaction with this invoice number already exists. Save anyway?')) return; }}

    var originalLength = transactions.length;
    transactions.push(tx);
    // recurring scheduling (simple): create next occurrence record
    if(tx.recurring && tx.recurring !== 'none'){ var next = nextRecurringDate(tx.date, tx.recurring); if(next){ var nextTx = Object.assign({}, tx); nextTx.id = generateId(); nextTx.date = next; nextTx.timestamp = Date.now(); transactions.push(nextTx); }}

    var saved = saveTransactions(); updateDisplay();
    if(!saved){ transactions.splice(originalLength); updateDisplay(); showNotification('Transaction added, but it could not be saved in browser storage. Export CSV to avoid losing this data on refresh.','error'); return; }
    if(transactionForm) transactionForm.reset(); setTodayDate(); if(attachmentInput) attachmentInput._lastBase64 = null; showNotification('Transaction added successfully!','success');
  }

  function onFilter(e){ Array.prototype.forEach.call(filterButtons, function(b){ b.classList.remove('active'); }); e.target.classList.add('active'); currentFilter = e.target.dataset.filter; displayTransactions(); }

  function onClearAll(){ if(transactions.length === 0){ showNotification('No transactions to clear!','error'); return; } if(!confirm('Are you sure you want to delete all transactions?')) return; var previous = transactions.slice(); transactions = []; if(!saveTransactions()){ transactions = previous; return; } updateDisplay(); showNotification('All transactions cleared!','error'); }

  function generateId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function updateDisplay(){ calculateTotals(); displayTransactions(); }

  function calculateTotals(){ var income = transactions.filter(function(t){ return t.type==='income'; }).reduce(function(s,t){ return s + (t.amount||0); },0); var expense = transactions.filter(function(t){ return t.type==='expense'; }).reduce(function(s,t){ return s + (t.amount||0); },0); var pending = transactions.filter(function(t){ return t.status==='pending'; }).reduce(function(s,t){ return s + (t.amount||0); },0); var balance = income - expense; if(totalBalanceEl) totalBalanceEl.textContent = formatCurrency(balance); if(totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income); if(totalExpenseEl) totalExpenseEl.textContent = formatCurrency(expense); var pendingEl = document.getElementById('totalPending'); if(pendingEl) pendingEl.textContent = formatCurrency(pending); }

  function displayTransactions(){
    if(!transactionsList) return;
    var list = transactions.slice();
    if(currentFilter !== 'all') list = list.filter(function(t){ return t.type === currentFilter; });
    if(list.length === 0){ transactionsList.innerHTML = '<div class="empty-state"><p>' + (currentFilter==='all' ? 'No transactions yet. Add your first transaction above!' : ('No ' + currentFilter + ' transactions found.')) + '</p></div>'; return; }
    list.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
    transactionsList.innerHTML = list.map(createTransactionHTML).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.delete-btn'), function(btn){ var id = btn.dataset.id; btn.addEventListener('click', function(){ handleDeleteWithUndo(id, btn); }); });
    Array.prototype.forEach.call(document.querySelectorAll('.edit-btn'), function(b){ b.addEventListener('click', function(){ enterEditMode(b.dataset.id); }); });
    Array.prototype.forEach.call(document.querySelectorAll('.save-btn'), function(b){ b.addEventListener('click', function(){ saveEdit(b.dataset.id); }); });
    Array.prototype.forEach.call(document.querySelectorAll('.cancel-btn'), function(b){ b.addEventListener('click', function(){ exitEditMode(b.dataset.id); }); });
    Array.prototype.forEach.call(document.querySelectorAll('.view-attach'), function(btn){ btn.addEventListener('click', function(){ var id = btn.dataset.id; var tx = transactions.find(function(t){ return t.id === id; }); if(tx && tx.attachment){ var w = window.open(); if(w){ w.document.write('<iframe src="'+tx.attachment+'" style="border:none;width:100%;height:100%"></iframe>'); } } }); });
  }

  function createTransactionHTML(t){
    var sign = t.type === 'income' ? '+' : '-';
    var date = formatDate(t.date);
    var cat = t.category || '';
    var html = '<div class="transaction-item ' + (t.type||'') + '" data-id="' + t.id + '" role="listitem">';
    html += '<div class="transaction-details">';
    html += '<div class="transaction-description">' + escapeHtml(t.description) + '</div>';
    html += '<div class="transaction-meta">';
    html += '<span class="transaction-category">' + escapeHtml(cat) + '</span>';
    html += '<span class="transaction-date">' + date + '</span>';
    if(t.dueDate){ var due = new Date(t.dueDate); var now = new Date(); var days = Math.ceil((due - new Date(now.getFullYear(), now.getMonth(), now.getDate()))/86400000); if(days < 0) html += '<span class="overdue-badge">OVERDUE</span>'; else if(days <= 3) html += '<span class="due-soon">Due in ' + days + 'd</span>'; }
    html += '<span class="transaction-status">' + escapeHtml(t.status || 'paid') + '</span>';
    if(t.invoiceNo) html += '<span class="transaction-invoice">Inv: ' + escapeHtml(t.invoiceNo) + '</span>';
    if(t.productId) html += '<span class="transaction-product">Bill: ' + escapeHtml(t.productId) + '</span>';
    if(t.recurring && t.recurring !== 'none') html += '<span class="recurring-pill">' + escapeHtml(t.recurring) + '</span>';
    html += '</div></div>';
    html += '<div style="display:flex; align-items:center; gap:10px">';
    html += '<div class="transaction-amount">' + sign + formatCurrency(t.amount, t.currency) + '</div>';
    html += '<div class="action-btns">';
    html += '<button class="edit-btn" data-id="' + t.id + '" aria-label="Edit transaction">Edit</button>';
    html += '<button class="save-btn" data-id="' + t.id + '" aria-hidden="true" style="display:none">Save</button>';
    html += '<button class="cancel-btn" data-id="' + t.id + '" aria-hidden="true" style="display:none">Cancel</button>';
    html += '<button class="delete-btn" data-id="' + t.id + '" aria-label="Delete transaction">Delete</button>';
    if(t.attachment) html += '<button class="view-attach" data-id="' + t.id + '">View</button>';
    html += '</div></div>';
    if(t.attachment) html += '<div class="attachment-preview"><img class="attachment-thumb" src="' + t.attachment + '" alt="attachment"/></div>';
    html += '</div>';
    return html;
  }

  function handleDeleteWithUndo(id, btn){ var container = btn.closest('.transaction-item'); if(!container) return; if(!confirm('Are you sure you want to delete this transaction?')) return; var tx = transactions.find(function(x){ return x.id === id; }); container.classList.add('remove'); lastDeleted = { item: tx, removedAt: Date.now() }; var cleanup = function(){ var previous = transactions.slice(); transactions = transactions.filter(function(x){ return x.id !== id; }); if(!saveTransactions()){ transactions = previous; updateDisplay(); return; } updateDisplay(); showUndoNotification(lastDeleted); }; container.addEventListener('transitionend', function tn(ev){ if(ev.propertyName === 'opacity'){ container.removeEventListener('transitionend', tn); cleanup(); } }); setTimeout(cleanup, 420); }

  function showUndoNotification(deleted){ var area = document.getElementById('undoArea'); if(!area) return; area.innerHTML = ''; var box = document.createElement('div'); box.style.cssText = 'background:#111;color:#fff;padding:10px 14px;border-radius:8px;display:inline-flex;gap:10px;align-items:center;'; box.textContent = 'Transaction deleted'; var undoBtn = document.createElement('button'); undoBtn.textContent = 'Undo'; undoBtn.style.cssText = 'background:#fff;color:#111;border-radius:6px;padding:6px 10px;border:none;cursor:pointer;'; undoBtn.addEventListener('click', function(){ if(!lastDeleted) return; var previous = transactions.slice(); transactions.push(lastDeleted.item); if(!saveTransactions()){ transactions = previous; return; } updateDisplay(); area.innerHTML = ''; lastDeleted = null; showNotification('Restore successful','success'); }); box.appendChild(undoBtn); area.appendChild(box); setTimeout(function(){ if(area.contains(box)) area.removeChild(box); lastDeleted = null; }, 6000); }

  function renderChart(){
    var activeSub = document.querySelector('.chart-subtab.active');
    var mode = activeSub ? activeSub.dataset.mode : 'expenses';
    var byCategory = {};
    transactions.forEach(function(t){
      if(mode==='expenses' && t.type!=='expense') return;
      if(mode==='income' && t.type!=='income') return;
      var k = t.category || 'Other';
      byCategory[k] = (byCategory[k]||0) + (t.amount||0);
    });

    var labels = Object.keys(byCategory).length ? Object.keys(byCategory) : ['No data'];
    var values = labels.map(function(l){ return byCategory[l] || 0; });

    // cumulative balance over time
    var sorted = transactions.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
    var cum = 0;
    var balanceData = [];
    sorted.forEach(function(t){ cum += (t.type==='income'? t.amount : -t.amount); balanceData.push(cum); });

    // build color palettes safely (hsla with commas)
    var bgColors = labels.map(function(_,i){ return 'hsla(' + ((i*55)%360) + ', 70%, 55%, 0.8)'; });
    var bgColorsPie = labels.map(function(_,i){ return 'hsla(' + ((i*55)%360) + ', 70%, 55%, 0.9)'; });

    var barEl = document.getElementById('barChart');
    if(barEl){
      var ctx = barEl.getContext ? barEl.getContext('2d') : barEl;
      try{ if(barChart) barChart.destroy(); }catch(e){}
      barChart = new Chart(ctx, {
        data: {
          labels: labels,
          datasets: [
            {
              type: 'bar',
              label: (mode==='expenses' ? 'Spend by Vendor' : (mode==='income' ? 'Income by Vendor' : 'Amount by Vendor')),
              data: values,
              backgroundColor: bgColors
            },
            {
              type: 'line',
              label: 'Cumulative Balance',
              data: balanceData,
              borderColor: 'rgba(34,197,94,0.9)',
              tension: 0.3,
              fill: false,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true },
            y1: { position: 'right', grid: { drawOnChartArea: false } }
          },
          plugins: { legend: { position: 'top' } }
        }
      });
    if(barEl.parentElement) barEl.parentElement.onclick = function(){
      // Open the full dashboard page with transactions and a suggested metric/range
      var opts = { txns: transactions, metric: (mode==='expenses'?'expense':'income'), range: 'month', year: (new Date()).getFullYear(), mode: mode };
      openDashboardWithOptions(opts);
    };
    }

    var pieEl = document.getElementById('pieChart');
    if(pieEl){
      var ctx2 = pieEl.getContext ? pieEl.getContext('2d') : pieEl;
      try{ if(pieChart) pieChart.destroy(); }catch(e){}
      pieChart = new Chart(ctx2, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{ data: values, backgroundColor: bgColorsPie }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
      });
      if(pieEl.parentElement) pieEl.parentElement.onclick = function(){
        var opts = { txns: transactions, metric: (mode==='expenses'?'expense':'income'), range: 'month', year: (new Date()).getFullYear(), mode: mode };
        openDashboardWithOptions(opts);
      };
    }

    setTimeout(function(){ try{ if(barChart) barChart.resize(); if(pieChart) pieChart.resize(); }catch(e){} }, 160);
  }

  function openChartInNewTab(type, payload){ var html = buildStandaloneChartHtml(type, payload); var blob = new Blob([html], { type: 'text/html' }); var url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(function(){ URL.revokeObjectURL(url); }, 20000); }

  function buildStandaloneChartHtml(type, payload){ var cdn = 'https://cdn.jsdelivr.net/npm/chart.js@4.3.0/dist/chart.umd.min.js'; var labelsJson = JSON.stringify(payload.labels || []); var valuesJson = JSON.stringify(payload.values || []); var balanceJson = JSON.stringify(payload.balanceData || []); var title = (type === 'bar') ? (payload.mode==='expenses'?'Spend by Vendor':'Income by Vendor') : (payload.mode==='expenses'?'Expense Distribution':'Income Distribution'); var parts = []; parts.push('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(title) + '</title>'); parts.push('<style>body{font-family:system-ui,Segoe UI,Roboto,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}#c{width:90vw;height:86vh;max-width:1200px;}</style>'); parts.push('</head><body>'); parts.push('<canvas id="c"></canvas>'); parts.push('<script src="' + cdn + '"></script>'); parts.push('<script>'); parts.push('const labels = ' + labelsJson + ';'); parts.push('const values = ' + valuesJson + ';'); parts.push('const balance = ' + balanceJson + ';'); parts.push('const ctx = document.getElementById("c").getContext("2d");'); if(type === 'bar'){ parts.push('new Chart(ctx,{data:{labels:labels,datasets:[{type:"bar",label:"' + escapeJs(title) + '",data:values,backgroundColor:labels.map(function(_,i){return "hsla("+((i*55)%360)+" 70% 55% / 0.85)";})},{type:"line",label:"Cumulative Balance",data:balance,borderColor:"rgba(34,197,94,0.9)",tension:0.3,fill:false,yAxisID:"y1"}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true},y1:{position:"right",grid:{drawOnChartArea:false}}},plugins:{legend:{position:"top"}}}});'); } else { parts.push('new Chart(ctx,{type:"pie",data:{labels:labels,datasets:[{data:values,backgroundColor:labels.map(function(_,i){return "hsla("+((i*55)%360)+" 70% 55% / 0.9)";})}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"right"}}}});'); } parts.push('<\/script>'); parts.push('</body></html>'); return parts.join('\n'); }

  // open a full-page summary dashboard in a new tab. Accepts transactions array.
  function openSummaryDashboard(txns){
    // prefer the options-based dashboard opener
    openDashboardWithOptions({ txns: txns });
  }

  // Open dashboard.html and pass options via sessionStorage.
  function openDashboardWithOptions(opts){
    try{
      opts = opts || {};
      var txns = opts.txns || transactions || [];
      var params = { metric: opts.metric || 'income', range: opts.range || 'month', year: opts.year || null, mode: opts.mode || null };
  var txnsStored = sessionStore.setJSON('summary_transactions_temp', txns, { notifyErrorMessage: 'Unable to store temporary dashboard data in session storage.' });
  var paramsStored = sessionStore.setJSON('summary_dashboard_params', params, { notifyErrorMessage: 'Unable to store dashboard options in session storage.' });
  if(!txnsStored || !paramsStored) return;
  // navigate in the same tab so browser back button returns to tracker
  try{ window.location.assign('dashboard.html'); }catch(err){ showNotification('Failed to open dashboard: '+(err&&err.message||err),'error'); }
    }catch(e){ showNotification('Failed to open dashboard: '+(e && e.message || e),'error'); }
  }

  function importCSVString(text){
    if(window.Papa && Papa.parse){
      var parsed = Papa.parse(text, { header:true, skipEmptyLines:true });
      var data = parsed.data || [];
      var newTx = data.map(function(row){
        return {
          id: row.id || generateId(),
          description: row.description || '',
          amount: parseFloat(row.amount) || 0,
          currency: row.currency || 'INR',
          category: row.category || '',
          productId: row.productId || '',
          invoiceNo: row.invoiceNo || '',
          type: row.type || 'expense',
          status: row.status || 'paid',
          date: row.date || new Date().toISOString().slice(0,10),
          dueDate: row.dueDate || '',
          recurring: row.recurring || 'none',
          attachment: null,
          timestamp: parseInt(row.timestamp) || Date.now()
        };
      });
      var previous = transactions.slice();
      transactions = transactions.concat(newTx);
      if(!saveTransactions()){ transactions = previous; return; }
      updateDisplay();
      return;
    }
    var lines = text.split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
    if(lines.length === 0) throw new Error('Empty file');
    var header = lines[0].split(',').map(function(h){ return h.replace(/"/g,'').trim(); });
    var newTx = [];
    for(var i=1;i<lines.length;i++){
      var cols = parseCSVLine(lines[i]); if(cols.length < header.length) continue; var tx = {};
      header.forEach(function(h,idx){ tx[h] = cols[idx] || ''; });
      if(!tx.id) tx.id = generateId(); tx.amount = parseFloat(tx.amount) || 0; tx.timestamp = parseInt(tx.timestamp) || Date.now(); if(!tx.description || !tx.date) continue; tx.currency = tx.currency || 'INR'; tx.dueDate = tx.dueDate || ''; tx.invoiceNo = tx.invoiceNo || ''; tx.recurring = tx.recurring || 'none'; tx.attachment = null; newTx.push(tx);
    }
    var previous = transactions.slice();
    transactions = transactions.concat(newTx); if(!saveTransactions()){ transactions = previous; return; } updateDisplay();
  }

  function onFileSelected(e){ var file = e.target.files && e.target.files[0]; if(!file) return; var reader = new FileReader(); reader.onload = function(ev){ try{ importCSVString(ev.target.result); showNotification('Import completed', 'success'); }catch(err){ showNotification('Failed to import CSV: ' + err.message, 'error'); } }; reader.readAsText(file); e.target.value=''; }

  function exportCSV(){
    if(transactions.length === 0){ showNotification('No transactions to export','error'); return; }
    var header = ['id','description','amount','currency','category','productId','invoiceNo','type','status','date','dueDate','recurring','timestamp'];
    var exportRows = transactions.map(function(t){ var out = {}; header.forEach(function(h){ out[h] = t[h] || ''; }); return out; });
    if(window.Papa && Papa.unparse){ var csv = Papa.unparse(exportRows, { columns: header }); var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'transactions-' + new Date().toISOString().slice(0,10) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showNotification('Export started','success'); return; }
    var rows = exportRows.map(function(t){ return header.map(function(h){ return '"' + String(t[h] || '').replace(/"/g,'""') + '"'; }).join(','); });
    var csv = [header.join(','), ].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'transactions-' + new Date().toISOString().slice(0,10) + '.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showNotification('Export started','success');
  }

  function parseCSVLine(line){ var res = []; var cur = ''; var inQuotes = false; for(var i=0;i<line.length;i++){ var ch = line[i]; if(ch === '"'){ inQuotes = !inQuotes; continue; } if(ch === ',' && !inQuotes){ res.push(cur); cur = ''; } else cur += ch; } res.push(cur); return res.map(function(s){ return s.replace(/^"|"$/g,''); }); }

  function formatCurrency(amount, currency){ var val = Number(amount||0).toFixed(2); if(!currency || currency === 'INR') return '₹' + val; return currency + ' ' + val; }
  function formatDate(d){ try{ return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }catch(e){ return d; } }

  function saveTransactions(){ return localStore.setJSON('transactions', transactions); }
  function loadTransactions(){
    var loaded = localStore.getJSON('transactions', [], {
      notifyParseErrorMessage: 'Saved transaction data was corrupted and has been reset. Import a CSV backup if needed.',
      removeIfCorrupt: true
    });
    if(!Array.isArray(loaded)){
      showNotification('Saved transaction data format was invalid and has been reset. Import a CSV backup if needed.','error');
      localStore.removeItem('transactions', { notify: false });
      transactions = [];
      return;
    }
    transactions = loaded;
  }

  function showNotification(message, type){ if(type===undefined) type='success'; var notification = document.createElement('div'); notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 25px; background: ' + (type === 'success' ? '#10b981' : '#ef4444') + '; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index:1000;'; notification.textContent = message; document.body.appendChild(notification); setTimeout(function(){ notification.remove(); }, 2200); }

  function enterEditMode(id){ var el = document.querySelector('.transaction-item[data-id="' + id + '"]'); if(!el) return; el.classList.add('editing'); var tx = transactions.find(function(t){ return t.id === id; }); if(!tx) return; var descEl = el.querySelector('.transaction-description'); var catEl = el.querySelector('.transaction-category'); var dateEl = el.querySelector('.transaction-date'); var amountEl = el.querySelector('.transaction-amount'); descEl.innerHTML = '<input class="edit-input" data-field="description" value="' + escapeHtml(tx.description) + '">'; catEl.innerHTML = '<input class="edit-input" data-field="category" value="' + escapeHtml(tx.category) + '">'; dateEl.innerHTML = '<input class="edit-input" type="date" data-field="date" value="' + tx.date + '">'; amountEl.innerHTML = '<input class="edit-input" type="number" step="0.01" data-field="amount" value="' + tx.amount + '">'; Array.prototype.forEach.call(el.querySelectorAll('.save-btn, .cancel-btn'), function(b){ b.style.display='inline-block'; b.removeAttribute('aria-hidden'); }); Array.prototype.forEach.call(el.querySelectorAll('.edit-btn'), function(b){ b.style.display='none'; }); var first = el.querySelector('.edit-input'); if(first) first.focus(); }

  function exitEditMode(id){ var el = document.querySelector('.transaction-item[data-id="' + id + '"]'); if(!el) return; var tx = transactions.find(function(t){ return t.id === id; }); if(!tx) return; el.classList.remove('editing'); el.querySelector('.transaction-description').textContent = tx.description; el.querySelector('.transaction-category').textContent = tx.category; el.querySelector('.transaction-date').textContent = formatDate(tx.date); el.querySelector('.transaction-amount').textContent = (tx.type==='income'?'+':'-') + formatCurrency(tx.amount); Array.prototype.forEach.call(el.querySelectorAll('.save-btn, .cancel-btn'), function(b){ b.style.display='none'; b.setAttribute('aria-hidden','true'); }); Array.prototype.forEach.call(el.querySelectorAll('.edit-btn'), function(b){ b.style.display='inline-block'; }); }

  function saveEdit(id){ var el = document.querySelector('.transaction-item[data-id="' + id + '"]'); if(!el) return; var inputs = el.querySelectorAll('.edit-input'); var tx = transactions.find(function(t){ return t.id === id; }); if(!tx) return; var previous = Object.assign({}, tx); Array.prototype.forEach.call(inputs, function(input){ var field = input.dataset.field; if(field === 'amount') tx[field] = parseFloat(input.value) || 0; else tx[field] = input.value; }); tx.timestamp = Date.now(); if(!saveTransactions()){ Object.keys(previous).forEach(function(k){ tx[k] = previous[k]; }); return; } updateDisplay(); showNotification('Transaction updated','success'); }

  function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escapeJs(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\'/g,"\\'"); }

  // start
  init();

})();
