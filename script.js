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

// 2. INISIALISASI VARIABEL (Wajib di atas)
firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref("tamu");

let logs = [];
let isCooldown = false;
let html5QrScanner = null;

// --- FUNGSI LOGIN ---
function checkAuth() {
    const pinInput = document.getElementById('pin-input');
    if (pinInput.value === "van1123") {
        localStorage.setItem('v_auth', 'true');
        location.reload(); // Refresh untuk memulai aplikasi secara bersih
    } else {
        alert("PIN Salah! Silakan coba lagi.");
    }
}

function logout() {
    localStorage.removeItem('v_auth');
    location.reload();
}

// --- FUNGSI UTAMA APLIKASI ---
function startApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    // Jalankan Sinkronisasi Data Cloud
    syncData();
    
    // Jalankan Kamera (dengan sedikit jeda agar elemen muncul dulu)
    setTimeout(() => {
        initQR();
    }, 500);
}

// --- LOGIKA SYNC DATA (REALTIME) ---
function syncData() {
    db.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Ubah objek ke array dan balik urutan (terbaru di atas)
            logs = Object.keys(data).map(key => data[key]).reverse();
        } else {
            logs = [];
        }
        renderHistory();
    });
}

// --- LOGIKA SCANNER ---
function initQR() {
    const readerDiv = document.getElementById('reader');
    if (!readerDiv) return;

    // Jika sudah ada scanner yang berjalan, bersihkan dulu
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

        // Parsing Data (Format: Nama, Asal, Jumlah)
        const parts = decodedText.split(",");
        const n = parts[0] ? parts[0].trim() : "Tamu Umum";
        const a = parts[1] ? parts[1].trim() : "-";
        const j = parts[2] ? parts[2].trim() : "1";
        
        const now = new Date();
        const t = now.toLocaleDateString('id-ID') + " " + 
                  now.getHours().toString().padStart(2, '0') + ":" + 
                  now.getMinutes().toString().padStart(2, '0');

        // Tampilkan ke layar preview
        document.getElementById('disp-nama').innerText = n;
        document.getElementById('disp-asal').innerText = a;
        document.getElementById('disp-jumlah').innerText = j;

        // SIMPAN KE FIREBASE
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

// --- TAMPILAN RIWAYAT ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    if (logs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:gray; font-size:0.8rem; margin-top:15px;">Belum ada data di cloud.</p>';
        return;
    }

    list.innerHTML = logs.map(item => `
        <div class="history-item">
            <div class="history-info">
                <b>${item.n}</b>
                <small>${item.t}</small>
            </div>
            <div style="font-weight:800; color:#2563eb">${item.j}</div>
        </div>
    `).join('');
}

// --- FITUR TAMBAHAN ---
function downloadExcel() {
    if (logs.length === 0) return alert("Data masih kosong!");
    let csv = "sep=,\nNama Tamu,Alamat,Jumlah,Waktu Scan\n"; 
    logs.forEach(r => {
        csv += `"${r.n}","${r.a}","${r.j}","${r.t}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Tamu_GuestScan.csv`;
    link.click();
}

function hapusRiwayat() {
    if (confirm("Hapus semua riwayat di Cloud secara permanen?")) {
        db.remove();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// --- JALANKAN SAAT HALAMAN DIBUKA ---
window.onload = () => {
    if (localStorage.getItem('v_auth') === 'true') {
        startApp();
    }
};
