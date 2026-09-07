import { app, db } from './firebase-init.js';
import { doc, onSnapshot, updateDoc, collection, getDocs, query, where, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase, ref, onValue, push, set, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { renderHalamanLembaga, renderHalamanPegawai, renderHalamanAnak, renderHalamanAbsensi, renderHalamanLisensi } from './datamaster.js';
import { renderHalamanKalender } from './kalender.js';
import { renderHalamanAkademik } from './akademik.js';
import { renderHalamanKeuangan } from './keuangan.js';
import { renderHalamanTugas } from './tugas.js';
import { renderHalamanKepengasuhan } from './kepengasuhan.js';
import { renderHalamanTahfidz } from './tahfidz.js';
import { renderHalamanRaport } from './raport.js'; 
import { renderHalamanPPDB } from './ppdb_admin.js'; 

const MENU_ITEMS = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'absensi', icon: 'fa-fingerprint', label: 'Absensi & Cuti' },
    { id: 'akademik', icon: 'fa-chalkboard-user', label: 'Akademik' },
    { id: 'kalender', icon: 'fa-calendar-days', label: 'Kalender Pendidikan' },
    { id: 'tugas', icon: 'fa-list-check', label: 'Tugas Pegawai' },
    { id: 'kepengasuhan', icon: 'fa-bed', label: 'Kepengasuhan & Asrama' },
    { id: 'tahfidz', icon: 'fa-book-quran', label: 'Tahfidz Al-Quran' },
    { id: 'raport', icon: 'fa-file-signature', label: 'E-Raport Digital' }, 
    { id: 'keuangan', icon: 'fa-sack-dollar', label: 'Payroll & Keuangan' },
    { id: 'anak', icon: 'fa-child', label: 'Data Anak' },
    { id: 'pegawai', icon: 'fa-users', label: 'Data Pegawai' },
    { id: 'lembaga', icon: 'fa-building', label: 'Data Lembaga' },
    { id: 'ppdb', icon: 'fa-address-card', label: 'Data PPDB' }, 
    { id: 'lisensi', icon: 'fa-gem', label: 'Lisensi & Modul' }
];

window.MENU_ITEMS_GLOBAL = MENU_ITEMS;

// ==========================================
// FUNGSI CEK LISENSI & TRIAL (GLOBAL)
// ==========================================
window.cekLisensi = function(kodeFitur) {
    const lembaga = (window.appState && window.appState.lembaga && window.appState.lembaga[0]) ? window.appState.lembaga[0] : {};
    const fitur = lembaga.lisensiFitur || [];
    const trialEnd = lembaga.masaUjiCobaAkhir || "";
    
    if (trialEnd) {
        const today = new Date().toISOString().split('T')[0];
        if (today <= trialEnd) return true; // Trial masih aktif
    }
    return fitur.includes(kodeFitur);
};

window.renderLockedPremiumHTML = function(namaModul) {
    const currentUser = window.currentUser || {};
    const isSA = currentUser.hakAkses === 'Super Admin';
    return `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-10 flex flex-col items-center justify-center text-center min-h-[60vh] animate-fade-in border-t-4 border-t-amber-400">
            <i class="fa-solid fa-lock text-7xl text-amber-400 mb-6 drop-shadow-md"></i>
            <h2 class="text-3xl font-black text-slate-800 mb-3">Modul Tersegel</h2>
            <p class="text-slate-500 font-medium mb-8 max-w-lg leading-relaxed">Halaman / Fitur <b>${namaModul}</b> adalah bagian dari Lisensi Premium. Segel aktif karena modul ini belum dilanggan atau masa uji coba telah berakhir.</p>
            ${isSA ? `<button onclick="window.navigate('lisensi')" class="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-key mr-2"></i> Buka Segel di Pengaturan Lisensi</button>` : `<div class="bg-slate-50 px-8 py-4 rounded-xl font-bold text-slate-500 border border-slate-200"><i class="fa-solid fa-headset mr-2"></i> Hubungi Super Admin Yayasan untuk membuka akses.</div>`}
        </div>
    `;
};

function getFreshUser() {
    let user = window.currentUser || {};
    if (window.appState && window.appState.pegawai && window.appState.pegawai.length > 0) {
        const freshUser = window.appState.pegawai.find(p => p.username === user.username || p.id === user.id);
        if (freshUser) {
            window.currentUser = freshUser;
            localStorage.setItem('yayasan_user_v2', JSON.stringify(freshUser));
            return freshUser;
        }
    }
    return user;
}

