import { db } from './firebase-init.js';
import { collection, doc, deleteDoc, getDocs, query, orderBy, writeBatch, setDoc, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

if (!window.kasFilters) window.kasFilters = { tanggal: '', keterangan: '', jenis: '', kategori: '' };
if (!window.kasSort) window.kasSort = { field: 'tanggal', order: 'desc' };

function getSortIcon(field) {
    if (window.kasSort.field !== field) return '<i class="fa-solid fa-sort opacity-30 ml-1 cursor-pointer text-[11px]"></i>';
    return window.kasSort.order === 'asc' 
        ? '<i class="fa-solid fa-sort-up text-indigo-600 ml-1 cursor-pointer"></i>' 
        : '<i class="fa-solid fa-sort-down text-indigo-600 ml-1 cursor-pointer"></i>';
}

window.setKasSort = function(field) {
    if (window.kasSort.field === field) {
        window.kasSort.order = window.kasSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        window.kasSort.field = field;
        window.kasSort.order = 'desc';
    }
    window.filterTabKas();
};

window.setKasFilter = function(field, value) {
    window.kasFilters[field] = value.toLowerCase();
    window.filterTabKas();
};

// ==========================================
// FUNGSI BANTUAN & FORMAT RUPIAH
// ==========================================
window.currentKeuanganTab = 'dasbor';
window.tempTunjanganMaster = [];
window.tempSkemaGaji = {};
window.rawGajiBulanIni = [];
window.statusBukuBulanIni = false;

function getTodayStr() {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

window.fRp = (num) => Number(num || 0).toLocaleString('id-ID');
window.pRp = (str) => Number(String(str).replace(/[^0-9]/g, ''));
window.inRp = (el) => {
    let val = String(el.value).replace(/[^0-9]/g, '');
    el.value = val ? Number(val).toLocaleString('id-ID') : '';
};

export async function renderHalamanKeuangan(container) {
    container.innerHTML = `<div class="p-10 text-center"><i class="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-500 mb-4 block"></i><p class="font-bold text-slate-500 text-lg">Memuat Payroll & Keuangan...</p></div>`;
    
    const sessionUser = window.currentUser || {};
    window.isPegawaiBiasa = sessionUser.hakAkses === 'Pegawai';
    if (window.isPegawaiBiasa) window.currentKeuanganTab = 'my_slip';
    else if (window.currentKeuanganTab === 'my_slip') window.currentKeuanganTab = 'dasbor';

    try {
        let dataKas = [];
        const snap = await getDocs(query(collection(db, "KasLembaga"), orderBy("tanggal", "desc")));
        snap.forEach(d => dataKas.push({id: d.id, ...d.data()}));
        window.appState.kas = dataKas;

        let dataSPP = [];
        const snapSPP = await getDocs(query(collection(db, "PembayaranSPP"), orderBy("tanggalBayar", "desc")));
        snapSPP.forEach(d => dataSPP.push({id: d.id, ...d.data()}));
        window.appState.spp = dataSPP;
    } catch(e) {}

    renderKeuanganTabs(container);
}

function renderKeuanganTabs(container) {
    // --- CEK LISENSI MODULAR ---
    const hasKeuanganPlus = window.cekLisensi('keuangan_plus');

    let tabsHTML = '';
    if (window.isPegawaiBiasa) {
        tabsHTML = `<button class="px-8 py-4 rounded-t-2xl font-black text-lg bg-indigo-600 text-white shadow-[0_-5px_15px_rgba(79,70,229,0.3)] border-b-4 border-indigo-600 translate-y-[4px]"><i class="fa-solid fa-file-invoice-dollar mr-3"></i> Slip Gaji Saya</button>`;
    } else {
        tabsHTML = `
            <button onclick="window.switchKeuanganTab('dasbor')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'dasbor' ? 'bg-indigo-600 text-white shadow-[0_-5px_15px_rgba(79,70,229,0.3)] border-b-4 border-indigo-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-chart-pie mr-2"></i> Dasbor</button>
            <button onclick="window.switchKeuanganTab('spp')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'spp' ? 'bg-orange-500 text-white shadow-[0_-5px_15px_rgba(249,115,22,0.3)] border-b-4 border-orange-500 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-hand-holding-dollar mr-2"></i> Pembayaran SPP ${!hasKeuanganPlus ? '<i class="fa-solid fa-lock text-amber-500 ml-2 text-xs" title="Tersegel Premium"></i>' : ''}</button>
            <button onclick="window.switchKeuanganTab('beasiswa')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'beasiswa' ? 'bg-purple-600 text-white shadow-[0_-5px_15px_rgba(147,51,234,0.3)] border-b-4 border-purple-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-user-graduate mr-2"></i> Beasiswa ${!hasKeuanganPlus ? '<i class="fa-solid fa-lock text-amber-500 ml-2 text-xs" title="Tersegel Premium"></i>' : ''}</button>
            <button onclick="window.switchKeuanganTab('slip')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'slip' ? 'bg-indigo-600 text-white shadow-[0_-5px_15px_rgba(79,70,229,0.3)] border-b-4 border-indigo-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-print mr-2"></i> Slip Gaji</button>
            <button onclick="window.switchKeuanganTab('skema')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'skema' ? 'bg-indigo-600 text-white shadow-[0_-5px_15px_rgba(79,70,229,0.3)] border-b-4 border-indigo-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-money-check-dollar mr-2"></i> Skema Gaji</button>
            <button onclick="window.switchKeuanganTab('kas')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentKeuanganTab === 'kas' ? 'bg-emerald-600 text-white shadow-[0_-5px_15px_rgba(16,185,129,0.3)] border-b-4 border-emerald-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-book-journal-whills mr-2"></i> Kas Lembaga</button>
        `;
    }

    container.innerHTML = `
        <div class="mb-6 flex overflow-x-auto border-b-4 border-slate-200 gap-2 custom-scrollbar pr-4">${tabsHTML}</div>
        <div id="keuangan-content-area" class="animate-fade-in"></div>
        <div id="hidden-slip-container" class="hidden absolute top-[-9999px] bg-white"></div>
    `;

    if (window.currentKeuanganTab === 'dasbor') window.renderTabDasbor();
    else if (window.currentKeuanganTab === 'spp') {
        if (!hasKeuanganPlus) document.getElementById('keuangan-content-area').innerHTML = window.renderLockedPremiumHTML('Pembayaran SPP Terpadu');
        else window.renderTabSPP();
    }
    else if (window.currentKeuanganTab === 'beasiswa') {
        if (!hasKeuanganPlus) document.getElementById('keuangan-content-area').innerHTML = window.renderLockedPremiumHTML('Manajemen Beasiswa & Potongan');
        else window.renderTabBeasiswa();
    }
    else if (window.currentKeuanganTab === 'slip' || window.currentKeuanganTab === 'my_slip') renderTabSlip();
    else if (window.currentKeuanganTab === 'skema') window.renderTabSkema();
    else if (window.currentKeuanganTab === 'kas') renderTabKas();
}

// ==========================================
// TAB BEASISWA (PENGATURAN JENIS & PENERIMA)
// ==========================================
window.beasiswaFilters = { cari: '', kelas: '' };

window.renderTabBeasiswa = function() {
    const area = document.getElementById('keuangan-content-area');
    const anakList = (window.appState.anak || []).filter(a => a.status !== 'Lulus');
    const listKelas = [...new Set(anakList.map(a => a.kelas || 'Tanpa Kelas'))].sort();
    const optKelas = listKelas.map(k => `<option value="${k}" ${window.beasiswaFilters.kelas === k ? 'selected' : ''}>${k}</option>`).join('');

    area.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-purple-500 mb-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b pb-4">
                <div>
                    <h3 class="font-black text-2xl text-slate-800"><i class="fa-solid fa-user-graduate text-purple-500 mr-2"></i> Manajemen Beasiswa</h3>
                    <p class="text-sm font-bold text-slate-500 mt-1">Sistem otomatis pemotongan biaya pendidikan untuk siswa terpilih.</p>
                </div>
                <button onclick="window.bukaModalJenisBeasiswa()" class="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black shadow-md transition flex items-center shrink-0"><i class="fa-solid fa-tags mr-2"></i> Pengaturan Jenis Beasiswa</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="beasiswa-stats-area"></div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Cari Nama Siswa</label>
                    <input type="text" placeholder="Ketik nama..." value="${window.beasiswaFilters.cari}" oninput="window.setBeasiswaFilter('cari', this.value)" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-purple-500">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Filter Kelas</label>
                    <select onchange="window.setBeasiswaFilter('kelas', this.value)" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-purple-500 cursor-pointer">
                        <option value="">Semua Kelas</option>
                        ${optKelas}
                    </select>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar">
            <table class="w-full text-left table-fixed min-w-[950px]">
                <thead class="bg-slate-100 text-slate-600 border-b-2 text-xs uppercase font-black sticky top-0 z-10">
                    <tr>
                        <th class="p-4 w-12 text-center">No</th>
                        <th class="p-4 w-56">Nama Siswa</th>
                        <th class="p-4 w-28">Kelas</th>
                        <th class="p-4 w-44 text-center">Status Beasiswa</th>
                        <th class="p-4 w-60">Detail Potongan / Benefit</th>
                        <th class="p-4 text-center w-40">Aksi</th>
                    </tr>
                </thead>
                <tbody id="tbody-beasiswa"></tbody>
            </table>
        </div>
        <div id="modal-beasiswa-area"></div>
    `;
    window.filterTabBeasiswa();
};

window.bukaModalJenisBeasiswa = function() {
    const lembaga = window.appState.lembaga[0] || {};
    const jenisList = lembaga.jenisBeasiswa || [];

    let htmlList = jenisList.map(j => `
        <div class="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl mb-2 shadow-sm">
            <div>
                <h4 class="font-black text-slate-800">${j.nama}</h4>
                <p class="text-xs font-bold text-slate-500 mt-0.5">${j.tipe === 'persen' ? `<span class="text-emerald-600">Diskon SPP ${j.nilai}%</span>` : (j.tipe === 'nominal' ? `<span class="text-blue-600">Potongan SPP Rp ${window.fRp(j.nilai)}</span>` : `<span class="text-orange-600">Penghapusan: ${j.targetTagihan}</span>`)}</p>
            </div>
            <button type="button" onclick="window.hapusJenisBeasiswa('${j.id}')" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg font-bold text-xs transition"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');

    let modal = document.createElement('div'); modal.id = 'modal-jenis-beasiswa';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col border-t-4 border-purple-500 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-tags text-purple-500 mr-2"></i> Jenis Beasiswa</h3><p class="text-xs font-bold text-slate-500">Buat skema potongan biaya pendidikan</p></div>
                <button type="button" onclick="document.getElementById('modal-jenis-beasiswa').remove()" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 class="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider"><i class="fa-solid fa-plus-circle text-purple-500 mr-1"></i> Tambah Skema Baru</h4>
                <form onsubmit="window.tambahJenisBeasiswa(event)">
                    <input type="text" id="bea-nama" placeholder="Nama Skema (Misal: Prestasi Akademik, Yatim)" class="w-full border border-slate-300 p-2.5 rounded-lg mb-3 text-sm font-bold focus:outline-purple-500" required>
                    <select id="bea-tipe" onchange="window.ubahFormBeasiswa(this.value)" class="w-full border border-slate-300 p-2.5 rounded-lg mb-3 text-sm font-bold focus:outline-purple-500 cursor-pointer" required>
                        <option value="">-- Pilih Jenis Pemotongan Biaya --</option>
                        <option value="persen">Potongan SPP Berupa Persentase (%)</option>
                        <option value="nominal">Potongan SPP Berupa Nominal (Rp)</option>
                        <option value="tagihan">Penghapusan Jenis Tagihan Khusus</option>
                    </select>
                    <div id="bea-dynamic-input" class="mb-3 hidden"></div>
                    <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-black px-4 py-2.5 rounded-lg transition shadow"><i class="fa-solid fa-save mr-1"></i> Simpan Skema Beasiswa</button>
                </form>
            </div>

            <div>
                <h4 class="text-sm font-black text-slate-700 mb-3 uppercase tracking-wider border-b pb-2">Daftar Skema Tersedia</h4>
                <div id="wadah-jenis-beasiswa">${htmlList || '<p class="text-center text-sm font-bold text-slate-400 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">Belum ada jenis beasiswa yang dibuat.</p>'}</div>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.ubahFormBeasiswa = function(val) {
    const area = document.getElementById('bea-dynamic-input');
    area.classList.remove('hidden');
    if(val === 'persen') {
        area.innerHTML = `<label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Potong Berapa Persen dari SPP?</label><input type="number" id="bea-nilai" placeholder="Contoh: 50 (Maksimal 100)" max="100" min="1" class="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-bold focus:outline-purple-500" required>`;
    } else if(val === 'nominal') {
        area.innerHTML = `<label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Potong Berapa Rupiah dari SPP?</label><input type="text" id="bea-nilai" oninput="window.inRp(this)" placeholder="Misal: 50.000" class="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-bold focus:outline-purple-500" required>`;
    } else if(val === 'tagihan') {
        area.innerHTML = `<label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tagihan Apa yang Digratiskan?</label><input type="text" id="bea-nilai" placeholder="Ketik nama tagihan (Misal: SPP, Uang Gedung, Uang Buku)" class="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-bold focus:outline-purple-500" required>`;
    } else {
        area.classList.add('hidden'); area.innerHTML = '';
    }
};

window.tambahJenisBeasiswa = async function(e) {
    e.preventDefault();
    const nama = document.getElementById('bea-nama').value;
    const tipe = document.getElementById('bea-tipe').value;
    const nilaiRaw = document.getElementById('bea-nilai').value;
    
    let obj = { id: Date.now().toString(), nama: nama, tipe: tipe };
    if(tipe === 'persen') obj.nilai = Number(nilaiRaw);
    else if(tipe === 'nominal') obj.nilai = window.pRp(nilaiRaw);
    else if(tipe === 'tagihan') obj.targetTagihan = nilaiRaw.trim();

    const btn = e.target.querySelector('button'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; btn.disabled = true;

    try {
        const idLembaga = window.appState.lembaga[0].id;
        let currentBea = window.appState.lembaga[0].jenisBeasiswa || [];
        currentBea.push(obj);

        await updateDoc(doc(db, "Lembaga", idLembaga), { jenisBeasiswa: currentBea });
        window.appState.lembaga[0].jenisBeasiswa = currentBea;
        
        document.getElementById('modal-jenis-beasiswa').remove();
        window.bukaModalJenisBeasiswa();
    } catch(err) { alert('Gagal menyimpan.'); btn.innerHTML = ori; btn.disabled = false; }
};

window.hapusJenisBeasiswa = async function(id) {
    if(!confirm("Yakin ingin menghapus skema beasiswa ini? (Tidak akan menghapus dari siswa yang sudah terlanjur menerimanya)")) return;
    try {
        const idLembaga = window.appState.lembaga[0].id;
        let currentBea = window.appState.lembaga[0].jenisBeasiswa || [];
        currentBea = currentBea.filter(b => b.id !== id);

        await updateDoc(doc(db, "Lembaga", idLembaga), { jenisBeasiswa: currentBea });
        window.appState.lembaga[0].jenisBeasiswa = currentBea;
        
        document.getElementById('modal-jenis-beasiswa').remove();
        window.bukaModalJenisBeasiswa();
    } catch(err) { alert('Gagal menghapus.'); }
};

window.filterTabBeasiswa = function() {
    const cari = window.beasiswaFilters.cari.toLowerCase();
    const kelas = window.beasiswaFilters.kelas;

    let anakList = (window.appState.anak || []).filter(a => a.status !== 'Lulus');

    if (cari) anakList = anakList.filter(a => (a.nama || '').toLowerCase().includes(cari));
    if (kelas) anakList = anakList.filter(a => (a.kelas || 'Tanpa Kelas') === kelas);

    let trs = '';
    let totalSiswa = anakList.length;
    let totalPenerima = 0;

    anakList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    anakList.forEach((anak, idx) => {
        const isBea = anak.isBeasiswa === true;
        if (isBea) totalPenerima++;

        let statusBadge = isBea 
            ? `<span class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-black text-xs border border-purple-200"><i class="fa-solid fa-medal mr-1"></i> Penerima</span>` 
            : `<span class="bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black text-xs border border-slate-200">Reguler</span>`;

        let detailBea = isBea && anak.beasiswaInfo 
            ? `<span class="font-bold text-slate-700">${anak.beasiswaInfo.nama}</span><br><span class="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 inline-block mt-1">${anak.beasiswaInfo.keterangan}</span>` 
            : `<span class="text-[10px] text-slate-400 italic">Tidak ada</span>`;

        let actionBtn = isBea
            ? `<button onclick="window.cabutBeasiswa('${anak.id}', '${anak.nama}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm w-full"><i class="fa-solid fa-xmark mr-1"></i> Cabut Beasiswa</button>`
            : `<button onclick="window.bukaModalTerapkanBeasiswa('${anak.id}', '${anak.nama}')" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm w-full"><i class="fa-solid fa-medal mr-1"></i> Terapkan Beasiswa</button>`;

        trs += `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-sm ${isBea ? 'bg-purple-50/30' : ''}">
            <td class="p-4 text-center font-bold text-slate-400">${idx + 1}</td>
            <td class="p-4 font-black text-slate-800">${anak.nama}</td>
            <td class="p-4 font-bold text-slate-500">${anak.kelas || '-'}</td>
            <td class="p-4 text-center">${statusBadge}</td>
            <td class="p-4">${detailBea}</td>
            <td class="p-4 text-center">${actionBtn}</td>
        </tr>`;
    });

    const statsArea = document.getElementById('beasiswa-stats-area');
    if(statsArea) {
        statsArea.innerHTML = `
            <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Siswa (Filter)</p><h3 class="text-2xl font-black text-slate-800">${totalSiswa} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl"><i class="fa-solid fa-users"></i></div>
            </div>
            <div class="bg-purple-50 border border-purple-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Penerima Beasiswa</p><h3 class="text-2xl font-black text-purple-700">${totalPenerima} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-purple-200 text-purple-700 flex items-center justify-center text-xl"><i class="fa-solid fa-medal"></i></div>
            </div>
            <div class="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Siswa Reguler</p><h3 class="text-2xl font-black text-slate-700">${totalSiswa - totalPenerima} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center text-xl"><i class="fa-solid fa-user-check"></i></div>
            </div>
        `;
    }

    const tbody = document.getElementById('tbody-beasiswa');
    if (tbody) tbody.innerHTML = trs || '<tr><td colspan="6" class="p-10 text-center text-slate-400 font-bold">Tidak ada data siswa yang cocok.</td></tr>';
};

window.bukaModalTerapkanBeasiswa = function(idSiswa, namaSiswa) {
    const lembaga = window.appState.lembaga[0] || {};
    const jenisList = lembaga.jenisBeasiswa || [];
    
    if(jenisList.length === 0) return alert("Anda belum membuat Skema Beasiswa. Silakan klik tombol 'Pengaturan Jenis Beasiswa' di atas terlebih dahulu.");

    let optBea = jenisList.map(j => {
        let ket = j.tipe === 'persen' ? `Diskon ${j.nilai}%` : (j.tipe === 'nominal' ? `Potongan Rp ${window.fRp(j.nilai)}` : `Hapus Tagihan: ${j.targetTagihan}`);
        return `<option value="${j.id}">${j.nama} (${ket})</option>`;
    }).join('');

    let modal = document.createElement('div'); modal.id = 'modal-terapkan-beasiswa';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col border-t-4 border-purple-500">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-medal text-purple-500 mr-2"></i> Terapkan Beasiswa</h3><p class="text-xs font-bold text-slate-500">${namaSiswa}</p></div>
                <button type="button" onclick="document.getElementById('modal-terapkan-beasiswa').remove()" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <form onsubmit="window.simpanTerapkanBeasiswa(event, '${idSiswa}', '${namaSiswa}')">
                <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Pilih Skema Beasiswa</label>
                <select id="pilih-jenis-bea" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-purple-500 text-slate-700 bg-slate-50 cursor-pointer mb-6" required>
                    <option value="">-- Pilih Skema --</option>
                    ${optBea}
                </select>
                <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-3.5 rounded-xl transition shadow-lg transform hover:-translate-y-1"><i class="fa-solid fa-bolt mr-2"></i> Eksekusi Potongan Otomatis</button>
            </form>
        </div>`;
    document.body.appendChild(modal);
};

window.simpanTerapkanBeasiswa = async function(e, idSiswa, namaSiswa) {
    e.preventDefault();
    const idJenis = document.getElementById('pilih-jenis-bea').value;
    const lembaga = window.appState.lembaga[0] || {};
    const skema = (lembaga.jenisBeasiswa || []).find(j => j.id === idJenis);
    if(!skema) return;

    const btn = e.target.querySelector('button'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;

    let anak = window.appState.anak.find(a => a.id === idSiswa);
    let sppAsli = lembaga.sppBulananGlobal || 0;
    let sppBaru = anak.sppBulanan || sppAsli;
    let tagihanBaru = [...(anak.tagihanLain || [])];
    let keterangan = '';

    if(skema.tipe === 'persen') {
        sppBaru = sppBaru - (sppBaru * (skema.nilai / 100));
        keterangan = `SPP Didiskon ${skema.nilai}%`;
    } else if(skema.tipe === 'nominal') {
        sppBaru = sppBaru - skema.nilai;
        if(sppBaru < 0) sppBaru = 0;
        keterangan = `SPP Dipotong Rp ${window.fRp(skema.nilai)}`;
    } else if(skema.tipe === 'tagihan') {
        let hapusT = skema.targetTagihan.toLowerCase();
        if(hapusT === 'spp' || hapusT === 'syahriah') {
            sppBaru = 0; keterangan = 'SPP Digratiskan Sepenuhnya';
        } else {
            tagihanBaru = tagihanBaru.filter(t => t.nama.toLowerCase() !== hapusT);
            keterangan = `Tagihan Khusus [${skema.targetTagihan}] Dihapus`;
        }
    }

    try {
        await updateDoc(doc(db, "Anak", idSiswa), { 
            isBeasiswa: true, sppBulanan: sppBaru, tagihanLain: tagihanBaru, beasiswaInfo: { nama: skema.nama, keterangan: keterangan }
        });

        if(anak) {
            anak.isBeasiswa = true; anak.sppBulanan = sppBaru; anak.tagihanLain = tagihanBaru; anak.beasiswaInfo = { nama: skema.nama, keterangan: keterangan };
        }

        alert(`Beasiswa berhasil diterapkan pada ${namaSiswa}!\nInfo Sistem: ${keterangan}`);
        document.getElementById('modal-terapkan-beasiswa').remove();
        window.filterTabBeasiswa();
    } catch(err) { alert("Gagal menerapkan beasiswa."); btn.innerHTML = ori; btn.disabled = false; }
};

window.cabutBeasiswa = async function(idSiswa, namaSiswa) {
    if(!confirm(`Yakin ingin mencabut beasiswa dari ${namaSiswa}?\n(Target SPP akan dikembalikan secara otomatis ke nilai Target Global Lembaga)`)) return;

    try {
        const lembaga = window.appState.lembaga[0] || {};
        const sppGlobal = lembaga.sppBulananGlobal || 0;

        await updateDoc(doc(db, "Anak", idSiswa), { 
            isBeasiswa: false, sppBulanan: sppGlobal, beasiswaInfo: null 
        });

        let anak = window.appState.anak.find(a => a.id === idSiswa);
        if(anak) {
            anak.isBeasiswa = false; anak.sppBulanan = sppGlobal; anak.beasiswaInfo = null;
        }

        alert(`Beasiswa berhasil dicabut dari ${namaSiswa}. SPP kembali ke target normal: Rp ${window.fRp(sppGlobal)}.`);
        window.filterTabBeasiswa();
    } catch(err) { alert("Gagal mencabut beasiswa."); }
};

window.switchKeuanganTab = function(tab) { window.currentKeuanganTab = tab; renderKeuanganTabs(document.getElementById('view-container')); }

window.getBulanMenunggak = function(idSiswa, sppList) {
    const d = new Date();
    let curY = d.getFullYear(); let curM = d.getMonth() + 1;
    let startY = curM < 7 ? curY - 1 : curY;
    let expected = []; let tempY = startY; let tempM = 7;
    
    while(true) {
        expected.push(`${tempY}-${String(tempM).padStart(2,'0')}`);
        if (tempY === curY && tempM === curM) break;
        tempM++; if (tempM > 12) { tempM = 1; tempY++; }
    }
    
    let paid = sppList.filter(s => s.idSiswa === idSiswa && !s.isCicilan).map(s => s.bulanSpp);
    return expected.filter(m => !paid.includes(m));
};

window.hitungTunggakanSiswa = function(idSiswa, sppList) {
    return window.getBulanMenunggak(idSiswa, sppList).length;
};

// ==========================================
// TAB DASBOR KEUANGAN (GRAFIK & TREN)
// ==========================================
window.renderTabDasbor = async function() {
    const area = document.getElementById('keuangan-content-area');
    area.innerHTML = `<div class="p-10 text-center"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-3"></i><br><span class="font-bold text-slate-500">Menganalisa Tren Keuangan...</span></div>`;

    if (!window.Chart) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    const kas = window.appState.kas || [];
    const tMasuk = kas.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + Number(k.nominal), 0);
    const tKeluar = kas.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + Number(k.nominal), 0);
    const sld = tMasuk - tKeluar;

    const curMonthStr = getTodayStr().substring(0, 7);
    let tMasukBulanIni = 0; let tKeluarBulanIni = 0;
    
    kas.forEach(k => {
        if(k.tanggal.startsWith(curMonthStr)) {
            if(k.jenis === 'Pemasukan') tMasukBulanIni += Number(k.nominal);
            if(k.jenis === 'Pengeluaran') tKeluarBulanIni += Number(k.nominal);
        }
    });
    const sldBulanIni = tMasukBulanIni - tKeluarBulanIni;

    const spp = window.appState.spp || [];
    const anak = window.appState.anak || [];
    
    const arrears = anak.filter(a => a.status !== 'Lulus' && window.hitungTunggakanSiswa(a.id, spp) > 0);
    
    let arrearsHTML = arrears.slice(0, 5).map(a => {
        let tunggakan = window.hitungTunggakanSiswa(a.id, spp);
        return `
        <div class="flex justify-between items-center p-2.5 border-b border-rose-100 hover:bg-rose-50 transition rounded">
            <div>
                <p class="text-sm font-black text-slate-700 leading-tight">${a.nama}</p>
                <p class="text-[10px] font-bold text-rose-500">Kelas: ${a.kelas || '-'} • <span class="bg-rose-200 text-rose-800 px-1 rounded">Tunggakan: ${tunggakan} Bulan</span></p>
            </div>
            <div class="flex gap-1">
                <button onclick="window.switchKeuanganTab('spp')" class="text-[10px] bg-emerald-500 hover:bg-emerald-600 transition text-white px-2.5 py-1.5 rounded-md font-bold shadow-sm"><i class="fa-solid fa-arrow-right mr-1"></i> Buka SPP</button>
            </div>
        </div>`;
    }).join('');

    let trs = kas.slice(0, 5).map(k => {
        const isM = k.jenis === 'Pemasukan'; const col = isM ? 'emerald' : 'rose'; const sign = isM ? '+' : '-';
        const tglDisplay = k.tanggal && k.tanggal.includes('-') ? k.tanggal.split('-').reverse().join('/') : k.tanggal;
        return `
        <div class="flex justify-between items-center p-3 border-b border-slate-100 hover:bg-slate-50 transition rounded-lg">
            <div class="overflow-hidden pr-2">
                <p class="font-black text-slate-700 text-sm truncate max-w-[200px] sm:max-w-xs">${k.keterangan || '-'}</p>
                <p class="text-[10px] font-bold text-slate-400 mt-0.5">${tglDisplay} • <span class="text-indigo-500">${k.kategori}</span></p>
            </div>
            <div class="font-black text-${col}-600 text-sm whitespace-nowrap bg-${col}-50 px-2.5 py-1 rounded-md border border-${col}-100 shadow-sm">${sign} Rp ${window.fRp(k.nominal)}</div>
        </div>`;
    }).join('');

    const date1YearAgo = new Date(); date1YearAgo.setFullYear(date1YearAgo.getFullYear() - 1);
    const startMonthDefault = `${date1YearAgo.getFullYear()}-${String(date1YearAgo.getMonth()+1).padStart(2,'0')}`;

    area.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shrink-0"><i class="fa-solid fa-arrow-trend-up"></i></div>
                <div class="overflow-hidden"><p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Pemasukan Yayasan</p><h3 class="text-2xl font-black text-slate-800 truncate">Rp ${window.fRp(tMasuk)}</h3></div>
            </div>
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div class="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl shrink-0"><i class="fa-solid fa-arrow-trend-down"></i></div>
                <div class="overflow-hidden"><p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Pengeluaran Yayasan</p><h3 class="text-2xl font-black text-slate-800 truncate">Rp ${window.fRp(tKeluar)}</h3></div>
            </div>
            <div class="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl shadow-lg border border-indigo-500 flex items-center gap-4 text-white transform hover:scale-[1.02] transition">
                <div class="w-14 h-14 rounded-2xl bg-white/20 text-white flex items-center justify-center text-2xl shrink-0"><i class="fa-solid fa-vault"></i></div>
                <div class="overflow-hidden"><p class="text-[10px] font-black text-indigo-100 uppercase tracking-wider mb-1">Saldo Akhir Yayasan</p><h3 class="text-2xl font-black truncate">Rp ${window.fRp(sld)}</h3></div>
            </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-emerald-400">
                <p class="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">Pemasukan Bulan Ini</p>
                <h3 class="text-xl font-black text-slate-800 truncate">Rp ${window.fRp(tMasukBulanIni)}</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center border-l-4 border-l-rose-400">
                <p class="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Pengeluaran Bulan Ini</p>
                <h3 class="text-xl font-black text-slate-800 truncate">Rp ${window.fRp(tKeluarBulanIni)}</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center md:col-span-1 col-span-2 border-l-4 ${sldBulanIni >= 0 ? 'border-l-indigo-500' : 'border-l-red-500'}">
                <p class="text-[10px] font-black ${sldBulanIni >= 0 ? 'text-indigo-500' : 'text-red-500'} uppercase tracking-wider mb-1">Net/Selisih Bulan Ini</p>
                <h3 class="text-xl font-black ${sldBulanIni >= 0 ? 'text-indigo-700' : 'text-red-600 animate-pulse'} truncate">Rp ${window.fRp(sldBulanIni)}</h3>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                <div class="flex flex-col md:flex-row justify-between md:items-center mb-4 border-b border-slate-100 pb-3 gap-3">
                    <h3 class="font-black text-lg text-slate-800"><i class="fa-solid fa-chart-column text-indigo-500 mr-2"></i> Tren Keuangan</h3>
                    <div class="flex flex-wrap gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <select id="chart-filter-jenis" onchange="window.updateChartKeuangan()" class="text-xs border-0 bg-white font-bold text-slate-600 rounded p-1 focus:ring-0 cursor-pointer shadow-sm">
                            <option value="Semua">Semua Arus Kas</option>
                            <option value="Pemasukan">Pemasukan Saja</option>
                            <option value="Pengeluaran">Pengeluaran Saja</option>
                        </select>
                        <input type="month" id="chart-filter-start" value="${startMonthDefault}" onchange="window.updateChartKeuangan()" class="text-xs border border-slate-200 rounded p-1 font-bold shadow-sm">
                        <span class="text-xs text-slate-400 font-bold">-</span>
                        <input type="month" id="chart-filter-end" value="${curMonthStr}" onchange="window.updateChartKeuangan()" class="text-xs border border-slate-200 rounded p-1 font-bold shadow-sm">
                    </div>
                </div>
                <div class="relative h-72 w-full"><canvas id="chartKeuangan"></canvas></div>
            </div>
            
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 gap-2">
                    <h3 class="font-black text-lg text-slate-800"><i class="fa-solid fa-chart-pie text-indigo-500 mr-2"></i> Proporsi</h3>
                    <select id="pie-filter-jenis" onchange="window.updatePieKeuangan()" class="text-[10px] border border-slate-200 bg-slate-50 font-bold text-slate-600 rounded-lg p-1.5 focus:outline-indigo-500 cursor-pointer shadow-sm">
                        <option value="Semua">Bandingkan 2 Grafik</option>
                        <option value="Pemasukan">Pemasukan Saja</option>
                        <option value="Pengeluaran">Pengeluaran Saja</option>
                    </select>
                </div>
                <div id="pie-container" class="relative flex-1 min-h-[220px] flex flex-col items-center justify-center gap-2 overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h3 class="font-black text-lg text-slate-800"><i class="fa-solid fa-clock-rotate-left text-indigo-500 mr-2"></i> Transaksi Terakhir</h3>
                    <button onclick="window.switchKeuanganTab('kas')" class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-lg font-black hover:bg-indigo-600 hover:text-white transition shadow-sm border border-indigo-100">Lihat Semua</button>
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">${trs || '<p class="text-center text-slate-400 font-bold text-sm mt-10">Belum ada transaksi.</p>'}</div>
            </div>

            <div class="bg-rose-50 border border-rose-200 p-6 rounded-3xl shadow-sm flex flex-col relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><i class="fa-solid fa-triangle-exclamation text-8xl text-rose-500"></i></div>
                <div class="flex justify-between items-center mb-4 border-b border-rose-200 pb-3 relative z-10">
                    <h3 class="font-black text-lg text-rose-800"><i class="fa-solid fa-bell text-rose-600 mr-2 animate-pulse"></i> Siswa Menunggak SPP</h3>
                    <span class="text-xs bg-rose-200 text-rose-800 font-black px-2 py-1 rounded-full border border-rose-300 shadow-sm">${arrears.length} Anak</span>
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 relative z-10">
                    ${arrearsHTML || '<div class="text-center text-emerald-600 bg-emerald-100 border border-emerald-200 p-4 rounded-xl font-bold text-sm mt-4"><i class="fa-solid fa-check-circle mr-1 text-xl block mb-2"></i> Luar biasa!<br>Tidak ada siswa yang menunggak!</div>'}
                    ${arrears.length > 5 ? `<button onclick="window.switchKeuanganTab('spp')" class="w-full mt-3 bg-white text-rose-600 border border-rose-200 text-xs font-black py-2.5 rounded-lg hover:bg-rose-600 hover:text-white transition shadow-sm">Lihat Daftar Lengkap (${arrears.length - 5} lainnya)</button>` : ''}
                </div>
            </div>
        </div>
    `;

    window.updatePieKeuangan();
    window.updateChartKeuangan();
};

window.updatePieKeuangan = function() {
    const jenis = document.getElementById('pie-filter-jenis').value;
    const kas = window.appState.kas || [];
    const pieContainer = document.getElementById('pie-container');
    
    pieContainer.innerHTML = '';
    if (window.pieChart1) { window.pieChart1.destroy(); window.pieChart1 = null; }
    if (window.pieChart2) { window.pieChart2.destroy(); window.pieChart2 = null; }

    const colorPaletteMasuk = ['#10b981', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#14b8a6', '#84cc16', '#eab308', '#f97316', '#06b6d4'];
    const colorPaletteKeluar = ['#f43f5e', '#f97316', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

    function createPie(tipe, colors) {
        const dataRaw = {};
        kas.forEach(k => {
            if (k.jenis === tipe) {
                if (!dataRaw[k.kategori]) dataRaw[k.kategori] = 0;
                dataRaw[k.kategori] += Number(k.nominal);
            }
        });
        const sortedKat = Object.keys(dataRaw).sort((a,b) => dataRaw[b] - dataRaw[a]).slice(0, 10);
        if (sortedKat.length === 0) return null;
        const pData = sortedKat.map(l => dataRaw[l]);
        
        const div = document.createElement('div');
        div.className = 'w-full flex-1 flex flex-col items-center justify-center relative min-h-[160px] bg-white rounded-xl py-2';
        div.innerHTML = `<p class="text-[9px] font-black ${tipe==='Pemasukan'?'text-emerald-500':'text-rose-500'} uppercase tracking-widest absolute top-1 left-2 bg-${tipe==='Pemasukan'?'emerald':'rose'}-50 px-2 py-0.5 rounded border border-${tipe==='Pemasukan'?'emerald':'rose'}-100 z-10">${tipe}</p><div class="relative w-full h-36 mt-4"><canvas></canvas></div>`;
        pieContainer.appendChild(div);

        const ctx = div.querySelector('canvas').getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: { labels: sortedKat, datasets: [{ data: pData, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, font: { size: 9, weight: 'bold' } } } } }
        });
    }

    if (jenis === 'Semua') {
        window.pieChart1 = createPie('Pemasukan', colorPaletteMasuk);
        window.pieChart2 = createPie('Pengeluaran', colorPaletteKeluar);
        if(!window.pieChart1 && !window.pieChart2) pieContainer.innerHTML = '<p class="text-xs text-slate-400 font-bold m-auto">Belum ada data.</p>';
    } else if (jenis === 'Pemasukan') {
        window.pieChart1 = createPie('Pemasukan', colorPaletteMasuk);
        if(!window.pieChart1) pieContainer.innerHTML = '<p class="text-xs text-slate-400 font-bold m-auto">Belum ada pemasukan.</p>';
    } else if (jenis === 'Pengeluaran') {
        window.pieChart2 = createPie('Pengeluaran', colorPaletteKeluar);
        if(!window.pieChart2) pieContainer.innerHTML = '<p class="text-xs text-slate-400 font-bold m-auto">Belum ada pengeluaran.</p>';
    }
};

window.updateChartKeuangan = function() {
    const jenis = document.getElementById('chart-filter-jenis').value;
    const start = document.getElementById('chart-filter-start').value;
    const end = document.getElementById('chart-filter-end').value;
    const kas = window.appState.kas || [];

    const monthlyData = {};
    kas.forEach(k => {
        const monthKey = k.tanggal.substring(0, 7); 
        if(monthKey >= start && monthKey <= end) {
            if(!monthlyData[monthKey]) monthlyData[monthKey] = { masuk: 0, keluar: 0 };
            if(k.jenis === 'Pemasukan') monthlyData[monthKey].masuk += Number(k.nominal);
            if(k.jenis === 'Pengeluaran') monthlyData[monthKey].keluar += Number(k.nominal);
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(m => {
        const [y, mo] = m.split('-');
        return new Date(y, mo - 1).toLocaleString('id-ID', { month: 'short', year: 'numeric' });
    });

    let datasets = [];
    if(jenis === 'Semua' || jenis === 'Pemasukan') datasets.push({ label: ' Pemasukan', data: sortedMonths.map(m => monthlyData[m].masuk), backgroundColor: '#10b981', borderRadius: 4 });
    if(jenis === 'Semua' || jenis === 'Pengeluaran') datasets.push({ label: ' Pengeluaran', data: sortedMonths.map(m => monthlyData[m].keluar), backgroundColor: '#f43f5e', borderRadius: 4 });

    const ctx = document.getElementById('chartKeuangan').getContext('2d');
    if (window.keuanganChart) window.keuanganChart.destroy();
    window.keuanganChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } } },
            scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });
};

// ==========================================
// TAB SKEMA GAJI & TUNJANGAN
// ==========================================
window.renderTabSkema = function renderTabSkema() {
    const area = document.getElementById('keuangan-content-area');
    const lembaga = window.appState.lembaga[0] || {};
    
    if (Object.keys(window.tempSkemaGaji).length === 0 && lembaga.skemaGaji) {
        window.tempSkemaGaji = JSON.parse(JSON.stringify(lembaga.skemaGaji));
        window.tempTunjanganMaster = JSON.parse(JSON.stringify(lembaga.tunjanganMaster || []));
    }
    
    const daftarJabatan = (lembaga.daftarJabatan || '').split(',').map(j => j.trim()).filter(j => j);
    
    let tunjHTML = window.tempTunjanganMaster.map(t => {
        const isPot = t.jenis === 'potongan';
        const col = isPot ? 'rose' : 'emerald';
        const sign = isPot ? '-' : '+';
        return `
        <div class="bg-${col}-50 border border-${col}-200 px-3 py-2 rounded-lg flex justify-between items-center mb-2 shadow-sm">
            <div><span class="font-black text-${col}-800 block">${t.nama}</span><span class="text-[10px] font-bold text-${col}-600">${sign} Rp ${window.fRp(t.nominal)}</span></div>
            <button onclick="window.hapusTunjangan(${t.id})" class="text-rose-500 hover:text-rose-700 bg-white w-7 h-7 rounded-full shadow flex items-center justify-center"><i class="fa-solid fa-times"></i></button>
        </div>`;
    }).join('');

    let skemaHTML = daftarJabatan.map(j => {
        let s = window.tempSkemaGaji[j] || { metode: 'Bulanan', nominal: 0, potTelat: 0, potAlpa: 0, tunjanganAktif: [] };
        
        let allChecked = window.tempTunjanganMaster.length > 0 && window.tempTunjanganMaster.every(t => (s.tunjanganAktif || []).includes(t.id));
        let checksTunjangan = '';
        
        if (window.tempTunjanganMaster.length > 0) {
            checksTunjangan += `<label class="flex items-center space-x-2 text-[10px] font-black text-indigo-700 bg-indigo-100 hover:bg-indigo-200 p-1.5 border border-indigo-300 rounded cursor-pointer mb-2 transition"><input type="checkbox" onchange="window.toggleSemuaTunjanganJabatan('${j}', this.checked)" class="form-checkbox text-indigo-600 rounded" ${allChecked ? 'checked' : ''}> <span>PILIH SEMUA ITEM</span></label>`;
            
            checksTunjangan += window.tempTunjanganMaster.map(t => {
                const isCkd = (s.tunjanganAktif || []).includes(t.id) ? 'checked' : '';
                return `<label class="flex items-center space-x-2 text-[10px] font-bold text-slate-600 bg-white p-1.5 border rounded cursor-pointer mb-1"><input type="checkbox" onchange="window.toggleTunjanganJabatan('${j}', ${t.id}, this.checked)" class="form-checkbox text-indigo-600 rounded" ${isCkd}> <span>${t.nama}</span></label>`;
            }).join('');
        }

        return `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-black text-slate-800">${j}</td>
            <td class="p-2"><select class="border p-2 w-full rounded text-xs font-bold skema-metode" data-jab="${j}"><option value="Bulanan" ${s.metode==='Bulanan'?'selected':''}>Bulanan Tetap</option><option value="Per Kehadiran" ${s.metode==='Per Kehadiran'?'selected':''}>Per Kehadiran (Sesi)</option><option value="Per JP" ${s.metode==='Per JP'?'selected':''}>Per Jam Mengajar (JP)</option></select></td>
            <td class="p-2"><input type="text" class="border p-2 w-full rounded text-xs font-bold text-indigo-700 bg-indigo-50 skema-nominal" data-jab="${j}" value="${window.fRp(s.nominal)}" oninput="window.inRp(this)" placeholder="Rp"></td>
            <td class="p-2"><input type="text" class="border p-2 w-full rounded text-xs font-bold text-orange-600 bg-orange-50 skema-telat" data-jab="${j}" value="${window.fRp(s.potTelat)}" oninput="window.inRp(this)" placeholder="Rp/Menit"></td>
            <td class="p-2"><input type="text" class="border p-2 w-full rounded text-xs font-bold text-rose-600 bg-rose-50 skema-alpa" data-jab="${j}" value="${window.fRp(s.potAlpa)}" oninput="window.inRp(this)" placeholder="Rp/Hari"></td>
            <td class="p-2"><div class="max-h-32 overflow-y-auto custom-scrollbar bg-slate-100 p-1.5 rounded border">${checksTunjangan || '<span class="text-[9px] text-slate-400 italic p-1">Belum ada item master</span>'}</div></td>
        </tr>`;
    }).join('');

    area.innerHTML = `
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div class="xl:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 class="font-black text-lg text-slate-800 mb-4 border-b pb-2"><i class="fa-solid fa-gift text-indigo-500 mr-2"></i> Master Tunjangan & Potongan</h3>
                <div class="mb-4">
                    <input type="text" id="tunj-nama" placeholder="Nama Item" class="w-full border-2 border-slate-200 p-2 rounded-lg text-xs font-bold mb-2">
                    <select id="tunj-jenis" class="w-full border-2 border-slate-200 p-2 rounded-lg text-xs font-bold mb-2 cursor-pointer focus:outline-indigo-500">
                        <option value="pendapatan">Tambahan Pendapatan (+)</option>
                        <option value="potongan">Dipotong Langsung (-)</option>
                    </select>
                    <input type="text" id="tunj-nom" placeholder="Nominal (Rp)" oninput="window.inRp(this)" class="w-full border-2 border-slate-200 p-2 rounded-lg text-xs font-bold mb-2">
                    <button onclick="window.tambahTunjangan()" class="w-full bg-indigo-100 hover:bg-indigo-600 text-indigo-700 hover:text-white py-2 rounded-lg text-xs font-black transition"><i class="fa-solid fa-plus mr-1"></i> Tambah Ke Master</button>
                </div>
                <div class="max-h-64 overflow-y-auto custom-scrollbar pr-1">${tunjHTML || '<p class="text-xs text-slate-400 italic text-center">Belum ada data</p>'}</div>
            </div>
            
            <div class="xl:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 class="font-black text-lg text-slate-800 mb-4 border-b pb-2"><i class="fa-solid fa-sitemap text-indigo-500 mr-2"></i> Skema Gaji per Jabatan</h3>
                <div class="overflow-x-auto custom-scrollbar border border-slate-200 rounded-xl mb-4">
                    <table class="w-full text-left text-sm min-w-[700px]">
                        <thead class="bg-slate-100 text-slate-600 border-b">
                            <tr><th class="p-3">Jabatan</th><th class="p-3">Sistem</th><th class="p-3">Gaji Pokok</th><th class="p-3">Pot. Telat</th><th class="p-3">Pot. Alpa</th><th class="p-3 w-40">Item Tambahan Aktif</th></tr>
                        </thead>
                        <tbody>${skemaHTML || '<tr><td colspan="6" class="p-6 text-center text-slate-400">Isi daftar jabatan di Data Lembaga</td></tr>'}</tbody>
                    </table>
                </div>
                <button onclick="window.simpanSkemaLembaga()" id="btn-simpan-skema" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition w-full md:w-auto float-right"><i class="fa-solid fa-save mr-2"></i> Simpan Pengaturan Gaji</button>
            </div>
        </div>
    `;
}

window.tambahTunjangan = function() {
    const nama = document.getElementById('tunj-nama').value; 
    const nom = window.pRp(document.getElementById('tunj-nom').value);
    const jenis = document.getElementById('tunj-jenis').value;
    if(!nama || !nom) return alert("Isi nama dan nominal!");
    window.tempTunjanganMaster.push({ id: Date.now(), nama, nominal: nom, jenis: jenis }); 
    renderTabSkema();
};

window.hapusTunjangan = function(id) {
    window.tempTunjanganMaster = window.tempTunjanganMaster.filter(t => t.id !== id);
    for (let j in window.tempSkemaGaji) {
        if(window.tempSkemaGaji[j].tunjanganAktif) window.tempSkemaGaji[j].tunjanganAktif = window.tempSkemaGaji[j].tunjanganAktif.filter(tid => tid !== id);
    }
    renderTabSkema();
};

window.toggleTunjanganJabatan = function(jab, tunjId, isChecked) {
    if(!window.tempSkemaGaji[jab]) window.tempSkemaGaji[jab] = { tunjanganAktif: [] };
    if(!window.tempSkemaGaji[jab].tunjanganAktif) window.tempSkemaGaji[jab].tunjanganAktif = [];
    if(isChecked) window.tempSkemaGaji[jab].tunjanganAktif.push(tunjId);
    else window.tempSkemaGaji[jab].tunjanganAktif = window.tempSkemaGaji[jab].tunjanganAktif.filter(id => id !== tunjId);
};

window.toggleSemuaTunjanganJabatan = function(jab, isChecked) {
    if(!window.tempSkemaGaji[jab]) window.tempSkemaGaji[jab] = { tunjanganAktif: [] };
    if(isChecked) window.tempSkemaGaji[jab].tunjanganAktif = window.tempTunjanganMaster.map(t => t.id);
    else window.tempSkemaGaji[jab].tunjanganAktif = [];
    renderTabSkema();
};

window.simpanSkemaLembaga = async function() {
    const btn = document.getElementById('btn-simpan-skema'); btn.innerHTML = 'Menyimpan...'; btn.disabled = true;
    const metodes = document.querySelectorAll('.skema-metode'); const nominals = document.querySelectorAll('.skema-nominal');
    const telats = document.querySelectorAll('.skema-telat'); const alpas = document.querySelectorAll('.skema-alpa');
    
    metodes.forEach((m, i) => {
        let jab = m.dataset.jab; if(!window.tempSkemaGaji[jab]) window.tempSkemaGaji[jab] = { tunjanganAktif: [] };
        window.tempSkemaGaji[jab].metode = m.value; window.tempSkemaGaji[jab].nominal = window.pRp(nominals[i].value);
        window.tempSkemaGaji[jab].potTelat = window.pRp(telats[i].value); window.tempSkemaGaji[jab].potAlpa = window.pRp(alpas[i].value);
    });

    try {
        const idLembaga = window.appState.lembaga[0].id;
        await updateDoc(doc(db, "Lembaga", idLembaga), { skemaGaji: window.tempSkemaGaji, tunjanganMaster: window.tempTunjanganMaster });
        window.appState.lembaga[0].skemaGaji = JSON.parse(JSON.stringify(window.tempSkemaGaji));
        window.appState.lembaga[0].tunjanganMaster = JSON.parse(JSON.stringify(window.tempTunjanganMaster));
        alert("Skema Gaji dan Tunjangan berhasil diperbarui!");
    } catch(e) { alert("Gagal menyimpan: " + e.message); } finally { renderTabSkema(); }
};

// ==========================================
// TAB KALKULASI SLIP GAJI
// ==========================================
function renderTabSlip() {
    const area = document.getElementById('keuangan-content-area');
    const today = new Date(); const curMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    
    area.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-indigo-500 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h3 class="font-black text-2xl text-slate-800"><i class="fa-solid ${window.isPegawaiBiasa ? 'fa-user-check' : 'fa-print'} text-indigo-500 mr-2"></i> ${window.isPegawaiBiasa ? 'Slip Gaji Saya' : 'Kalkulasi Penggajian'}</h3>
                <p class="text-sm font-bold text-slate-500 mt-1">Sistem membaca riwayat presensi & cuti bulan yang dipilih secara otomatis.</p>
            </div>
            <div class="flex items-center space-x-3 bg-indigo-50 p-3 rounded-xl border border-indigo-100 w-full md:w-auto">
                <label class="font-black text-indigo-700 whitespace-nowrap"><i class="fa-regular fa-calendar mr-1"></i> Bulan:</label>
                <input type="month" id="filter-bulan-gaji" value="${curMonth}" onchange="window.kalkulasiGajiBulk()" class="border-2 border-indigo-200 p-2.5 rounded-lg font-black text-indigo-900 bg-white w-full focus:outline-indigo-500 cursor-pointer shadow-sm">
            </div>
        </div>
        <div id="tabel-gaji-area" class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar relative min-h-[200px]"></div>
    `;
    window.kalkulasiGajiBulk();
}

window.toggleTutupBuku = async function() {
    const bln = document.getElementById('filter-bulan-gaji').value;
    const isClosed = window.statusBukuBulanIni;
    
    const actionText = isClosed ? 'MEMBUKA' : 'MENUTUP';
    const infoText = !isClosed ? '\n\nPerhatian:\n1. Pegawai akan bisa melihat slip mereka.\n2. Total THP semua pegawai akan OTOMATIS MASUK ke Buku Kas Lembaga.' : '\n\nPerhatian: Data gaji akan ditarik kembali / dihapus otomatis dari Buku Kas Lembaga.';

    if(!confirm(`Yakin ingin ${actionText} buku gaji bulan ${bln}? ${infoText}`)) return;
    
    try {
        const batch = writeBatch(db);
        
        batch.set(doc(db, "StatusGaji", bln), { bln: bln, isClosed: !isClosed });

        const tglStr = window.getLocalISOString();
        (window.tempDataGajiBulanIni || []).forEach(gaji => {
            const docId = `KasGaji_${gaji.idPegawai}_${bln}`;
            if (!isClosed) {
                if (gaji.thpFinal > 0) {
                    batch.set(doc(db, "KasLembaga", docId), {
                        tanggal: tglStr, jenis: "Pengeluaran", kategori: "Gaji Pegawai",
                        keterangan: `Gaji ${gaji.nama} (${bln})`, nominal: gaji.thpFinal, createdAt: new Date().toISOString()
                    });
                }
            } else {
                batch.delete(doc(db, "KasLembaga", docId));
            }
        });

        await batch.commit();
        alert(`Buku gaji ${bln} berhasil ${isClosed ? 'dibuka' : 'ditutup'}!`);
        window.kalkulasiGajiBulk();
    } catch(e) { alert("Gagal memperbarui status buku & sinkronisasi kas."); }
};

window.kalkulasiGajiBulk = async function() {
    const bln = document.getElementById('filter-bulan-gaji').value;
    const area = document.getElementById('tabel-gaji-area');
    if(!bln) return;
    area.innerHTML = `<div class="p-20 text-center"><i class="fa-solid fa-spinner fa-spin text-5xl text-indigo-600 mb-4"></i><br><span class="font-black text-slate-700">Menganalisa Data Presensi & Cuti...</span></div>`;
    
    try {
        let absensiRaw = []; let cutiRaw = []; let savedGaji = []; 
        window.statusBukuBulanIni = false;

        const snapStat = await getDocs(query(collection(db, "StatusGaji"), where("bln", "==", bln)));
        snapStat.forEach(d => { if(d.data().isClosed) window.statusBukuBulanIni = true; });

        if(window.isPegawaiBiasa && !window.statusBukuBulanIni) {
            return area.innerHTML = `<div class="p-20 text-center text-slate-400 font-bold"><i class="fa-solid fa-lock text-6xl mb-4 text-slate-300"></i><br>Slip Gaji bulan ${bln} belum diterbitkan (Buku belum ditutup).</div>`;
        }

        const snap1 = await getDocs(query(collection(db, "Absensi"))); snap1.forEach(d => { if(d.data().tanggal.startsWith(bln)) absensiRaw.push(d.data()); });
        const snap2 = await getDocs(query(collection(db, "Cuti"))); snap2.forEach(d => { if(d.data().tanggal.startsWith(bln)) cutiRaw.push(d.data()); });
        const snap3 = await getDocs(query(collection(db, "GajiBulanan"))); snap3.forEach(d => { if(d.data().bln === bln) savedGaji.push({id: d.id, ...d.data()}); });

        let listPegawai = window.appState.pegawai || [];
        if (window.isPegawaiBiasa) listPegawai = listPegawai.filter(p => p.id === window.currentUser.id);

        const lembaga = window.appState.lembaga[0] || {};
        const skemaGaji = lembaga.skemaGaji || {};
        const tunjanganMaster = lembaga.tunjanganMaster || [];

        window.rawGajiSistem = {}; 
        window.tempDataGajiBulanIni = []; 
        let grandTotalGaji = 0;

        let trs = listPegawai.map((p, idx) => {
            let penAuto = []; let potAuto = []; let ringkasanInfo = [];

            (p.detailJabatan || []).forEach(jab => {
                const skema = skemaGaji[jab.namaJabatan];
                if(!skema) return ringkasanInfo.push(`<span class="text-rose-500 font-bold">${jab.namaJabatan}: Skema Belum Diatur</span>`);

                const absJab = absensiRaw.filter(a => a.idGuru === p.id && a.jabatan === jab.namaJabatan);
                let telatMins = absJab.reduce((sum, a) => sum + (Number(a.terlambat) || 0), 0);
                if(telatMins > 0 && skema.potTelat > 0) potAuto.push({ nama: `Telat ${jab.namaJabatan} (${telatMins} Mnt)`, nom: telatMins * skema.potTelat });

                let pokok = 0; let ketP = '';
                if (skema.metode === 'Bulanan') { pokok = skema.nominal; ketP = 'Bulan'; } 
                else if (skema.metode === 'Per Kehadiran') {
                    let count = 0;
                    if(jab.tipePresensi === 'CICO') count = absJab.filter(x => x.status === 'Cek Out').length;
                    else if(jab.tipePresensi === '1x') count = absJab.length;
                    else count = new Set(absJab.map(x => x.jamTxt)).size;
                    pokok = count * skema.nominal; ketP = `${count}x Hadir`;
                } else if (skema.metode === 'Per JP') {
                    let jp = absJab.reduce((sum, a) => {
                        if(!a.jamTxt || a.jamTxt==='-') return sum+1; const pj=a.jamTxt.replace('Jam ','').split('-');
                        return sum + (pj.length===2 ? Number(pj[1])-Number(pj[0])+1 : 1);
                    }, 0);
                    pokok = jp * skema.nominal; ketP = `${jp} JP`;
                }
                if(pokok > 0) penAuto.push({ nama: `Gaji Pokok - ${jab.namaJabatan} (${ketP})`, nom: pokok });

                let tPenTotal = 0; let tPotTotal = 0;
                (skema.tunjanganAktif || []).forEach(tid => {
                    let tm = tunjanganMaster.find(t => t.id === tid); 
                    if(tm) { 
                        if(tm.jenis === 'potongan') {
                            potAuto.push({ nama: `Pot. ${tm.nama} (${jab.namaJabatan})`, nom: tm.nominal });
                            tPotTotal += tm.nominal;
                        } else {
                            penAuto.push({ nama: `Tunj. ${tm.nama} (${jab.namaJabatan})`, nom: tm.nominal }); 
                            tPenTotal += tm.nominal;
                        }
                    }
                });

                ringkasanInfo.push(`<span class="font-bold text-slate-700">${jab.namaJabatan}</span> <span class="text-[10px] bg-slate-100 px-1 rounded border">Pkk: Rp ${window.fRp(pokok)} | Tnj: Rp ${window.fRp(tPenTotal)} | PotLain: Rp ${window.fRp((telatMins * skema.potTelat) + tPotTotal)}</span>`);
            });

            // --- INJEKSI FITUR HONOR RAPAT ---
            const rapatHadir = absensiRaw.filter(a => a.idGuru === p.id && a.tipe === 'Rapat' && Number(a.honorRapat || 0) > 0);
            if (rapatHadir.length > 0) {
                let totalHonorRapat = rapatHadir.reduce((sum, r) => sum + Number(r.honorRapat), 0);
                penAuto.push({ nama: `Honor Rapat (${rapatHadir.length}x Hadir)`, nom: totalHonorRapat });
                ringkasanInfo.push(`<span class="font-bold text-purple-700">Honor Rapat</span> <span class="text-[10px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-200">Rp ${window.fRp(totalHonorRapat)}</span>`);
            }
            // ---------------------------------

            window.rawGajiSistem[p.id] = { penAuto, potAuto, nama: p.nama, bln: bln, jabatans: p.detailJabatan };
            
            let saved = savedGaji.find(g => g.idGuru === p.id);
            let finalPen = saved ? saved.pendapatan : [...penAuto];
            let finalPot = saved ? saved.potongan : [...potAuto];
            
            let totPen = finalPen.reduce((s, x) => s + x.nom, 0);
            let totPot = finalPot.reduce((s, x) => s + x.nom, 0);
            let thp = totPen - totPot; if(thp < 0) thp = 0;
            grandTotalGaji += thp;
            window.tempDataGajiBulanIni.push({ idPegawai: p.id, nama: p.nama, thpFinal: thp });

            return `
            <tr class="border-b border-slate-100 hover:bg-indigo-50/30 transition">
                <td class="p-4 text-center font-bold text-slate-400">${idx + 1}</td>
                <td class="p-4"><h4 class="font-black text-indigo-900 leading-tight">${p.nama}</h4><span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${p.hakAkses}</span></td>
                <td class="p-4 text-xs leading-relaxed">${ringkasanInfo.join('<br>') || '<span class="italic text-slate-400">Tidak ada data</span>'}</td>
                <td class="p-4"><span class="font-black text-emerald-600 text-lg tracking-tight">Rp ${window.fRp(thp)}</span></td>
                <td class="p-4 text-center"><button onclick="window.bukaModalSlip('${p.id}')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-4 py-2.5 rounded-lg font-black text-xs transition shadow-sm border border-indigo-200 hover:border-indigo-600 w-full whitespace-nowrap"><i class="fa-solid ${window.isPegawaiBiasa ? 'fa-print' : 'fa-pen-to-square'} mr-1"></i> ${window.isPegawaiBiasa ? 'Lihat Slip' : 'Edit & Slip'}</button></td>
            </tr>`;
        }).join('');

        let sumRow = window.isPegawaiBiasa ? '' : `
            <tr class="bg-indigo-50 border-t-4 border-indigo-200">
                <td colspan="3" class="p-4 text-right font-black text-indigo-900 text-lg">GRAND TOTAL PENGGAJIAN LEMBAGA:</td>
                <td colspan="2" class="p-4 font-black text-emerald-600 text-2xl tracking-tighter">Rp ${window.fRp(grandTotalGaji)}</td>
            </tr>`;

        let btnTutupBuku = window.isPegawaiBiasa ? '' : `
            <button onclick="window.toggleTutupBuku()" class="mb-4 ${window.statusBukuBulanIni ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-black px-6 py-3 rounded-xl shadow-lg transition flex items-center">
                <i class="fa-solid ${window.statusBukuBulanIni ? 'fa-lock-open' : 'fa-lock'} mr-2"></i> ${window.statusBukuBulanIni ? 'Buka Kembali Buku Gaji' : 'Tutup Buku Gaji Bulan Ini'}
            </button>`;

        area.innerHTML = `
            ${btnTutupBuku}
            <table class="w-full text-left">
                <thead class="bg-indigo-50 text-indigo-800 border-b-4 border-indigo-100">
                    <tr><th class="p-4 w-12 text-center">No</th><th class="p-4">Identitas Pegawai</th><th class="p-4">Ringkasan Algoritma Sistem</th><th class="p-4">Take Home Pay</th><th class="p-4 text-center">Aksi Dokumen</th></tr>
                </thead>
                <tbody>${trs || '<tr><td colspan="5" class="p-10 text-center text-slate-400 font-bold">Data Pegawai Kosong.</td></tr>'}${sumRow}</tbody>
            </table>
        `;
    } catch(e) { area.innerHTML = `<div class="p-10 text-red-500 text-center font-black text-xl"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Gagal Memproses Kalkulasi.</div>`; }
};

// ================= MODAL SLIP DINAMIS =================
window.tempSlipEdit = { idGuru: '', bln: '', pen: [], pot: [], nama: '', jab: [] };

window.bukaModalSlip = async function(idGuru) {
    const bln = document.getElementById('filter-bulan-gaji').value;
    const raw = window.rawGajiSistem[idGuru];
    
    let pen = [...raw.penAuto]; let pot = [...raw.potAuto];
    
    try {
        const snap = await getDocs(query(collection(db, "GajiBulanan"), where("idGuru", "==", idGuru), where("bln", "==", bln)));
        if (!snap.empty) {
            const saved = snap.docs[0].data();
            pen = saved.pendapatan; pot = saved.potongan;
        }
    } catch(e){}

    window.tempSlipEdit = { idGuru, bln, pen, pot, nama: raw.nama, jab: raw.jabatans };
    window.renderIsiModalSlip();
};

window.renderIsiModalSlip = function() {
    let modal = document.getElementById('modal-slip');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-slip';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
        document.body.appendChild(modal);
    }

    const d = window.tempSlipEdit;
    let totPen = d.pen.reduce((s,x)=>s+x.nom,0);
    let totPot = d.pot.reduce((s,x)=>s+x.nom,0);
    let thp = totPen - totPot; if(thp < 0) thp = 0;

    const isRO = window.isPegawaiBiasa || window.statusBukuBulanIni ? 'disabled' : '';
    const dRO = window.isPegawaiBiasa || window.statusBukuBulanIni ? 'hidden' : '';

    let penHTML = d.pen.map((p, i) => `
        <div class="flex gap-2 mb-2">
            <input type="text" value="${p.nama}" onchange="window.updateSlipVal('pen', ${i}, 'nama', this.value)" class="border p-2 rounded w-2/3 text-xs font-bold bg-slate-50 focus:bg-white" placeholder="Nama Pendapatan" ${isRO}>
            <input type="text" value="${window.fRp(p.nom)}" oninput="window.inRp(this)" onchange="window.updateSlipVal('pen', ${i}, 'nom', this.value)" class="border p-2 rounded w-1/3 text-xs font-black text-emerald-600 text-right focus:outline-emerald-500" placeholder="Rp" ${isRO}>
            <button onclick="window.hapusSlipItem('pen', ${i})" class="bg-red-100 text-red-500 px-2 rounded hover:bg-red-500 hover:text-white transition ${dRO}"><i class="fa-solid fa-times"></i></button>
        </div>`).join('');

    let potHTML = d.pot.map((p, i) => `
        <div class="flex gap-2 mb-2">
            <input type="text" value="${p.nama}" onchange="window.updateSlipVal('pot', ${i}, 'nama', this.value)" class="border p-2 rounded w-2/3 text-xs font-bold bg-slate-50 focus:bg-white" placeholder="Nama Potongan" ${isRO}>
            <input type="text" value="${window.fRp(p.nom)}" oninput="window.inRp(this)" onchange="window.updateSlipVal('pot', ${i}, 'nom', this.value)" class="border p-2 rounded w-1/3 text-xs font-black text-rose-600 text-right focus:outline-rose-500" placeholder="Rp" ${isRO}>
            <button onclick="window.hapusSlipItem('pot', ${i})" class="bg-red-100 text-red-500 px-2 rounded hover:bg-red-500 hover:text-white transition ${dRO}"><i class="fa-solid fa-times"></i></button>
        </div>`).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 md:p-8 flex flex-col max-h-[90vh] border-t-4 border-indigo-500">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
                <div><h3 class="text-2xl font-black text-indigo-800"><i class="fa-solid fa-file-invoice-dollar mr-2"></i> Slip Gaji: ${d.nama}</h3><p class="text-sm font-bold text-slate-500 mt-1">Bulan Periode: ${d.bln} ${window.statusBukuBulanIni ? '<span class="bg-red-100 text-red-600 px-2 rounded ml-2">Buku Ditutup (Read-Only)</span>' : ''}</p></div>
                <button onclick="document.getElementById('modal-slip').classList.add('hidden')" class="text-red-500 hover:text-red-700 text-3xl font-bold transition"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-emerald-50/30 border border-emerald-200 p-4 rounded-xl">
                    <div class="flex justify-between items-center mb-3 border-b border-emerald-200 pb-2">
                        <h4 class="font-black text-emerald-700"><i class="fa-solid fa-plus-circle mr-1"></i> Rincian Pendapatan</h4>
                        <button onclick="window.tambahSlipItem('pen')" class="text-xs bg-emerald-500 text-white px-2 py-1 rounded font-bold hover:bg-emerald-600 transition ${dRO}">+ Tambah</button>
                    </div>
                    ${penHTML || '<p class="text-xs text-slate-400 italic">Tidak ada pendapatan.</p>'}
                    <div class="mt-4 pt-2 border-t border-emerald-200 text-right font-black text-emerald-800">Total: Rp ${window.fRp(totPen)}</div>
                </div>

                <div class="bg-rose-50/30 border border-rose-200 p-4 rounded-xl">
                    <div class="flex justify-between items-center mb-3 border-b border-rose-200 pb-2">
                        <h4 class="font-black text-rose-700"><i class="fa-solid fa-minus-circle mr-1"></i> Rincian Potongan</h4>
                        <button onclick="window.tambahSlipItem('pot')" class="text-xs bg-rose-500 text-white px-2 py-1 rounded font-bold hover:bg-rose-600 transition ${dRO}">+ Tambah</button>
                    </div>
                    ${potHTML || '<p class="text-xs text-slate-400 italic">Tidak ada potongan.</p>'}
                    <div class="mt-4 pt-2 border-t border-rose-200 text-right font-black text-rose-800">Total: Rp ${window.fRp(totPot)}</div>
                </div>
            </div>

            <div class="mt-4 bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-right flex justify-between items-center">
                <span class="font-black text-indigo-800 tracking-widest uppercase text-sm">Take Home Pay</span>
                <span class="text-4xl font-black text-indigo-600 tracking-tighter">Rp ${window.fRp(thp)}</span>
            </div>

            <div class="mt-6 border-t pt-4 flex gap-3 justify-end">
                <button type="button" onclick="document.getElementById('modal-slip').classList.add('hidden')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold transition">Tutup</button>
                <button type="button" onclick="window.simpanDanCetakSlip(event)" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition"><i class="fa-solid fa-print mr-2"></i> ${window.isPegawaiBiasa || window.statusBukuBulanIni ? 'Cetak PDF Slip Gaji' : 'Simpan & Cetak PDF Slip'}</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.updateSlipVal = function(tipe, idx, key, val) {
    if(key === 'nom') window.tempSlipEdit[tipe][idx][key] = window.pRp(val);
    else window.tempSlipEdit[tipe][idx][key] = val;
    window.renderIsiModalSlip();
};
window.tambahSlipItem = function(tipe) { window.tempSlipEdit[tipe].push({ nama: '', nom: 0 }); window.renderIsiModalSlip(); };
window.hapusSlipItem = function(tipe, idx) { window.tempSlipEdit[tipe].splice(idx, 1); window.renderIsiModalSlip(); };

window.simpanDanCetakSlip = async function(event) {
    const btn = event.currentTarget; const oriText = btn.innerHTML;
    const d = window.tempSlipEdit;
    
    let totPen = d.pen.reduce((s,x)=>s+x.nom,0); let totPot = d.pot.reduce((s,x)=>s+x.nom,0);
    let thp = totPen - totPot; if(thp < 0) thp = 0;

    if (!window.isPegawaiBiasa && !window.statusBukuBulanIni) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;
        const docId = `Gaji_${d.idGuru}_${d.bln}`;
        try {
            await setDoc(doc(db, "GajiBulanan", docId), { idGuru: d.idGuru, bln: d.bln, pendapatan: d.pen, potongan: d.pot, thpFinal: thp, updatedAt: new Date().toISOString() });
        } catch(e) { alert("Gagal menyimpan slip ke database."); }
        btn.innerHTML = oriText; btn.disabled = false;
    }

    window.eksekusiCetakPDFSlip(d, thp);
    document.getElementById('modal-slip').classList.add('hidden');
    if(!window.isPegawaiBiasa) window.kalkulasiGajiBulk();
};

