// ==========================================
// 1. KONFIGURASI SUPABASE
// ==========================================
const _supabaseUrl = 'https://nzwmuvsrgehuqwtptail.supabase.co'; 
const _supabaseKey = 'sb_publishable_8EXXTY_SDKC3M3hotHAj0A_12r7yqpK';
const supabaseClient = supabase.createClient(_supabaseUrl, _supabaseKey);

// ==========================================
// 2. INISIALISASI
// ==========================================
let db = []; 
const scanner = new Html5Qrcode("reader");
const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); 
let isLocked = false;

// Bersihkan memori lokal lama
localStorage.removeItem('wedding_v6_data');

// ==========================================
// 3. FUNGSI AMBIL & SINKRONISASI DATA
// ==========================================
async function fetchInitialData() {
    try {
        const { data, error } = await supabaseClient
            .from('kehadiran')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            db = data.map(item => ({
                id: item.id,
                nama: item.nama,
                alamat: item.alamat,
                ucapan: item.ucapan || "Terima kasih sudah hadir!",
                waktu: new Date(item.created_at).toLocaleTimeString('id-ID')
            }));
            render();
        }
    } catch (err) {
        console.error("Gagal ambil data awal:", err);
    }
}

// Realtime Sync
supabaseClient
    .channel('public:kehadiran')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kehadiran' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const newItem = {
                id: payload.new.id,
                nama: payload.new.nama,
                alamat: payload.new.alamat,
                ucapan: payload.new.ucapan || "Terima kasih sudah hadir!",
                waktu: new Date(payload.new.created_at).toLocaleTimeString('id-ID')
            };
            db.unshift(newItem);
        } else if (payload.eventType === 'DELETE') {
            db = db.filter(item => item.id !== payload.old.id);
        }
        render();
    })
    .subscribe();

// ==========================================
// 4. LOGIKA SCAN (ANTI-DUPLIKAT & ANTI-ERROR)
// ==========================================
async function processData(text) {
    if (isLocked) return;
    isLocked = true;

    const p = text.split(',');
    const entry = {
        nama: p[0] ? p[0].trim() : "Tamu Undangan",
        alamat: p[1] ? p[1].trim() : "-",
        ucapan: p[3] ? p[3].trim() : "Terima kasih sudah hadir!"
    };

    // CEK DUPLIKAT: Jika nama & alamat persis sudah ada di list
    const isDuplicate = db.some(t => 
        t.nama.toLowerCase() === entry.nama.toLowerCase() && 
        t.alamat.toLowerCase() === entry.alamat.toLowerCase()
    );

    if (isDuplicate) {
        showNotif("⚠️ Tamu ini sudah pernah scan!");
        setTimeout(() => { isLocked = false; }, 3000);
        return;
    }

    sound.play().catch(() => {});

    // Update UI Modal (Cek elemen dulu agar tidak error)
    const elNama = document.getElementById('modal-nama');
    const elDoa = document.getElementById('modal-doa');
    const elLock = document.getElementById('lock-screen');

    if (elNama) elNama.innerText = entry.nama;
    if (elDoa) elDoa.innerText = `"${entry.ucapan}"`;
    if (elLock) elLock.style.display = 'flex';

    try {
        const { error } = await supabaseClient
            .from('kehadiran')
            .insert([{ 
                nama: entry.nama, 
                alamat: entry.alamat, 
                ucapan: entry.ucapan,
                status_hadir: 'Hadir di Lokasi' 
            }]);

        if (error) throw error;
        showNotif("Check-in Berhasil ✨");

    } catch (err) {
        console.error("Gagal simpan ke Supabase:", err);
        showNotif("Gagal Sinkron Cloud ⚠️");
    }

    setTimeout(() => {
        isLocked = false;
        if (elLock) elLock.style.display = 'none';
    }, 4000);
}

// ==========================================
// 5. RENDER & TAMPILAN
// ==========================================
function render() {
    const container = document.getElementById('guest-list-container');
    const countEl = document.getElementById('count-tamu');
    
    if (countEl) countEl.innerText = `${db.length} Hadir`;
    if (!container) return;

    container.innerHTML = db.map(t => `
        <div class="guest-item" style="animation: slideIn 0.5s ease forwards;">
            <div class="guest-info">
                <h4>${t.nama}</h4>
                <p>📍 ${t.alamat} • ⌚ ${t.waktu}</p>
                <div style="font-size: 11px; font-style: italic; color: var(--primary); margin-top: 5px;">
                    "${t.ucapan}"
                </div>
            </div>
        </div>
    `).join('');
}

// Fungsi pendukung lainnya
function showNotif(msg) {
    const n = document.getElementById('notif');
    if (n) {
        n.innerText = msg; n.style.display = 'block';
        setTimeout(() => n.style.display = 'none', 3000);
    }
}

window.downloadExcel = function() {
    if (db.length === 0) return alert("Belum ada data");
    const ws = XLSX.utils.json_to_sheet(db.map(({id, ...rest}) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar_Hadir");
    XLSX.writeFile(wb, `Rekap_Tamu.xlsx`);
}

// Jalankan sistem
fetchInitialData();
scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 280 }, processData);