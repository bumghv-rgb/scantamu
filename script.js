// Database Lokal
let logs = JSON.parse(localStorage.getItem('v_offline_logs')) || [];
let html5QrCode; 

// --- SISTEM TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('v_offline_theme', isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    if (icon && text) {
        icon.innerText = isDark ? '☀️' : '🌙';
        text.innerText = isDark ? 'Mode Terang' : 'Mode Gelap';
    }
}

// Load tema saat pertama kali buka
if (localStorage.getItem('v_offline_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeUI(true);
}

// --- SISTEM SUARA (BEEP) ---
function playBeep() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
        osc.stop(context.currentTime + 0.5);
    } catch (e) {
        console.warn("Audio Context diblokir browser sebelum ada interaksi.");
    }
}

// --- AUTENTIKASI ---
function checkAuth() {
    const pinInput = document.getElementById('pin-input');
    if (pinInput.value === "van1123") {
        localStorage.setItem('v_offline_auth', 'true');
        startApp();
    } else {
        alert("PIN Salah!");
    }
}

function logout() {
    localStorage.removeItem('v_offline_auth');
    location.reload();
}

function startApp() {
    if (localStorage.getItem('v_offline_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('logout-btn').style.display = 'flex';
        renderHistory();
        initQR();
    }
}

// --- LOGIKA SCANNER DENGAN KONFIRMASI ---
function initQR() {
    // Inisialisasi library
    const scanner = new Html5QrcodeScanner("reader", { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
    });

    scanner.render((decodedText) => {
        // Bunyi Beep saat terdeteksi
        playBeep();

        // Parsing Data (Format: Nama, Alamat, Jumlah)
        const parts = decodedText.split(",");
        const nama = parts[0] ? parts[0].trim() : "Tamu Umum";
        const alamat = parts[1] ? parts[1].trim() : "-";
        const jumlah = parts[2] ? parts[2].trim() : "1";

        // Ambil Waktu Sekarang
        const now = new Date();
        const waktu = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear() + " " + 
                      now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');

        // Tampilkan Preview di UI
        document.getElementById('disp-nama').innerText = nama;
        document.getElementById('disp-asal').innerText = alamat;
        document.getElementById('disp-jumlah').innerText = jumlah;

        // Jendela Konfirmasi (Menjedakan proses input selanjutnya)
        setTimeout(() => {
            const yakin = confirm(`Konfirmasi Data Tamu:\n\nNama: ${nama}\nAsal: ${alamat}\nJumlah: ${jumlah}\n\nSimpan ke laporan?`);
            
            if (yakin) {
                saveData(nama, alamat, jumlah, waktu);
            } else {
                console.log("Scan dibatalkan oleh pengguna.");
            }
        }, 150);
    });
}

function saveData(n, a, j, t) {
    // Masukkan ke array di posisi paling atas
    logs.unshift({ n, a, j, t });
    localStorage.setItem('v_offline_logs', JSON.stringify(logs));
    
    // Update daftar riwayat di layar
    renderHistory();
    
    // Notifikasi visual singkat
    const status = document.getElementById('scan-status');
    status.innerText = "BERHASIL DISIMPAN";
    status.style.color = "var(--success)";
    
    setTimeout(() => {
        status.innerText = "SIAP PINDAI";
        status.style.color = "var(--primary)";
    }, 2000);
}

// --- TAMPILAN RIWAYAT ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (logs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-top:15px;">Belum ada riwayat scan.</p>';
        return;
    }

    list.innerHTML = logs.map(item => `
        <div class="history-item">
            <div class="history-info">
                <b>${item.n}</b>
                <small>${item.t}</small>
            </div>
            <div style="font-weight:800; color:var(--primary)">${item.j}</div>
        </div>
    `).join('');
}

// --- RESET DATA ---
function hapusRiwayat() {
    if (confirm("PERINGATAN: Hapus semua riwayat scan secara permanen?")) {
        logs = [];
        localStorage.removeItem('v_offline_logs');
        renderHistory();
        
        // Reset tampilan display
        document.getElementById('disp-nama').innerText = "-";
        document.getElementById('disp-asal').innerText = "-";
        document.getElementById('disp-jumlah').innerText = "-";
    }
}

// --- EKSPOR EXCEL (CSV) ---
function downloadExcel() {
    if (logs.length === 0) return alert("Tidak ada data untuk diunduh!");
    
    // Header CSV dengan instruksi separator untuk Excel
    let csv = "sep=,\nNama Tamu,Alamat,Jumlah Orang,Waktu Scan\n"; 
    
    logs.forEach(r => {
        // Membersihkan karakter kutip agar tidak merusak format CSV
        const cleanNama = r.n.replace(/"/g, '""');
        const cleanAlamat = r.a.replace(/"/g, '""');
        csv += `"${cleanNama}","${cleanAlamat}","${r.j}","${r.t}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    link.href = url;
    link.download = `Laporan_Tamu_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Cek status login saat halaman dimuat
if (localStorage.getItem('v_offline_auth') === 'true') {
    startApp();
}