window.eksekusiCetakPDFSlip = function(d, thp) {
    const [year, month] = d.bln.split('-'); const namaBulan = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const lembaga = window.appState.lembaga[0] || {};
    const jabatans = (d.jab || []).map(x => x.namaJabatan).join(', ');

    let tPen = d.pen.map(x => `<tr><td style="padding:4px 0;">${x.nama}</td><td style="text-align:right;">Rp ${window.fRp(x.nom)}</td></tr>`).join('');
    let tPot = d.pot.map(x => `<tr><td style="padding:4px 0;">${x.nama}</td><td style="text-align:right;">Rp ${window.fRp(x.nom)}</td></tr>`).join('');

    const html = `
        <div style="padding:40px; font-family:sans-serif; color:#0f172a; width:800px; background:#fff;">
            <div style="text-align:center; border-bottom:4px solid #4f46e5; padding-bottom:15px; margin-bottom:20px;">
                <h1 style="margin:0; color:#4f46e5; font-size:26px; font-weight:900; text-transform:uppercase;">${lembaga.namaLembaga || 'SLIP GAJI RESMI'}</h1>
                <p style="margin:5px 0 0 0; font-size:14px; font-weight:bold; color:#64748b; letter-spacing:2px;">PERIODE BUKU: ${namaBulan.toUpperCase()}</p>
            </div>
            
            <table style="width:100%; margin-bottom:20px; font-size:14px; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                <tr><td style="width:140px; font-weight:bold; padding:4px 0; color:#475569;">Nama Pegawai</td><td style="font-weight:900; font-size:16px;">: ${d.nama}</td></tr>
                <tr><td style="font-weight:bold; padding:4px 0; color:#475569;">Jabatan Struktural</td><td style="font-weight:bold;">: ${jabatans}</td></tr>
            </table>

            <div style="display:flex; gap:20px; margin-bottom:20px;">
                <div style="flex:1; border:1px solid #cbd5e1; border-radius:8px; padding:15px;">
                    <h4 style="margin:0 0 10px 0; color:#047857; font-weight:bold; border-bottom:2px solid #a7f3d0; padding-bottom:5px;">Rincian Pendapatan</h4>
                    <table style="width:100%; font-size:13px;">${tPen || '<tr><td>-</td><td style="text-align:right;">0</td></tr>'}</table>
                </div>
                <div style="flex:1; border:1px solid #cbd5e1; border-radius:8px; padding:15px;">
                    <h4 style="margin:0 0 10px 0; color:#be123c; font-weight:bold; border-bottom:2px solid #fecdd3; padding-bottom:5px;">Rincian Potongan</h4>
                    <table style="width:100%; font-size:13px;">${tPot || '<tr><td>-</td><td style="text-align:right;">0</td></tr>'}</table>
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:#ecfdf5; border:2px solid #10b981; padding:15px 20px; border-radius:8px; margin-bottom:40px;">
                <span style="font-weight:900; font-size:16px; color:#065f46;">TOTAL DITERIMA (TAKE HOME PAY)</span>
                <span style="font-weight:900; font-size:24px; color:#047857;">Rp ${window.fRp(thp)}</span>
            </div>

            <div style="display:flex; justify-content:flex-end; text-align:center;">
                <div>
                    <p style="margin:0 0 70px 0; font-size:14px; font-weight:bold; color:#475569;">Tangerang, ${new Date().getDate()} ${namaBulan}<br>Pimpinan / Bendahara Lembaga</p>
                    <p style="margin:0; font-weight:bold; border-bottom:2px solid #334155; display:inline-block; min-width:200px;"></p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('hidden-slip-container').innerHTML = html;
    window.unduhPDF('hidden-slip-container', `Slip_${d.nama.replace(/\s+/g, '_')}_${d.bln}.pdf`);
};

// ==========================================
// TAB BUKU KAS LEMBAGA (REAL-TIME & KATEGORI DINAMIS)
// ==========================================
window.defaultKatMasuk = ['SPP', 'Donasi/Infaq', 'Bantuan Pemerintah', 'Keuntungan Usaha', 'Pembayaran Lainnya', 'Dana Hibah', 'Lain-lain'];
window.defaultKatKeluar = ['Gaji dan Tunjangan', 'Operasional KBM', 'Listrik & Air', 'Perawatan Sarpras', 'Konsumsi', 'Transport', 'Kesehatan dan Pengobatan', 'Lain-lain'];
window.editKasKeterangan = async function(id, ketLama) {
    const baru = prompt("Ubah keterangan transaksi Kas:", ketLama);
    if (baru !== null && baru.trim() !== "") {
        try {
            await updateDoc(doc(db, "KasLembaga", id), { keterangan: baru.trim() });
            alert("Keterangan transaksi kas berhasil diubah!");
            window.muatUlangTabelKas();
        } catch(e) { alert("Gagal merubah data."); }
    }
};

window.kasCheckedIds = new Set();
window.toggleCheckKas = function(id, isChecked) {
    if(isChecked) window.kasCheckedIds.add(id); else window.kasCheckedIds.delete(id);
    document.getElementById('btn-hapus-bulk').classList.toggle('hidden', window.kasCheckedIds.size === 0);
};
window.toggleCheckAllKas = function(isChecked) {
    document.querySelectorAll('.kas-chk').forEach(b => { b.checked = isChecked; window.toggleCheckKas(b.value, isChecked); });
};
window.hapusKasBulk = async function() {
    if(!window.kasCheckedIds || window.kasCheckedIds.size === 0) return alert("Pilih data yang ingin dihapus terlebih dahulu!");
    if(!confirm(`Yakin ingin menghapus massal ${window.kasCheckedIds.size} transaksi ini?\nJika ada pembayaran SPP/Siswa, status Lunas mereka juga akan dibatalkan! (Membutuhkan Otorisasi)`)) return;

    window.verifikasiTokenOtorisasi(`Hapus Massal ${window.kasCheckedIds.size} Transaksi Kas Lembaga`).then(async (isValid) => {
        if(!isValid) return;
        try {
            const batch = writeBatch(db);
            
            window.kasCheckedIds.forEach(idKas => {
                const kasData = (window.appState.kas || []).find(k => k.id === idKas);
                if(!kasData) return;

                if(kasData.idSiswa && kasData.idTagihan) {
                    let anak = (window.appState.anak || []).find(a => a.id === kasData.idSiswa);
                    if(anak) {
                        let tagihanIndex = (anak.tagihanLain || []).findIndex(t => t.id === kasData.idTagihan);
                        if(tagihanIndex > -1) {
                            let currentTerbayar = anak.tagihanLain[tagihanIndex].terbayar || 0;
                            anak.tagihanLain[tagihanIndex].terbayar = Math.max(0, currentTerbayar - kasData.nominal);
                            anak.tagihanLain[tagihanIndex].lunas = (anak.tagihanLain[tagihanIndex].terbayar >= anak.tagihanLain[tagihanIndex].nominal);
                            batch.update(doc(db, "Anak", kasData.idSiswa), { tagihanLain: anak.tagihanLain });
                        }
                    }
                }

                const sppTerkait = (window.appState.spp || []).filter(s => s.idKas === idKas);
                sppTerkait.forEach(spp => {
                    batch.delete(doc(db, "PembayaranSPP", spp.id));
                    window.appState.spp = window.appState.spp.filter(s => s.id !== spp.id);
                });

                batch.delete(doc(db, "KasLembaga", idKas));
                window.appState.kas = window.appState.kas.filter(k => k.id !== idKas);
            });

            await batch.commit();
            window.kasCheckedIds.clear();
            alert("Semua transaksi kas terpilih berhasil dihapus beserta status tagihan terkait!");
            window.muatUlangTabelKas();
            if(window.currentKeuanganTab === 'dasbor') window.renderTabDasbor();
            if(window.currentKeuanganTab === 'spp') window.filterTabSPP();
        } catch(e) { alert("Gagal menghapus data massal: " + e.message); }
    });
};

window.muatUlangTabelKas = async function(btn) {
    if(btn) { btn.dataset.ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat...'; btn.disabled = true; }
    try {
        let dataKas = [];
        const snap = await getDocs(query(collection(db, "KasLembaga"), orderBy("tanggal", "desc")));
        snap.forEach(d => dataKas.push({id: d.id, ...d.data()}));
        window.appState.kas = dataKas;
        window.filterTabKas();
    } catch(e) {} finally {
        if(btn) { btn.innerHTML = btn.dataset.ori; btn.disabled = false; }
    }
};

export async function renderTabKas() {
    window.renderTabKas = renderTabKas; 
    window.appState = window.appState || {};
    if (!window.kasCheckedIds) window.kasCheckedIds = new Set();
    
    const lembaga = window.appState.lembaga[0] || {};
    // --- GEMBOK MODULAR ---
    const isPremium = (lembaga.lisensiFitur || []).includes('keuangan_plus');

    const area = document.getElementById('keuangan-content-area');
    if(!area) return;
    
    area.innerHTML = `<div class="p-10 text-center"><i class="fa-solid fa-spinner fa-spin text-4xl text-emerald-500 mb-3"></i><br><span class="font-bold text-slate-500">Memuat Buku Kas Real-Time...</span></div>`;

    let dataKas = [];
    try {
        const snap = await getDocs(query(collection(db, "KasLembaga"), orderBy("tanggal", "desc")));
        snap.forEach(d => dataKas.push({id: d.id, ...d.data()}));
        window.appState.kas = dataKas;
    } catch(e) {}

    window.kasCheckedIds.clear();
    const today = getTodayStr();
    const firstDay = today.substring(0, 8) + '01'; 

    const allKas = window.appState.kas || [];
    const grandMasuk = allKas.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + Number(k.nominal), 0);
    const grandKeluar = allKas.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + Number(k.nominal), 0);
    const grandSaldo = grandMasuk - grandKeluar;

    let bulkBtn = isPremium 
        ? `<button onclick="window.bukaModalKas('bulk')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-black text-sm shadow-md transition"><i class="fa-solid fa-list-ol mr-1"></i> Bulk</button>`
        : `<button class="bg-slate-200 text-slate-400 px-4 py-2.5 rounded-xl font-black text-sm shadow-sm cursor-not-allowed" title="Input Bulk Tersedia di Keuangan Terpadu"><i class="fa-solid fa-lock mr-1"></i> Bulk</button>`;

    area.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-gradient-to-br from-emerald-400 to-emerald-600 p-8 rounded-3xl shadow-lg text-white transform transition hover:-translate-y-1"><div class="flex justify-between items-start mb-2"><p class="text-emerald-50 font-black text-xs uppercase tracking-widest bg-emerald-700/30 px-3 py-1 rounded-full">Total Pemasukan Keseluruhan</p><i class="fa-solid fa-arrow-trend-up text-3xl opacity-50"></i></div><h2 class="text-4xl font-black truncate mt-4">Rp ${window.fRp(grandMasuk)}</h2></div>
            <div class="bg-gradient-to-br from-rose-400 to-rose-600 p-8 rounded-3xl shadow-lg text-white transform transition hover:-translate-y-1"><div class="flex justify-between items-start mb-2"><p class="text-rose-50 font-black text-xs uppercase tracking-widest bg-rose-700/30 px-3 py-1 rounded-full">Total Pengeluaran Keseluruhan</p><i class="fa-solid fa-arrow-trend-down text-3xl opacity-50"></i></div><h2 class="text-4xl font-black truncate mt-4">Rp ${window.fRp(grandKeluar)}</h2></div>
            <div class="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl shadow-xl text-white md:scale-105 border-4 border-white/20"><div class="flex justify-between items-start mb-2"><p class="text-indigo-100 font-black text-xs uppercase tracking-widest bg-indigo-900/30 px-3 py-1 rounded-full">Saldo Kas Keseluruhan</p><i class="fa-solid fa-vault text-4xl opacity-50"></i></div><h2 class="text-5xl font-black truncate mt-4 tracking-tighter">Rp ${window.fRp(grandSaldo)}</h2></div>
        </div>
        
        <div class="bg-white p-6 rounded-t-3xl border border-slate-100 flex flex-col gap-4 bg-slate-50 border-b-0">
            <div class="flex flex-wrap justify-between items-center gap-4">
                <div class="flex items-center gap-3">
                    <h3 class="font-black text-2xl text-slate-800"><i class="fa-solid fa-list mr-1 text-indigo-500"></i> Rekam Jejak Kas</h3>
                    <button onclick="window.muatUlangTabelKas(this)" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"><i class="fa-solid fa-sync-alt mr-1"></i> Muat Ulang</button>
                </div>
                <div class="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-xl shadow-sm">
                    <span class="text-xs font-bold text-slate-500 px-2"><i class="fa-solid fa-calendar-day mr-1"></i> Interval Tanggal:</span>
                    <input type="date" id="kas-filter-start" value="${firstDay}" oninput="window.filterTabKas()" class="border border-slate-300 rounded p-1.5 text-xs font-bold focus:outline-indigo-500 bg-slate-50 hover:bg-white cursor-pointer transition">
                    <span class="text-xs font-bold text-slate-400">-</span>
                    <input type="date" id="kas-filter-end" value="${today}" oninput="window.filterTabKas()" class="border border-slate-300 rounded p-1.5 text-xs font-bold focus:outline-indigo-500 bg-slate-50 hover:bg-white cursor-pointer transition">
                </div>
            </div>

            <div class="flex flex-wrap gap-2 items-center justify-between mt-2 border-t border-slate-200 pt-4">
                <button onclick="window.hapusKasBulk()" class="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition hidden animate-fade-in" id="btn-hapus-bulk"><i class="fa-solid fa-trash-can-arrow-up mr-1"></i> Hapus Terpilih</button>
                <div class="flex flex-wrap gap-2 items-center ml-auto">
                    <button onclick="window.bukaModalKategoriKas()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition"><i class="fa-solid fa-tags mr-1"></i> Master Kategori</button>
                    <button onclick="window.bukaModalKas('single')" class="bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-200 hover:border-indigo-600 px-4 py-2.5 rounded-xl font-black text-sm transition"><i class="fa-solid fa-plus mr-1"></i> Single</button>
                    ${bulkBtn}
                    <div class="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>
                    <label class="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-sm shadow-md transition cursor-pointer flex items-center mb-0"><i class="fa-solid fa-upload mr-1"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporKasCSV(event)" class="hidden"></label>
                    <button onclick="window.eksporKasCSV()" class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-sm shadow-md transition"><i class="fa-solid fa-download mr-1"></i> Ekspor CSV</button>
                </div>
            </div>
        </div>
        
        <div class="bg-white rounded-b-3xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar">
            <table class="w-full text-left table-fixed min-w-[950px]">
                <thead class="bg-slate-100 text-slate-600 border-b-2 sticky top-0 z-10 shadow-sm text-xs uppercase font-black">
                    <tr>
                        <th class="p-4 w-12 text-center"><input type="checkbox" onchange="window.toggleCheckAllKas(this.checked)" class="w-4 h-4 rounded text-indigo-600 cursor-pointer"></th>
                        <th class="p-4 w-32 cursor-pointer select-none hover:bg-slate-200 transition" onclick="window.setKasSort('tanggal')">Tanggal ${getSortIcon('tanggal')}</th>
                        <th class="p-4 cursor-pointer select-none hover:bg-slate-200 transition" onclick="window.setKasSort('keterangan')">Keterangan ${getSortIcon('keterangan')}</th>
                        <th class="p-4 text-right cursor-pointer select-none hover:bg-slate-200 w-36 transition" onclick="window.setKasSort('masuk')">Pemasukan ${getSortIcon('masuk')}</th>
                        <th class="p-4 text-right cursor-pointer select-none hover:bg-slate-200 w-36 transition" onclick="window.setKasSort('keluar')">Pengeluaran ${getSortIcon('keluar')}</th>
                        <th class="p-4 text-right w-40">Total (Saldo)</th>
                        <th class="p-4 cursor-pointer select-none hover:bg-slate-200 w-44 transition" onclick="window.setKasSort('kategori')">Kategori ${getSortIcon('kategori')}</th>
                        <th class="p-4 text-center w-24">Aksi</th>
                    </tr>
                    <tr class="bg-slate-50 border-b">
                        <td class="p-2"></td>
                        <td class="p-2"><input type="text" placeholder="Cari tgl..." value="${window.kasFilters.tanggal}" oninput="window.setKasFilter('tanggal', this.value)" class="w-full border border-slate-300 p-1.5 rounded text-xs font-bold bg-white focus:outline-indigo-500"></td>
                        <td class="p-2"><input type="text" placeholder="Cari keterangan..." value="${window.kasFilters.keterangan}" oninput="window.setKasFilter('keterangan', this.value)" class="w-full border border-slate-300 p-1.5 rounded text-xs font-bold bg-white focus:outline-indigo-500"></td>
                        <td class="p-2" colspan="2">
                            <select onchange="window.setKasFilter('jenis', this.value)" class="w-full border border-slate-300 p-1.5 rounded text-xs font-black text-slate-700 bg-white focus:outline-indigo-500 cursor-pointer">
                                <option value="" ${window.kasFilters.jenis===''?'selected':''}>Semua Transaksi</option>
                                <option value="Pemasukan" ${window.kasFilters.jenis==='Pemasukan'?'selected':''}>Tampilkan Pemasukan</option>
                                <option value="Pengeluaran" ${window.kasFilters.jenis==='Pengeluaran'?'selected':''}>Tampilkan Pengeluaran</option>
                            </select>
                        </td>
                        <td class="p-2"></td>
                        <td class="p-2"><input type="text" placeholder="Cari kategori..." value="${window.kasFilters.kategori}" oninput="window.setKasFilter('kategori', this.value)" class="w-full border border-slate-300 p-1.5 rounded text-xs font-bold bg-white focus:outline-indigo-500"></td>
                        <td class="p-2"></td>
                    </tr>
                </thead>
                <tbody id="tbody-kas"></tbody>
            </table>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div class="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-right shadow-sm">
                <span class="text-xs font-black text-emerald-600 uppercase tracking-widest">Pemasukan (Sesuai Filter)</span>
                <h3 id="kas-filter-masuk" class="text-3xl font-black text-emerald-700 tracking-tighter mt-1">Rp 0</h3>
            </div>
            <div class="bg-rose-50 border border-rose-200 p-5 rounded-2xl text-right shadow-sm">
                <span class="text-xs font-black text-rose-600 uppercase tracking-widest">Pengeluaran (Sesuai Filter)</span>
                <h3 id="kas-filter-keluar" class="text-3xl font-black text-rose-700 tracking-tighter mt-1">Rp 0</h3>
            </div>
            <div class="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl text-right shadow-sm">
                <span class="text-xs font-black text-indigo-600 uppercase tracking-widest">Saldo (Sesuai Filter)</span>
                <h3 id="kas-filter-saldo" class="text-3xl font-black text-indigo-700 tracking-tighter mt-1">Rp 0</h3>
            </div>
        </div>

        <div id="modal-kas-area"></div>
    `;
    window.filterTabKas();
}