window.renderProfilCV = function(container) {
    const user = window.currentUser || {};
    const foto = (user.fotoProfil && user.fotoProfil.length > 0) ? user.fotoProfil[0] : `https://ui-avatars.com/api/?name=${user.nama || 'User'}&background=e2e8f0&color=475569&size=200`;
    const jabatans = (user.detailJabatan || []).map(d => `<span class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black shadow-sm border border-indigo-200">${d.namaJabatan}</span>`).join(' ') || '-';

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 max-w-5xl mx-auto gap-4">
            <h2 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-address-card text-indigo-500 mr-2"></i> Curriculum Vitae & Profil</h2>
            <div class="flex gap-2">
                <button onclick="window.unduhPDF('cv-container', 'CV_${(user.nama||'Pegawai').replace(/\s+/g, '_')}.pdf')" class="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition flex items-center transform hover:-translate-y-1"><i class="fa-solid fa-file-pdf mr-2"></i> Download CV</button>
                <button onclick="window.navigate('pegawai')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition flex items-center transform hover:-translate-y-1"><i class="fa-solid fa-pen mr-2"></i> Edit Profil</button>
            </div>
        </div>
        
        <div id="cv-container" class="bg-white rounded-3xl shadow-xl overflow-hidden border-t-4 border-indigo-500 relative max-w-5xl mx-auto animate-slide-up p-8 md:p-12 mb-10">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-8 border-b-2 border-slate-100 pb-8 mb-8">
                <img src="${foto}" class="w-40 h-40 rounded-3xl object-cover shadow-lg border-4 border-slate-50 shrink-0">
                <div class="text-center md:text-left flex-1 pt-2">
                    <h1 class="text-4xl md:text-5xl font-black text-slate-800 uppercase tracking-tight mb-3">${user.nama || 'NAMA LENGKAP'}</h1>
                    <p class="text-lg font-bold text-indigo-600 mb-4 tracking-wide">${user.hakAkses || 'Pegawai'} <span class="mx-2 text-slate-300">|</span> ${jabatans}</p>
                    <p class="text-sm font-medium text-slate-500 italic leading-relaxed max-w-3xl">"${user.bio || 'Belum ada bio/deskripsi singkat yang ditambahkan.'}"</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="space-y-8">
                    <div>
                        <h3 class="font-black text-slate-800 border-b-2 border-indigo-100 pb-2 mb-4 tracking-wider"><i class="fa-solid fa-address-book text-indigo-500 mr-2"></i> KONTAK & SOSMED</h3>
                        <ul class="space-y-4 text-sm font-bold text-slate-600">
                            <li class="flex items-center"><i class="fa-solid fa-phone w-6 text-emerald-500 text-lg"></i> ${user.noHp || '-'}</li>
                            <li class="flex items-center"><i class="fa-solid fa-envelope w-6 text-blue-500 text-lg"></i> <span class="truncate">${user.email || '-'}</span></li>
                            ${user.googleAkun ? `<li class="flex items-center text-rose-500"><i class="fa-brands fa-google w-6 text-lg"></i> <span class="truncate" title="${user.googleAkun}">Tersinkronisasi</span></li>` : ''}
                            <li class="flex items-start"><i class="fa-solid fa-location-dot w-6 text-rose-500 text-lg mt-0.5"></i> <span class="leading-relaxed">${user.alamat || '-'}</span></li>
                            <li class="flex items-center mt-4 pt-4 border-t border-slate-100"><i class="fa-brands fa-instagram w-6 text-pink-500 text-xl"></i> ${user.sosmedIg || '-'}</li>
                            <li class="flex items-center"><i class="fa-brands fa-linkedin w-6 text-blue-700 text-xl"></i> ${user.sosmedIn || '-'}</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class="font-black text-slate-800 border-b-2 border-indigo-100 pb-2 mb-4 tracking-wider"><i class="fa-solid fa-user text-indigo-500 mr-2"></i> INFO PERSONAL</h3>
                        <ul class="space-y-3 text-sm font-bold text-slate-600">
                            <li><span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Tempat, Tgl Lahir</span> ${user.tempatLahir || '-'}, ${user.tglLahir || '-'}</li>
                            <li><span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Jenis Kelamin</span> ${user.jk || '-'}</li>
                            <li><span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Pernikahan</span> ${user.pernikahan || '-'} ${user.jmlAnak ? `<span class="bg-slate-100 px-2 py-0.5 rounded text-xs ml-1">${user.jmlAnak} Anak</span>` : ''}</li>
                            <li><span class="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Asrama</span> <span class="${user.asrama === 'Ya' ? 'text-emerald-600' : ''}">${user.asrama === 'Ya' ? 'Tinggal di Asrama' : 'Tidak Berasrama'}</span></li>
                        </ul>
                    </div>

                    <div>
                        <h3 class="font-black text-slate-800 border-b-2 border-indigo-100 pb-2 mb-4 tracking-wider"><i class="fa-solid fa-star text-indigo-500 mr-2"></i> KEAHLIAN & HOBI</h3>
                        <div class="flex flex-wrap gap-2">
                            ${(user.keahlian || '').split(',').filter(x=>x.trim()).length > 0 ? (user.keahlian||'').split(',').map(k => `<span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold">${k.trim()}</span>`).join('') : '<span class="text-sm font-medium text-slate-400 italic">Belum ada keahlian khusus.</span>'}
                        </div>
                    </div>
                </div>

                <div class="md:col-span-2 space-y-8 pl-0 md:pl-6 md:border-l border-slate-100">
                    <div>
                        <h3 class="font-black text-slate-800 border-b-2 border-indigo-100 pb-2 mb-4 tracking-wider"><i class="fa-solid fa-graduation-cap text-indigo-500 mr-2 text-xl"></i> RIWAYAT PENDIDIKAN</h3>
                        <p class="text-sm font-bold text-slate-600 whitespace-pre-wrap leading-loose">${user.riwayatPend || user.pendidikan || '<span class="italic font-medium text-slate-400">Belum ada riwayat pendidikan yang ditambahkan.</span>'}</p>
                    </div>

                    <div>
                        <h3 class="font-black text-slate-800 border-b-2 border-indigo-100 pb-2 mb-4 tracking-wider"><i class="fa-solid fa-briefcase text-indigo-500 mr-2 text-xl"></i> PENGALAMAN KERJA</h3>
                        <p class="text-sm font-bold text-slate-600 whitespace-pre-wrap leading-loose">${user.riwayatKerja || '<span class="italic font-medium text-slate-400">Belum ada pengalaman kerja yang ditambahkan.</span>'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export function renderLayout() {
    window.renderSidebarMenu(); 
    
    const currentUser = getFreshUser();
    const lembaga = (window.appState && window.appState.lembaga && window.appState.lembaga[0]) ? window.appState.lembaga[0] : {}; 
    const header = document.getElementById('app-header');
    
    header.innerHTML = `
        <div class="flex items-center gap-3 w-full max-w-[60%]">
            <button onclick="window.kembaliKeStart()" id="btn-win-start" class="hidden text-white text-2xl md:text-3xl mr-3 hover:scale-110 transition drop-shadow-md" title="Kembali ke Start Screen"><i class="fa-brands fa-windows"></i></button>
            ${lembaga.logo ? `<img src="${lembaga.logo}" class="h-8 md:h-10 w-auto object-contain rounded-lg shadow-sm" id="header-logo-img">` : '<i class="fa-solid fa-school text-indigo-500 text-2xl" id="header-logo-icon"></i>'}
            <div class="flex flex-col truncate">
                <span class="font-black text-sm md:text-lg uppercase text-indigo-900 truncate" id="header-title">DASHBOARD</span>
                <span class="text-[10px] md:text-xs font-bold text-slate-500 truncate uppercase tracking-widest" id="header-subtitle">${lembaga.namaLembaga || 'Sistem Informasi Internal'}</span>
            </div>
        </div>
        <div class="flex items-center space-x-2 md:space-x-4 shrink-0">
            <button onclick="window.location.reload(true)" class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-black shadow-sm transition" title="Muat Ulang Paksa (Hard Refresh)">
                <i class="fa-solid fa-arrows-rotate"></i>
            </button>
            <button onclick="window.navigate('absensi')" class="flex items-center bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-3 md:px-4 py-2 rounded-xl text-xs font-black shadow-md transition transform hover:-translate-y-0.5"><i class="fa-solid fa-fingerprint md:mr-2"></i> <span class="hidden md:inline">Presensi</span></button>
            <div class="flex items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition border border-transparent hover:border-slate-200 dark:hover:border-slate-600" onclick="window.navigate('profil')">
                <img id="header-foto-profil" src="${(currentUser.fotoProfil && currentUser.fotoProfil.length > 0) ? currentUser.fotoProfil[0] : `https://ui-avatars.com/api/?name=${currentUser.nama || 'User'}&background=e2e8f0`}" class="w-9 h-9 rounded-full object-cover mr-2 md:mr-3 border-2 border-slate-200 shadow-sm">
                <span id="header-nama-profil" class="font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">${currentUser.nama || 'User'}</span>
            </div>
            <button onclick="window.handleLogout()" class="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded shadow transition" title="Keluar dari Sistem">
                <i class="fa-solid fa-power-off"></i>
            </button>
        </div>
    `;
}

window.kembaliKeStart = function() {
    document.body.classList.remove('app-open');
};

window.renderSidebarMenu = function() {
    const currentUser = getFreshUser();
    const lembaga = window.appState.lembaga[0] || {};
    
    // Kunci Akses Khusus
    const isSuperAdmin = currentUser.hakAkses === 'Super Admin';
    const isAdministrator = currentUser.hakAkses === 'Administrator';
    const isSA_Admin = isSuperAdmin || isAdministrator;
    
    const isKepala = (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala'));
    const userJabatans = (currentUser.detailJabatan || []).map(j => j.namaJabatan);
    
    const wewenangMatrix = lembaga.wewenangMatrix || {};

    let allowedMenuIds = new Set();
    // Administrator & SA otomatis mendapatkan semua menu
    if (isSA_Admin) {
        MENU_ITEMS.forEach(m => allowedMenuIds.add(m.id));
    } else {
        allowedMenuIds.add('dashboard'); 
        if (isKepala) allowedMenuIds.add('ppdb'); 
        
        userJabatans.forEach(jabatan => {
            const menus = wewenangMatrix[jabatan] || [];
            menus.forEach(mId => allowedMenuIds.add(mId));
        });
    }

    if (!isSuperAdmin) allowedMenuIds.delete('lisensi'); // Lisensi murni 100% hanya SA

    const filteredMenus = MENU_ITEMS.filter(m => allowedMenuIds.has(m.id));
    const sidebar = document.getElementById('app-sidebar');
    
    const trialEnd = lembaga.masaUjiCobaAkhir || "";
    let statusLisensi = "Lisensi Standar";
    if (trialEnd) {
        const today = new Date().toISOString().split('T')[0];
        if (today <= trialEnd) statusLisensi = "Masa Uji Coba (Trial)";
        else if ((lembaga.lisensiFitur || []).length > 0) statusLisensi = "Lisensi Modular";
    } else if ((lembaga.lisensiFitur || []).length > 0) {
        statusLisensi = "Lisensi Modular";
    }

    if (sidebar) {
        sidebar.innerHTML = `
            <div class="p-4 border-b border-slate-200">
                <div class="font-black text-xl text-primary">Portal Yayasan</div>
                <div class="text-amber-600 mt-1 font-bold" style="font-family: 'Caveat', 'Comic Sans MS', cursive; font-size: 1.15rem; transform: rotate(-3deg); transform-origin: left center;">${statusLisensi}</div>
            </div>
            <nav class="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
                ${filteredMenus.map(m => {
                    let lockIcon = '';
                    if (m.id === 'tugas' && !window.cekLisensi('tugas_pegawai')) lockIcon = '<i class="fa-solid fa-lock text-amber-500 ml-auto text-xs" title="Tersegel Premium"></i>';
                    if (m.id === 'ppdb' && !window.cekLisensi('ppdb_online')) lockIcon = '<i class="fa-solid fa-lock text-amber-500 ml-auto text-xs" title="Tersegel Premium"></i>';
                    if (m.id === 'kalender' && !window.cekLisensi('kalender_plus')) lockIcon = '<i class="fa-solid fa-lock text-amber-500 ml-auto text-xs" title="Tersegel Premium"></i>';
                    
                    let btnClass = window.currentPage === m.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700';
                    let iClass = window.currentPage === m.id ? 'text-blue-500' : 'text-slate-400';
                    
                    if (m.id === 'lembaga') {
                        btnClass = window.currentPage === m.id ? 'bg-rose-100 text-rose-800 font-bold' : 'text-rose-800 bg-rose-50 hover:bg-rose-100 hover:text-rose-900';
                        iClass = window.currentPage === m.id ? 'text-rose-700' : 'text-rose-600';
                    }
                    if (m.id === 'ppdb') {
                        btnClass = window.currentPage === m.id ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900';
                        iClass = window.currentPage === m.id ? 'text-emerald-700' : 'text-emerald-600';
                    }
                    if (m.id === 'lisensi') {
                        btnClass = window.currentPage === m.id ? 'bg-amber-100 text-amber-800 font-bold' : 'text-amber-800 bg-amber-50 hover:bg-amber-100 hover:text-amber-900';
                        iClass = window.currentPage === m.id ? 'text-amber-600' : 'text-amber-500';
                    }

                    return `
                    <button onclick="window.navigate('${m.id}')" class="w-full flex items-center p-3 text-left rounded-xl transition shadow-sm border border-transparent hover:border-slate-200 ${btnClass}">
                        <i class="fa-solid ${m.icon} w-8 ${iClass}"></i> 
                        <span class="font-semibold flex-1">${m.label}</span>
                        ${lockIcon}
                    </button>
                    `;
                }).join('')}
            </nav>
        `;
    }
};

window.listenTokenOtorisasi = function() {
    const tokenDisplay = document.getElementById('dashboard-token-display');
    const statusText = document.getElementById('token-status-text');
    if(!tokenDisplay) return;

    const unsub = onSnapshot(doc(db, "SistemOtorisasi", "token_hapus"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === "Pending" && data.token) {
                tokenDisplay.innerText = data.token;
                statusText.innerHTML = `Dari: <span class="text-white bg-red-800/50 px-2 py-0.5 rounded font-black tracking-wider">${data.requester || 'Bagian Keuangan'}</span><br><span class="text-yellow-300 text-[10px] block mt-1 leading-tight"><i class="fa-solid fa-triangle-exclamation"></i> Detail: ${data.actionDetail || 'Penghapusan Data'}</span>`;
            } else if (data.status === "Used") {
                tokenDisplay.innerText = "------";
                statusText.innerText = "Token sebelumnya telah digunakan. Menunggu permintaan baru...";
            } else {
                tokenDisplay.innerText = "------";
                statusText.innerText = "Menunggu permintaan token dari pegawai...";
            }
        } else {
            tokenDisplay.innerText = "------";
        }
    });
    if(window.unsubToken) window.unsubToken();
    window.unsubToken = unsub;
};

// ================= FUNGSI REALTIME DATABASE UNTUK PEMBERITAHUAN =================
window.initPemberitahuanRTDB = function() {
    const rtdb = getDatabase(app);
    const refP = ref(rtdb, 'Pemberitahuan');
    onValue(refP, (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById('list-pemberitahuan-rtdb');
        if(!container) return;
        
        if(data) {
            const arr = Object.keys(data).map(k => ({id: k, ...data[k]})).sort((a,b) => b.timestamp - a.timestamp);
            const currentUser = window.currentUser || {};
            const isSA_Admin = currentUser.hakAkses === 'Super Admin' || currentUser.hakAkses === 'Administrator';
            
            container.innerHTML = arr.map(p => `
                <div class="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-r-xl rounded-l-sm mb-3 shadow-sm relative group transition hover:shadow-md">
                    ${isSA_Admin || currentUser.nama === p.pengirim ? `<button onclick="window.hapusPemberitahuanRTDB('${p.id}')" class="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition bg-white w-6 h-6 rounded-full shadow-sm flex items-center justify-center"><i class="fa-solid fa-trash text-[10px]"></i></button>` : ''}
                    <h4 class="font-black text-indigo-900 text-sm leading-tight pr-6">${p.judul}</h4>
                    <p class="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">${p.isi}</p>
                    <div class="mt-3 text-[9px] font-bold text-indigo-400 flex items-center"><i class="fa-solid fa-user-pen mr-1"></i> ${p.pengirim} <span class="mx-2">•</span> <i class="fa-regular fa-clock mr-1"></i> ${new Date(p.timestamp).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div class="text-center p-8 text-slate-400 font-bold border border-dashed border-slate-300 rounded-xl bg-slate-50"><i class="fa-solid fa-envelope-open text-3xl mb-2 text-slate-300"></i><br>Belum ada pemberitahuan penting.</div>`;
        }
    });
};

window.kirimPemberitahuanRTDB = function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;
    const rtdb = getDatabase(app);
    const refP = ref(rtdb, 'Pemberitahuan');
    const judul = document.getElementById('input-judul-pemberitahuan').value;
    const isi = document.getElementById('input-isi-pemberitahuan').value;
    
    push(refP, { judul: judul, isi: isi, pengirim: window.currentUser.nama, timestamp: Date.now() }).then(() => {
        document.getElementById('form-pemberitahuan').reset(); btn.innerHTML = ori; btn.disabled = false;
    }).catch(err => { alert("Gagal mengirim pemberitahuan."); btn.innerHTML = ori; btn.disabled = false; });
};

window.hapusPemberitahuanRTDB = function(id) {
    if(!confirm("Hapus pemberitahuan ini?")) return;
    const rtdb = getDatabase(app);
    remove(ref(rtdb, 'Pemberitahuan/' + id));
};

window.toggleKelasNotif = function(cb, kelas) {
    const safeKelas = kelas.replace(/\s+/g, '-');
    document.querySelectorAll('.notif-chk-' + safeKelas).forEach(el => {
        el.checked = cb.checked;
    });
};

window.toggleNotifCard = function() {
    const body = document.getElementById('body-notif-ortu');
    const cover = document.getElementById('notif-cover-content');
    const icon = document.getElementById('notif-icon');
    const btn = document.getElementById('btn-notif-card');
    
    body.classList.toggle('hidden');
    
    if (body.classList.contains('hidden')) {
        cover.className = 'flex flex-col py-10 items-center justify-center transition-all duration-500 w-full';
        icon.className = 'fa-solid fa-bullhorn text-7xl mb-4 transition-all duration-500 transform group-hover:scale-110 drop-shadow-lg';
        btn.className = 'w-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-5 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md border-b-4 border-purple-700 cursor-pointer group';
    } else {
        cover.className = 'flex flex-row items-center justify-start transition-all duration-500 w-full';
        icon.className = 'fa-solid fa-bullhorn text-xl mr-3 transition-all duration-500 text-purple-600';
        btn.className = 'w-full bg-purple-100 hover:bg-purple-200 text-purple-900 p-4 rounded-t-2xl flex items-center justify-start transition-all duration-500 border-b border-purple-200 cursor-pointer';
    }
};

window.toggleNotifOrtuTipe = function() {
    const tipe = document.getElementById('notif-ortu-tipe').value;
    const area = document.getElementById('notif-ortu-pembelian-area');
    const lbl = document.getElementById('lbl-notif-judul');
    if (tipe === 'Pembelian') {
        area.classList.remove('hidden');
        lbl.innerText = 'Keterangan Tambahan';
        document.getElementById('notif-ortu-judul').placeholder = 'Opsional, misal: Harap segera disetujui...';
        document.getElementById('notif-ortu-judul').required = false;
    } else {
        area.classList.add('hidden');
        lbl.innerText = 'Judul Pengumuman';
        document.getElementById('notif-ortu-judul').placeholder = 'Cth: Libur Semester Ganjil...';
        document.getElementById('notif-ortu-judul').required = true;
    }
};

window.kirimNotifOrtu = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const ori = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengirim...';
    btn.disabled = true;

    const checkedTargets = Array.from(document.querySelectorAll('input[name="notif-target-chk"]:checked')).map(cb => cb.value);
    
    if (checkedTargets.length === 0) {
        alert("Pilih minimal 1 siswa target!");
        btn.innerHTML = ori; btn.disabled = false; return;
    }

    const tipe = document.getElementById('notif-ortu-tipe').value;
    const expiredAt = document.getElementById('notif-ortu-expired').value;
    
    let baseData = {
        tipe: tipe,
        expiredAt: expiredAt,
        pengirim: window.currentUser.nama, 
        createdAt: new Date().toISOString()
    };

    if (tipe === 'Pembelian') {
        const namaItem = document.getElementById('notif-ortu-item').value;
        const nominalRaw = document.getElementById('notif-ortu-nominal').value;
        if (!namaItem || !nominalRaw) {
            alert("Nama Item dan Nominal wajib diisi untuk tipe Pembelian!");
            btn.innerHTML = ori; btn.disabled = false; return;
        }
        baseData.namaItem = namaItem;
        baseData.nominal = Number(nominalRaw.replace(/[^0-9]/g, ''));
        baseData.judul = document.getElementById('notif-ortu-judul').value || `Persetujuan Pembelian: ${namaItem}`;
        baseData.isi = document.getElementById('notif-ortu-isi').value;
        baseData.status = 'Pending';
    } else {
        baseData.judul = document.getElementById('notif-ortu-judul').value;
        baseData.isi = document.getElementById('notif-ortu-isi').value;
    }

    try {
        for (const val of checkedTargets) {
            const [idSiswa, namaSiswa] = val.split('|');
            await addDoc(collection(db, "NotifikasiOrtu"), { ...baseData, idSiswa, namaSiswa });
        }
        alert(`Berhasil! Pemberitahuan / Tagihan telah dikirim ke ${checkedTargets.length} wali murid.`);
        document.getElementById('form-notif-ortu').reset();
        window.toggleNotifOrtuTipe();
        document.querySelectorAll('input[name="notif-target-chk"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[type="checkbox"][onchange^="window.toggleKelasNotif"]').forEach(cb => cb.checked = false);
    } catch(err) { 
        alert("Gagal mengirim pemberitahuan: " + err.message); 
    }
    
    btn.innerHTML = ori; btn.disabled = false;
};

window.loadDashboardAdvancedWidgets = async function() {
    const dDate = new Date();
    const startOfMonth = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-01`;

    const pendingEl = document.getElementById('dasbor-pending-list');
    if(pendingEl) {
        try {
            const snap = await getDocs(query(collection(db, "Cuti"), where("status", "==", "Pending")));
            let html = '';
            if(snap.empty) {
                html = `<div class="p-6 text-center text-slate-400 font-bold bg-slate-50 rounded-xl mt-2"><i class="fa-solid fa-check-double text-3xl mb-2 text-emerald-400 block"></i>Bersih! Tidak ada antrean.</div>`;
            } else {
                let items = []; snap.forEach(d => items.push({id: d.id, ...d.data()}));
                html = items.slice(0,4).map(i => `
                <div class="flex justify-between items-center p-3 border-b border-orange-100 last:border-0 hover:bg-orange-50 transition rounded-lg">
                    <div><h4 class="text-xs font-black text-slate-700">${i.pengaju}</h4><p class="text-[9px] font-bold text-slate-500">${i.jenis}</p></div>
                    <button onclick="window.navigate('absensi')" class="bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition">Cek</button>
                </div>`).join('');
            }
            pendingEl.innerHTML = html;
        } catch(e) { pendingEl.innerHTML = '<div class="text-xs text-red-500">Gagal memuat.</div>'; }
    }

    const keuEl = document.getElementById('dasbor-keuangan-widget');
    if(keuEl) {
        try {
            const snapKas = await getDocs(query(collection(db, "BukuKas"), where("tanggal", ">=", startOfMonth)));
            let inTotal = 0; let outTotal = 0;
            snapKas.forEach(d => {
                let k = d.data();
                if(k.jenis === 'Pemasukan') inTotal += Number(k.nominal||0);
                else if(k.jenis === 'Pengeluaran') outTotal += Number(k.nominal||0);
            });
            const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
            keuEl.innerHTML = `
                <div class="flex justify-between items-center mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition cursor-pointer" onclick="window.navigate('keuangan')">
                    <div class="flex items-center"><i class="fa-solid fa-arrow-trend-up text-emerald-500 text-2xl mr-3"></i><div><p class="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">Pemasukan Bulan Ini</p><h4 class="text-sm font-black text-emerald-900">${fmt(inTotal)}</h4></div></div>
                </div>
                <div class="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100 hover:bg-rose-100 transition cursor-pointer" onclick="window.navigate('keuangan')">
                    <div class="flex items-center"><i class="fa-solid fa-arrow-trend-down text-rose-500 text-2xl mr-3"></i><div><p class="text-[9px] font-black text-rose-700 uppercase tracking-wider mb-0.5">Pengeluaran Bulan Ini</p><h4 class="text-sm font-black text-rose-900">${fmt(outTotal)}</h4></div></div>
                </div>
            `;
        } catch(e) { keuEl.innerHTML = '<div class="text-xs text-red-500 p-3">Gagal sinkron.</div>'; }
    }

    const disEl = document.getElementById('dasbor-disiplin-list');
    if(disEl) {
        try {
            const snap = await getDocs(query(collection(db, "Absensi"), where("tanggal", ">=", startOfMonth)));
            let scores = {};
            snap.forEach(d => {
                let a = d.data();
                if(a.terlambat === 0 && (a.status === 'Hadir Harian' || a.status === 'Cek In')) {
                    if(!scores[a.namaGuru]) scores[a.namaGuru] = 0;
                    scores[a.namaGuru]++;
                }
            });
            let sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]).slice(0,3);
            let html = '';
            if(sorted.length === 0) {
                html = '<div class="text-xs text-slate-400 text-center p-6"><i class="fa-solid fa-ranking-star text-3xl mb-2 opacity-50 block"></i>Belum ada rekam jejak bulan ini.</div>';
            } else {
                let medals = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
                html = sorted.map((s,i) => `
                <div class="flex justify-between items-center p-3 border-b border-blue-100 last:border-0 hover:bg-blue-50 transition">
                    <div class="flex items-center"><i class="fa-solid fa-medal ${medals[i]||'text-blue-300'} text-2xl mr-3 drop-shadow-sm"></i><h4 class="text-xs font-black text-slate-700">${s[0]}</h4></div>
                    <span class="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded shadow-sm">${s[1]}x Tepat Waktu</span>
                </div>`).join('');
            }
            disEl.innerHTML = html;
        } catch(e) { disEl.innerHTML = '<div class="text-xs text-red-500 p-3">Gagal memuat.</div>'; }
    }
};

window.loadDashboardSantriWidgets = async function(loadTahfidz, loadAsrama) {
    const dDate = new Date();
    const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`;

    if (loadTahfidz) {
        const tahfidzEl = document.getElementById('dasbor-tahfidz-list');
        if (tahfidzEl) {
            try {
                const snap = await getDocs(query(collection(db, "Tahfidz"), where("tanggal", "==", todayISO), limit(10)));
                let items = []; snap.forEach(d => items.push(d.data()));
                if(items.length === 0) {
                    tahfidzEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold"><i class="fa-solid fa-mug-hot text-3xl mb-2 block opacity-50"></i>Belum ada setoran hari ini.</div>`;
                } else {
                    tahfidzEl.innerHTML = items.map(i => {
                        let badge = i.ziyadah ? 'Ziyadah' : (i.murajaah ? 'Murajaah' : '');
                        let col = i.ziyadah ? 'teal' : 'amber';
                        return `
                        <div class="flex justify-between items-center p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition rounded-lg">
                            <div><h4 class="text-xs font-black text-slate-700">${i.namaSiswa}</h4><p class="text-[9px] font-bold text-slate-500">Musyrif: ${i.guru}</p></div>
                            <span class="bg-${col}-100 text-${col}-700 px-2 py-0.5 rounded text-[9px] font-black">${badge}</span>
                        </div>`;
                    }).join('');
                }
            } catch(e) { tahfidzEl.innerHTML = '<div class="text-xs text-red-500 p-3">Gagal memuat.</div>'; }
        }
    }

    if (loadAsrama) {
        const asramaEl = document.getElementById('dasbor-asrama-list');
        if (asramaEl) {
            try {
                const snap = await getDocs(query(collection(db, "Kepengasuhan"), where("tanggal", "==", todayISO), limit(10)));
                let items = []; snap.forEach(d => items.push(d.data()));
                if(items.length === 0) {
                    asramaEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-bold"><i class="fa-solid fa-mug-hot text-3xl mb-2 block opacity-50"></i>Asrama kondusif hari ini.</div>`;
                } else {
                    asramaEl.innerHTML = items.map(i => {
                        let col = i.kategori === 'Pelanggaran' ? 'rose' : (i.kategori === 'Prestasi' ? 'emerald' : 'blue');
                        return `
                        <div class="flex justify-between items-center p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition rounded-lg">
                            <div class="truncate pr-2"><h4 class="text-xs font-black text-slate-700 truncate">${i.namaSiswa}</h4><p class="text-[9px] font-bold text-slate-500 truncate">${i.bentuk || i.statusRutin}</p></div>
                            <span class="bg-${col}-100 text-${col}-700 px-2 py-0.5 rounded text-[9px] font-black whitespace-nowrap">${i.kategori}</span>
                        </div>`;
                    }).join('');
                }
            } catch(e) { asramaEl.innerHTML = '<div class="text-xs text-red-500 p-3">Gagal memuat.</div>'; }
        }
    }
};

