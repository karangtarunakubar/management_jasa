// ==========================================
// 1. DATABASE IMPLEMENTATION (IndexedDB)
// ==========================================
const DB_NAME = 'ArtDesignDB';
const DB_VERSION = 1;
const STORE_NAME = 'orders';

let db = null;

// Inisialisasi Database IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = dbInstance.createObjectStore(STORE_NAME, {
          keyPath: 'invoiceNo'
        });
        objectStore.createIndex('hari', 'hariPemesanan', { unique: false });
        objectStore.createIndex('kategori', 'kategoriProduk', { unique: false });
        objectStore.createIndex('metode', 'metodeBayar', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('Database error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Tambah / Simpan Order ke Database
function saveOrderToDB(orderData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(orderData);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Ambil Semua Data Order dari Database
function getAllOrdersFromDB() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Hapus Order dari Database
function deleteOrderFromDB(invoiceNo) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(invoiceNo);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ==========================================
// 2. TABS NAVIGATION & UI CONTROL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  setupTabs();
  setupFormCalculations();
  setupFormSubmit();
  await refreshUI();
});

function setupTabs() {
  const tabs = document.querySelectorAll('.sheet-tabs .tab');
  const panels = document.querySelectorAll('.sheet-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-sheet');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// ==========================================
// 3. KALKULATOR HARGA & HARGA DASAR AUTO
// ==========================================
const hargaMaster = {
  Brochure: 150000,
  Poster: 220000,
  Banner: 350000,
  Packaging: 275000,
  'Social Media': 180000
};

function setupFormCalculations() {
  const kategoriSelect = document.getElementById('kategoriProduk');
  const hargaDasarInput = document.getElementById('hargaDasar');
  const jumlahOrderInput = document.getElementById('jumlahOrder');

  // Auto set harga dasar dari master data saat kategori dipilih
  kategoriSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (hargaMaster[selected]) {
      hargaDasarInput.value = hargaMaster[selected];
    }
    updateLiveCalculator();
  });

  hargaDasarInput.addEventListener('input', updateLiveCalculator);
  jumlahOrderInput.addEventListener('input', updateLiveCalculator);
}

function updateLiveCalculator() {
  const hargaDasar = parseFloat(document.getElementById('hargaDasar').value) || 0;
  const jumlah = parseInt(document.getElementById('jumlahOrder').value) || 1;
  const subtotal = hargaDasar * jumlah;
  const total = subtotal;

  document.getElementById('displayHargaDasar').innerText = formatRupiah(hargaDasar);
  document.getElementById('displayJumlah').innerText = jumlah;
  document.getElementById('displaySubtotal').innerText = formatRupiah(subtotal);
  document.getElementById('liveTotal').innerText = formatRupiah(total);
}

function formatRupiah(angka) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(angka);
}

// ==========================================
// 4. SUBMIT FORM & SIMPAN DATA
// ==========================================
function setupFormSubmit() {
  const form = document.getElementById('orderForm');
  const statusNote = document.getElementById('formStatus');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const hargaDasar = parseFloat(document.getElementById('hargaDasar').value) || 0;
    const jumlahOrder = parseInt(document.getElementById('jumlahOrder').value) || 1;
    const totalInvoice = hargaDasar * jumlahOrder;

    const newOrder = {
      invoiceNo: document.getElementById('invoiceNo').value.trim(),
      customerId: document.getElementById('customerId').value.trim(),
      hariPemesanan: document.getElementById('hariPemesanan').value,
      tanggalPemesanan: document.getElementById('tanggalPemesanan').value,
      namaCustomer: document.getElementById('namaCustomer').value.trim(),
      waCustomer: document.getElementById('waCustomer').value.trim(),
      emailCustomer: document.getElementById('emailCustomer').value.trim(),
      kategoriProduk: document.getElementById('kategoriProduk').value,
      orientasi: document.getElementById('orientasi').value,
      dimensi: document.getElementById('dimensi').value.trim(),
      jumlahOrder: jumlahOrder,
      hargaDasar: hargaDasar,
      totalInvoice: totalInvoice,
      metodeBayar: document.getElementById('metodeBayar').value,
      statusBayar: document.getElementById('statusBayar').value,
      createdAt: new Date().toISOString()
    };

    try {
      await saveOrderToDB(newOrder);
      statusNote.innerText = '✅ Order ' + newOrder.invoiceNo + ' berhasil disimpan ke Database!';
      statusNote.style.color = '#10B981';

      form.reset();
      updateLiveCalculator();
      await refreshUI();

      setTimeout(() => {
        statusNote.innerText = 'Siap menyimpan data baru';
        statusNote.style.color = '';
      }, 4000);
    } catch (err) {
      statusNote.innerText = '❌ Gagal menyimpan data (Invoice sudah ada / Error DB)';
      statusNote.style.color = '#EF4444';
    }
  });
}

// ==========================================
// 5. AUTO REFRESH SHEET 2 & SHEET 3 DARI DB
// ==========================================
async function refreshUI() {
  const orders = await getAllOrdersFromDB();
  renderTable(orders);
  renderAuditDashboard(orders);
}

