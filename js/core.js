// ==========================================
// FILE 7: CORE.JS (BOOTING AWAL & SINKRONISASI DATA + SUPER CACHE)
// ==========================================

import { db } from './firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.loadAppData = async function(forceRefresh = false) {
    if (typeof showGlobalLoading === "function") showGlobalLoading('Memuat Data Sistem...');
    
    try {
        // 1. Siapkan kerangka dasar agar file lain (seperti datamaster.js) tidak error/crash
        window.appData = {
            dataMaster: {},
            akademik: {},
            dashboard: {}
        };

        // 2. Mengambil data dari koleksi "Lembaga" di Firestore
        const lembagaRef = collection(db, "Lembaga");
        const lembagaSnap = await getDocs(lembagaRef);
        
        let dataLembaga = [];
        lembagaSnap.forEach((doc) => {
            dataLembaga.push({ id: doc.id, ...doc.data() });
        });

        // 3. Masukkan ke variabel global dengan struktur yang tepat
        window.appData.dataMaster.lembaga = dataLembaga;

        if (typeof hideGlobalLoading === "function") hideGlobalLoading();
        console.log("Data berhasil dimuat dari Firestore!", window.appData);
        
    } catch (error) {
        console.error("Gagal memuat data dari Firestore:", error);
        if (typeof hideGlobalLoading === "function") hideGlobalLoading();
        alert("Terjadi kesalahan saat memuat data database.");
    }
};

function updateActiveNavigationStyles(activeModule) {
    const allNavBtns = document.querySelectorAll('#main-sidebar .nav-btn');
    allNavBtns.forEach(btn => {
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'font-bold');
        btn.classList.add('text-slate-700', 'dark:text-slate-300');
    });

    const activeDesktopBtn = document.getElementById(`nav-desktop-${activeModule}`);
    if (activeDesktopBtn) {
        activeDesktopBtn.classList.remove('text-slate-700', 'dark:text-slate-300');
        activeDesktopBtn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'font-bold');
    }

    const allMobileBtns = document.querySelectorAll('#mobile-menu-list .nav-btn-mobile');
    allMobileBtns.forEach(btn => btn.classList.remove('bg-slate-100', 'dark:bg-slate-700'));

    const activeMobileBtn = document.getElementById(`nav-mobile-${activeModule}`);
    if (activeMobileBtn) activeMobileBtn.classList.add('bg-slate-100', 'dark:bg-slate-700');
}

// --- FUNGSI PEMBANTU UNTUK MERAPIKAN KODE ---
function applyDataToApp(db) {
    // === BAGIAN ATAS (TETAP DIPERTAHANKAN) ===
    if (db.profil && Object.keys(db.profil).length > 0) appData.profil = db.profil;
    if (db.cuti) appData.cuti = db.cuti;
    if (db.klaim) appData.klaim = db.klaim;
    if (db.tugas) appData.tugas = db.tugas;
    if (db.kontak) appData.kontak = db.kontak;
    if (db.absensi) appData.absensi = db.absensi;
    if (db.kalender) appData.kalender = db.kalender; 
    
    if (db.dashboardAdmin) {
        appData.dashboard.pendingApprovals = [
            ...db.dashboardAdmin.pendingCuti.map(c => ({ pengaju: c.pengaju, tipe: "Cuti", deskripsi: c.alasan, nilai: "-", waktu: "Baru" })),
            ...db.dashboardAdmin.pendingKlaim.map(k => ({ pengaju: k.pengaju, tipe: "Klaim", deskripsi: k.judul, nilai: formatRupiah(k.nominal), waktu: "Baru" }))
        ];
    }

    // === BAGIAN BAWAH (YANG DIPERBARUI AGAR TIDAK CRASH) ===
    if (db.dataMaster) {
        appData.dataMaster = db.dataMaster;
    } else {
        appData.dataMaster = { pegawai: [], anak: [], donatur: [], surat: [], mapel: [], kelas: [], lembaga: [] };
    }

    if (db.akademik) {
        appData.akademik = db.akademik;
    } else {
        appData.akademik = { jadwal: [], nilai: [], modul: [] }; // Pelampung anti-crash
    }
    
    // Jurnal, Keuangan, Sarpras
    appData.jurnal = db.jurnal || [];
    appData.keuangan = db.keuangan || [];
    appData.sarpras = db.sarpras || [];
}