window.loadTunggakanDasbor = async function() {
    const listEl = document.getElementById('dasbor-tunggakan-list');
    if(!listEl) return;
    try {
        const snap = await getDocs(collection(db, "PembayaranSPP"));
        let sppList = []; snap.forEach(d => sppList.push(d.data()));
        
        let arrears = [];
        const dDate = new Date();
        const curM = dDate.getMonth() + 1;
        const startY = curM < 7 ? dDate.getFullYear() - 1 : dDate.getFullYear();
        let expected = []; let tempY = startY; let tempM = 7;
        while(true) {
            expected.push(`${tempY}-${String(tempM).padStart(2,'0')}`);
            if(tempY === dDate.getFullYear() && tempM === curM) break;
            tempM++; if(tempM>12){ tempM=1; tempY++; }
        }

        window.appState.anak.filter(a => a.status !== 'Lulus').forEach(a => {
            let paid = sppList.filter(s => s.idSiswa === a.id && !s.isCicilan).map(s => s.bulanSpp);
            let nunggak = expected.filter(m => !paid.includes(m)).length;
            if(nunggak > 0) arrears.push({ nama: a.nama, kelas: a.kelas, bln: nunggak });
        });

        arrears.sort((a,b) => b.bln - a.bln);
        let html = arrears.slice(0, 6).map(a => `<div class="flex justify-between items-center p-3 border-b border-rose-100 hover:bg-rose-50 transition rounded-lg"><div class="flex items-center"><div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex justify-center items-center font-black text-xs mr-3 border border-rose-200">${a.nama.charAt(0)}</div><div><h4 class="text-sm font-black text-slate-700 leading-tight">${a.nama}</h4><p class="text-[10px] font-bold text-slate-500">Kelas ${a.kelas||'-'}</p></div></div><span class="bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-black shadow-sm">${a.bln} Bln</span></div>`).join('');
        
        if(!html) html = `<div class="p-8 text-center text-emerald-500 font-bold bg-emerald-50 rounded-xl border border-emerald-100"><i class="fa-solid fa-check-circle text-4xl mb-3 block opacity-50"></i>Luar biasa!<br>Tidak ada siswa yang menunggak.</div>`;
        listEl.innerHTML = html;
    } catch(e) { listEl.innerHTML = '<div class="p-4 text-center text-red-500 font-bold">Gagal memuat data tunggakan.</div>'; }
};