// Render Sheet 2: Tabel Transaksi Pemesanan
function renderTable(orders) {
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px; color: #888;">Belum ada data transaksi tersimpan.</td></tr>`;
    return;
  }

  orders.forEach((order, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${order.invoiceNo}</strong></td>
      <td>${order.customerId}</td>
      <td>${order.namaCustomer}</td>
      <td>${order.hariPemesanan}</td>
      <td>${order.tanggalPemesanan}</td>
      <td><span class="badge badge-kat">${order.kategoriProduk}</span></td>
      <td>${order.orientasi}</td>
      <td>${order.dimensi}</td>
      <td><strong>${formatRupiah(order.totalInvoice)}</strong></td>
      <td>${order.metodeBayar}</td>
      <td><span class="badge status-${order.statusBayar.toLowerCase()}">${order.statusBayar}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Sheet 3: Dashboard Audit & Monitoring
function renderAuditDashboard(orders) {
  const totalOrders = orders.length;
  const unpaidCount = orders.filter((o) => o.statusBayar === 'Unpaid').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalInvoice || 0), 0);

  document.getElementById('auditTotalOrders').innerText = totalOrders;
  document.getElementById('auditUnpaid').innerText = unpaidCount;
  document.getElementById('auditRevenue').innerText = formatRupiah(totalRevenue);

  // Rekap Metode Bayar
  const payCount = { QRIS: 0, Cash: 0, 'Transfer Bank': 0 };
  orders.forEach((o) => {
    if (payCount[o.metodeBayar] !== undefined) payCount[o.metodeBayar]++;
  });
  const topPayment = Object.keys(payCount).reduce((a, b) => (payCount[a] > payCount[b] ? a : b), 'QRIS');
  document.getElementById('auditPaymentMethod').innerText = totalOrders > 0 ? topPayment : '-';

  // 1. Audit Tren per Hari
  const dayTrendList = document.getElementById('dayTrendList');
  dayTrendList.innerHTML = '';
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  days.forEach((day) => {
    const count = orders.filter((o) => o.hariPemesanan === day).length;
    const li = document.createElement('li');
    li.innerHTML = `<span>${day}</span> <strong>${count} Order</strong>`;
    dayTrendList.appendChild(li);
  });

  // 2. Rekap Metode Pembayaran
  const paymentBreakdownList = document.getElementById('paymentBreakdownList');
  paymentBreakdownList.innerHTML = '';
  Object.keys(payCount).forEach((method) => {
    const count = payCount[method];
    const li = document.createElement('li');
    li.innerHTML = `<span>${method}</span> <strong>${count} Transaksi</strong>`;
    paymentBreakdownList.appendChild(li);
  });

  // 3. Breakdown Omset per Kategori
  const categoryBreakdownList = document.getElementById('categoryBreakdownList');
  categoryBreakdownList.innerHTML = '';
  const catOmset = {};
  orders.forEach((o) => {
    catOmset[o.kategoriProduk] = (catOmset[o.kategoriProduk] || 0) + o.totalInvoice;
  });

  Object.keys(hargaMaster).forEach((cat) => {
    const omset = catOmset[cat] || 0;
    const pct = totalRevenue > 0 ? ((omset / totalRevenue) * 100).toFixed(1) : 0;
    const li = document.createElement('li');
    li.innerHTML = `<span>${cat}</span> <strong>${formatRupiah(omset)} (${pct}%)</strong>`;
    categoryBreakdownList.appendChild(li);
  });
}

// ==========================================
// 6. AUTO SEND INVOICE TO WHATSAPP CUSTOMER
// ==========================================
function setupWhatsAppSender() {
  const btnSendWa = document.getElementById('btnSendWa');
  
  btnSendWa.addEventListener('click', () => {
    // Ambil data dari form input saat ini
    const invoiceNo = document.getElementById('invoiceNo').value.trim() || 'INV-XXXX';
    const namaCustomer = document.getElementById('namaCustomer').value.trim() || 'Pelanggan';
    const waCustomer = document.getElementById('waCustomer').value.trim();
    const kategori = document.getElementById('kategoriProduk').value || '-';
    const orientasi = document.getElementById('orientasi').value || '-';
    const dimensi = document.getElementById('dimensi').value || '-';
    const jumlah = document.getElementById('jumlahOrder').value || 1;
    const metodeBayar = document.getElementById('metodeBayar').value || '-';
    const statusBayar = document.getElementById('statusBayar').value || '-';
    
    const hargaDasar = parseFloat(document.getElementById('hargaDasar').value) || 0;
    const totalInvoice = hargaDasar * jumlah;

    if (!waCustomer) {
      alert('⚠️ Mohon isi Nomor WhatsApp (No. WA) customer terlebih dahulu!');
      document.getElementById('waCustomer').focus();
      return;
    }

    // Format Pesan WhatsApp yang rapi & profesional
    const message = 
`*INVOICE PEMESANAN - ART DESIGN*
-----------------------------------
Halo *${namaCustomer}*, 
Terima kasih telah mempercayakan kebutuhan desain & cetak Anda kepada kami. Berikut adalah rincian tagihan Anda:

🧾 *No. Invoice:* ${invoiceNo}
📦 *Kategori:* ${kategori} (${orientasi} - ${dimensi})
🔢 *Jumlah:* ${jumlah} Pcs/Unit
💰 *Total Tagihan:* *${formatRupiah(totalInvoice)}*

💳 *Metode Pembayaran:* ${metodeBayar}
📌 *Status:* *${statusBayar}*

Silakan lakukan pembayaran atau konfirmasi pesanan melalui balasan chat ini. Terima kasih! 🙏`;

    // Bersihkan nomor telepon dari spasi/simbol (ubah 08xxx menjadi 628xxx)
    let cleanPhone = waCustomer.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    // Buka WhatsApp Web / App dengan URL scheme
    const waURL = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waURL, '_blank');
  });
}

// Panggil fungsi ini di dalam DOMContentLoaded event utama Anda:
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  setupTabs();
  setupFormCalculations();
  setupFormSubmit();
  setupWhatsAppSender(); // <--- Tambahkan inisialisasi ini
  await refreshUI();
});