function updateUserInterface() {
    document.getElementById('sidebar-user-name').textContent = escapeHTML(appData.profil.nama || currentUser.nama);
    document.getElementById('sidebar-user-role').textContent = escapeHTML(appData.profil.jabatan || currentUser.jabatan);
    
    const avatarInitial = document.getElementById('sidebar-avatar-initial');
    const avatarImg = document.getElementById('sidebar-avatar-img');
    if (currentUser.fotoProfil && currentUser.fotoProfil.trim() !== '') {
        avatarInitial.classList.add('hidden');
        avatarImg.classList.remove('hidden');
        avatarImg.src = currentUser.fotoProfil;
    } else {
        avatarInitial.classList.remove('hidden');
        avatarImg.classList.add('hidden');
        avatarInitial.textContent = currentUser.nama.charAt(0).toUpperCase();
    }

    const isAdminOrManager = currentUser.role === 'admin' || (currentUser.jabatan && (currentUser.jabatan.toLowerCase().includes('tata usaha') || currentUser.jabatan.includes('kurikulum') || currentUser.jabatan.includes('yayasan') || currentUser.jabatan.includes('ray')));
    const btnAddKalender = document.getElementById('btn-add-kalender');
    if (btnAddKalender) {
        if (isAdminOrManager) btnAddKalender.classList.remove('hidden');
        else btnAddKalender.classList.add('hidden');
    }
}

function refreshCurrentPageContent() {
    const activeDesktopBtn = document.querySelector('#main-sidebar .nav-btn.font-bold');
    if (activeDesktopBtn) {
        const viewName = activeDesktopBtn.id.replace('nav-desktop-', '');
        if (viewName === 'akademik' && typeof renderAkademikData === "function") {
            renderAkademikData();
        } 
        else if (viewName === 'dashboard') {
            if (typeof renderDashboardManager === "function") renderDashboardManager();
            if (typeof renderDashboardKalender === "function") renderDashboardKalender();
        } else if (viewName === 'kalender' && typeof renderKalender === "function") renderKalender();
        else if (viewName === 'absensi' && typeof renderRiwayatAbsensi === "function") renderRiwayatAbsensi();
        else if (viewName === 'datamaster' && typeof renderDataMasterTable === "function") renderDataMasterTable();
        else if (viewName === 'jurnal' && typeof renderJurnalPage === "function") renderJurnalPage();
        else if (viewName === 'keuangan' && typeof renderKeuanganPage === "function") renderKeuanganPage();
        else if (viewName === 'sarpras' && typeof renderSarprasPage === "function") renderSarprasPage();
        else if (viewName === 'profil' && typeof renderProfilCV === "function") renderProfilCV();
        
        // TAMBAHAN BARU UNTUK PAYROLL:
        else if (viewName === 'payroll' && typeof initPayrollPage === "function") initPayrollPage();
    }
}

// ----------------------------------------------------
// INISIALISASI APLIKASI
// ----------------------------------------------------
function initApp() {
    if(typeof initClock === "function") initClock();
    
    const themeSelector = document.getElementById('theme-selector');
    if(themeSelector && typeof handleThemeChange === "function") {
        themeSelector.addEventListener('change', handleThemeChange);
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (savedTheme) { 
            themeSelector.value = savedTheme; 
            handleThemeChange({ target: { value: savedTheme } }); 
        } else { 
            handleThemeChange({ target: { value: 'light' } }); 
        }
    }
    
    if(typeof checkSession === "function") checkSession();
}

// ==================================================
// FITUR BARU: TOMBOL SAKTI FORCE SYNC & HARD RELOAD
// ==================================================
async function forceSyncSystem() {
    if (!confirm("Tindakan ini akan menarik pembaruan kode sistem dan data terbaru dari database. Lanjutkan?")) return;
    
    if(typeof showGlobalLoading === "function") 
        showGlobalLoading("Menarik pembaruan sistem & data terbaru...");
    
    try {
        // 1. Bakar Cache Database Lokal
        if (currentUser && currentUser.username) {
            console.log("🗑️ Menghapus cache appData untuk:", currentUser.username);
            localStorage.removeItem(`portal_appData_${currentUser.username}`);
        }
        
        // 2. Bakar Cache HTML dari Router
        if (typeof viewsCache !== 'undefined') {
            console.log("🗑️ Menghapus cache HTML views");
            for (let key in viewsCache) {
                delete viewsCache[key];
            }
        }
        
        // 3. *** PULL DATA TERBARU DARI BACKEND (TUNGGU SELESAI!) ***
        console.log("📡 Fetching data terbaru dari backend...");
        if (typeof loadAppData === "function") {
            await loadAppData(false); // Tunggu sampai selesai!
            console.log("✅ Data berhasil dimuat dari backend");
            
            // 4. Render halaman dengan data baru
            if (typeof refreshCurrentPageContent === "function") {
                console.log("🎨 Rendering halaman dengan data baru");
                refreshCurrentPageContent();
            }
        }
        
        // 5. Tutup loading indicator
        if(typeof hideGlobalLoading === "function") {
            hideGlobalLoading();
        }
        
        console.log("✨ Sinkronisasi data selesai!");
        
    } catch (error) {
        console.error("❌ Error saat sinkronisasi:", error);
        if(typeof hideGlobalLoading === "function") hideGlobalLoading();
        if(typeof ModernUI !== 'undefined' && ModernUI.alert) {
            ModernUI.alert("Error Sinkronisasi", "Gagal menarik data: " + error.message, 'error');
        } else {
            alert("Gagal sinkronisasi: " + error.message);
        }
    }
}

