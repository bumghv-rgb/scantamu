// Database Lokal
let logs = JSON.parse(localStorage.getItem('v_offline_logs')) || [];

// --- SISTEM TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('v_offline_theme', isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
    document.getElementById('theme-text').innerText = isDark ? 'Mode Terang' : 'Mode Gelap';
}

// Cek tema saat load
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
        console.log("Audio Error:", e);
    }
}

// --- AUTENTIKASI ---
function checkAuth() {
    const pin = document.getElementById('pin-input').value;
    if (pin === "van1123") {
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

// --- LOGIKA SCANNER ---
function initQR() {
    const scanner = new Html5QrcodeScanner("reader", { fps: 15, qrbox: 250 });
    scanner.render((text) => {
        playBeep();
        
        // Asumsi data QR: Nama,Alamat,Jumlah
        const parts = text.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear() + " " + 
                  now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');

        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        saveData(n, a, j, t);
    });
}

function saveData(n, a, j, t) {
    logs.unshift({ n, a, j, t });
    localStorage.setItem('v_offline_logs', JSON.stringify(logs));
    renderHistory();
    
    const status = document.getElementById('scan-status');
    status.innerText = "BERHASIL DISIMPAN";
    status.style.color = "var(--success)";
    
    setTimeout(() => {
        status.innerText = "SIAP PINDAI";
        status.style.color = "var(--primary)";
    }, 2000);
}

// --- RIWAYAT & LAPORAN ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (logs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-top:15px;">Belum ada riwayat.</p>';
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

function hapusRiwayat() {
    if (confirm("Hapus semua riwayat lokal?")) {
        logs = [];
        localStorage.removeItem('v_offline_logs');
        renderHistory();
    }
}

function downloadExcel() {
    if (logs.length === 0) return alert("Data kosong!");
    
    let csv = "sep=,\nNama Tamu,Alamat,Jumlah,Waktu Scan\n"; 
    logs.forEach(r => {
        csv += `"${r.n.replace(/"/g, '""')}","${r.a.replace(/"/g, '""')}","${r.j}","${r.t}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Tamu.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Jalankan otomatis jika sudah pernah login
if (localStorage.getItem('v_offline_auth') === 'true') {
    startApp();
}