window.loadHadirPegawaiDasbor = async function() {
    const el = document.getElementById('dasbor-hadir-pegawai-list');
    if(!el) return;
    
    const dDate = new Date();
    const todayISO = `${dDate.getFullYear()}-${String(dDate.getMonth()+1).padStart(2,'0')}-${String(dDate.getDate()).padStart(2,'0')}`;
    
    try {
        const snap = await getDocs(query(collection(db, "Absensi"), where("tanggal", "==", todayISO)));
        let absenList = []; snap.forEach(d => absenList.push(d.data()));
        
        let hadirUnik = new Set();
        absenList.forEach(a => { if(a.tipe === '1x' || a.status === 'Cek In') hadirUnik.add(a.idGuru); });

        const totalPegawai = window.appState.pegawai.length;
        const persen = totalPegawai > 0 ? Math.round((hadirUnik.size / totalPegawai) * 100) : 0;

        el.innerHTML = `
            <div class="flex items-center justify-between mb-4 border-b border-emerald-100 pb-4">
                <div>
                    <h4 class="text-3xl font-black text-emerald-600 tracking-tighter">${hadirUnik.size} <span class="text-sm font-bold text-emerald-400">/ ${totalPegawai} Hadir</span></h4>
                    <p class="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Status Kehadiran Hari Ini</p>
                </div>
                <div class="w-16 h-16 rounded-full border-4 border-emerald-100 flex items-center justify-center relative bg-white shadow-sm">
                    <svg class="absolute inset-0 w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" fill="transparent" class="text-emerald-500" stroke-dasharray="175.9" stroke-dashoffset="${175.9 - (175.9 * persen / 100)}"></circle></svg>
                    <span class="font-black text-emerald-700 text-xs">${persen}%</span>
                </div>
            </div>
            <div class="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 max-h-40 overflow-y-auto custom-scrollbar">
                ${Array.from(hadirUnik).map(id => {
                    const p = window.appState.pegawai.find(x => x.id === id); if(!p) return '';
                    return `<div class="flex items-center py-2 border-b border-emerald-100/50 last:border-0"><div class="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-sm"></div><span class="text-xs font-bold text-emerald-900">${p.nama}</span></div>`;
                }).join('') || '<p class="text-xs text-emerald-600 font-bold text-center py-4 opacity-70">Belum ada rekam kehadiran.</p>'}
            </div>
        `;
    } catch(e) { el.innerHTML = '<p class="text-xs text-red-500 font-bold text-center">Gagal memuat absensi.</p>'; }
};

