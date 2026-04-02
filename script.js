// 1. PASTE CONFIG FIREBASE ANDA DI SINI
const firebaseConfig = {
      apiKey: "AIzaSyDsGqBbJ5QwSPXm45tQE1ZMy8WvSHTqQBM",
      authDomain: "daftar-tamu-undangan-72ab1.firebaseapp.com",
      projectId: "daftar-tamu-undangan-72ab1",
      databaseURL:"https://console.firebase.google.com/u/0/project/daftar-tamu-undangan-72ab1/database/daftar-tamu-undangan-72ab1-default-rtdb/data/~2F",
      storageBucket: "daftar-tamu-undangan-72ab1.firebasestorage.app",
      messagingSenderId: "26307099392",
      appId: "1:26307099392:web:77351d21affb70e88f51e5",
      measurementId: "G-B0G7GJBTSJ"
};

// 2. Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("tamu"); // Nama tabel/folder di database

let logs = [];
let isCooldown = false;

// --- SISTEM TEMA ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('v_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
if(localStorage.getItem('v_theme') === 'dark') document.body.classList.add('dark-mode');

// --- SYNC DATA REALTIME ---
// Fungsi ini otomatis jalan setiap ada data baru masuk ke cloud
db.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        // Mengubah objek menjadi array dan membalik urutan (terbaru di atas)
        logs = Object.keys(data).map(key => data[key]).reverse();
    } else {
        logs = [];
    }
    renderHistory();
});

// --- SCANNER ---
function initQR() {
    const scanner = new Html5QrcodeScanner("reader", { fps: 20, qrbox: 250 });
    scanner.render((text) => {
        if (isCooldown) return;
        isCooldown = true;
        
        // Suara Beep
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);

        const parts = text.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.toLocaleDateString('id-ID') + " " + now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');

        // Tampilkan Preview
        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        // SIMPAN KE FIREBASE
        db.push({ n, a, j, t, created_at: Date.now() });

        // Cooldown 3 detik agar tidak double scan
        const status = document.getElementById('scan-status');
        let cd = 3;
        const timer = setInterval(() => {
            cd--;
            status.innerText = `TUNGGU (${cd}s)...`;
            status.style.color = "var(--danger)";
            if (cd <= 0) {
                clearInterval(timer);
                isCooldown = false;
                status.innerText = "SIAP PINDAI";
                status.style.color = "var(--primary)";
            }
        }, 1000);
    });
}

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
    if (confirm("Hapus SEMUA riwayat di semua perangkat secara permanen?")) {
        db.remove();
    }
}

// Auth
function checkAuth() {
    if (document.getElementById('pin-input').value === "van1123") {
        localStorage.setItem('v_auth', 'true');
        startApp();
    } else { alert("PIN Salah!"); }
}

function startApp() {
    if (localStorage.getItem('v_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('logout-btn').style.display = 'flex';
        initQR();
    }
}
if (localStorage.getItem('v_auth') === 'true') startApp();
