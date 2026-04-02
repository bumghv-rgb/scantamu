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

// 2. INISIALISASI (Global)
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("tamu");

let logs = [];
let isCooldown = false;
let html5QrScanner = null;

// --- FUNGSI START APLIKASI ---
function startApp() {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loginScreen && mainApp) {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'flex';
        
        // Kasih jeda sedikit agar browser menggambar elemen #reader dulu
        setTimeout(() => {
            initQR();
        }, 300);
    }
}

// --- LOGIKA SCANNER ---
function initQR() {
    // Pastikan elemen 'reader' ada di HTML
    const readerElem = document.getElementById('reader');
    if (!readerElem) return console.error("Elemen #reader tidak ditemukan!");

    // Bersihkan scanner jika sudah ada sebelumnya
    if (html5QrScanner) {
        html5QrScanner.clear();
    }

    html5QrScanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: 250,
        rememberLastUsedCamera: true
    });
    
    html5QrScanner.render((decodedText) => {
        if (isCooldown) return;
        isCooldown = true;

        // Suara Beep
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            osc.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } catch(e) {}

        const parts = decodedText.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.toLocaleDateString('id-ID') + " " + 
                  now.getHours().toString().padStart(2, '0') + ":" + 
                  now.getMinutes().toString().padStart(2, '0');

        // Update UI
        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        // Simpan ke Cloud
        db.push({ n, a, j, t, timestamp: Date.now() });

        // Cooldown 3 detik
        const status = document.getElementById('scan-status');
        let cd = 3;
        const timer = setInterval(() => {
            cd--;
            status.innerText = `TUNGGU (${cd}s)...`;
            if (cd <= 0) {
                clearInterval(timer);
                isCooldown = false;
                status.innerText = "SIAP PINDAI";
            }
        }, 1000);
    });
}

// --- SYNC DATA CLOUD ---
db.on('value', (snapshot) => {
    const data = snapshot.val();
    logs = data ? Object.values(data).reverse() : [];
    renderHistory();
});

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    if (logs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:gray; font-size:0.8rem;">Kosong</p>';
        return;
    }
    list.innerHTML = logs.map(item => `
        <div class="history-item">
            <div class="history-info"><b>${item.n}</b><small>${item.t}</small></div>
            <div style="font-weight:800; color:blue">${item.j}</div>
        </div>
    `).join('');
}

// --- AUTH & THEME ---
function checkAuth() {
    if (document.getElementById('pin-input').value === "van1123") {
        localStorage.setItem('v_auth', 'true');
        startApp();
    } else { alert("PIN Salah!"); }
}

function logout() {
    localStorage.removeItem('v_auth');
    location.reload();
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// DOWNLOAD & DELETE (Firebase)
function downloadExcel() {
    let csv = "sep=,\nNama Tamu,Alamat,Jumlah,Waktu Scan\n"; 
    logs.forEach(r => csv += `"${r.n}","${r.a}","${r.j}","${r.t}"\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Tamu.csv`;
    link.click();
}

function hapusRiwayat() {
    if (confirm("Hapus semua data di Cloud?")) db.remove();
}

// JALANKAN SAAT HALAMAN SELESAI DIMUAT
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('v_auth') === 'true') {
        startApp();
    }
});
