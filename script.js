// Database & Inisialisasi
let db = JSON.parse(localStorage.getItem('wedding_v6_data')) || [];
const scanner = new Html5Qrcode("reader");
const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); 
let isLocked = false;

// Fungsi Ganti Tema
function setTheme(t) {
    document.body.className = 'theme-' + t;
    localStorage.setItem('wedding_theme', t);
}

// Load Tema yang Tersimpan
const savedTheme = localStorage.getItem('wedding_theme');
if(savedTheme) setTheme(savedTheme);

// Fungsi Utama Scan
function processData(text) {
    if (isLocked) return;
    isLocked = true;

    sound.play().catch(() => {});
    
    // Split data QR: nama, alamat, jumlah, doa
    const p = text.split(',');
    const entry = {
        id: Date.now(),
        "Waktu Scan": new Date().toLocaleTimeString('id-ID'),
        "Nama Tamu": p[0] ? p[0].trim() : "Tamu Undangan",
        "Alamat": p[1] ? p[1].trim() : "-",
        "Jumlah Orang": p[2] ? p[2].trim() : "1",
        "Ucapan & Doa": p[3] ? p[3].trim() : "Terima kasih sudah hadir!"
    };

    // Tampilkan Modal Ucapan
    document.getElementById('modal-nama').innerText = entry["Nama Tamu"];
    document.getElementById('modal-doa').innerText = `"${entry["Ucapan & Doa"]}"`;
    document.getElementById('lock-screen').style.display = 'flex';

    // Cek Duplikat
    if (!db.some(t => t["Nama Tamu"] === entry["Nama Tamu"] && t["Alamat"] === entry["Alamat"])) {
        db.unshift(entry);
        saveData();
        showNotif("Berhasil dicatat ✨");
    } else {
        showNotif("Data sudah ada ⚠️");
    }

    // Timer Jeda
    setTimeout(() => {
        isLocked = false;
        document.getElementById('lock-screen').style.display = 'none';
    }, 3500);
}

// Render List ke UI
function render() {
    const container = document.getElementById('guest-list-container');
    document.getElementById('count-tamu').innerText = `${db.length} Hadir`;

    container.innerHTML = db.map(t => `
        <div class="guest-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div class="guest-info">
                    <h4>${t["Nama Tamu"]}</h4>
                    <p>📍 ${t["Alamat"]} • ⌚ ${t["Waktu Scan"]}</p>
                </div>
                <button class="delete-btn" onclick="deleteEntry(${t.id})">✕</button>
            </div>
            <div class="guest-footer">
                <div class="guest-doa">"${t["Ucapan & Doa"]}"</div>
                <div class="badge" style="background:var(--card)">${t["Jumlah Orang"]} Pax</div>
            </div>
        </div>
    `).join('');
}

// Hapus Satu Baris
window.deleteEntry = function(id) {
    if(confirm("Hapus tamu ini dari daftar?")) {
        db = db.filter(t => t.id !== id);
        saveData();
    }
}

// Simpan ke LocalStorage
function saveData() {
    localStorage.setItem('wedding_v6_data', JSON.stringify(db));
    render();
}

// Download Excel
window.downloadExcel = function() {
    if (db.length === 0) return alert("Belum ada data untuk diekspor");
    const cleanData = db.map(({id, ...rest}) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Hadir");
    XLSX.writeFile(wb, `Laporan_Wedding_Premium.xlsx`);
}

// Notifikasi Melayang
function showNotif(msg) {
    const n = document.getElementById('notif');
    n.innerText = msg; n.style.display = 'block';
    setTimeout(() => n.style.display = 'none', 3000);
}

// Reset Total
window.clearAllData = function() {
    if(confirm("PERINGATAN: Hapus seluruh database permanen?")) {
        db = []; saveData();
    }
}

// Menjalankan Scanner
scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 280 }, processData);

// Listener untuk File/Galeri
document.getElementById('input-file').addEventListener('change', e => {
    if (e.target.files[0]) scanner.scanFile(e.target.files[0], true).then(processData);
});

// Jalankan render pertama kali
render();