// =========================================================
// MESIN POP-UP MODERN (PENGGANTI ALERT, CONFIRM, PROMPT KUNO)
// =========================================================

const ModernUI = {
    _createOverlay: function(id) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';
        return overlay;
    },

    alert: function(title, message, type = 'info') {
        const overlay = this._createOverlay('modern-alert');
        let iconHtml = '<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4"><i class="fa-solid fa-circle-info text-2xl text-blue-600"></i></div>';
        let btnClass = 'bg-blue-600 hover:bg-blue-700';

        if (type === 'success') {
            iconHtml = '<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4"><i class="fa-solid fa-check text-3xl text-green-600"></i></div>';
            btnClass = 'bg-green-600 hover:bg-green-700';
        } else if (type === 'error') {
            iconHtml = '<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4"><i class="fa-solid fa-times text-3xl text-red-600"></i></div>';
            btnClass = 'bg-red-600 hover:bg-red-700';
        }

        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl transform transition-all scale-100 animate-slide-up border border-slate-100 dark:border-slate-700">
                ${iconHtml}
                <h3 class="text-xl font-black mb-2 text-slate-800 dark:text-white">${title}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">${message}</p>
                <button onclick="document.getElementById('modern-alert').remove()" class="w-full ${btnClass} text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Mengerti</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    confirm: function(title, message, onConfirm) {
        const overlay = this._createOverlay('modern-confirm');
        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl transform transition-all scale-100 animate-slide-up border border-slate-100 dark:border-slate-700">
                <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
                    <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-600"></i>
                </div>
                <h3 class="text-xl font-black mb-2 text-slate-800 dark:text-white">${title}</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">${message}</p>
                <div class="flex space-x-3">
                    <button onclick="document.getElementById('modern-confirm').remove()" class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors">Batal</button>
                    <button id="btn-confirm-yes" class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Ya, Lanjutkan</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('btn-confirm-yes').onclick = () => {
            overlay.remove();
            onConfirm();
        };
    },

    prompt: function(title, message, placeholder, typeInput, onConfirm) {
        const overlay = this._createOverlay('modern-prompt');
        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100 animate-slide-up border border-slate-100 dark:border-slate-700">
                <h3 class="text-xl font-black mb-1 text-slate-800 dark:text-white flex items-center"><i class="fa-solid fa-keyboard mr-2 text-blue-500"></i> ${title}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">${message}</p>
                <input type="${typeInput}" id="modern-prompt-input" placeholder="${placeholder}" class="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold mb-6 text-center text-lg">
                <div class="flex space-x-3">
                    <button onclick="document.getElementById('modern-prompt').remove()" class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors">Batal</button>
                    <button id="btn-prompt-submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Kirim</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        setTimeout(() => document.getElementById('modern-prompt-input').focus(), 100);
        document.getElementById('btn-prompt-submit').onclick = () => {
            const val = document.getElementById('modern-prompt-input').value;
            overlay.remove();
            onConfirm(val);
        };
    }
};

// =========================================================
// MESIN AUTO-FORMAT RUPIAH (TITIK RIBUAN SAAT DIKETIK)
// =========================================================

// Fungsi untuk menambahkan titik setiap 3 angka
function formatAngkaRibuan(angka) {
    let number_string = angka.replace(/[^,\d]/g, '').toString(),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    return split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
}

// Pasang pendeteksi otomatis ke semua input yang memiliki class 'input-rupiah'
document.addEventListener('input', function (e) {
    if (e.target && e.target.classList.contains('input-rupiah')) {
        // Ambil nilai saat ini, hilangkan huruf/simbol lain, lalu format ulang
        let nilaiAsli = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = formatAngkaRibuan(nilaiAsli);
    }
});

document.addEventListener('DOMContentLoaded', initApp);