window.loadTugasDasbor = function() {
    const el = document.getElementById('dasbor-tugas-stats');
    if(!el) return;
    const tugas = window.appState.tugas || [];
    const currentUser = window.currentUser || {};
    const myTasks = tugas.filter(t => t.idPenerima === currentUser.id && t.status !== 'Selesai');
    
    if (myTasks.length > 0) {
        el.innerHTML = `Anda memiliki <span class="font-black text-amber-800 text-sm bg-amber-200 px-1.5 py-0.5 rounded shadow-sm">${myTasks.length} tugas</span> aktif.`;
    } else {
        el.innerHTML = `Luar biasa! Tidak ada tugas aktif untuk Anda.`;
    }
};

window.tempDasborConfigAll = {};
window.tempDasborJabatan = 'Global';

window.bukaModalAturDasbor = function() {
    const lembaga = window.appState.lembaga[0] || {};
    window.tempDasborConfigAll = lembaga.dashboardConfig ? JSON.parse(JSON.stringify(lembaga.dashboardConfig)) : {};
    
    if (typeof window.tempDasborConfigAll.pegawai === 'boolean') {
        window.tempDasborConfigAll = { 'Global': { ...window.tempDasborConfigAll } };
    }

    const daftarJabatan = lembaga.daftarJabatan ? lembaga.daftarJabatan.split(',').map(j => j.trim()).filter(j => j) : [];
    let optJabatan = `<option value="Global">Pengaturan Global (Super Admin & Pegawai Tanpa Jabatan)</option>`;
    daftarJabatan.forEach(j => {
        optJabatan += `<option value="${j}">Khusus Jabatan: ${j}</option>`;
    });

    let modal = document.getElementById('modal-atur-dasbor');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'modal-atur-dasbor';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 md:p-8 flex flex-col max-h-[90vh] border-t-4 border-slate-800">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
                <div><h3 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-sliders text-slate-600 mr-2"></i> Konfigurasi Dasbor Pegawai</h3><p class="text-xs font-bold text-slate-500 mt-1">Pilih Jabatan, lalu centang Card Widget yang ingin ditampilkan pada akun mereka.</p></div>
                <button onclick="document.getElementById('modal-atur-dasbor').remove()" class="text-slate-400 hover:text-red-500 text-3xl font-bold bg-slate-100 hover:bg-red-50 w-10 h-10 rounded-full flex items-center justify-center transition"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Pilih Jabatan Target:</label>
                <select onchange="window.renderCheckboxesAturDasbor(this.value)" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-indigo-500 text-indigo-700 bg-white cursor-pointer shadow-sm">
                    ${optJabatan}
                </select>
            </div>

            <div id="dasbor-cb-container" class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            </div>
            
            <div class="mt-6 border-t pt-4 flex justify-end">
                <button onclick="window.simpanAturDasbor()" class="bg-slate-800 hover:bg-slate-900 text-white font-black px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-1 w-full md:w-auto"><i class="fa-solid fa-save mr-2"></i> Simpan Konfigurasi</button>
            </div>
        </div>`;
    
    window.renderCheckboxesAturDasbor('Global');
};

window.renderCheckboxesAturDasbor = function(jabatan) {
    window.tempDasborJabatan = jabatan;
    const defConfig = { 
        pegawai: true, siswa: true, asrama: true, token: true, 
        hadirPegawai: true, hadirKelas: true, kalender: true, pemberitahuan: true, 
        tunggakan: true, tugas: true, keuangan: true, pending: true, disiplin: true,
        trenTahfidz: true, trenKepengasuhan: true, notifOrtu: true
    };
    
    let conf = window.tempDasborConfigAll[jabatan] || defConfig;

    // --- GEMBOK MODULAR DASHBOARD WIDGET ---
    const cb = (key, label, desc, color, reqFeature) => {
        let isLocked = reqFeature ? !window.cekLisensi(reqFeature) : false;
        return `
        <label class="flex items-start p-4 border-2 ${isLocked ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' : `border-slate-100 bg-white cursor-pointer hover:bg-${color}-50 hover:border-${color}-200`} rounded-xl transition group shadow-sm">
            <input type="checkbox" class="mt-1 w-5 h-5 ${isLocked ? 'text-slate-400' : `text-${color}-600 accent-${color}-600`} rounded dasbor-cfg-chk" data-key="${key}" ${conf[key] && !isLocked ? 'checked' : ''} ${isLocked ? 'disabled' : ''}>
            <div class="ml-3 w-full">
                <span class="font-black ${isLocked ? 'text-slate-500' : `text-slate-800 group-hover:text-${color}-700`} block text-sm flex justify-between">${label} ${isLocked ? '<i class="fa-solid fa-lock text-amber-500 text-xs" title="Tersegel Premium"></i>' : ''}</span>
                <span class="text-[10px] font-bold text-slate-400 leading-tight mt-0.5 block">${desc}</span>
            </div>
        </label>`;
    };

    const container = document.getElementById('dasbor-cb-container');
    if (container) {
        container.innerHTML = `
            ${cb('pegawai', 'Total Pegawai', 'Statistik jumlah seluruh pegawai aktif.', 'blue', null)}
            ${cb('siswa', 'Total Siswa', 'Statistik jumlah anak didik / siswa aktif.', 'orange', null)}
            ${cb('asrama', 'Kapasitas Asrama', 'Statistik ketersediaan & sisa kuota ranjang asrama.', 'teal', null)}
            ${cb('token', 'Token Otorisasi', 'Akses PIN rahasia penghapusan data.', 'red', null)}
            
            ${cb('keuangan', 'Ringkasan Kas', 'Arus pemasukan & pengeluaran bulan ini.', 'emerald', null)}
            ${cb('pending', 'Persetujuan Tertunda', 'Daftar pengajuan izin/cuti yang butuh ACC.', 'orange', null)}
            ${cb('disiplin', 'Peringkat Disiplin', 'Top 3 Pegawai paling rajin & tepat waktu.', 'blue', null)}
            
            ${cb('pemberitahuan', 'Papan Pemberitahuan', 'Sistem pengumuman realtime antar pegawai.', 'indigo', 'tugas_pegawai')}
            ${cb('tugas', 'Tugas Pegawai', 'Modul manajemen tugas harian.', 'amber', 'tugas_pegawai')}
            ${cb('kalender', 'Kalender Bulan Ini', 'Cuplikan agenda dan event bulan berjalan.', 'teal', null)}
            ${cb('hadirPegawai', 'Kehadiran Pegawai', 'Persentase pegawai yang sudah absen hari ini.', 'emerald', null)}
            ${cb('hadirKelas', 'Kehadiran Kelas', 'Pantauan KBM, kehadiran guru pengajar & siswa.', 'blue', null)}
            ${cb('tunggakan', 'Siswa Menunggak', 'Daftar top siswa menunggak tagihan terlama.', 'rose', 'keuangan_plus')}
            ${cb('trenTahfidz', 'Tren Tahfidz', 'Ringkasan setoran hafalan harian.', 'teal', 'tahfidz_plus')}
            ${cb('trenKepengasuhan', 'Jurnal Asrama', 'Ringkasan jurnal kepengasuhan harian.', 'emerald', 'tahfidz_plus')}
            ${cb('notifOrtu', 'Kirim Notif Ortu', 'Kirim pengumuman/tagihan ke portal wali murid.', 'purple', 'ortu_portal')}
        `;
    }
};

window.simpanAturDasbor = async function() {
    const idLembaga = window.appState.lembaga[0]?.id;
    if(!idLembaga) return alert("Data lembaga tidak ditemukan!");
    const btn = document.querySelector('#modal-atur-dasbor button.bg-slate-800');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;
    
    const newConfig = {};
    document.querySelectorAll('.dasbor-cfg-chk').forEach(chk => {
        newConfig[chk.dataset.key] = chk.checked;
    });

    let finalConfigToSave = { ...window.tempDasborConfigAll };
    if (typeof finalConfigToSave.pegawai === 'boolean') {
        const oldConf = {...finalConfigToSave};
        finalConfigToSave = { 'Global': oldConf };
    }
    
    finalConfigToSave[window.tempDasborJabatan] = newConfig;

    try {
        await updateDoc(doc(db, "Lembaga", idLembaga), { dashboardConfig: finalConfigToSave });
        window.appState.lembaga[0].dashboardConfig = finalConfigToSave;
        alert("Konfigurasi Dasbor untuk " + window.tempDasborJabatan + " berhasil disimpan!");
        document.getElementById('modal-atur-dasbor').remove();
        window.navigate('dashboard');
    } catch(e) { alert("Gagal menyimpan konfigurasi."); btn.innerHTML = 'Simpan Konfigurasi'; btn.disabled = false; }
};

window.navigate = function(page) {
    document.body.classList.add('app-open');
    window.currentPage = page;
    window.renderSidebarMenu(); 

    const currentUser = getFreshUser();
    const lembaga = window.appState.lembaga[0] || {};
    
    const isSuperAdmin = currentUser.hakAkses === 'Super Admin';
    const isAdministrator = currentUser.hakAkses === 'Administrator';
    const isSA_Admin = isSuperAdmin || isAdministrator;
    
    const isOpTU = currentUser.hakAkses === 'Operator/TU';
    const isKepala = (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala'));
    const isHead = isSA_Admin || isKepala || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('ketua'));
    
    const canPostAnnounce = isSA_Admin || isOpTU || isHead;
    const wewenangMatrix = lembaga.wewenangMatrix || {};
    
    let hasAccess = false;
    
    if (isSA_Admin || page === 'dashboard' || page === 'profil') {
        hasAccess = true;
    } else if (page === 'ppdb' && isKepala) {
        hasAccess = true; 
    } else {
        const userJabatans = (currentUser.detailJabatan || []).map(j => j.namaJabatan);
        userJabatans.forEach(jab => {
            if (wewenangMatrix[jab] && wewenangMatrix[jab].includes(page)) hasAccess = true;
        });
    }

    if (!hasAccess) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang untuk membuka halaman ini.");
        window.kembaliKeStart();
        return;
    }

    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.innerText = page.replace('-', ' ').toUpperCase();
    const container = document.getElementById('view-container');
    
    if (page === 'tugas' && !window.cekLisensi('tugas_pegawai')) return container.innerHTML = window.renderLockedPremiumHTML('Manajemen Tugas Pegawai (Kanban)');
    if (page === 'ppdb' && !window.cekLisensi('ppdb_online')) return container.innerHTML = window.renderLockedPremiumHTML('Sistem PPDB Online & QRIS');
    if (page === 'kalender' && !window.cekLisensi('kalender_plus')) return container.innerHTML = window.renderLockedPremiumHTML('Kalender Pendidikan Terpadu');
    if (page === 'lisensi' && !isSuperAdmin) { alert("Ditolak!"); window.kembaliKeStart(); return; }

    if (page === 'dashboard') {
        let savedConfig = lembaga.dashboardConfig || {};
        if (typeof savedConfig.pegawai === 'boolean') savedConfig = { 'Global': savedConfig };

        let config = { pegawai: false, siswa: false, asrama: false, token: false, hadirPegawai: false, hadirKelas: false, kalender: false, pemberitahuan: false, tunggakan: false, tugas: false, keuangan: false, pending: false, disiplin: false, trenTahfidz: false, trenKepengasuhan: false, notifOrtu: false };
        const defConfig = { pegawai: true, siswa: true, asrama: true, token: true, hadirPegawai: true, hadirKelas: true, kalender: true, pemberitahuan: true, tunggakan: true, tugas: true, keuangan: true, pending: true, disiplin: true, trenTahfidz: true, trenKepengasuhan: true, notifOrtu: true };

        const userJabs = (currentUser.detailJabatan || []).map(j => j.namaJabatan);
        
        // Administrator & SA melihat Global Dasbor jika belum punya konfigurasi spesifik
        if (isSA_Admin && userJabs.length === 0) { Object.assign(config, savedConfig['Global'] || defConfig); } 
        else if (userJabs.length === 0) { Object.assign(config, savedConfig['Global'] || defConfig); } 
        else {
            userJabs.forEach(jab => {
                const c = savedConfig[jab] || savedConfig['Global'] || defConfig;
                Object.keys(config).forEach(k => { if (c[k]) config[k] = true; });
            });
        }

        let html = `
        <div class="flex justify-between items-center mb-4 md:mb-6">
            <h2 class="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Ringkasan Sistem</h2>
            ${isSA_Admin ? `<button onclick="window.bukaModalAturDasbor()" class="bg-slate-800 hover:bg-slate-900 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black shadow-lg transition flex items-center transform hover:-translate-y-1"><i class="fa-solid fa-sliders md:mr-2"></i> <span class="hidden md:inline">Atur Dasbor</span></button>` : ''}
        </div>
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 mb-6">
        `;

        if (config.pegawai) {
            html += `
            <div class="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 md:p-6 rounded-2xl shadow-lg border border-indigo-400 flex items-center justify-start gap-3 md:gap-4 text-white transform hover:scale-[1.02] transition h-full text-left">
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-2xl shrink-0 backdrop-blur-sm"><i class="fa-solid fa-user-tie"></i></div>
                <div class="overflow-hidden flex-1">
                    <p class="text-[9px] md:text-[10px] font-black text-indigo-100 uppercase tracking-wider mb-0.5 md:mb-1 truncate">Pegawai</p>
                    <h3 class="text-xl md:text-3xl font-black truncate">${(window.appState.pegawai || []).length} <span class="text-[9px] md:text-sm font-bold opacity-80">Org</span></h3>
                </div>
            </div>`;
        }
        if (config.siswa) {
            html += `
            <div class="bg-gradient-to-br from-orange-400 to-rose-500 p-3 md:p-6 rounded-2xl shadow-lg border border-rose-400 flex items-center justify-start gap-3 md:gap-4 text-white transform hover:scale-[1.02] transition h-full text-left">
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-2xl shrink-0 backdrop-blur-sm"><i class="fa-solid fa-graduation-cap"></i></div>
                <div class="overflow-hidden flex-1">
                    <p class="text-[9px] md:text-[10px] font-black text-rose-100 uppercase tracking-wider mb-0.5 md:mb-1 truncate">Siswa</p>
                    <h3 class="text-xl md:text-3xl font-black truncate">${(window.appState.anak || []).filter(a=>a.statusAkademik!=='Lulus').length} <span class="text-[9px] md:text-sm font-bold opacity-80">Anak</span></h3>
                </div>
            </div>`;
        }
        if (config.asrama) {
            const totalAsrama = (window.appState.anak || []).filter(a=>a.asrama==='Ya' && a.statusAkademik!=='Lulus').length;
            const kapasitas = Number(lembaga.asrama || 0);
            html += `
            <div class="bg-gradient-to-br from-emerald-400 to-teal-500 p-3 md:p-6 rounded-2xl shadow-lg border border-teal-400 flex items-center justify-start gap-3 md:gap-4 text-white transform hover:scale-[1.02] transition h-full text-left">
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-2xl shrink-0 backdrop-blur-sm"><i class="fa-solid fa-bed"></i></div>
                <div class="overflow-hidden flex-1">
                    <p class="text-[9px] md:text-[10px] font-black text-teal-100 uppercase tracking-wider mb-0.5 md:mb-1 truncate">Kapasitas Asrama</p>
                    <h3 class="text-xl md:text-3xl font-black truncate">${totalAsrama} <span class="text-[9px] md:text-sm font-bold opacity-80">/ ${kapasitas||'-'}</span></h3>
                </div>
            </div>`;
        }
        if (config.token && isHead) {
            html += `
            <div class="bg-gradient-to-br from-red-600 to-red-800 p-3 md:p-6 rounded-2xl shadow-lg border border-red-500 flex items-center justify-start gap-3 md:gap-4 text-white transform hover:scale-[1.02] transition h-full text-left relative overflow-hidden group cursor-pointer">
                <div class="absolute inset-0 flex justify-end items-center opacity-10 pointer-events-none -mr-4"><i class="fa-solid fa-shield-halved text-6xl md:text-8xl group-hover:scale-110 transition-transform"></i></div>
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-2xl shrink-0 backdrop-blur-sm relative z-10"><i class="fa-solid fa-key"></i></div>
                <div class="overflow-hidden flex-1 relative z-10">
                    <p class="text-[9px] md:text-[10px] font-black text-red-100 uppercase tracking-wider mb-0.5 md:mb-1 truncate">Token PIN</p>
                    <div class="bg-white text-red-700 font-black text-sm md:text-xl tracking-widest py-0.5 md:py-1 px-2 rounded md:rounded-lg shadow-inner mb-0.5 md:mb-1 inline-block" id="dashboard-token-display">------</div>
                    <p class="text-red-200 text-[7px] md:text-[9px] font-bold leading-tight truncate" id="token-status-text">Menunggu...</p>
                </div>
            </div>`;
        }
        html += `</div><div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6"><div class="xl:col-span-1 flex flex-col gap-6">`;
        
        if (config.keuangan) {
            html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 class="font-black text-slate-700 text-sm uppercase tracking-wider mb-4 flex items-center"><i class="fa-solid fa-wallet text-emerald-500 mr-2"></i> Ringkasan Kas Yayasan</h3>
                <div id="dasbor-keuangan-widget"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat Data...</div></div>
            </div>`;
        }
        if (config.pending) {
            html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col">
                <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-orange-50 rounded-t-2xl">
                    <h3 class="font-black text-orange-800 text-sm uppercase tracking-wider"><i class="fa-solid fa-file-signature mr-2"></i> Butuh ACC Tertunda</h3>
                </div>
                <div class="flex-1 p-2" id="dasbor-pending-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Mengecek...</div></div>
            </div>`;
        }
        
        if (config.pemberitahuan) {
            if (!window.cekLisensi('tugas_pegawai')) {
                html += `<div class="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-3"></i><h4 class="font-bold text-slate-500">Papan Pengumuman</h4><span class="text-[10px] text-amber-500 font-bold mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
            } else {
                html += `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                    <div class="bg-indigo-600 text-white p-4 rounded-t-2xl flex justify-between items-center shrink-0">
                        <h3 class="font-black text-sm uppercase tracking-wider"><i class="fa-solid fa-bullhorn mr-2"></i> Papan Pengumuman</h3>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50" id="list-pemberitahuan-rtdb">
                        <div class="text-center p-8 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block"></i>Memuat realtime...</div>
                    </div>
                    ${canPostAnnounce ? `
                    <div class="p-4 border-t border-slate-200 bg-white rounded-b-2xl shrink-0">
                        <form id="form-pemberitahuan" onsubmit="window.kirimPemberitahuanRTDB(event)">
                            <input type="text" id="input-judul-pemberitahuan" placeholder="Judul Singkat..." class="w-full border border-slate-200 p-2 rounded-lg text-xs font-bold mb-2 focus:outline-indigo-500 bg-slate-50" required>
                            <textarea id="input-isi-pemberitahuan" rows="2" placeholder="Tulis pengumuman..." class="w-full border border-slate-200 p-2 rounded-lg text-xs font-medium mb-2 focus:outline-indigo-500 bg-slate-50" required></textarea>
                            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 rounded-lg shadow-sm transition"><i class="fa-solid fa-paper-plane mr-1"></i> Siarkan (Realtime)</button>
                        </form>
                    </div>` : ''}
                </div>`;
            }
        }

        if (config.notifOrtu && canPostAnnounce) {
            if (!window.cekLisensi('ortu_portal')) {
                html += `<div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center mb-6"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-3"></i><h4 class="font-bold text-slate-500">Notifikasi Portal Ortu</h4><span class="text-[10px] text-amber-500 font-bold mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
            } else {
                let anakByKelas = {};
                (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus').forEach(a => {
                    const kls = a.kelas || 'Tanpa Kelas';
                    if(!anakByKelas[kls]) anakByKelas[kls] = [];
                    anakByKelas[kls].push(a);
                });
                let chkSiswaHTML = '';
                Object.keys(anakByKelas).sort().forEach(kls => {
                    const arr = anakByKelas[kls];
                    const safeKls = kls.replace(/\s+/g, '-');
                    chkSiswaHTML += `
                    <div class="mb-2 border border-purple-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <label class="flex items-center bg-purple-100 p-2.5 cursor-pointer hover:bg-purple-200 transition">
                            <input type="checkbox" onchange="window.toggleKelasNotif(this, '${safeKls}')" class="w-4 h-4 text-purple-600 rounded mr-3">
                            <span class="font-black text-xs text-purple-900 uppercase tracking-wider">Kelas ${kls} <span class="bg-white text-purple-600 px-1.5 py-0.5 rounded text-[9px] ml-1">${arr.length} Anak</span></span>
                        </label>
                        <div class="p-2 bg-white max-h-32 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-1">
                            ${arr.map(a => `
                            <label class="flex items-center cursor-pointer hover:bg-purple-50 p-1.5 rounded transition">
                                <input type="checkbox" name="notif-target-chk" value="${a.id}|${a.nama}" class="w-3.5 h-3.5 text-purple-600 rounded mr-2 notif-chk-${safeKls}">
                                <span class="text-xs font-bold text-slate-700">${a.nama}</span>
                            </label>
                            `).join('')}
                        </div>
                    </div>`;
                });

                html += `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col mb-6 transition-all duration-500">
                    <button type="button" id="btn-notif-card" onclick="window.toggleNotifCard()" class="w-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-5 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md border-b-4 border-purple-700 cursor-pointer group">
                        <div id="notif-cover-content" class="flex flex-col py-10 items-center justify-center transition-all duration-500 w-full">
                            <i id="notif-icon" class="fa-solid fa-bullhorn text-7xl mb-4 transition-all duration-500 transform group-hover:scale-110 drop-shadow-lg"></i>
                            <h3 class="font-black text-sm uppercase tracking-wider text-center">Kirim Pemberitahuan / Tagihan Ortu</h3>
                        </div>
                    </button>
                    <div id="body-notif-ortu" class="hidden p-5 md:p-6 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                        <form id="form-notif-ortu" onsubmit="window.kirimNotifOrtu(event)">
                            <label class="text-[10px] font-bold text-slate-500 uppercase block mb-2">Pilih Target Siswa (Bisa Berdasarkan Kelas)</label>
                            <div class="mb-5 bg-white p-3 rounded-xl border border-slate-200 max-h-64 overflow-y-auto custom-scrollbar shadow-inner">
                                ${chkSiswaHTML || '<p class="text-xs font-bold text-slate-400 text-center py-4">Belum ada siswa terdaftar.</p>'}
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipe Pemberitahuan</label>
                                    <select id="notif-ortu-tipe" onchange="window.toggleNotifOrtuTipe()" class="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-bold focus:outline-purple-500 bg-white cursor-pointer" required>
                                        <option value="Informasi">Informasi / Pengumuman Biasa</option>
                                        <option value="Pembelian">Tagihan Pembelian (Butuh Persetujuan)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1" id="lbl-notif-judul">Judul Pengumuman</label>
                                    <input type="text" id="notif-ortu-judul" placeholder="Cth: Libur Semester Ganjil..." class="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-bold focus:outline-purple-500 bg-white shadow-sm" required>
                                </div>
                            </div>
                            <div id="notif-ortu-pembelian-area" class="hidden mb-4 bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-inner flex flex-col md:flex-row gap-4 animate-fade-in">
                                <div class="flex-1">
                                    <label class="text-[10px] font-bold text-purple-700 uppercase block mb-1">Nama Item Pembelian</label>
                                    <input type="text" id="notif-ortu-item" placeholder="Cth: Buku Paket Semester 2" class="w-full border border-purple-300 p-3 rounded-lg text-xs font-bold focus:outline-purple-500 bg-white shadow-sm">
                                </div>
                                <div class="flex-1">
                                    <label class="text-[10px] font-bold text-purple-700 uppercase block mb-1">Nominal Harga (Rp)</label>
                                    <input type="text" id="notif-ortu-nominal" oninput="let v=this.value.replace(/[^0-9]/g,''); this.value=v?Number(v).toLocaleString('id-ID'):''" placeholder="Cth: 150.000" class="w-full border border-purple-300 p-3 rounded-lg text-xs font-black text-purple-700 focus:outline-purple-500 bg-white shadow-sm">
                                </div>
                            </div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Berlaku Sampai Tanggal</label>
                            <input type="date" id="notif-ortu-expired" class="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-bold focus:outline-purple-500 bg-white shadow-sm mb-4" required>
                            <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Isi Pesan / Keterangan Lengkap</label>
                            <textarea id="notif-ortu-isi" rows="3" placeholder="Tulis pesan lengkap untuk wali murid..." class="w-full border-2 border-slate-200 p-3 rounded-xl text-xs font-medium mb-6 focus:outline-purple-500 bg-white shadow-sm" required></textarea>
                            <button type="submit" class="w-full md:w-auto md:px-12 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 float-right"><i class="fa-solid fa-paper-plane mr-2"></i> Kirim Notifikasi</button>
                            <div class="clear-both"></div>
                        </form>
                    </div>
                </div>`;
            }
        }

        if (config.tugas) {
            let clk = window.cekLisensi('tugas_pegawai') ? `onclick="window.navigate('tugas')"` : '';
            html += `
            <div class="${window.cekLisensi('tugas_pegawai')?'bg-amber-50 cursor-pointer hover:bg-amber-100':'bg-slate-50 cursor-not-allowed opacity-70'} rounded-2xl shadow-sm border border-amber-200 p-5 flex items-center justify-between transition transform hover:-translate-y-1" ${clk}>
                <div>
                    <h3 class="font-black ${window.cekLisensi('tugas_pegawai')?'text-amber-800':'text-slate-500'} text-sm"><i class="fa-solid ${window.cekLisensi('tugas_pegawai')?'fa-list-check':'fa-lock'} mr-1 ${window.cekLisensi('tugas_pegawai')?'text-amber-600':'text-amber-500'}"></i> Modul Tugas Pegawai</h3>
                    <p class="text-[11px] font-bold ${window.cekLisensi('tugas_pegawai')?'text-amber-600':'text-slate-400'} mt-1" id="dasbor-tugas-stats">${window.cekLisensi('tugas_pegawai')?'<i class="fa-solid fa-circle-notch fa-spin"></i> Menghitung...':'<span class="bg-amber-100 px-2 py-0.5 rounded text-[10px] text-amber-500">Segel Premium</span>'}</p>
                </div>
                <i class="fa-solid fa-person-digging text-4xl ${window.cekLisensi('tugas_pegawai')?'text-amber-300':'text-slate-300'}"></i>
            </div>`;
        }
        html += `</div><div class="xl:col-span-2 flex flex-col gap-6">`;
        
        if (config.hadirPegawai || config.disiplin) {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
            if (config.hadirPegawai) {
                html += `<div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5" id="dasbor-hadir-pegawai-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i><br>Memuat...</div></div>`;
            }
            if (config.disiplin) {
                html += `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col">
                    <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                        <h3 class="font-black text-blue-800 text-sm uppercase tracking-wider"><i class="fa-solid fa-ranking-star mr-2"></i> Top Disiplin Bulan Ini</h3>
                    </div>
                    <div class="flex-1 p-2" id="dasbor-disiplin-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i><br>Kalkulasi...</div></div>
                </div>`;
            }
            html += `</div>`;
        }

        if (config.hadirKelas) {
            html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0">
                <div class="p-5 border-b border-slate-100 flex items-center bg-blue-50 rounded-t-2xl">
                    <i class="fa-solid fa-chalkboard-user text-blue-600 text-xl mr-3"></i>
                    <div><h3 class="font-black text-blue-900 text-base">Pantauan KBM Hari Ini</h3><p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Kehadiran Guru Kelas & Siswa</p></div>
                </div>
                <div id="dashboard-absen-widget" class="overflow-x-auto custom-scrollbar p-1">
                    <div class="text-center p-8 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block"></i>Memuat data...</div>
                </div>
            </div>`;
        }

        if (config.trenTahfidz || config.trenKepengasuhan) {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
            if (config.trenTahfidz) {
                if(!window.cekLisensi('tahfidz_plus')) {
                    html += `<div class="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center opacity-70"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-2"></i><h4 class="font-bold text-slate-500">Tren Tahfidz Harian</h4><span class="text-[10px] font-bold text-amber-500 mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
                } else {
                    html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col">
                        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-teal-50 rounded-t-2xl">
                            <h3 class="font-black text-teal-800 text-sm uppercase tracking-wider"><i class="fa-solid fa-book-quran mr-1"></i> Tren Tahfidz Harian</h3>
                            <button onclick="window.navigate('tahfidz')" class="text-[10px] bg-teal-200 text-teal-800 px-2 py-1 rounded font-black hover:bg-teal-600 hover:text-white transition">Lihat</button>
                        </div>
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 max-h-64" id="dasbor-tahfidz-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i><br>Kalkulasi...</div></div>
                    </div>`;
                }
            }
            if (config.trenKepengasuhan) {
                if(!window.cekLisensi('tahfidz_plus')) {
                    html += `<div class="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center opacity-70"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-2"></i><h4 class="font-bold text-slate-500">Jurnal Asrama Harian</h4><span class="text-[10px] font-bold text-amber-500 mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
                } else {
                    html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col">
                        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-2xl">
                            <h3 class="font-black text-emerald-800 text-sm uppercase tracking-wider"><i class="fa-solid fa-bed mr-1"></i> Jurnal Asrama Harian</h3>
                            <button onclick="window.navigate('kepengasuhan')" class="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-1 rounded font-black hover:bg-emerald-600 hover:text-white transition">Lihat</button>
                        </div>
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 max-h-64" id="dasbor-asrama-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i><br>Kalkulasi...</div></div>
                    </div>`;
                }
            }
            html += `</div>`;
        }

        if (config.tunggakan || config.kalender) {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
            if (config.tunggakan) {
                if (!window.cekLisensi('keuangan_plus')) {
                    html += `<div class="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center opacity-70"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-2"></i><h4 class="font-bold text-slate-500">Tunggakan SPP</h4><span class="text-[10px] font-bold text-amber-500 mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
                } else {
                    html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 flex flex-col">
                        <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-rose-50 rounded-t-2xl">
                            <h3 class="font-black text-rose-800 text-sm uppercase tracking-wider"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Top Tunggakan SPP</h3>
                            <button onclick="window.navigate('keuangan')" class="text-[10px] bg-rose-200 text-rose-800 px-2 py-1 rounded font-black hover:bg-rose-600 hover:text-white transition">Lihat Semua</button>
                        </div>
                        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 max-h-64" id="dasbor-tunggakan-list"><div class="text-center p-4 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i><br>Kalkulasi...</div></div>
                    </div>`;
                }
            }
            if (config.kalender) {
                if (!window.cekLisensi('kalender_plus')) {
                    html += `<div class="bg-slate-50 border border-slate-200 p-8 rounded-2xl text-center flex flex-col items-center justify-center opacity-70"><i class="fa-solid fa-lock text-4xl text-slate-300 mb-2"></i><h4 class="font-bold text-slate-500">Kalender Pendidikan</h4><span class="text-[10px] font-bold text-amber-500 mt-1 bg-amber-100 px-2 py-0.5 rounded">Segel Premium</span></div>`;
                } else {
                    html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h3 class="font-black text-teal-800 text-base"><i class="fa-solid fa-calendar-days text-teal-600 mr-2"></i> Kalender <span id="dashboard-kalender-month-label">Bulan Ini</span></h3>
                            <button onclick="window.navigate('kalender')" class="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1.5 rounded-lg font-black hover:bg-teal-600 hover:text-white transition shadow-sm">Buka Kalender</button>
                        </div>
                        <div id="dashboard-kalender-container" class="overflow-hidden"></div>
                    </div>`;
                }
            }
            html += `</div>`;
        }

        html += `</div></div>`; 

        container.innerHTML = html;
        
        if (config.token && isHead) window.listenTokenOtorisasi();
        if (window.cekLisensi('tugas_pegawai') && config.pemberitahuan) window.initPemberitahuanRTDB();
        if (config.hadirPegawai) window.loadHadirPegawaiDasbor();
        if (window.cekLisensi('keuangan_plus') && config.tunggakan) window.loadTunggakanDasbor();
        if (window.cekLisensi('tugas_pegawai') && config.tugas && typeof window.loadTugasDasbor === 'function') window.loadTugasDasbor();
        if (config.hadirKelas && typeof window.loadDashboardKehadiran === 'function') window.loadDashboardKehadiran();
        if (window.cekLisensi('kalender_plus') && config.kalender && typeof window.renderDashboardKalender === 'function') setTimeout(window.renderDashboardKalender, 50);
        
        if (config.keuangan || config.pending || config.disiplin) {
            window.loadDashboardAdvancedWidgets();
        }
        if (window.cekLisensi('tahfidz_plus') && (config.trenTahfidz || config.trenKepengasuhan)) {
            window.loadDashboardSantriWidgets(config.trenTahfidz, config.trenKepengasuhan);
        }

    } else if (page === 'lembaga') { renderHalamanLembaga(container);
    } else if (page === 'pegawai') { renderHalamanPegawai(container);
    } else if (page === 'anak') { renderHalamanAnak(container);
    } else if (page === 'tugas') { renderHalamanTugas(container);
    } else if (page === 'absensi') { renderHalamanAbsensi(container);
    } else if (page === 'kalender') { renderHalamanKalender(container); 
    } else if (page === 'akademik') { renderHalamanAkademik(container); 
    } else if (page === 'kepengasuhan') { renderHalamanKepengasuhan(container); 
    } else if (page === 'tahfidz') { renderHalamanTahfidz(container); 
    } else if (page === 'raport') { renderHalamanRaport(container); 
    } else if (page === 'keuangan') { renderHalamanKeuangan(container); 
    } else if (page === 'ppdb') { renderHalamanPPDB(container); 
    } else if (page === 'lisensi') { renderHalamanLisensi(container); 
    } else if (page === 'profil') { window.renderProfilCV(container);
    }
};
