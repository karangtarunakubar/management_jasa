const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const initialTransactions = [
  {
    invoice: 'INV-2026-001',
    customerId: 'CUST-001',
    customerName: 'Budi Santoso',
    hari: 'Senin',
    tanggal: '03/11/2026',
    kategori: 'Poster',
    orientasi: 'Portrait',
    dimensi: 'A4',
    total: 250000,
    metode: 'QRIS',
    status: 'Paid'
  },
  {
    invoice: 'INV-2026-002',
    customerId: 'CUST-002',
    customerName: 'Siska Putri',
    hari: 'Rabu',
    tanggal: '05/11/2026',
    kategori: 'Banner',
    orientasi: 'Landscape',
    dimensi: '120x80 cm',
    total: 420000,
    metode: 'Transfer Bank',
    status: 'DP'
  },
  {
    invoice: 'INV-2026-003',
    customerId: 'CUST-003',
    customerName: 'Raka Wijaya',
    hari: 'Jumat',
    tanggal: '07/11/2026',
    kategori: 'Packaging',
    orientasi: 'Square',
    dimensi: '15x15 cm',
    total: 320000,
    metode: 'Cash',
    status: 'Unpaid'
  }
];

const state = {
  transactions: [...initialTransactions]
};

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.sheet-panel');
const orderForm = document.getElementById('orderForm');
const basePriceInput = document.getElementById('hargaDasar');
const quantityInput = document.getElementById('jumlahOrder');
const displayHargaDasar = document.getElementById('displayHargaDasar');
const displayJumlah = document.getElementById('displayJumlah');
const displaySubtotal = document.getElementById('displaySubtotal');
const displayTambahan = document.getElementById('displayTambahan');
const liveTotal = document.getElementById('liveTotal');
const transactionTableBody = document.getElementById('transactionTableBody');

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function updatePriceSummary() {
  const hargaDasar = Number(basePriceInput.value || 0);
  const qty = Number(quantityInput.value || 0);
  const subtotal = hargaDasar * qty;
  const biayaTambahan = Math.max(0, subtotal * 0.05);
  const total = subtotal + biayaTambahan;

  displayHargaDasar.textContent = formatCurrency(hargaDasar);
  displayJumlah.textContent = qty;
  displaySubtotal.textContent = formatCurrency(subtotal);
  displayTambahan.textContent = formatCurrency(biayaTambahan);
  liveTotal.textContent = formatCurrency(total);
}

function renderTransactions() {
  transactionTableBody.innerHTML = '';

  state.transactions.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.invoice}</td>
      <td>${item.customerId}</td>
      <td>${item.customerName}</td>
      <td>${item.hari}</td>
      <td>${item.tanggal}</td>
      <td>${item.kategori}</td>
      <td>${item.orientasi}</td>
      <td>${item.dimensi}</td>
      <td>${formatCurrency(item.total)}</td>
      <td>${item.metode}</td>
      <td>${item.status}</td>
    `;
    transactionTableBody.appendChild(row);
  });

  updateAudit();
}

function updateAudit() {
  const totalOrders = state.transactions.length;
  const unpaid = state.transactions.filter((item) => item.status === 'Unpaid').length;
  const totalRevenue = state.transactions.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const paymentCounts = state.transactions.reduce((acc, item) => {
    acc[item.metode] = (acc[item.metode] || 0) + 1;
    return acc;
  }, {});

  const paymentMethodText = Object.entries(paymentCounts)
    .sort((a, b) => b[1] - a[1])[0]
    ?.join(': ') || '-';

  const dayCounts = DAY_NAMES.reduce((acc, day) => {
    acc[day] = state.transactions.filter((item) => item.hari === day).length;
    return acc;
  }, {});

  const categoryTotals = state.transactions.reduce((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + Number(item.total || 0);
    return acc;
  }, {});

  document.getElementById('auditTotalOrders').textContent = totalOrders;
  document.getElementById('auditUnpaid').textContent = unpaid;
  document.getElementById('auditRevenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('auditPaymentMethod').textContent = paymentMethodText;

  const dayTrendList = document.getElementById('dayTrendList');
  dayTrendList.innerHTML = DAY_NAMES.map((day) => {
    const value = dayCounts[day] || 0;
    return `
      <li>
        <span>${day}</span>
        <strong>${value}</strong>
      </li>
    `;
  }).join('');

  const paymentBreakdownList = document.getElementById('paymentBreakdownList');
  const sortedPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1]);
  paymentBreakdownList.innerHTML = sortedPayment.length
    ? sortedPayment.map(([method, count]) => `
        <li>
          <span>${method}</span>
          <strong>${count}</strong>
        </li>
      `).join('')
    : '<li><span>-</span><strong>0</strong></li>';

  const categoryBreakdownList = document.getElementById('categoryBreakdownList');
  const totalCategory = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0) || 1;
  categoryBreakdownList.innerHTML = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => {
      const contribution = ((value / totalCategory) * 100).toFixed(1);
      return `
        <li>
          <span>${category}</span>
          <strong>${formatCurrency(value)} • ${contribution}%</strong>
        </li>
      `;
    }).join('');
}

function switchSheet(targetId) {
  tabs.forEach((tab) => {
    const active = tab.dataset.sheet === targetId;
    tab.classList.toggle('active', active);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetId);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchSheet(tab.dataset.sheet));
});

[basePriceInput, quantityInput].forEach((input) => input.addEventListener('input', updatePriceSummary));

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(orderForm);
  const transaksi = {
    invoice: formData.get('invoiceNo'),
    customerId: formData.get('customerId'),
    customerName: formData.get('namaCustomer'),
    hari: formData.get('hariPemesanan'),
    tanggal: formData.get('tanggalPemesanan'),
    kategori: formData.get('kategoriProduk'),
    orientasi: formData.get('orientasi'),
    dimensi: formData.get('dimensi'),
    total: Number(basePriceInput.value || 0) * Number(quantityInput.value || 0),
    metode: formData.get('metodeBayar'),
    status: formData.get('statusBayar')
  };

  state.transactions.unshift(transaksi);
  renderTransactions();
  orderForm.reset();
  document.getElementById('jumlahOrder').value = 1;
  document.getElementById('hargaDasar').value = 150000;
  document.getElementById('formStatus').textContent = `Data ${transaksi.invoice} berhasil disimpan dan terhubung.`;
  updatePriceSummary();
});

updatePriceSummary();
renderTransactions();








































































































































