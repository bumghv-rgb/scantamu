// 1. KONFIGURASI FIREBASE (Ganti dengan milik Anda)
const firebaseConfig = {
    apiKey: "AIzaSyDsGqBbJ5QwSPXm45tQE1ZMy8WvSHTqQBM", 
    authDomain: "daftar-tamu-undangan-72ab1.firebaseapp.com",
    databaseURL: "https://console.firebase.google.com/u/0/project/daftar-tamu-undangan-72ab1/database/daftar-tamu-undangan-72ab1-default-rtdb/data/~2F",
    projectId: "daftar-tamu-undangan-72ab1",
    storageBucket: "daftar-tamu-undangan-72ab1.firebasestorage.app",
    messagingSenderId: "26307099392",
    appId: "1:26307099392:web:77351d21affb70e88f51e5"
};

// 2. INISIALISASI VARIABEL GLOBAL (Wajib di atas agar tidak error)
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("tamu");

let logs = [];
let isCooldown = false; 
let html5QrScanner = null;

// --- SISTEM TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('v_theme', isDark ? 'dark' : 'light');
}

if (localStorage.getItem('v_theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// --- AUTENTIKASI ---
function checkAuth() {
    const pin = document.getElementById('pin-input').value;
    if (pin === "van1123") {
        localStorage.setItem('v_auth', 'true');
        startApp();
    } else { 
        alert("PIN Salah!"); 
    }
}

function logout() {
    localStorage.removeItem('v_auth');
    location.reload();
}

function startApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    renderHistory(); // Render data awal
    initQR();        // Jalankan Kamera
}

// --- SYNC DATA CLOUD (REALTIME) ---
db.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        // Mengubah objek Firebase ke Array dan diurutkan dari yang terbaru
        logs = Object.values(data).reverse();
    } else {
        logs = [];
    }
    renderHistory();
});

// --- LOGIKA SCANNER ---
function initQR() {
    // Menghindari inisialisasi ganda
    if (html5QrScanner) {
        html5QrScanner.clear();
    }

    html5QrScanner = new Html5QrcodeScanner("reader", { 
        fps: 15, 
        qrbox: 250,
        rememberLastUsedCamera: true
    });
    
    html5QrScanner.render((decodedText) => {
        // Proteksi Cooldown (Anti-Duplicate)
        if (isCooldown) return;
        isCooldown = true;

        // Bunyi Beep Sederhana
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.start(); 
        osc.stop(audioCtx.currentTime + 0.1);

        // Parsing Data QR (Format: Nama, Asal, Jumlah)
        const parts = decodedText.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.toLocaleDateString('id-ID') + " " + 
                  now.getHours().toString().padStart(2, '0') + ":" + 
                  now.getMinutes().toString().padStart(2, '0');

        // Update Tampilan Preview
        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        // KIRIM KE FIREBASE
        db.push({ n, a, j, t, timestamp: Date.now() });

        // Hitung Mundur Cooldown 3 Detik
        const status = document.getElementById('scan-status');
        let cd = 3;
        status.style.color = "var(--danger)";
        
        const timer = setInterval(() => {
            cd--;
            status.innerText = `TUNGGU (${cd}s)...`;
            if (cd <= 0) {
                clearInterval(timer);
                isCooldown = false; // Buka kunci scanner kembali
                status.innerText = "SIAP PINDAI";
                status.style.color = "var(--primary)";
            }
        }, 1000);
    });
}

// --- TAMPILAN RIWAYAT ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    if (logs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:gray; font-size:0.8rem; margin-top:20px;">Belum ada riwayat scan.</p>';
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

// --- FITUR LAPORAN & RESET ---
function downloadExcel() {
    if (logs.length === 0) return alert("Data kosong!");
    let csv = "sep=,\nNama Tamu,Alamat,Jumlah,Waktu Scan\n"; 
    logs.forEach(r => {
        csv += `"${r.n}","${r.a}","${r.j}","${r.t}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Tamu_Cloud.csv`;
    link.click();
}

function hapusRiwayat() {
    if (confirm("Hapus semua riwayat di Cloud? Semua perangkat akan kehilangan data ini secara permanen.")) {
        db.remove();
        // Reset display
        document.getElementById('disp-nama').innerText = "-";
        document.getElementById('disp-asal').innerText = "-";
        document.getElementById('disp-jumlah').innerText = "-";
    }
}

// Jalankan otomatis jika sesi masih aktif
if (localStorage.getItem('v_auth') === 'true') {
    // Tunggu DOM selesai load agar tidak error
    window.onload = () => startApp();
}
