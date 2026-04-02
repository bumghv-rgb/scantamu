// Database Lokal
let logs = JSON.parse(localStorage.getItem('v_offline_logs')) || [];
let scanner; 
let isCooldown = false; // Kunci untuk mencegah scan bertubi-tubi

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
    if (icon) icon.innerText = isDark ? '☀️' : '🌙';
    if (text) text.innerText = isDark ? 'Mode Terang' : 'Mode Gelap';
}

if (localStorage.getItem('v_offline_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeUI(true);
}

// --- SISTEM SUARA ---
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
    } catch (e) { console.warn("Audio blocked"); }
}

// --- AUTENTIKASI ---
function checkAuth() {
    if (document.getElementById('pin-input').value === "van1123") {
        localStorage.setItem('v_offline_auth', 'true');
        startApp();
    } else { alert("PIN Salah!"); }
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

// --- LOGIKA SCANNER (TANPA KONFIRMASI) ---
function initQR() {
    scanner = new Html5QrcodeScanner("reader", { 
        fps: 20, 
        qrbox: 250,
        rememberLastUsedCamera: true
    });

    scanner.render((decodedText) => {
        // Jika masih dalam masa tunggu (cooldown), abaikan scan
        if (isCooldown) return;

        // Aktifkan Cooldown (Kunci sistem selama 3 detik)
        isCooldown = true;
        playBeep();

        // 1. Parsing Data
        const parts = decodedText.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear() + " " + 
                  now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');

        // 2. Tampilkan di UI
        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        // 3. Simpan Langsung
        saveData(n, a, j, t);

        // 4. Hitung Mundur Cooldown (Status Visual)
        const status = document.getElementById('scan-status');
        let countdown = 3;
        
        const timer = setInterval(() => {
            countdown--;
            status.innerText = `TUNGGU (${countdown}s)...`;
            status.style.color = "var(--danger)";
            
            if (countdown <= 0) {
                clearInterval(timer);
                isCooldown = false; // Buka kunci scan
                status.innerText = "SIAP PINDAI";
                status.style.color = "var(--primary)";
            }
        }, 1000);
    });
}

function saveData(n, a, j, t) {
    logs.unshift({ n, a, j, t });
    localStorage.setItem('v_offline_logs', JSON.stringify(logs));
    renderHistory();
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
            <div class="history-info"><b>${item.n}</b><small>${item.t}</small></div>
            <div style="font-weight:800; color:var(--primary)">${item.j}</div>
        </div>
    `).join('');
}

function hapusRiwayat() {
    if (confirm("Hapus semua riwayat?")) {
        logs = [];
        localStorage.removeItem('v_offline_logs');
        renderHistory();
        document.getElementById('disp-nama').innerText = "-";
        document.getElementById('disp-asal').innerText = "-";
        document.getElementById('disp-jumlah').innerText = "-";
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

if (localStorage.getItem('v_offline_auth') === 'true') startApp();
