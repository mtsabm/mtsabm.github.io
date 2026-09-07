import { db } from './firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { cekAksesSistem } from './auth.js';
import { renderLayout } from './router.js';

window.appState = { lembaga: [], pegawai: [], anak: [], jadwal: [], keuangan: [], kalender: [], tugas: [] };
let isLayoutRendered = false;

function initRealtimeListeners() {
    onSnapshot(collection(db, "Lembaga"), (snapshot) => {
        window.appState.lembaga = [];
        snapshot.forEach((doc) => window.appState.lembaga.push({ id: doc.id, ...doc.data() }));
        if (window.appState.lembaga.length > 0 && window.appState.lembaga[0].temaWebsite) {
            document.body.className = window.appState.lembaga[0].temaWebsite;
        } else {
            document.body.className = 'tema-1';
        }
        cekDanRenderUI();
    });

    onSnapshot(collection(db, "Pegawai"), (snapshot) => {
        window.appState.pegawai = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.hakAkses !== 'Super Admin') {
                window.appState.pegawai.push({ id: doc.id, ...data });
            }
        });
        if (isLayoutRendered && window.currentPage === 'pegawai') window.navigate('pegawai');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
        if (isLayoutRendered && window.currentPage === 'tugas') window.navigate('tugas');
    });

    onSnapshot(collection(db, "Anak"), (snapshot) => {
        window.appState.anak = [];
        snapshot.forEach((doc) => window.appState.anak.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'anak') window.navigate('anak');
        if (isLayoutRendered && window.currentPage === 'dashboard') window.navigate('dashboard');
    });

    onSnapshot(collection(db, "Jadwal"), (snapshot) => {
        window.appState.jadwal = [];
        snapshot.forEach((doc) => window.appState.jadwal.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'akademik') window.navigate('akademik');
    });

    // PENDETEKSI DATA TUGAS REALTIME
    onSnapshot(collection(db, "Tugas"), (snapshot) => {
        window.appState.tugas = [];
        snapshot.forEach((doc) => window.appState.tugas.push({ id: doc.id, ...doc.data() }));
        if (isLayoutRendered && window.currentPage === 'tugas') window.navigate('tugas');
        if (isLayoutRendered && window.currentPage === 'dashboard') {
            if(typeof window.loadTugasDasbor === 'function') window.loadTugasDasbor();
        }
    });
}

function cekDanRenderUI() {
    document.getElementById('global-loader').classList.add('hidden');
    document.getElementById('app-root').classList.remove('hidden');
    if (cekAksesSistem()) {
        if (!isLayoutRendered) {
            renderLayout();
            window.navigate('dashboard');
            isLayoutRendered = true;
        }
    }
}

window.onload = initRealtimeListeners;


window.renderLockedPremiumHTML = function(namaModul) {
    const currentUser = window.currentUser || {};
    const isSA = currentUser.hakAkses === 'Super Admin';
    
    let benefits = '';
    if (namaModul.includes('Tugas')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Pantau progres kerja pegawai secara real-time (Kanban).</li><li>Delegasi tugas spesifik dengan target deadline & notifikasi otomatis.</li><li>Evaluasi performa kinerja berdasarkan laporan penyelesaian tugas.</li></ul>`;
    } else if (namaModul.includes('PPDB')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Terima pendaftaran siswa baru secara online 24 jam nonstop.</li><li>Otomatisasi pembayaran formulir pendaftaran via integrasi QRIS & Virtual Account.</li><li>Manajemen seleksi, arsip berkas, dan pengumuman kelulusan terpusat.</li></ul>`;
    } else if (namaModul.includes('Kalender')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Sinkronisasi jadwal libur, hari ujian, dan event yayasan.</li><li>Agenda tampil langsung di Dasbor seluruh pegawai.</li><li>Mencegah bentrok jadwal antar divisi atau kegiatan asrama.</li></ul>`;
    } else if (namaModul.includes('Arsip')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Simpan dokumen raport final secara permanen & aman di cloud database.</li><li>Cetak ulang lembar raport kapan saja tanpa perlu input nilai ulang dari awal.</li><li>Pencarian riwayat nilai siswa lintas semester dan tahun ajaran dengan cepat.</li></ul>`;
    } else if (namaModul.includes('Wali Kelas')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Akses instan ke ringkasan kehadiran siswa di kelas yang Anda ampu.</li><li>Pantau grafik pelanggaran dan catatan kedisiplinan asrama milik anak wali Anda.</li><li>Identifikasi cepat tren akademik untuk bahan laporan dan evaluasi bulanan.</li></ul>`;
    } else if (namaModul.includes('Keuangan') || namaModul.includes('SPP')) {
        benefits = `<ul class="text-sm font-bold text-slate-600 text-left list-disc list-inside space-y-2 marker:text-amber-500"><li>Distribusi pembayaran SPP otomatis untuk menutupi tunggakan terlama.</li><li>Sistem manajemen Beasiswa dan penghapusan tagihan khusus santri.</li><li>Pencetakan e-Kwitansi SPP instan dengan logo lembaga.</li></ul>`;
    } else {
        benefits = `<div class="bg-indigo-50 text-indigo-700 text-sm font-bold px-4 py-3 rounded-lg border border-indigo-100"><i class="fa-solid fa-rocket mr-2"></i> Buka efisiensi maksimal yayasan Anda dengan fitur otomatisasi canggih ini!</div>`;
    }

    return `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center min-h-[60vh] animate-fade-in border-t-4 border-t-amber-400">
            <i class="fa-solid fa-lock text-7xl text-amber-400 mb-6 drop-shadow-md"></i>
            <h2 class="text-3xl font-black text-slate-800 mb-3">Modul Tersegel</h2>
            <p class="text-slate-500 font-medium mb-6 max-w-lg leading-relaxed">Halaman / Fitur <b>${namaModul}</b> adalah bagian dari Lisensi Premium. Segel aktif karena modul ini belum dilanggan atau masa uji coba telah berakhir.</p>
            
            <div class="w-full max-w-lg mx-auto bg-amber-50/50 border border-amber-200 p-6 rounded-2xl mb-8 shadow-inner">
                <h4 class="text-amber-900 font-black mb-4 flex items-center justify-center"><i class="fa-solid fa-star text-amber-500 mr-2"></i> Keuntungan Fitur Premium Ini:</h4>
                ${benefits}
            </div>

            ${isSA ? `<button onclick="window.navigate('lisensi')" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-key mr-2"></i> Buka Segel di Pengaturan Lisensi</button>` : `<div class="bg-slate-50 px-8 py-4 rounded-xl font-bold text-slate-500 border border-slate-200"><i class="fa-solid fa-headset mr-2 text-indigo-400"></i> Hubungi Super Admin Yayasan untuk membuka akses.</div>`}
        </div>
    `;
};