window.filterTabKas = function() {
    window.appState = window.appState || {};
    let filtered = [...(window.appState.kas || [])];
    
    const elStart = document.getElementById('kas-filter-start');
    const elEnd = document.getElementById('kas-filter-end');
    if(elStart && elEnd) {
        const start = elStart.value; const end = elEnd.value;
        if(start && end) {
            filtered = filtered.filter(k => {
                let d = k.tanggal || '';
                if (d.includes('/')) {
                    let p = d.split('/');
                    if(p.length === 3) d = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
                }
                return d >= start && d <= end;
            });
        }
    }

    if (window.kasFilters.tanggal) filtered = filtered.filter(k => (k.tanggal||'').includes(window.kasFilters.tanggal));
    if (window.kasFilters.keterangan) filtered = filtered.filter(k => (k.keterangan || '').toLowerCase().includes(window.kasFilters.keterangan));
    if (window.kasFilters.jenis) filtered = filtered.filter(k => k.jenis === window.kasFilters.jenis);
    if (window.kasFilters.kategori) filtered = filtered.filter(k => (k.kategori || '').toLowerCase().includes(window.kasFilters.kategori));

    const f = window.kasSort.field; const o = window.kasSort.order;
    filtered.sort((a, b) => {
        let valA, valB;
        if(f === 'masuk') { valA = a.jenis==='Pemasukan'?Number(a.nominal):0; valB = b.jenis==='Pemasukan'?Number(b.nominal):0; }
        else if(f === 'keluar') { valA = a.jenis==='Pengeluaran'?Number(a.nominal):0; valB = b.jenis==='Pengeluaran'?Number(b.nominal):0; }
        else { valA = String(a[f] || '').toLowerCase(); valB = String(b[f] || '').toLowerCase(); }
        
        if (typeof valA === 'number') return o === 'asc' ? valA - valB : valB - valA;
        return o === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    let tMasuk = filtered.filter(k => k.jenis === 'Pemasukan').reduce((s, k) => s + Number(k.nominal), 0);
    let tKeluar = filtered.filter(k => k.jenis === 'Pengeluaran').reduce((s, k) => s + Number(k.nominal), 0);
    let sld = tMasuk - tKeluar;

    const elMasuk = document.getElementById('kas-filter-masuk'); if(elMasuk) elMasuk.innerText = 'Rp ' + window.fRp(tMasuk);
    const elKeluar = document.getElementById('kas-filter-keluar'); if(elKeluar) elKeluar.innerText = 'Rp ' + window.fRp(tKeluar);
    const elSaldo = document.getElementById('kas-filter-saldo'); if(elSaldo) elSaldo.innerText = 'Rp ' + window.fRp(sld);

    let curBalance = sld;
    let trs = filtered.map((k) => {
        const isM = k.jenis === 'Pemasukan';
        const txtM = isM ? `Rp ${window.fRp(k.nominal)}` : '-';
        const txtK = !isM ? `Rp ${window.fRp(k.nominal)}` : '-';
        const bBal = curBalance;
        curBalance = curBalance - (isM ? Number(k.nominal) : -Number(k.nominal));
        const isCkd = window.kasCheckedIds && window.kasCheckedIds.has(k.id) ? 'checked' : '';
        
        const tglDisplay = k.tanggal && k.tanggal.includes('-') ? k.tanggal.split('-').reverse().join('/') : k.tanggal;

        const saldoColorClass = bBal < 0 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'text-indigo-700';

        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-sm ${isCkd ? 'bg-indigo-50/50' : ''}">
            <td class="p-4 text-center"><input type="checkbox" value="${k.id}" class="kas-chk w-4 h-4 rounded text-indigo-600 cursor-pointer" onchange="window.toggleCheckKas(this.value, this.checked)" ${isCkd}></td>
            <td class="p-4 font-bold text-slate-500 whitespace-nowrap">${tglDisplay}</td>
            <td class="p-4 text-slate-800 font-bold truncate" title="${k.keterangan || '-'}">${k.keterangan || '-'}</td>
            <td class="p-4 font-black text-emerald-600 text-right whitespace-nowrap">${txtM}</td>
            <td class="p-4 font-black text-orange-500 text-right whitespace-nowrap">${txtK}</td>
            <td class="p-4 font-black ${saldoColorClass} text-right whitespace-nowrap">Rp ${window.fRp(bBal)}</td>
            <td class="p-4 whitespace-nowrap"><span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md font-black text-[11px]">${k.kategori}</span></td>
            <td class="p-4 text-center">
                <div class="flex justify-center gap-1">
                    <button onclick="window.editKasFull('${k.id}')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-2.5 py-1.5 rounded-lg transition font-bold text-xs"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="window.hapusKas('${k.id}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-2.5 py-1.5 rounded-lg transition font-bold text-xs"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const tbody = document.getElementById('tbody-kas');
    if(tbody) tbody.innerHTML = trs || '<tr><td colspan="8" class="p-10 text-center text-slate-400 font-bold">Tidak ada data transaksi yang sesuai filter.</td></tr>';
};

window.editKasFull = function(id) {
    const trData = (window.appState.kas || []).find(k => k.id === id);
    if(!trData) return alert("Data transaksi tidak ditemukan.");

    window.verifikasiTokenOtorisasi(`Edit Kas: ${trData.keterangan} (Rp ${window.fRp(trData.nominal)})`).then((isValid) => {
        if(!isValid) return;
        window.bukaModalKas('edit', trData);
    });
};

window.autoPredictKategori = function(elKet) {
    const row = elKet.closest('.kas-row');
    const text = elKet.value.toLowerCase();
    const selJenis = row.querySelector('.kas-jenis');
    const selKat = row.querySelector('.kas-kat');
    const lembaga = window.appState.lembaga[0] || {};
    
    let jenisDitemukan = null; let katDitemukan = null;

    const rules = [
        { keywords: ['spp', 'syahriah', 'bulanan', 'iuran', 'smp', 'sma', 'sd', 'tk', 'paud'], jenis: 'Pemasukan', match: 'spp' },
        { keywords: ['donasi', 'infaq', 'shodaqoh', 'infak', 'sumbangan', 'sedekah', 'zakat'], jenis: 'Pemasukan', match: 'donasi' },
        { keywords: ['bantuan', 'bos', 'pemerintah', 'dinas', 'kemenag'], jenis: 'Pemasukan', match: 'bantuan' },
        { keywords: ['untung', 'usaha', 'laba', 'jualan', 'koperasi', 'kantin', 'bazar'], jenis: 'Pemasukan', match: 'usaha' },
        { keywords: ['hibah', 'wakaf'], jenis: 'Pemasukan', match: 'hibah' },
        { keywords: ['buku', 'pembangunan', 'seragam', 'ujian', 'denda', 'pendaftaran'], jenis: 'Pemasukan', match: 'pembayaran lain' },
        { keywords: ['gaji', 'honor', 'bisyarah', 'insentif', 'upah', 'tunjangan', 'thr', 'lembur'], jenis: 'Pengeluaran', match: 'gaji' },
        { keywords: ['atk', 'kertas', 'buku', 'pena', 'pensil', 'operasional', 'print', 'fotocopy', 'spidol', 'tinta'], jenis: 'Pengeluaran', match: 'operasional' },
        { keywords: ['listrik', 'air', 'pdam', 'token', 'pln', 'pulsa', 'internet', 'wifi', 'indihome'], jenis: 'Pengeluaran', match: 'listrik' },
        { keywords: ['gedung', 'cat', 'semen', 'paku', 'renovasi', 'bangunan', 'sarpras', 'meja', 'kursi', 'perbaikan', 'atap'], jenis: 'Pengeluaran', match: 'sarpras' },
        { keywords: ['konsumsi', 'makan', 'minum', 'beras', 'dapur', 'snack', 'kue', 'galon', 'lauk'], jenis: 'Pengeluaran', match: 'konsumsi' },
        { keywords: ['bensin', 'transport', 'tiket', 'tol', 'parkir', 'ojek', 'perjalanan', 'dinas luar'], jenis: 'Pengeluaran', match: 'transport' },
        { keywords: ['obat', 'sakit', 'kesehatan', 'rs', 'klinik', 'puskesmas', 'dokter', 'p3k', 'medis'], jenis: 'Pengeluaran', match: 'kesehatan' }
    ];

    for (let rule of rules) {
        if (rule.keywords.some(k => text.includes(k))) {
            jenisDitemukan = rule.jenis;
            const opsiKategori = jenisDitemukan === 'Pemasukan' ? (lembaga.katMasuk || window.defaultKatMasuk) : (lembaga.katKeluar || window.defaultKatKeluar);
            katDitemukan = opsiKategori.find(k => k.toLowerCase().includes(rule.match)) || opsiKategori[0]; break;
        }
    }

    if (jenisDitemukan && katDitemukan) {
        selJenis.value = jenisDitemukan; window.updateDropdownKategori(selJenis); selKat.value = katDitemukan;
    }
};

window.bukaModalKategoriKas = function() {
    const lembaga = window.appState.lembaga[0] || {};
    const katMasuk = (lembaga.katMasuk || window.defaultKatMasuk).join('\n');
    const katKeluar = (lembaga.katKeluar || window.defaultKatKeluar).join('\n');

    let modal = document.createElement('div'); modal.id = 'modal-kat-kas';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 md:p-8 flex flex-col border-t-4 border-indigo-500">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
                <div><h3 class="text-2xl font-black text-indigo-800"><i class="fa-solid fa-tags mr-2"></i> Master Kategori Kas</h3><p class="text-sm font-bold text-slate-500 mt-1">Pisahkan tiap kategori dengan baris baru (Enter).</p></div>
                <button onclick="document.getElementById('modal-kat-kas').remove()" class="text-slate-400 hover:text-red-500 text-3xl font-bold transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <label class="font-black text-emerald-600 mb-2 block"><i class="fa-solid fa-arrow-trend-up"></i> Kategori Pemasukan</label>
                    <textarea id="val-kat-masuk" rows="8" class="w-full border-2 border-emerald-200 bg-emerald-50 p-3 rounded-xl font-bold text-emerald-800 focus:outline-emerald-500 leading-relaxed">${katMasuk}</textarea>
                </div>
                <div>
                    <label class="font-black text-rose-600 mb-2 block"><i class="fa-solid fa-arrow-trend-down"></i> Kategori Pengeluaran</label>
                    <textarea id="val-kat-keluar" rows="8" class="w-full border-2 border-rose-200 bg-rose-50 p-3 rounded-xl font-bold text-rose-800 focus:outline-rose-500 leading-relaxed">${katKeluar}</textarea>
                </div>
            </div>
            <div class="mt-6 border-t pt-4 flex justify-end">
                <button onclick="window.simpanKategoriKas(this)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-xl shadow-lg transition"><i class="fa-solid fa-save mr-2"></i> Simpan Kategori</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.simpanKategoriKas = async function(btn) {
    const masuk = document.getElementById('val-kat-masuk').value.split('\n').map(x=>x.trim()).filter(x=>x);
    const keluar = document.getElementById('val-kat-keluar').value.split('\n').map(x=>x.trim()).filter(x=>x);
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;
    try {
        const idLembaga = window.appState.lembaga[0].id;
        await updateDoc(doc(db, "Lembaga", idLembaga), { katMasuk: masuk, katKeluar: keluar });
        window.appState.lembaga[0].katMasuk = masuk; window.appState.lembaga[0].katKeluar = keluar;
        alert("Kategori Kas Berhasil Diperbarui!"); document.getElementById('modal-kat-kas').remove();
    } catch(e) { alert("Gagal menyimpan kategori."); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Kategori'; }
};

window.updateDropdownKategori = function(selJenis) {
    const row = selJenis.closest('.kas-row'); const selKat = row.querySelector('.kas-kat');
    const lembaga = window.appState.lembaga[0] || {};
    const arrKat = selJenis.value === 'Pemasukan' ? (lembaga.katMasuk || window.defaultKatMasuk) : (lembaga.katKeluar || window.defaultKatKeluar);
    selKat.innerHTML = arrKat.map(k => `<option value="${k}">${k}</option>`).join('');
};

window.saveLocalKasBulk = function() {
    const modal = document.getElementById('modal-kas');
    if (!modal) return;
    const title = modal.querySelector('h3').innerText;
    if (!title.includes('Bulk')) return;

    let dataArr = [];
    document.querySelectorAll('.kas-row').forEach(row => {
        dataArr.push({
            tgl: row.querySelector('.kas-tgl').value,
            jen: row.querySelector('.kas-jenis').value,
            kat: row.querySelector('.kas-kat').value,
            ket: row.querySelector('.kas-ket').value,
            nom: row.querySelector('.kas-nom').value
        });
    });
    localStorage.setItem('kas_bulk_temp', JSON.stringify(dataArr));
};

window.loadLocalKasBulk = function() {
    const raw = localStorage.getItem('kas_bulk_temp');
    if (!raw) return;
    try {
        const dataArr = JSON.parse(raw);
        const rows = document.querySelectorAll('.kas-row');
        dataArr.forEach((data, i) => {
            if (rows[i]) {
                if (data.tgl) rows[i].querySelector('.kas-tgl').value = data.tgl;
                if (data.jen) {
                    rows[i].querySelector('.kas-jenis').value = data.jen;
                    window.updateDropdownKategori(rows[i].querySelector('.kas-jenis'));
                }
                if (data.kat) rows[i].querySelector('.kas-kat').value = data.kat;
                if (data.ket) rows[i].querySelector('.kas-ket').value = data.ket;
                if (data.nom) rows[i].querySelector('.kas-nom').value = data.nom;
            }
        });
    } catch(e) {}
};

window.bukaModalKas = function(mode, editData = null) {
    const lembaga = window.appState.lembaga[0] || {};
    let rows = ''; const limit = mode === 'bulk' ? 5 : 1; 

    for(let i=0; i<limit; i++) {
        const data = mode === 'edit' ? editData : { tanggal: getTodayStr(), jenis: 'Pemasukan', kategori: '', keterangan: '', nominal: '', id: '' };
        const optKategori = (data.jenis === 'Pemasukan' ? (lembaga.katMasuk || window.defaultKatMasuk) : (lembaga.katKeluar || window.defaultKatKeluar)).map(k => `<option value="${k}" ${data.kategori===k?'selected':''}>${k}</option>`).join('');

        rows += `
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl kas-row hover:border-indigo-300 transition">
            <input type="hidden" class="kas-id" value="${data.id || ''}">
            <div>
                <label class="text-[10px] font-black text-slate-400 block mb-1 uppercase">Tanggal</label>
                <input type="date" class="kas-tgl border-2 border-slate-200 p-2.5 rounded-lg text-xs font-bold focus:outline-indigo-500 w-full bg-white" value="${data.tanggal}" oninput="window.saveLocalKasBulk()" required>
            </div>
            <div>
                <label class="text-[10px] font-black text-slate-400 block mb-1 uppercase">Jenis</label>
                <select class="kas-jenis border-2 border-slate-200 p-2.5 rounded-lg text-xs font-black focus:outline-indigo-500 w-full cursor-pointer bg-white" onchange="window.updateDropdownKategori(this); window.saveLocalKasBulk();" required>
                    <option value="Pemasukan" class="text-emerald-600" ${data.jenis==='Pemasukan'?'selected':''}>Pemasukan (+)</option>
                    <option value="Pengeluaran" class="text-rose-600" ${data.jenis==='Pengeluaran'?'selected':''}>Pengeluaran (-)</option>
                </select>
            </div>
            <div>
                <label class="text-[10px] font-black text-slate-400 block mb-1 uppercase">Kategori</label>
                <select class="kas-kat border-2 border-slate-200 p-2.5 rounded-lg text-xs font-bold focus:outline-indigo-500 w-full cursor-pointer bg-white" onchange="window.saveLocalKasBulk()" required>${optKategori}</select>
            </div>
            <div>
                <label class="text-[10px] font-black text-slate-400 block mb-1 uppercase">Keterangan (Required)</label>
                <input type="text" class="kas-ket border-2 border-slate-200 p-2.5 rounded-lg text-xs font-bold focus:outline-indigo-500 w-full bg-white" oninput="window.autoPredictKategori(this); window.saveLocalKasBulk();" value="${data.keterangan || ''}" placeholder="Cth: Beli Spidol" required>
            </div>
            <div>
                <label class="text-[10px] font-black text-slate-400 block mb-1 uppercase">Nominal (Required)</label>
                <input type="text" oninput="window.inRp(this); window.saveLocalKasBulk();" class="kas-nom border-2 border-slate-200 p-2.5 rounded-lg text-xs font-black text-indigo-700 bg-indigo-50 focus:outline-indigo-500 w-full placeholder-indigo-300" value="${data.nominal ? window.fRp(data.nominal) : ''}" placeholder="Rp 0" required>
            </div>
        </div>`;
    }
    
    let title = 'Tambah Transaksi Kas';
    let noticeHtml = '';
    if(mode === 'bulk') {
        title = 'Input Banyak Transaksi (Bulk)';
        noticeHtml = '<p class="text-[10px] text-slate-400 mt-2 font-bold text-center"><i class="fa-solid fa-circle-info mr-1"></i> <strong>Sistem Auto-Save (Draft):</strong> Ketikan Anda aman jika tidak sengaja keluar. Data otomatis kembali saat membuka menu Bulk ini lagi.</p>';
    }
    if(mode === 'edit') title = 'Edit Transaksi Kas';

    document.getElementById('modal-kas-area').innerHTML = `<div id="modal-kas" class="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up"><div class="bg-white rounded-3xl shadow-2xl w-full max-w-6xl p-6 md:p-8 flex flex-col max-h-[90vh] border-t-4 border-indigo-500"><div class="flex justify-between items-start mb-6 border-b pb-4"><h3 class="text-2xl font-black text-indigo-800"><i class="fa-solid fa-file-invoice mr-2"></i> ${title}</h3><button type="button" onclick="document.getElementById('modal-kas').remove()" class="text-slate-400 hover:text-red-500 text-3xl font-bold transition bg-slate-100 hover:bg-red-50 w-10 h-10 rounded-full flex items-center justify-center"><i class="fa-solid fa-times"></i></button></div><form onsubmit="window.simpanKas(event)" class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">${rows}${noticeHtml}<div class="mt-6 border-t pt-6 flex gap-3 justify-end"><button type="button" onclick="document.getElementById('modal-kas').remove()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-8 py-4 rounded-xl transition">Batal</button><button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-xl shadow-xl transition transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Transaksi</button></div></form></div></div>`;
    
    if(mode === 'bulk') window.loadLocalKasBulk();
};

window.simpanKas = async function(e) {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;
    try {
        const batch = writeBatch(db); let hasData = false;
        const isBulk = document.querySelector('#modal-kas h3').innerText.includes('Bulk');
        
        document.querySelectorAll('.kas-row').forEach(r => {
            const id = r.querySelector('.kas-id').value;
            const tgl = r.querySelector('.kas-tgl').value; const jen = r.querySelector('.kas-jenis').value; const kat = r.querySelector('.kas-kat').value; const ket = r.querySelector('.kas-ket').value; const nom = window.pRp(r.querySelector('.kas-nom').value);
            if(tgl && jen && kat && nom) { 
                const docRef = id ? doc(db, "KasLembaga", id) : doc(collection(db, "KasLembaga"));
                batch.set(docRef, { tanggal: tgl, jenis: jen, kategori: kat, keterangan: ket, nominal: nom, createdAt: new Date().toISOString() }, {merge: true}); 
                hasData = true; 
            }
        });
        if(!hasData) throw new Error("Tidak ada data valid diinput."); 
        
        await batch.commit(); 
        if(isBulk) localStorage.removeItem('kas_bulk_temp');
        alert("Transaksi Kas Berhasil Disimpan!"); document.getElementById('modal-kas').remove(); window.muatUlangTabelKas();
    } catch(err) { alert(err.message || "Gagal!"); btn.innerHTML = ori; btn.disabled = false; }
};

window.hapusKas = async function(idKas) {
    const kasData = (window.appState.kas || []).find(k => k.id === idKas);
    if(!kasData) return alert("Data Kas tidak ditemukan");

    if(!confirm("Yakin ingin menghapus transaksi ini? Tindakan ini membutuhkan otorisasi token.\n(Jika ini adalah SPP/Tagihan Lain, status lunas siswa terkait juga akan dibatalkan otomatis)")) return;
    
    window.verifikasiTokenOtorisasi(`Hapus Kas: ${kasData.keterangan} (Rp ${window.fRp(kasData.nominal)})`).then(async (isValid) => {
        if(!isValid) return;
        
        try {
            const batch = writeBatch(db);
            
            if(kasData.idSiswa && kasData.idTagihan) {
                let anak = (window.appState.anak || []).find(a => a.id === kasData.idSiswa);
                if(anak) {
                    let tagihanIndex = (anak.tagihanLain || []).findIndex(t => t.id === kasData.idTagihan);
                    if(tagihanIndex > -1) {
                        let currentTerbayar = anak.tagihanLain[tagihanIndex].terbayar || 0;
                        anak.tagihanLain[tagihanIndex].terbayar = Math.max(0, currentTerbayar - kasData.nominal);
                        anak.tagihanLain[tagihanIndex].lunas = (anak.tagihanLain[tagihanIndex].terbayar >= anak.tagihanLain[tagihanIndex].nominal);
                        batch.update(doc(db, "Anak", kasData.idSiswa), { tagihanLain: anak.tagihanLain });
                    }
                }
            }
            
            const sppTerkait = (window.appState.spp || []).filter(s => s.idKas === idKas);
            sppTerkait.forEach(spp => {
                batch.delete(doc(db, "PembayaranSPP", spp.id));
                window.appState.spp = window.appState.spp.filter(s => s.id !== spp.id);
            });

            batch.delete(doc(db, "KasLembaga", idKas));
            await batch.commit();
            
            window.appState.kas = window.appState.kas.filter(k => k.id !== idKas);
            alert("Transaksi Kas Berhasil Dihapus beserta Status Tagihan Siswa (Jika Ada)!");
            window.muatUlangTabelKas();
            if(window.currentKeuanganTab === 'dasbor') window.renderTabDasbor();
            if(window.currentKeuanganTab === 'spp') window.filterTabSPP();
        } catch(e) { alert("Gagal menghapus data: " + e.message); }
    });
};

window.eksporKasCSV = function() {
    let kas = [...(window.appState.kas || [])];
    if (window.kasFilters.tanggal) kas = kas.filter(k => k.tanggal.includes(window.kasFilters.tanggal));
    if (window.kasFilters.keterangan) kas = kas.filter(k => (k.keterangan || '').toLowerCase().includes(window.kasFilters.keterangan));
    if (window.kasFilters.jenis) kas = kas.filter(k => k.jenis === window.kasFilters.jenis);
    if (window.kasFilters.kategori) kas = kas.filter(k => (k.kategori || '').toLowerCase().includes(window.kasFilters.kategori));

    if (kas.length === 0) return alert("Belum ada data untuk diekspor pada filter ini.");
    
    let csvContent = "sep=;\r\nTanggal;jenis;kategori;keterangan;nominal\r\n";
    kas.forEach(k => {
        let cleanKet = String(k.keterangan || '-').replace(/"/g, '""').replace(/\n/g, ' ');
        let tglExp = k.tanggal && k.tanggal.includes('-') ? k.tanggal.split('-').reverse().join('/') : k.tanggal;
        csvContent += `"${tglExp}";"${k.jenis}";"${k.kategori}";"${cleanKet}";${k.nominal}\r\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Laporan_Kas_Lembaga.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

window.imporKasCSV = function(event) {
    const file = event.target.files[0]; if (!file) return; 
    
    const lblButton = event.target.parentElement;
    const originalContent = lblButton.innerHTML;
    lblButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Memproses...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const lines = e.target.result.split('\n'); 
        let successCount = 0; let dupCount = 0;
        const batch = writeBatch(db);
        const existingData = window.appState.kas || [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim() || lines[i].startsWith('sep=')) continue;
            
            const cols = lines[i].split(/;|,/).map(col => col.replace(/(^"|"$)/g, '').trim());
            
            if (cols && cols.length >= 5) {
                let tgl = cols[0];
                
                if (tgl.includes('/') || tgl.includes('-')) {
                    let p = tgl.split(/[\/\-]/);
                    if (p.length === 3) {
                        let year, month, day;
                        
                        if (p[0].length === 4) {
                            year = p[0]; month = p[1]; day = p[2];
                        } else {
                            year = p[2].length === 2 ? '20' + p[2] : p[2];
                            month = p[1]; day = p[0];
                        }
                        
                        tgl = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                }

                const jen = cols[1]; const kat = cols[2]; const ket = cols[3]; const nom = Number(cols[4]);

                if (tgl && jen && kat && !isNaN(nom) && nom > 0) {
                    const isDuplicate = existingData.some(k => k.tanggal === tgl && k.jenis === jen && k.kategori === kat && k.keterangan === ket && Number(k.nominal) === nom);
                    if(isDuplicate) { dupCount++; continue; }

                    batch.set(doc(collection(db, "KasLembaga")), { tanggal: tgl, jenis: jen, kategori: kat, keterangan: ket, nominal: nom, createdAt: new Date().toISOString() });
                    successCount++;
                }
            }
        }

        if (successCount > 0) {
            try {
                await batch.commit(); 
                alert(`Berhasil mengimpor ${successCount} transaksi baru dari CSV! ${dupCount > 0 ? `\n(Aman: Mengabaikan ${dupCount} data karena terdeteksi sebagai Duplikat)` : ''}`);
                window.muatUlangTabelKas(); 
            } catch(err) { alert("Gagal menyimpan data impor ke database."); lblButton.innerHTML = originalContent; }
        } else if (dupCount > 0) {
            alert(`Impor Dibatalkan.\nSistem mendeteksi bahwa keseluruhan ${dupCount} baris data CSV tersebut DUPLIKAT (sudah tercatat di Buku Kas).`);
            lblButton.innerHTML = originalContent;
        } else { 
            alert("Format CSV salah. Pastikan format tabel impor sama persis dengan tabel saat Anda melakukan Ekspor CSV."); 
            lblButton.innerHTML = originalContent; 
        }
    };
    reader.readAsText(file);
};

// ==========================================
// TAB PEMBAYARAN SPP (PENCARIAN, FILTER, KELOMPOK KELAS)
// ==========================================
window.sppFilters = { cari: '', kelas: '', bulan: '' };

window.renderTabSPP = function() {
    const area = document.getElementById('keuangan-content-area');
    const d = new Date();
    const curMonthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    
    if (!window.sppFilters.bulan) window.sppFilters.bulan = curMonthStr;

    const anakList = (window.appState.anak || []).filter(a => a.status !== 'Lulus');
    const listKelas = [...new Set(anakList.map(a => a.kelas || 'Tanpa Kelas'))].sort();
    const optKelas = listKelas.map(k => `<option value="${k}" ${window.sppFilters.kelas === k ? 'selected' : ''}>${k}</option>`).join('');

    area.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-t-4 border-orange-500 mb-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b pb-4">
                <div>
                    <h3 class="font-black text-2xl text-slate-800"><i class="fa-solid fa-hand-holding-dollar text-orange-500 mr-2"></i> Manajemen Pembayaran SPP</h3>
                    <p class="text-sm font-bold text-slate-500 mt-1">Sistem otomatis tersinkron dengan Buku Kas Lembaga.</p>
                </div>
                <button onclick="window.bukaModalTagihanGlobal()" class="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black shadow-md transition flex items-center"><i class="fa-solid fa-gears mr-2"></i> Pengaturan Tagihan Global</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="spp-stats-area">
                </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Cari Nama Siswa</label>
                    <input type="text" id="spp-cari" placeholder="Ketik nama..." value="${window.sppFilters.cari}" oninput="window.setSppFilter('cari', this.value)" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-orange-500">
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Filter Kelas</label>
                    <select id="spp-kelas" onchange="window.setSppFilter('kelas', this.value)" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-orange-500 cursor-pointer">
                        <option value="">Semua Kelas</option>
                        ${optKelas}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Bulan SPP (Target)</label>
                    <input type="month" id="spp-bulan" value="${window.sppFilters.bulan}" onchange="window.setSppFilter('bulan', this.value)" class="w-full border-2 border-orange-300 p-2.5 rounded-xl font-black text-orange-700 bg-orange-50 focus:outline-orange-500 cursor-pointer">
                </div>
            </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar">
            <table class="w-full text-left table-fixed min-w-[1050px]">
                <thead class="bg-slate-100 text-slate-600 border-b-2 text-xs uppercase font-black sticky top-0 z-10">
                    <tr>
                        <th class="p-4 w-12 text-center">No</th>
                        <th class="p-4 w-56">Nama Siswa</th>
                        <th class="p-4 w-32">Status Bulan Ini</th>
                        <th class="p-4 w-40">Total Tunggakan</th>
                        <th class="p-4 w-36">Nominal Bayar</th>
                        <th class="p-4 w-32">Tgl Bayar</th>
                        <th class="p-4 text-center w-56">Aksi Cepat</th>
                    </tr>
                </thead>
                <tbody id="tbody-spp"></tbody>
            </table>
        </div>
        <div id="modal-spp-area"></div>
        <div id="hidden-kwitansi-container" class="hidden absolute top-[-9999px] bg-white"></div>
    `;

    window.filterTabSPP();
};

window.setSppFilter = function(key, val) {
    window.sppFilters[key] = val;
    window.filterTabSPP();
};

window.filterTabSPP = function() {
    const cari = window.sppFilters.cari.toLowerCase();
    const kelas = window.sppFilters.kelas;
    const bulan = window.sppFilters.bulan;

    let anakList = (window.appState.anak || []).filter(a => a.status !== 'Lulus');
    let sppList = window.appState.spp || [];

    if (cari) anakList = anakList.filter(a => (a.nama || '').toLowerCase().includes(cari));
    if (kelas) anakList = anakList.filter(a => (a.kelas || 'Tanpa Kelas') === kelas);

    const grouped = {};
    anakList.forEach(a => {
        const k = a.kelas || 'Tanpa Kelas';
        if(!grouped[k]) grouped[k] = [];
        grouped[k].push(a);
    });

    const sortedKelas = Object.keys(grouped).sort();
    let trs = '';
    let totalSiswa = anakList.length;
    let totalLunas = 0;

    sortedKelas.forEach(k => {
        trs += `
        <tr class="bg-indigo-50 border-b border-indigo-100">
            <td colspan="7" class="p-3 px-5 font-black text-indigo-800 text-sm"><i class="fa-solid fa-layer-group mr-2"></i> KELAS: ${k} <span class="bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] uppercase ml-2">${grouped[k].length} Siswa</span></td>
        </tr>`;

        grouped[k].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

        grouped[k].forEach((anak, idx) => {
            let payment = sppList.find(s => s.idSiswa === anak.id && s.bulanSpp === bulan);
            if (payment) totalLunas++;

            let tunggakan = window.hitungTunggakanSiswa(anak.id, sppList);
            let badgeTunggakan = tunggakan > 0 
                ? `<span class="text-rose-600 font-black"><i class="fa-solid fa-triangle-exclamation"></i> ${tunggakan} Bulan</span>` 
                : `<span class="text-emerald-500 font-bold"><i class="fa-solid fa-check"></i> Tidak Ada</span>`;

            let statusBadge = payment 
                ? `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md font-black text-xs border border-emerald-200"><i class="fa-solid fa-check-double mr-1"></i> Lunas</span>` 
                : `<span class="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md font-black text-xs border border-rose-200"><i class="fa-solid fa-xmark mr-1"></i> Menunggak</span>`;
            
            let actionBtn = payment
                ? `<button onclick="window.hapusBayarSPP('${payment.id}', '${payment.idKas}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1.5 rounded-lg transition font-bold text-[10px] mr-1 shadow-sm" title="Batal"><i class="fa-solid fa-trash"></i></button>
                   <button onclick="window.cetakKwitansiSPP('${payment.id}')" class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-2 py-1.5 rounded-lg transition font-bold text-[10px] mr-1 shadow-sm" title="Cetak Kwitansi"><i class="fa-solid fa-print"></i></button>`
                : `<button onclick="window.bukaModalBayarSPP('${anak.id}', '${anak.nama}', '${anak.kelas || '-'}', '${bulan}', ${anak.sppBulanan || 0})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition font-bold text-[10px] mr-1 shadow-sm" title="Setor Pembayaran SPP"><i class="fa-solid fa-cash-register mr-1"></i> Bayar SPP</button>`;

            actionBtn += `
                <button onclick="window.bukaModalBayarLain('${anak.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded-lg transition font-bold text-[10px] mr-1 shadow-sm" title="Bayar Tagihan Lainnya"><i class="fa-solid fa-file-invoice-dollar"></i></button>
                <button onclick="window.bukaModalSetTagihan('${anak.id}')" class="bg-slate-700 hover:bg-slate-800 text-white px-2 py-1.5 rounded-lg transition font-bold text-[10px] shadow-sm" title="Penyesuaian Tagihan Siswa"><i class="fa-solid fa-gear"></i></button>
            `;

            let displayNominalSPP = payment ? 'Rp ' + window.fRp(payment.nominal) : (anak.sppBulanan ? 'Target: Rp '+window.fRp(anak.sppBulanan) : '-');

            trs += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-sm">
                <td class="p-4 text-center font-bold text-slate-400">${idx + 1}</td>
                <td class="p-4 font-black text-slate-800">${anak.nama}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4">${badgeTunggakan}</td>
                <td class="p-4 font-black text-slate-700">${displayNominalSPP}</td>
                <td class="p-4 font-bold text-slate-500">${payment ? (payment.tanggalBayar && payment.tanggalBayar.includes('-') ? payment.tanggalBayar.split('-').reverse().join('/') : payment.tanggalBayar) : '-'}</td>
                <td class="p-4 text-center whitespace-nowrap">${actionBtn}</td>
            </tr>`;
        });
    });

    const statsArea = document.getElementById('spp-stats-area');
    if(statsArea) {
        statsArea.innerHTML = `
            <div class="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Siswa Sesuai Filter</p><h3 class="text-2xl font-black text-slate-800">${totalSiswa} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl"><i class="fa-solid fa-users"></i></div>
            </div>
            <div class="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Lunas Sesuai Filter</p><h3 class="text-2xl font-black text-emerald-700">${totalLunas} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-emerald-200 text-emerald-700 flex items-center justify-center text-xl"><i class="fa-solid fa-check-double"></i></div>
            </div>
            <div class="bg-rose-50 border border-rose-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div><p class="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-1">Menunggak Sesuai Filter</p><h3 class="text-2xl font-black text-rose-700">${totalSiswa - totalLunas} Siswa</h3></div>
                <div class="w-12 h-12 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center text-xl"><i class="fa-solid fa-triangle-exclamation"></i></div>
            </div>
        `;
    }

    const tbody = document.getElementById('tbody-spp');
    if (tbody) tbody.innerHTML = trs || '<tr><td colspan="7" class="p-10 text-center text-slate-400 font-bold">Tidak ada data siswa yang cocok.</td></tr>';
};

window.bukaModalTagihanGlobal = function() {
    const lembaga = window.appState.lembaga[0] || {};
    let sppGlobal = lembaga.sppBulananGlobal || '';
    let tagihanLain = lembaga.tagihanLainGlobal || [];

    let tagihanHTML = tagihanLain.map((t) => `
        <div class="flex flex-col sm:flex-row gap-2 mb-2 tagihan-item-global bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <input type="text" placeholder="Nama (Misal: Uang Buku)" value="${t.nama}" class="flex-1 border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500" required>
            <select class="border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500 cursor-pointer bg-slate-50 text-slate-600" required>
                <option value="1x" ${t.metode === '1x' ? 'selected' : ''}>Hanya 1x</option>
                <option value="Tahun" ${t.metode === 'Tahun' ? 'selected' : ''}>Per Tahun</option>
                <option value="Semester" ${t.metode === 'Semester' ? 'selected' : ''}>Per Semester</option>
                <option value="Bulan" ${t.metode === 'Bulan' ? 'selected' : ''}>Per Bulan</option>
                <option value="Minggu" ${t.metode === 'Minggu' ? 'selected' : ''}>Per Minggu</option>
            </select>
            <input type="text" oninput="window.inRp(this)" placeholder="Nominal" value="${window.fRp(t.nominal)}" class="w-1/3 border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500" required>
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 rounded transition font-bold"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');

    let modal = document.createElement('div'); modal.id = 'modal-tagihan-global';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 flex flex-col border-t-4 border-orange-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-gears text-orange-500 mr-2"></i> Pengaturan Tagihan Global</h3><p class="text-xs font-bold text-slate-500">Terapkan besaran tagihan ke semua siswa secara massal.</p></div>
                <button type="button" onclick="document.getElementById('modal-tagihan-global').remove()" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <form onsubmit="window.simpanTagihanGlobal(event)">
                <div class="mb-6">
                    <label class="text-xs font-black text-slate-500 uppercase block mb-2">Target SPP Per Bulan (Semua Siswa)</label>
                    <input type="text" id="global-spp-nom" oninput="window.inRp(this)" value="${sppGlobal ? window.fRp(sppGlobal) : ''}" placeholder="Misal: 100.000" class="w-full border-2 border-orange-200 bg-orange-50 p-3 rounded-xl font-black text-xl text-orange-700 focus:outline-orange-500">
                </div>
                
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs font-black text-slate-500 uppercase block">Tagihan Lainnya (Buku, Gedung, dll)</label>
                        <button type="button" onclick="window.tambahBarisTagihanGlobal()" class="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition shadow-sm"><i class="fa-solid fa-plus"></i> Tambah Tagihan</button>
                    </div>
                    <div id="wadah-tagihan-global" class="bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[50px]">
                        ${tagihanHTML || '<p class="text-xs text-center text-slate-400 font-bold italic py-4" id="msg-kosong-global">Belum ada tagihan lain.</p>'}
                    </div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" class="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl transition shadow-md w-full"><i class="fa-solid fa-bolt mr-2"></i> Terapkan ke Semua Siswa</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
};

window.tambahBarisTagihanGlobal = function() {
    let msg = document.getElementById('msg-kosong-global'); if(msg) msg.remove();
    let div = document.createElement('div');
    div.className = 'flex flex-col sm:flex-row gap-2 mb-2 tagihan-item-global animate-fade-in bg-white p-2 rounded-lg border border-slate-200 shadow-sm';
    div.innerHTML = `
        <input type="text" placeholder="Nama Tagihan" class="flex-1 border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500" required>
        <select class="border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500 cursor-pointer bg-slate-50 text-slate-600" required>
            <option value="1x">Hanya 1x</option>
            <option value="Tahun">Per Tahun</option>
            <option value="Semester">Per Semester</option>
            <option value="Bulan">Per Bulan</option>
            <option value="Minggu">Per Minggu</option>
        </select>
        <input type="text" oninput="window.inRp(this)" placeholder="Nominal" class="w-1/3 border border-slate-300 p-2 rounded text-sm font-bold focus:outline-orange-500" required>
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 rounded transition font-bold"><i class="fa-solid fa-trash"></i></button>
    `;
    document.getElementById('wadah-tagihan-global').appendChild(div);
};

window.simpanTagihanGlobal = async function(e) {
    e.preventDefault();
    if(!confirm("Tindakan ini akan menimpa (overwrite) target SPP dan Tagihan Lain SEMUA SISWA aktif dengan nominal ini. Anda yakin?")) return;
    
    const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menerapkan...'; btn.disabled = true;

    const sppNom = window.pRp(document.getElementById('global-spp-nom').value);
    const tagihanNodes = document.querySelectorAll('.tagihan-item-global');
    let tagihanLain = [];
    tagihanNodes.forEach(node => {
        const inputs = node.querySelectorAll('input');
        const selects = node.querySelectorAll('select');
        const nama = inputs[0].value.trim();
        const metode = selects[0].value;
        const nom = window.pRp(inputs[1].value);
        if(nama && nom > 0) tagihanLain.push({ id: Date.now().toString() + Math.floor(Math.random()*100), nama: nama, metode: metode, nominal: nom, lunas: false });
    });

    try {
        const idLembaga = window.appState.lembaga[0].id;
        const batch = writeBatch(db);
        
        batch.update(doc(db, "Lembaga", idLembaga), { sppBulananGlobal: sppNom, tagihanLainGlobal: tagihanLain });
        
        window.appState.anak.forEach(a => {
            if (a.status !== 'Lulus') {
                batch.update(doc(db, "Anak", a.id), { sppBulanan: sppNom, tagihanLain: tagihanLain });
                a.sppBulanan = sppNom;
                a.tagihanLain = tagihanLain;
            }
        });

        window.appState.lembaga[0].sppBulananGlobal = sppNom;
        window.appState.lembaga[0].tagihanLainGlobal = tagihanLain;

        await batch.commit();
        alert("Berhasil! Tagihan global diterapkan ke SEMUA siswa aktif.");
        document.getElementById('modal-tagihan-global').remove();
        window.filterTabSPP();
    } catch (err) { alert("Gagal menerapkan tagihan."); btn.innerHTML = ori; btn.disabled = false; }
};

window.bukaModalSetTagihan = function(idSiswa) {
    let anak = (window.appState.anak || []).find(a => a.id === idSiswa);
    if(!anak) return;

    let tagihanHTML = (anak.tagihanLain || []).map((t) => `
        <div class="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl mb-2 tagihan-item-siswa shadow-sm" data-id="${t.id}">
            <div>
                <p class="font-black text-slate-800">${t.nama}</p>
                <p class="font-bold text-slate-500 text-xs mt-0.5">Rp ${window.fRp(t.nominal)} <span class="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black ml-1 text-[9px]">${t.metode || '1x'}</span></p>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition font-bold text-xs"><i class="fa-solid fa-trash mr-1"></i> Hapus</button>
        </div>
    `).join('');

    let modal = document.createElement('div'); modal.id = 'modal-set-tagihan';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col border-t-4 border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-user-gear text-slate-700 mr-2"></i> Penyesuaian Tagihan Siswa</h3><p class="text-xs font-bold text-slate-500">${anak.nama} (${anak.kelas || '-'})</p></div>
                <button type="button" onclick="document.getElementById('modal-set-tagihan').remove()" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <form onsubmit="window.simpanSetTagihan(event, '${idSiswa}')">
                <div class="mb-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <label class="text-xs font-black text-indigo-800 uppercase block mb-1">Target SPP Per Bulan</label>
                    <p class="text-xl font-black text-indigo-600">Rp ${window.fRp(anak.sppBulanan || 0)}</p>
                    <p class="text-[10px] font-bold text-indigo-400 mt-1">Ditetapkan dari Pengaturan Global</p>
                </div>
                
                <div class="mb-4">
                    <label class="text-xs font-black text-slate-500 uppercase block mb-2">Hapus Tagihan Yang Tidak Diambil Siswa Ini</label>
                    <div id="wadah-tagihan-lain" class="bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[50px]">
                        ${tagihanHTML || '<p class="text-xs text-center text-slate-400 font-bold italic py-4" id="msg-kosong-tagihan">Tidak ada tagihan tambahan.</p>'}
                    </div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" class="bg-slate-800 hover:bg-slate-900 text-white font-black px-6 py-3 rounded-xl transition shadow-md w-full"><i class="fa-solid fa-save mr-2"></i> Simpan Penyesuaian</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
};

window.simpanSetTagihan = async function(e, idSiswa) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    let anak = window.appState.anak.find(a => a.id === idSiswa);
    const tagihanNodes = document.querySelectorAll('.tagihan-item-siswa');
    
    let keptIds = [];
    tagihanNodes.forEach(node => { keptIds.push(node.getAttribute('data-id')); });
    
    let tagihanBaru = (anak.tagihanLain || []).filter(t => keptIds.includes(t.id));

    try {
        await updateDoc(doc(db, "Anak", idSiswa), { tagihanLain: tagihanBaru });
        anak.tagihanLain = tagihanBaru;
        alert("Penyesuaian tagihan berhasil disimpan!");
        document.getElementById('modal-set-tagihan').remove();
        window.filterTabSPP();
    } catch(err) { alert("Gagal menyimpan."); btn.innerHTML = ori; btn.disabled = false; }
};

window.bukaModalBayarLain = function(idSiswa) {
    let anak = (window.appState.anak || []).find(a => a.id === idSiswa);
    if(!anak) return;

    let tagihanHTML = (anak.tagihanLain || []).map((t) => {
        let terbayar = t.terbayar || 0;
        let sisa = t.nominal - terbayar;
        let isLunas = t.lunas || sisa <= 0;

        return `
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border ${isLunas ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'} rounded-xl mb-3 gap-3 shadow-sm">
            <div>
                <h4 class="font-black text-slate-800">${t.nama} <span class="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-1 text-[9px] align-middle">${t.metode || '1x'}</span></h4>
                <p class="font-bold text-slate-500 text-xs mt-1">Target: Rp ${window.fRp(t.nominal)} <span class="text-slate-300 mx-1">|</span> <span class="text-indigo-500">Terbayar: Rp ${window.fRp(terbayar)}</span></p>
            </div>
            ${isLunas ? `<span class="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black self-start sm:self-auto"><i class="fa-solid fa-check mr-1"></i> LUNAS</span>` 
                      : `<div class="flex gap-2 self-start sm:self-auto">
                            <button onclick="window.bukaModalCicilLain('${idSiswa}', '${t.id}', '${anak.nama}', '${t.nama}', ${sisa})" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-black text-xs transition shadow-sm" title="Cicil Tagihan"><i class="fa-solid fa-coins mr-1"></i> Cicil</button>
                            <button onclick="window.prosesBayarLainLunas('${idSiswa}', '${t.id}', '${anak.nama}', '${t.nama}', ${sisa})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg font-black text-xs transition shadow-sm" title="Lunas Penuh"><i class="fa-solid fa-check mr-1"></i> Lunas</button>
                         </div>`}
        </div>`;
    }).join('');

    let modal = document.createElement('div'); modal.id = 'modal-bayar-lain';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 md:p-8 flex flex-col border-t-4 border-blue-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-file-invoice-dollar text-blue-500 mr-2"></i> Tagihan Lainnya</h3><p class="text-xs font-bold text-slate-500">${anak.nama} (${anak.kelas || '-'})</p></div>
                <button type="button" onclick="document.getElementById('modal-bayar-lain').remove()" class="text-slate-400 hover:text-red-500 text-3xl font-bold transition bg-slate-100 hover:bg-red-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                ${tagihanHTML || '<p class="text-center text-slate-400 font-bold text-sm py-6">Tidak ada tagihan lain yang tercatat untuk siswa ini.</p>'}
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window.bukaModalBayarSPP = function(idSiswa, namaSiswa, kelasSiswa, bulanSppTerkait, nominalDefault) {
    let sppList = window.appState.spp || [];
    let unpaidMonths = window.getBulanMenunggak(idSiswa, sppList);
    unpaidMonths.sort();

    let targetSpp = nominalDefault || (window.appState.lembaga[0]?.sppBulananGlobal || 0);
    let totalTunggakan = 0;
    let rincianHTML = '';

    if(unpaidMonths.length === 0) return alert(`${namaSiswa} tidak memiliki tunggakan SPP sama sekali!`);

    unpaidMonths.forEach(m => {
        let terbayar = sppList.filter(s => s.idSiswa === idSiswa && s.bulanSpp === m).reduce((sum, s) => sum + s.nominal, 0);
        let sisa = targetSpp - terbayar;
        if(sisa > 0) {
            totalTunggakan += sisa;
            rincianHTML += `<div class="flex justify-between items-center border-b border-slate-100 py-1.5"><span class="text-xs font-bold text-slate-600">${m}</span><span class="text-xs font-black text-rose-600">Rp ${window.fRp(sisa)}</span></div>`;
        }
    });

    let saranBayar = targetSpp * 1.5;
    if(saranBayar > totalTunggakan) saranBayar = totalTunggakan;

    let modal = document.createElement('div'); modal.id = 'modal-bayar-spp';
    modal.className = 'fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 md:p-8 flex flex-col border-t-4 border-emerald-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div class="flex justify-between items-start mb-6 border-b pb-4">
                <div>
                    <h3 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-cash-register text-emerald-500 mr-2"></i> Setor Pembayaran SPP</h3>
                    <p class="text-xs font-bold text-slate-500 mt-1">Sistem Auto-Distribusi (Pecah Otomatis)</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-bayar-spp').remove()" class="text-slate-400 hover:text-red-500 text-3xl font-bold transition bg-slate-100 hover:bg-red-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0"><i class="fa-solid fa-times"></i></button>
            </div>

            <div class="mb-4">
                <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Identitas Siswa</label>
                <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                    <div><p class="font-black text-slate-800">${namaSiswa}</p><p class="text-xs font-bold text-slate-500">Kelas: ${kelasSiswa}</p></div>
                    <div class="text-right"><p class="text-[10px] font-black text-slate-400 uppercase">Target / Bulan</p><p class="font-black text-indigo-600">Rp ${window.fRp(targetSpp)}</p></div>
                </div>
            </div>

            <div class="mb-5 bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-inner">
                <div class="flex justify-between items-center mb-3">
                    <label class="text-[11px] font-black text-rose-800 uppercase tracking-wider block">Total Tagihan (${unpaidMonths.length} Bulan)</label>
                    <span class="font-black text-rose-700 text-xl">Rp ${window.fRp(totalTunggakan)}</span>
                </div>
                <div class="bg-white p-3 rounded-lg border border-rose-100 max-h-32 overflow-y-auto custom-scrollbar">
                    ${rincianHTML}
                </div>
            </div>

            <form onsubmit="window.simpanBayarSPP(event, '${idSiswa}', '${namaSiswa}')">
                <div class="mb-4">
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">Tanggal Pembayaran</label>
                    <input type="date" id="spp-tgl" value="${getTodayStr()}" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-emerald-500" required>
                </div>
                <div class="mb-6">
                    <label class="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2 flex justify-between">
                        <span>Nominal Uang Diserahkan (Rp)</span>
                        <span class="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded shadow-sm">Saran Ideal: Rp ${window.fRp(saranBayar)}</span>
                    </label>
                    <input type="text" id="spp-nom" oninput="window.inRp(this)" placeholder="Ketik nominal yang disetor wali murid..." class="w-full border-2 border-emerald-200 bg-emerald-50 p-4 rounded-xl font-black text-3xl text-emerald-700 focus:outline-emerald-500 text-center shadow-inner" required>
                    <p class="text-[10px] font-bold text-emerald-600 mt-3 text-center"><i class="fa-solid fa-bolt text-yellow-500 mr-1"></i> Uang akan otomatis dipecah untuk melunasi bulan tertua terlebih dahulu.</p>
                </div>
                <div class="flex gap-3 justify-end pt-4 border-t border-slate-100">
                    <button type="button" onclick="document.getElementById('modal-bayar-spp').remove()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3 rounded-xl transition">Batal</button>
                    <button type="submit" class="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-xl shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-check-double mr-2"></i> Eksekusi Setoran</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
};

window.simpanBayarSPP = async function(e, idSiswa, namaSiswa) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]'); const ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memproses...'; btn.disabled = true;
    
    const tgl = document.getElementById('spp-tgl').value;
    const totalUangMasuk = window.pRp(document.getElementById('spp-nom').value);

    let anak = window.appState.anak.find(a => a.id === idSiswa);
    let targetSpp = anak.sppBulanan || (window.appState.lembaga[0]?.sppBulananGlobal || 0);

    if (targetSpp <= 0 || totalUangMasuk <= 0) {
        alert("Nominal pembayaran atau Target SPP Siswa tidak valid (Rp 0).");
        btn.innerHTML = ori; btn.disabled = false; return;
    }

    let sppList = window.appState.spp || [];
    let unpaidMonths = window.getBulanMenunggak(idSiswa, sppList);
    unpaidMonths.sort(); 

    try {
        const batch = writeBatch(db);
        let sisaUang = totalUangMasuk;
        let logDistribusi = [];

        for (let i = 0; i < unpaidMonths.length; i++) {
            if (sisaUang <= 0) break;

            let bulan = unpaidMonths[i];
            let terbayarSblm = sppList.filter(s => s.idSiswa === idSiswa && s.bulanSpp === bulan).reduce((sum, s) => sum + s.nominal, 0);
            let butuhBerapa = targetSpp - terbayarSblm;

            if (butuhBerapa <= 0) continue; 

            let nominalBayarBulanIni = 0;
            let statusCicilan = false;
            let cicilKe = "";

            if (sisaUang >= butuhBerapa) {
                nominalBayarBulanIni = butuhBerapa;
                statusCicilan = false; 
                sisaUang -= butuhBerapa;
            } else {
                nominalBayarBulanIni = sisaUang;
                statusCicilan = true;
                let cicilanSblm = sppList.filter(s => s.idSiswa === idSiswa && s.bulanSpp === bulan && s.isCicilan).length;
                cicilKe = String(cicilanSblm + 1);
                sisaUang = 0;
            }

            const idKasBaru = doc(collection(db, "KasLembaga")).id;
            const idSppBaru = doc(collection(db, "PembayaranSPP")).id;

            let ketKas = statusCicilan ? `Cicilan Ke-${cicilKe} SPP ${namaSiswa} (${bulan})` : `Lunas SPP ${namaSiswa} (${bulan})`;

            batch.set(doc(db, "KasLembaga", idKasBaru), {
                tanggal: tgl, jenis: "Pemasukan", kategori: "SPP/Syahriah", keterangan: ketKas, nominal: nominalBayarBulanIni, idSiswa: idSiswa, createdAt: new Date().toISOString()
            });

            batch.set(doc(db, "PembayaranSPP", idSppBaru), {
                idSiswa: idSiswa, namaSiswa: namaSiswa, bulanSpp: bulan, tanggalBayar: tgl, nominal: nominalBayarBulanIni, idKas: idKasBaru, isCicilan: statusCicilan, cicilanKe: cicilKe, createdAt: new Date().toISOString()
            });

            logDistribusi.push(`- ${bulan} : Rp ${window.fRp(nominalBayarBulanIni)} (${statusCicilan ? 'Masih Cicilan' : 'LUNAS'})`);
        }

        if (sisaUang > 0) {
            const idKasBaru = doc(collection(db, "KasLembaga")).id;
            batch.set(doc(db, "KasLembaga", idKasBaru), {
                tanggal: tgl, jenis: "Pemasukan", kategori: "Lain-lain", keterangan: `Kelebihan Uang SPP (Deposit) - ${namaSiswa}`, nominal: sisaUang, idSiswa: idSiswa, createdAt: new Date().toISOString()
            });
            logDistribusi.push(`- Kelebihan Dana (Deposit Kas): Rp ${window.fRp(sisaUang)}`);
        }

        await batch.commit();
        alert(`Uang sejumlah Rp ${window.fRp(totalUangMasuk)} berhasil disetor dan didistribusikan secara pintar!\n\nRincian Pemecahan:\n${logDistribusi.join('\n')}`);
        document.getElementById('modal-bayar-spp').remove();
        
        const snapSPP = await getDocs(query(collection(db, "PembayaranSPP"), orderBy("tanggalBayar", "desc")));
        let dataSPP = []; snapSPP.forEach(d => dataSPP.push({id: d.id, ...d.data()}));
        window.appState.spp = dataSPP;
        
        const snapKas = await getDocs(query(collection(db, "KasLembaga"), orderBy("tanggal", "desc")));
        let dataKas = []; snapKas.forEach(d => dataKas.push({id: d.id, ...d.data()}));
        window.appState.kas = dataKas;

        window.filterTabSPP();
        if(window.currentKeuanganTab === 'dasbor') window.renderTabDasbor();
    } catch(err) { alert("Gagal memproses pembayaran: " + err.message); btn.innerHTML = ori; btn.disabled = false; }
};

window.setBeasiswaSiswa = async function(idSiswa, namaSiswa) {
    if(!confirm(`Jadikan ${namaSiswa} sebagai penerima BEASISWA? (Target SPP akan menjadi Rp 0 secara permanen hingga diubah kembali)`)) return;
    try {
        await updateDoc(doc(db, "Anak", idSiswa), { sppBulanan: 0, isBeasiswa: true });
        let idx = window.appState.anak.findIndex(a => a.id === idSiswa);
        if(idx > -1) {
            window.appState.anak[idx].sppBulanan = 0;
            window.appState.anak[idx].isBeasiswa = true;
        }
        alert(`${namaSiswa} kini terdaftar sebagai penerima Beasiswa!`);
        let modal1 = document.getElementById('modal-bayar-spp'); if(modal1) modal1.remove();
        window.filterTabSPP();
    } catch(e) { alert("Gagal mengeset beasiswa."); }
};

window.hapusBayarSPP = async function(idSpp, idKas) {
    const sppData = (window.appState.spp || []).find(s => s.id === idSpp);
    if(!sppData) return alert("Data tidak ditemukan.");

    if(!confirm("Yakin ingin membatalkan pembayaran SPP ini? Data kas akan ditarik otomatis dan membutuhkan otorisasi token.")) return;
    
    window.verifikasiTokenOtorisasi(`Batal SPP: ${sppData.namaSiswa} (Bln ${sppData.bulanSpp})`).then(async (isValid) => {
        if(!isValid) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, "PembayaranSPP", idSpp));
            if(idKas) batch.delete(doc(db, "KasLembaga", idKas));
            await batch.commit();
            
            window.appState.spp = window.appState.spp.filter(s => s.id !== idSpp);
            if(idKas) window.appState.kas = window.appState.kas.filter(k => k.id !== idKas);
            
            alert("Pembayaran SPP berhasil dibatalkan.");
            window.filterTabSPP();
            if(window.currentKeuanganTab === 'dasbor') window.renderTabDasbor();
        } catch(e) { alert("Gagal membatalkan pembayaran."); }
    });
};

window.cetakKwitansiSPP = function(idSpp) {
    const sppList = window.appState.spp || [];
    const pay = sppList.find(s => s.id === idSpp);
    if(!pay) return alert("Data tidak ditemukan.");

    const lembaga = window.appState.lembaga[0] || {};
    const tglArr = pay.tanggalBayar.split('-');
    const tglFormat = `${tglArr[2]} ${new Date(tglArr[0], tglArr[1]-1).toLocaleString('id-ID', { month: 'long' })} ${tglArr[0]}`;

    const html = `
        <div style="padding:40px; font-family:sans-serif; color:#0f172a; width:800px; background:#fff; border: 2px dashed #cbd5e1;">
            <div style="text-align:center; border-bottom:4px solid #f97316; padding-bottom:15px; margin-bottom:20px;">
                <h1 style="margin:0; color:#f97316; font-size:26px; font-weight:900; text-transform:uppercase;">${lembaga.namaLembaga || 'KWITANSI PEMBAYARAN'}</h1>
                <p style="margin:5px 0 0 0; font-size:14px; font-weight:bold; color:#64748b; letter-spacing:2px;">BUKTI PEMBAYARAN SAH</p>
            </div>
            
            <table style="width:100%; margin-bottom:20px; font-size:16px; line-height: 2;">
                <tr><td style="width:200px; font-weight:bold; color:#475569;">Telah terima dari</td><td style="font-weight:900; font-size:18px;">: ${pay.namaSiswa}</td></tr>
                <tr><td style="font-weight:bold; color:#475569;">Uang Sebesar</td><td style="font-weight:900; font-size:18px; color:#f97316;">: Rp ${window.fRp(pay.nominal)}</td></tr>
                <tr><td style="font-weight:bold; color:#475569;">Untuk Pembayaran</td><td style="font-weight:bold;">: SPP/Syahriah Bulan ${pay.bulanSpp} ${pay.isCicilan ? '(Cicilan Ke-'+pay.cicilanKe+')' : ''}</td></tr>
            </table>

            <div style="display:flex; justify-content:flex-end; text-align:center; margin-top: 40px;">
                <div>
                    <p style="margin:0 0 70px 0; font-size:14px; font-weight:bold; color:#475569;">Tangerang, ${tglFormat}<br>Penerima / Bendahara</p>
                    <p style="margin:0; font-weight:bold; border-bottom:2px solid #334155; display:inline-block; min-width:200px;"></p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('hidden-kwitansi-container').innerHTML = html;
    window.unduhPDF('hidden-kwitansi-container', `Kwitansi_SPP_${pay.namaSiswa.replace(/\s+/g, '_')}_${pay.bulanSpp}.pdf`);
};

window.verifikasiTokenOtorisasi = function(actionDetail = "Penghapusan Data Keuangan") {
    window.currentActionDetail = actionDetail;

    if (window.currentUser && window.currentUser.hakAkses === 'Super Admin') {
        return Promise.resolve(true); 
    }

    return new Promise((resolve) => {
        let modal = document.createElement('div');
        modal.id = 'modal-verifikasi-token';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-slide-up';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col border-t-4 border-red-500">
                <div class="flex justify-between items-start mb-4 border-b pb-3">
                    <div>
                        <h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-shield-halved text-red-500 mr-2"></i> Verifikasi Otorisasi</h3>
                        <p class="text-xs font-bold text-slate-500 mt-1">Penghapusan data memerlukan token dari Kepala/Ketua.</p>
                    </div>
                    <button type="button" onclick="document.getElementById('modal-verifikasi-token').remove();" class="text-slate-400 hover:text-red-500 text-2xl transition"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="mb-4 text-center">
                    <button type="button" onclick="window.requestTokenBaru(this)" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs py-2.5 rounded-xl transition border border-indigo-200 shadow-sm"><i class="fa-solid fa-paper-plane mr-1"></i> Minta Token Baru ke Kepala / Ketua</button>
                </div>
                <div class="mb-6">
                    <label class="text-xs font-black text-slate-500 uppercase block mb-1">Masukkan 6 Digit Kode Token</label>
                    <input type="text" id="input-token-kode" placeholder="Contoh: 123456" maxlength="6" class="w-full border-2 border-slate-200 p-3 rounded-xl font-black text-center text-2xl tracking-widest focus:outline-red-500">
                </div>
                <button type="button" onclick="window.prosesCekToken(window.customTokenResolve)" class="w-full bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 rounded-xl shadow-md transition"><i class="fa-solid fa-trash-can mr-2"></i> Konfirmasi Hapus Data</button>
            </div>`;
        document.body.appendChild(modal);
        window.customTokenResolve = resolve;
    });
};

window.requestTokenBaru = async function(btn) {
    let ori = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Mengirim Permintaan...'; btn.disabled = true;
    try {
        let tokenAcak = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, "SistemOtorisasi", "token_hapus"), {
            token: tokenAcak,
            updatedAt: new Date().toISOString(),
            requester: window.currentUser?.nama || 'Bagian Keuangan',
            actionDetail: window.currentActionDetail || 'Penghapusan Data',
            status: "Pending"
        });
        alert("Permintaan berhasil dikirim! Silakan hubungi Kepala Sekolah / Ketua untuk melihat token di dasbor mereka.");
    } catch(e) { alert("Gagal meminta token otorisasi."); }
    btn.innerHTML = ori; btn.disabled = false;
};

window.prosesCekToken = async function(resolve) {
    let input = document.getElementById('input-token-kode').value.trim();
    if(!input) return alert("Masukkan token terlebih dahulu!");
    try {
        const snap = await getDocs(query(collection(db, "SistemOtorisasi")));
        let validToken = "";
        snap.forEach(d => { if(d.id === "token_hapus") validToken = d.data().token; });
        
        if(input === validToken && validToken !== "") {
            await setDoc(doc(db, "SistemOtorisasi", "token_hapus"), { token: "", updatedAt: new Date().toISOString(), status: "Used" });
            document.getElementById('modal-verifikasi-token').remove();
            if(resolve) resolve(true);
        } else {
            alert("Kode token salah atau sudah kedaluwarsa!");
        }
    } catch(e) { alert("Gagal memverifikasi token."); }
};
