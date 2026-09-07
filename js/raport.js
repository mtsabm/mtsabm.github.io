import { db } from './firebase-init.js';
import { collection, doc, deleteDoc, getDocs, query, orderBy, setDoc, getDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.currentRaportTab = '';

// ==========================================
// FUNGSI BANTUAN & KALKULASI OTOMATIS
// ==========================================
window.getSemesterFromBulan = function(bulanStr) {
    if(!bulanStr) return "Semester Belum Ditentukan";
    const [y, m] = bulanStr.split('-').map(Number);
    let sem = (m >= 7 && m <= 12) ? 'Ganjil' : 'Genap';
    let tapel = (m >= 7 && m <= 12) ? `${y}/${y+1}` : `${y-1}/${y}`;
    return `Semester ${sem} - TA ${tapel}`;
};

window.calcPredikat = function(inputEl) {
    const val = Number(inputEl.value);
    const row = inputEl.closest('.raport-mapel-row');
    
    let kkm = 75; 
    if (row) {
        const kkmEl = row.querySelector('.mapel-kkm');
        if (kkmEl && kkmEl.value) kkm = Number(kkmEl.value);
    }

    const interval = (100 - kkm) / 3;
    const batasC = kkm;
    const batasB = kkm + interval;
    const batasA = kkm + (interval * 2);

    let pred = ''; let cls = '';
    if (val >= Math.round(batasA)) { pred = 'A (Sangat Baik)'; cls = 'bg-emerald-100 text-emerald-700'; }
    else if (val >= Math.round(batasB)) { pred = 'B (Baik)'; cls = 'bg-blue-100 text-blue-700'; }
    else if (val >= batasC) { pred = 'C (Cukup)'; cls = 'bg-amber-100 text-amber-700'; }
    else { pred = 'D (Perlu Bimbingan)'; cls = 'bg-rose-100 text-rose-700'; } 
    
    if (row) {
        const pEl = row.querySelector('.mapel-predikat');
        if(pEl) { pEl.value = pred; pEl.className = `mapel-predikat w-full border p-1.5 rounded text-xs text-center font-black cursor-not-allowed ${cls}`; }
    }
};

// ==========================================
// INISIALISASI & FILTER HAK AKSES
// ==========================================
export async function renderHalamanRaport(container) {
    // --- GEMBOK MODULAR ---
    const hasRaportPlus = window.cekLisensi('raport_plus');

    const currentUser = window.currentUser || {};
    const isSA_Admin = ['Super Admin', 'Administrator'].includes(currentUser.hakAkses);
    const isTU = currentUser.hakAkses === 'Operator/TU';
    const isWaliKelas = (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('wali kelas')) || currentUser.waliKelas;
    const isGuru = (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('guru'));
    const isMusyrif = (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('pengasuh') || j.namaJabatan.toLowerCase().includes('musyrif') || j.namaJabatan.toLowerCase().includes('tahfidz'));

    const canDasborWali = isWaliKelas || isSA_Admin; // Akses Dasbor Khusus
    const canInputMapel = isGuru || isSA_Admin || isTU;
    const canInputTahfidz = isMusyrif || isSA_Admin || isTU;
    const canPreview = isWaliKelas || isSA_Admin || isTU;
    const canArsip = isSA_Admin || isTU; 

    if (!['dasbor_wali','input_mapel','input_tahfidz','preview','arsip'].includes(window.currentRaportTab)) {
        if (canDasborWali) window.currentRaportTab = 'dasbor_wali';
        else if (canInputMapel) window.currentRaportTab = 'input_mapel';
        else if (canInputTahfidz) window.currentRaportTab = 'input_tahfidz';
        else if (canPreview) window.currentRaportTab = 'preview';
        else if (canArsip) window.currentRaportTab = 'arsip';
    }

    let tabs = '';
    if (canDasborWali) tabs += `<button onclick="window.switchRaportTab('dasbor_wali')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'dasbor_wali' ? 'bg-purple-600 text-white border-b-4 border-purple-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-chart-pie mr-2"></i> Dasbor Wali Kelas ${!hasRaportPlus ? '<i class="fa-solid fa-lock text-amber-500 ml-2 text-xs" title="Tersegel Premium"></i>' : ''}</button>`;
    if (canInputMapel) tabs += `<button onclick="window.switchRaportTab('input_mapel')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'input_mapel' ? 'bg-blue-600 text-white border-b-4 border-blue-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-pen-nib mr-2"></i> Input Nilai Mapel (Guru)</button>`;
    if (canInputTahfidz) tabs += `<button onclick="window.switchRaportTab('input_tahfidz')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'input_tahfidz' ? 'bg-teal-600 text-white border-b-4 border-teal-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-book-quran mr-2"></i> Input Raport Tahfidz</button>`;
    if (canPreview) tabs += `<button onclick="window.switchRaportTab('preview')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'preview' ? 'bg-indigo-600 text-white border-b-4 border-indigo-600 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-file-signature mr-2"></i> Preview & Cetak (Wali Kelas)</button>`;
    if (canArsip) tabs += `<button onclick="window.switchRaportTab('arsip')" class="px-5 py-4 rounded-t-2xl font-black transition flex items-center ${window.currentRaportTab === 'arsip' ? 'bg-slate-800 text-white border-b-4 border-slate-800 translate-y-[4px]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"><i class="fa-solid fa-box-archive mr-2"></i> Arsip Raport ${!hasRaportPlus ? '<i class="fa-solid fa-lock text-amber-500 ml-2 text-xs" title="Tersegel Premium"></i>' : ''}</button>`;

    container.innerHTML = `
        <div class="mb-6 flex overflow-x-auto border-b-4 border-slate-200 gap-2 custom-scrollbar pr-4">${tabs}</div>
        <div id="raport-content-area" class="animate-fade-in"></div>
    `;

    if (window.currentRaportTab === 'dasbor_wali') {
        if (!hasRaportPlus) document.getElementById('raport-content-area').innerHTML = window.renderLockedPremiumHTML('Dasbor Khusus Wali Kelas');
        else window.renderDasborWali();
    }
    else if (window.currentRaportTab === 'input_mapel') window.renderInputMapel();
    else if (window.currentRaportTab === 'input_tahfidz') window.renderInputTahfidz();
    else if (window.currentRaportTab === 'preview') window.renderPreviewRaport();
    else if (window.currentRaportTab === 'arsip') {
        if (!hasRaportPlus) document.getElementById('raport-content-area').innerHTML = window.renderLockedPremiumHTML('Pangkalan Arsip Raport Terpusat');
        else window.renderArsipRaport();
    }
}

window.switchRaportTab = function(tab) {
    window.currentRaportTab = tab; window.navigate('raport');
};

// ==========================================
// TAB DASBOR WALI KELAS (BARU)
// ==========================================
window.renderDasborWali = async function() {
    if (typeof window.Chart === 'undefined') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    const area = document.getElementById('raport-content-area');
    const currentUser = window.currentUser || {};
    const kelas = currentUser.waliKelas;

    if (!kelas || kelas === "Belum diatur" || kelas === "") {
        area.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm"><i class="fa-solid fa-triangle-exclamation text-5xl text-amber-500 mb-4 block"></i><h3 class="text-xl font-black text-slate-700">Akses Terbatas</h3><p class="text-slate-500 font-bold mt-2">Anda belum ditugaskan sebagai Wali Kelas tertentu di profil Anda. Dasbor ini dikhususkan untuk memantau data kelas secara spesifik.</p></div>`;
        return;
    }

    area.innerHTML = `<div class="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm"><i class="fa-solid fa-circle-notch fa-spin text-4xl text-purple-500 mb-4 block"></i><p class="font-bold text-slate-500">Memproses visualisasi grafik, tren, dan metrik kelas ${kelas}...</p></div>`;

    const lembaga = window.appState.lembaga[0] || {};
    let expectedMapels = [];
    let mapelRaw = lembaga.daftarMapel || lembaga.mataPelajaran || ''; 
    if (Array.isArray(mapelRaw)) { expectedMapels = mapelRaw.map(m => typeof m === 'string' ? m : m.nama); }
    else if (typeof mapelRaw === 'string' && mapelRaw.trim() !== '') { expectedMapels = mapelRaw.split(',').map(m => m.trim()); }

    const siswaKelas = (window.appState.anak || []).filter(a => a.kelas === kelas && a.statusAkademik !== 'Lulus');
    const jmlSiswa = siswaKelas.length;
    
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 10);
    const curBulan = localISOTime.substring(0, 7);

    let hadirHariIni = 0, sakitBulanIni = 0, izinBulanIni = 0, alpaBulanIni = 0;
    let totalPoinPelanggaran = 0, totalPoinPrestasi = 0;
    let totalNilai = 0, countNilai = 0;
    let monitoringDataSiswa = [];
    
    let mapNilaiSiswaBulanIni = {};
    window.rawTrendNilaiKelas = []; 
    
    let mapelGradedCount = {};
    expectedMapels.forEach(m => mapelGradedCount[m] = 0);
    let siswaRemedial = []; 

    siswaKelas.forEach(s => { mapNilaiSiswaBulanIni[s.id] = { nama: s.nama, total: 0, count: 0, rataRata: 0 }; });

    try {
        const { db } = await import('./firebase-init.js');
        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        const snapAbsen = await getDocs(query(collection(db, "AbsensiSiswa"), where("kelas", "==", kelas)));
        let petaAbsenSiswa = {};
        
        siswaKelas.forEach(s => {
            petaAbsenSiswa[s.id] = { sakit: 0, izin: 0, alpa: 0, hadirHariIni: '-' };
        });

        snapAbsen.forEach(d => {
            const data = d.data();
            if(data.tanggal && data.detailSiswa) {
                data.detailSiswa.forEach(ds => {
                    const idTarget = ds.idSiswa || ds.id;
                    if(petaAbsenSiswa[idTarget]) {
                        const obj = petaAbsenSiswa[idTarget];
                        if(data.tanggal.startsWith(curBulan)) {
                            if(ds.status === 'Sakit') { sakitBulanIni++; obj.sakit++; }
                            if(ds.status === 'Izin') { izinBulanIni++; obj.izin++; }
                            if(ds.status === 'Alpa') { alpaBulanIni++; obj.alpa++; }
                        }
                        if(data.tanggal === localISOTime) {
                            if(ds.status === 'Hadir') { hadirHariIni++; obj.hadirHariIni = 'Hadir'; }
                            else { obj.hadirHariIni = ds.status; }
                        }
                    }
                });
            }
        });

        let petaKarakterSiswa = {};
        siswaKelas.forEach(s => { petaKarakterSiswa[s.id] = { prestasi: 0, pelanggaran: 0 }; });

        const snapAsrama = await getDocs(collection(db, "Kepengasuhan"));
        snapAsrama.forEach(d => {
            const data = d.data();
            if(data.tanggal && data.tanggal.startsWith(curBulan) && petaKarakterSiswa[data.idSiswa]) {
                if(data.kategori === 'Pelanggaran') {
                    totalPoinPelanggaran += Number(data.poin || 0);
                    petaKarakterSiswa[data.idSiswa].pelanggaran += Number(data.poin || 0);
                } else if(data.kategori === 'Prestasi') {
                    totalPoinPrestasi += Number(data.poin || 0);
                    petaKarakterSiswa[data.idSiswa].prestasi += Number(data.poin || 0);
                }
            }
        });

        const snapNilaiAll = await getDocs(collection(db, "NilaiMapel"));
        snapNilaiAll.forEach(d => {
            const data = d.data();
            if(siswaKelas.some(s => s.id === data.idSiswa)) {
                window.rawTrendNilaiKelas.push(data);
                
                if(data.bulan === curBulan) {
                    totalNilai += Number(data.nilai || 0);
                    countNilai++;
                    
                    if(mapelGradedCount[data.mapel] !== undefined) mapelGradedCount[data.mapel]++;
                    else mapelGradedCount[data.mapel] = 1;

                    if (Number(data.nilai) < Number(data.kkm || 75)) {
                        siswaRemedial.push({ nama: data.namaSiswa, mapel: data.mapel, nilai: data.nilai, kkm: data.kkm || 75 });
                    }

                    if(mapNilaiSiswaBulanIni[data.idSiswa]) {
                        mapNilaiSiswaBulanIni[data.idSiswa].total += Number(data.nilai || 0);
                        mapNilaiSiswaBulanIni[data.idSiswa].count++;
                    }
                }
            }
        });

        const rataRataKelas = countNilai > 0 ? (totalNilai / countNilai).toFixed(1) : 0;

        Object.keys(mapNilaiSiswaBulanIni).forEach(id => {
            let s = mapNilaiSiswaBulanIni[id];
            s.rataRata = s.count > 0 ? (s.total / s.count).toFixed(1) : 0;
        });
        
        const rankingSiswa = Object.values(mapNilaiSiswaBulanIni)
            .filter(s => s.count > 0)
            .sort((a, b) => b.rataRata - a.rataRata)
            .slice(0, 10);

        let tabelRankingHTML = rankingSiswa.length > 0 ? rankingSiswa.map((r, idx) => `
            <tr class="border-b border-slate-100 hover:bg-yellow-50 transition">
                <td class="p-3 text-center font-black ${idx < 3 ? 'text-yellow-500 text-lg' : 'text-slate-400'}">${idx + 1}</td>
                <td class="p-3 font-bold text-slate-800">${r.nama}</td>
                <td class="p-3 text-center font-black text-indigo-600">${r.rataRata}</td>
                <td class="p-3 text-center text-xs text-slate-400">${r.count} Mapel</td>
            </tr>
        `).join('') : '<tr><td colspan="4" class="text-center p-4 text-slate-400 font-bold">Belum ada data nilai akademik bulan ini.</td></tr>';

        let optTrendSiswa = `<option value="Semua">-- Rata-Rata Seluruh Kelas --</option>` + siswaKelas.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');

        siswaKelas.forEach(s => {
            const abs = petaAbsenSiswa[s.id] || { sakit: 0, izin: 0, alpa: 0, hadirHariIni: '-' };
            const kar = petaKarakterSiswa[s.id] || { prestasi: 0, pelanggaran: 0 };
            monitoringDataSiswa.push({
                nis: s.nis || '-',
                nama: s.nama,
                statusHariIni: abs.hadirHariIni,
                sakit: abs.sakit,
                izin: abs.izin,
                alpa: abs.alpa,
                prestasi: kar.prestasi,
                pelanggaran: kar.pelanggaran
            });
        });

        let tabelHTML = `
            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto mb-6">
                <h3 class="text-sm font-black text-slate-700 mb-4 flex items-center">
                    <i class="fa-solid fa-table text-indigo-500 mr-2"></i> 
                    Tabel Monitoring Sinkronisasi & Rekapitulasi Data Firestore
                </h3>
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th class="p-3">NIS</th>
                            <th class="p-3">Nama Siswa</th>
                            <th class="p-3 text-center">Hari Ini</th>
                            <th class="p-3 text-center">Sakit</th>
                            <th class="p-3 text-center">Izin</th>
                            <th class="p-3 text-center">Alpa</th>
                            <th class="p-3 text-center">Poin Kebaikan</th>
                            <th class="p-3 text-center">Poin Disiplin</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
        `;

        monitoringDataSiswa.forEach(row => {
            let badgeHariIni = `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">${row.statusHariIni}</span>`;
            if(row.statusHariIni === 'Hadir') badgeHariIni = `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">Hadir</span>`;
            if(row.statusHariIni === 'Sakit') badgeHariIni = `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">Sakit</span>`;
            if(row.statusHariIni === 'Izin') badgeHariIni = `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Izin</span>`;
            if(row.statusHariIni === 'Alpa') badgeHariIni = `<span class="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">Alpa</span>`;

            tabelHTML += `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="p-3 font-mono">${row.nis}</td>
                    <td class="p-3 font-bold">${row.nama}</td>
                    <td class="p-3 text-center">${badgeHariIni}</td>
                    <td class="p-3 text-center font-bold text-amber-600">${row.sakit}</td>
                    <td class="p-3 text-center font-bold text-blue-600">${row.izin}</td>
                    <td class="p-3 text-center font-bold text-rose-600">${row.alpa}</td>
                    <td class="p-3 text-center font-bold text-teal-600">${row.prestasi}</td>
                    <td class="p-3 text-center font-bold text-rose-600">${row.pelanggaran}</td>
                </tr>
            `;
        });
        tabelHTML += `</tbody></table></div>`;

        let guruBelumNilaiHTML = expectedMapels.map(m => {
            let c = mapelGradedCount[m] || 0;
            if(c < jmlSiswa) return `<li class="border-b border-orange-200/50 py-2 flex justify-between items-center"><span class="font-bold text-xs truncate pr-2">${m}</span> <span class="bg-white/30 px-2 py-0.5 rounded text-[10px] font-black shrink-0 shadow-sm">${c}/${jmlSiswa} Siswa</span></li>`;
            return '';
        }).join('');
        if(!guruBelumNilaiHTML) guruBelumNilaiHTML = '<p class="text-xs font-bold bg-white/20 p-3 rounded-lg text-center shadow-inner mt-2"><i class="fa-solid fa-check-double mr-1"></i> Semua mapel sudah dinilai!</p>';

        let remedialHTML = siswaRemedial.map(r => `
            <li class="border-b border-rose-200/50 py-2 flex flex-col">
                <div class="flex justify-between items-center"><span class="font-black text-xs truncate pr-2">${r.nama}</span> <span class="bg-white/30 px-2 py-0.5 rounded text-[10px] font-black shrink-0 shadow-sm">${r.nilai} <span class="opacity-70 font-medium">/ ${r.kkm}</span></span></div>
                <span class="text-[9px] font-medium opacity-90 mt-0.5 truncate">${r.mapel}</span>
            </li>
        `).join('');
        if(!remedialHTML) remedialHTML = '<p class="text-xs font-bold bg-white/20 p-3 rounded-lg text-center shadow-inner mt-2"><i class="fa-solid fa-check-double mr-1"></i> Semua siswa melampaui KKM!</p>';

        area.innerHTML = `
            <div class="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-3xl shadow-lg text-white mb-6 relative overflow-hidden animate-slide-up">
                <div class="absolute right-0 top-0 opacity-10 pointer-events-none"><i class="fa-solid fa-chalkboard-user text-9xl -mt-4 -mr-4"></i></div>
                <h2 class="text-2xl md:text-3xl font-black mb-2 relative z-10"><i class="fa-solid fa-crown text-yellow-300 mr-2"></i> Dasbor Wali Kelas ${kelas}</h2>
                <p class="text-purple-100 font-bold relative z-10 text-sm">Pemantauan 360° akademik, kedisiplinan, dan kelengkapan nilai siswa bulan ini.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-center">
                    <span class="text-[10px] font-black uppercase text-slate-400 block mb-1">Rata-Rata Akademik</span>
                    <h5 class="text-3xl font-black text-indigo-600">${rataRataKelas}</h5>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-center">
                    <span class="text-[10px] font-black uppercase text-slate-400 block mb-1">Hadir Hari Ini</span>
                    <h5 class="text-3xl font-black text-emerald-600">${hadirHariIni} <span class="text-sm text-emerald-400">/ ${jmlSiswa}</span></h5>
                </div>
                <div class="bg-gradient-to-br from-orange-400 to-amber-600 p-4 rounded-xl shadow-md text-white flex flex-col h-48">
                    <h3 class="text-xs font-black uppercase tracking-wider mb-2 flex items-center border-b border-orange-300/50 pb-2"><i class="fa-solid fa-clipboard-question mr-2"></i> Belum Selesai Dinilai</h3>
                    <ul class="flex-1 overflow-y-auto custom-scrollbar pr-1">${guruBelumNilaiHTML}</ul>
                </div>
                <div class="bg-gradient-to-br from-rose-500 to-red-600 p-4 rounded-xl shadow-md text-white flex flex-col h-48">
                    <h3 class="text-xs font-black uppercase tracking-wider mb-2 flex items-center border-b border-rose-300/50 pb-2"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Wajib Remedial</h3>
                    <ul class="flex-1 overflow-y-auto custom-scrollbar pr-1">${remedialHTML}</ul>
                </div>
            </div>

            <!-- WIDGET JUARA KELAS & TREN -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div class="lg:col-span-1 bg-gradient-to-b from-yellow-50 to-white p-6 rounded-2xl border border-yellow-200 shadow-sm flex flex-col max-h-[420px]">
                    <h3 class="text-sm font-black text-yellow-800 mb-4 flex items-center border-b border-yellow-200 pb-2 shrink-0">
                        <i class="fa-solid fa-trophy text-yellow-500 mr-2"></i> Top 10 Juara Kelas (Bulan Ini)
                    </h3>
                    <div class="overflow-y-auto flex-1 custom-scrollbar">
                        <table class="w-full text-left text-sm">
                            <thead class="sticky top-0 bg-yellow-50"><tr class="text-[10px] uppercase text-slate-400 border-b border-slate-200"><th class="p-2 text-center">Rank</th><th class="p-2">Siswa</th><th class="p-2 text-center">Rata-rata</th><th class="p-2 text-center">Data</th></tr></thead>
                            <tbody>${tabelRankingHTML}</tbody>
                        </table>
                    </div>
                </div>
                
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[420px]">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-slate-100 pb-3 gap-3 shrink-0">
                        <div>
                            <h3 class="text-sm font-black text-slate-700 mb-1">Grafik Tren Akademik Semester</h3>
                            <p class="text-[11px] text-slate-400 font-bold">Perkembangan dari bulan ke bulan, semester ke semester.</p>
                        </div>
                        <select id="trend-siswa-select" onchange="window.updateTrendRaportWali()" class="w-full sm:w-auto border-2 border-indigo-100 p-2 rounded-lg text-xs font-bold focus:outline-indigo-500 bg-indigo-50 text-indigo-800 cursor-pointer shadow-sm">
                            ${optTrendSiswa}
                        </select>
                    </div>
                    
                    <div class="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                        <div class="w-full md:w-1/2 flex flex-col overflow-hidden">
                            <div class="flex-1 min-h-[200px] w-full relative"><canvas id="canvasTrendKelas"></canvas></div>
                        </div>
                        <div class="w-full md:w-1/2 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                            <table class="w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-500 sticky top-0 uppercase">
                                    <tr><th class="p-2">Bulan</th><th class="p-2">Semester</th><th class="p-2 text-center">Rata-Rata</th></tr>
                                </thead>
                                <tbody id="tbody-trend-kelas"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- GRAFIK PIE & BAR LAMA -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm font-black text-slate-700 mb-1">Proporsi Status Kehadiran Kelas (Bulan Ini)</h3>
                        <p class="text-[11px] text-slate-400 font-bold mb-4">Grafik lingkaran pembagian akumulasi absensi.</p>
                    </div>
                    <div class="max-h-[260px] flex justify-center items-center">
                        <canvas id="canvasPieAbsen" class="max-w-[220px] max-h-[220px]"></canvas>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm font-black text-slate-700 mb-1">Perbandingan Akumulasi Poin Karakter</h3>
                        <p class="text-[11px] text-slate-400 font-bold mb-4">Grafik batang total poin prestasi kebaikan vs pelanggaran disiplin.</p>
                    </div>
                    <div class="max-h-[260px]">
                        <canvas id="canvasBarKarakter" class="w-full h-full"></canvas>
                    </div>
                </div>
            </div>

            ${tabelHTML}
        `;

        window.updateTrendRaportWali();

        const ctxPie = document.getElementById('canvasPieAbsen').getContext('2d');
        new window.Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Hadir Hari Ini', 'Sakit', 'Izin', 'Alpa'],
                datasets: [{
                    data: [hadirHariIni, sakitBulanIni, izinBulanIni, alpaBulanIni],
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'],
                    borderWidth: 2, borderColor: '#ffffff'
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } } } }
        });

        const ctxBar = document.getElementById('canvasBarKarakter').getContext('2d');
        new window.Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Poin Kebaikan (Prestasi)', 'Poin Disiplin (Pelanggaran)'],
                datasets: [{
                    label: 'Total Akumulasi Poin',
                    data: [totalPoinPrestasi, totalPoinPelanggaran],
                    backgroundColor: ['#14b8a6', '#f43f5e'],
                    borderRadius: 8
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });

    } catch(e) {
        area.innerHTML = `<div class="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-500 font-bold"><i class="fa-solid fa-triangle-exclamation text-4xl mb-3 block"></i> Gagal merender grafik analisis visual kelas. Detail: ${e.message}</div>`;
    }
};

window.updateTrendRaportWali = function() {
    const idSiswa = document.getElementById('trend-siswa-select').value;
    const rawData = window.rawTrendNilaiKelas || [];
    
    let trenBulan = {};
    rawData.forEach(d => {
        if(idSiswa === 'Semua' || d.idSiswa === idSiswa) {
            if(!trenBulan[d.bulan]) trenBulan[d.bulan] = { total: 0, count: 0 };
            trenBulan[d.bulan].total += Number(d.nilai || 0);
            trenBulan[d.bulan].count++;
        }
    });

    const sortedBulan = Object.keys(trenBulan).sort();
    const labelTren = [];
    const dataTren = [];
    let tabelTrenHTML = '';

    sortedBulan.forEach(b => {
        const rata = (trenBulan[b].total / trenBulan[b].count).toFixed(1);
        const semester = window.getSemesterFromBulan(b);
        labelTren.push(b);
        dataTren.push(rata);

        tabelTrenHTML += `
            <tr class="border-b border-slate-100 hover:bg-indigo-50 transition">
                <td class="p-2 font-bold text-slate-700">${b}</td>
                <td class="p-2 font-medium text-slate-500 truncate max-w-[120px]" title="${semester}">${semester}</td>
                <td class="p-2 text-center font-black text-indigo-600">${rata}</td>
            </tr>
        `;
    });

    if (!tabelTrenHTML) tabelTrenHTML = '<tr><td colspan="3" class="text-center p-4 text-slate-400 font-bold">Belum ada data tren.</td></tr>';
    
    document.getElementById('tbody-trend-kelas').innerHTML = tabelTrenHTML;

    const ctxTrend = document.getElementById('canvasTrendKelas');
    if(!ctxTrend) return;
    
    if (window.chartTrendKelasInstance) window.chartTrendKelasInstance.destroy();
    
    window.chartTrendKelasInstance = new window.Chart(ctxTrend.getContext('2d'), {
        type: 'line',
        data: {
            labels: labelTren.length > 0 ? labelTren : ['Belum Ada Data'],
            datasets: [{
                label: idSiswa === 'Semua' ? 'Rata-Rata Kelas' : 'Rata-Rata Siswa',
                data: dataTren.length > 0 ? dataTren : [0],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4f46e5',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, min: 0, max: 100 } } }
    });
};

// ==========================================
// TAB 1: INPUT NILAI MAPEL (GURU)
// ==========================================
window.toggleBulkInputMapel = function() {
    const isBulk = document.getElementById('mapel-mode-bulk')?.checked;
    if(isBulk) {
        document.getElementById('mapel-single-area').classList.add('hidden');
        document.getElementById('mapel-bulk-area').classList.remove('hidden');
    } else {
        document.getElementById('mapel-single-area').classList.remove('hidden');
        if(document.getElementById('mapel-bulk-area')) document.getElementById('mapel-bulk-area').classList.add('hidden');
    }
};

window.renderInputMapel = function() {
    const lembaga = window.appState.lembaga[0] || {};
    const isPremium = (lembaga.lisensiFitur || []).includes('raport_plus');

    const area = document.getElementById('raport-content-area');
    const anakList = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus').sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    const optAnak = anakList.map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');
    
    const currentUser = window.currentUser || {};
    
    let daftarMapelLembaga = [];
    let mapelRaw = lembaga.daftarMapel || lembaga.mataPelajaran || ''; 
    if (Array.isArray(mapelRaw)) {
        daftarMapelLembaga = mapelRaw.map(m => typeof m === 'string' ? m : m.nama);
    } else if (typeof mapelRaw === 'string' && mapelRaw.trim() !== '') {
        daftarMapelLembaga = mapelRaw.split(',').map(m => m.trim());
    }

    if (daftarMapelLembaga.length === 0) {
        daftarMapelLembaga = ['Pendidikan Agama Islam', 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam', 'Ilmu Pengetahuan Sosial', 'Bahasa Inggris', 'Pendidikan Jasmani', 'Seni Budaya', 'Prakarya', 'Muatan Lokal'];
    }

    let mapelGuruIni = [];
    (currentUser.detailJabatan || []).forEach(j => {
        if (j.mapel) {
            const mapels = typeof j.mapel === 'string' ? j.mapel.split(',').map(m=>m.trim()) : j.mapel;
            mapels.forEach(m => { if(!mapelGuruIni.includes(m)) mapelGuruIni.push(m); });
        }
    });

    let optMapel = '';
    if (mapelGuruIni.length > 0) {
        optMapel = mapelGuruIni.map(m => `<option value="${m}">${m}</option>`).join('');
    } else {
        optMapel = daftarMapelLembaga.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    const bulkRows = anakList.map((a, i) => `
        <tr data-id="${a.id}" data-nama="${a.nama}" class="border-b border-slate-200 hover:bg-slate-50 transition raport-mapel-row">
            <td class="p-2 text-center font-bold text-slate-500">${i+1}</td>
            <td class="p-2 font-black text-slate-800 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">${a.nama} <span class="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded ml-1 border">Kls ${a.kelas||'-'}</span></td>
            <td class="p-2 bg-blue-50/30 min-w-[70px]"><input type="number" class="mapel-kkm w-full border border-blue-200 p-1.5 rounded text-xs text-center font-bold bg-white focus:outline-blue-500" placeholder="KKM" value="75"></td>
            <td class="p-2 bg-blue-50/30 min-w-[70px]"><input type="number" class="mapel-tugas w-full border border-blue-200 p-1.5 rounded text-xs text-center font-bold bg-white focus:outline-blue-500" placeholder="Tugas" value="0"></td>
            <td class="p-2 bg-blue-50/30 min-w-[70px]"><input type="number" class="mapel-praktek w-full border border-blue-200 p-1.5 rounded text-xs text-center font-bold bg-white focus:outline-blue-500" placeholder="Praktek" value="0"></td>
            <td class="p-2 bg-blue-50/30 min-w-[90px]">
                <select class="mapel-adab w-full border border-blue-200 p-1 rounded text-xs font-bold bg-white focus:outline-blue-500">
                    <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                    <option value="B (Baik)" selected>B (Baik)</option>
                    <option value="C (Cukup)">C (Cukup)</option>
                    <option value="D (Kurang)">D (Kurang)</option>
                </select>
            </td>
            <td class="p-2 bg-blue-100/50 min-w-[80px] border-l border-blue-200"><input type="number" class="mapel-nilai w-full border border-blue-300 p-1.5 rounded text-xs text-center font-black text-blue-800 bg-white focus:outline-blue-600" placeholder="Akhir" oninput="window.calcPredikat(this)"></td>
            <td class="p-2 bg-blue-100/50 min-w-[100px]"><input type="text" class="mapel-predikat w-full border border-blue-200 p-1.5 rounded text-[10px] text-center font-black bg-slate-100 text-slate-400 cursor-not-allowed" placeholder="Predikat" readonly></td>
        </tr>
    `).join('');

    const btnCBT = isPremium ? `<button type="button" onclick="alert('CBT API siap disambungkan!')" class="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-200 transition shadow-sm"><i class="fa-solid fa-laptop-code mr-1"></i> Tarik Nilai CBT</button>` : `<button type="button" class="bg-slate-100 text-slate-400 px-3 py-2 rounded-lg text-xs font-bold cursor-not-allowed shadow-sm" title="Integrasi CBT Tersedia di Raport Plus"><i class="fa-solid fa-lock mr-1"></i> Tarik CBT</button>`;
    
    const toggleBulk = isPremium ? `
        <label class="flex items-center cursor-pointer bg-white px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm w-full md:w-auto justify-center">
            <input type="checkbox" id="mapel-mode-bulk" onchange="window.toggleBulkInputMapel()" class="mr-2 w-4 h-4 text-blue-600 rounded">
            <span class="text-xs font-bold text-blue-800">Mode Tabel Kelas (Input Massal)</span>
        </label>
    ` : `
        <div class="flex items-center bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto justify-center opacity-70 cursor-not-allowed" title="Input Massal Tersedia di Raport Plus">
            <i class="fa-solid fa-lock text-slate-400 mr-2"></i>
            <span class="text-xs font-bold text-slate-500">Mode Input Massal</span>
        </div>
    `;

    area.innerHTML = `
        <div class="bg-blue-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-blue-500 relative overflow-hidden">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-blue-200 pb-4 gap-4">
                <h2 class="text-xl font-black text-blue-900"><i class="fa-solid fa-pen-nib mr-2 text-blue-500"></i> Setor Nilai Mata Pelajaran</h2>
                <div class="flex gap-2 w-full md:w-auto">
                    ${btnCBT}
                    ${toggleBulk}
                </div>
            </div>
            
            <form id="form-input-mapel" onsubmit="window.simpanInputMapel(event)">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Bulan & Tahun</label>
                        <input type="month" id="mapel-bulan" onchange="document.getElementById('lbl-semester-mapel').innerText = window.getSemesterFromBulan(this.value); window.loadMonitoringMapel();" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 bg-white cursor-pointer" required>
                        <p class="text-[10px] font-black text-blue-600 mt-1"><i class="fa-solid fa-info-circle mr-1"></i> <span id="lbl-semester-mapel">Pilih Bulan Terlebih Dahulu</span></p>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Mata Pelajaran</label>
                        <select id="mapel-nama" onchange="window.loadMonitoringMapel()" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 bg-white cursor-pointer" required>
                            <option value="">-- Pilih Mapel --</option>${optMapel}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Jenis Penilaian</label>
                        <select id="mapel-jenis-penilaian" onchange="window.loadMonitoringMapel()" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 bg-white cursor-pointer" required>
                            <option value="Ulangan Harian">Ulangan Harian</option>
                            <option value="Ujian Tengah Semester (UTS)">Ujian Tengah Semester (UTS)</option>
                            <option value="Ujian Akhir Semester (UAS)">Ujian Akhir Semester (UAS)</option>
                            <option value="Tugas Akhir/Portofolio">Tugas Akhir/Portofolio</option>
                        </select>
                    </div>
                </div>

                <div id="mapel-single-area" class="bg-white/60 p-5 rounded-xl shadow-sm border border-white mb-6 raport-mapel-row">
                    <label class="text-xs font-black text-slate-500 uppercase block mb-2">Target Siswa</label>
                    <select id="mapel-siswa-single" class="w-full border-2 border-blue-100 p-3 rounded-xl font-bold text-blue-900 focus:outline-blue-500 bg-white mb-4 cursor-pointer">
                        <option value="">-- Pilih Satu Siswa --</option>${optAnak}
                    </select>
                    
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-4 border-b border-blue-100 pb-4 mb-4">
                        <div class="col-span-2 md:col-span-1"><label class="text-[10px] font-bold text-slate-500 uppercase block">KKM</label><input type="number" id="mapel-kkm-single" class="mapel-kkm w-full border-2 p-3 rounded-lg text-sm font-bold text-center focus:outline-blue-500" value="75"></div>
                        <div class="col-span-1"><label class="text-[10px] font-bold text-slate-500 uppercase block">Nilai Tugas</label><input type="number" id="mapel-tugas-single" class="w-full border-2 p-3 rounded-lg text-sm font-bold text-center focus:outline-blue-500" value="0"></div>
                        <div class="col-span-1"><label class="text-[10px] font-bold text-slate-500 uppercase block">Nilai Praktek</label><input type="number" id="mapel-praktek-single" class="w-full border-2 p-3 rounded-lg text-sm font-bold text-center focus:outline-blue-500" value="0"></div>
                        <div class="col-span-2"><label class="text-[10px] font-bold text-slate-500 uppercase block">Adab/Akhlaq Mapel</label>
                            <select id="mapel-adab-single" class="w-full border-2 p-3 rounded-lg text-sm font-bold bg-white focus:outline-blue-500">
                                <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                                <option value="B (Baik)" selected>B (Baik)</option>
                                <option value="C (Cukup)">C (Cukup)</option>
                                <option value="D (Kurang)">D (Kurang)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="text-[10px] font-bold text-blue-600 uppercase block">NILAI AKHIR (Kognitif)</label><input type="number" id="mapel-nilai-single" class="mapel-nilai w-full border-2 border-blue-400 p-3 rounded-lg text-lg font-black text-blue-700 bg-blue-100 text-center focus:outline-blue-600 shadow-inner" oninput="window.calcPredikat(this)"></div>
                        <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Predikat Kognitif</label><input type="text" id="mapel-predikat-single" class="mapel-predikat w-full border-2 p-3 rounded-lg text-sm font-black bg-slate-100 text-center cursor-not-allowed" readonly></div>
                    </div>
                </div>

                ${isPremium ? `
                <div id="mapel-bulk-area" class="hidden bg-white border border-slate-200 p-2 rounded-xl shadow-inner mb-6 overflow-x-auto custom-scrollbar relative">
                    <table class="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                        <thead>
                            <tr class="bg-blue-100 border-b border-blue-200">
                                <th class="p-3 text-center text-xs font-black text-blue-800 w-12">No</th>
                                <th class="p-3 text-xs font-black text-blue-800 sticky left-0 bg-blue-100 z-10">Nama Siswa</th>
                                <th class="p-3 text-center text-xs font-black text-blue-800">KKM</th>
                                <th class="p-3 text-center text-xs font-black text-blue-800">Tugas</th>
                                <th class="p-3 text-center text-xs font-black text-blue-800">Praktek</th>
                                <th class="p-3 text-center text-xs font-black text-blue-800">Adab Mapel</th>
                                <th class="p-3 text-center text-xs font-black text-blue-900 border-l border-blue-200 bg-blue-200/50">N. Akhir</th>
                                <th class="p-3 text-center text-xs font-black text-blue-800">Predikat</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-mapel-bulk">${bulkRows || '<tr><td colspan="8" class="text-center text-slate-400 p-6 font-bold">Tidak ada siswa aktif.</td></tr>'}</tbody>
                    </table>
                </div>` : ''}

                <button type="submit" id="btn-simpan-input-mapel" class="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg float-right"><i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai</button>
                <div class="clear-both"></div>
            </form>
        </div>
        
        <div id="monitoring-mapel-area"></div>
    `;
    setTimeout(window.loadMonitoringMapel, 100);
};

window.simpanInputMapel = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-input-mapel'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    const bulan = document.getElementById('mapel-bulan').value;
    const mapel = document.getElementById('mapel-nama').value;
    const jenisPenilaian = document.getElementById('mapel-jenis-penilaian').value;
    const isBulk = document.getElementById('mapel-mode-bulk')?.checked;
    let payloads = [];

    if (isBulk) {
        document.querySelectorAll('#tbody-mapel-bulk tr').forEach(tr => {
            const idSiswa = tr.dataset.id; const namaSiswa = tr.dataset.nama;
            const kkm = Number(tr.querySelector('.mapel-kkm').value);
            const tugas = Number(tr.querySelector('.mapel-tugas').value);
            const praktek = Number(tr.querySelector('.mapel-praktek').value);
            const adab = tr.querySelector('.mapel-adab').value;
            const nilai = Number(tr.querySelector('.mapel-nilai').value);
            const predikat = tr.querySelector('.mapel-predikat').value;
            
            if(nilai > 0 || tugas > 0 || praktek > 0) {
                payloads.push({ idSiswa, namaSiswa, bulan, mapel, jenisPenilaian, kkm, tugas, praktek, adab, nilai, predikat, guru: window.currentUser.nama, updatedAt: new Date().toISOString() });
            }
        });
    } else {
        const sVal = document.getElementById('mapel-siswa-single').value;
        if(!sVal) { alert("Pilih siswa terlebih dahulu!"); btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai'; btn.disabled = false; return; }
        const [idSiswa, namaSiswa] = sVal.split('|');
        const kkm = Number(document.getElementById('mapel-kkm-single').value);
        const tugas = Number(document.getElementById('mapel-tugas-single').value);
        const praktek = Number(document.getElementById('mapel-praktek-single').value);
        const adab = document.getElementById('mapel-adab-single').value;
        const nilai = Number(document.getElementById('mapel-nilai-single').value);
        const predikat = document.getElementById('mapel-predikat-single').value;
        
        if(nilai > 0 || tugas > 0 || praktek > 0) {
            payloads.push({ idSiswa, namaSiswa, bulan, mapel, jenisPenilaian, kkm, tugas, praktek, adab, nilai, predikat, guru: window.currentUser.nama, updatedAt: new Date().toISOString() });
        }
    }

    if(payloads.length === 0) { alert("Tidak ada nilai valid yang dimasukkan."); btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai'; btn.disabled = false; return; }

    try {
        const { writeBatch, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const { db } = await import('./firebase-init.js');
        
        const batch = writeBatch(db);
        payloads.forEach(p => {
            // Gunakan Jenis Penilaian untuk memisahkan ID dokumen agar UH, UTS, UAS tidak saling timpa
            const formatJenis = p.jenisPenilaian.replace(/\s+/g,'_').substring(0,8);
            const docId = `NM_${p.idSiswa}_${p.mapel.replace(/\s+/g,'')}_${p.bulan}_${formatJenis}`;
            batch.set(doc(db, "NilaiMapel", docId), p);
        });
        await batch.commit();
        alert(`Berhasil menyetor nilai untuk ${payloads.length} entri siswa.`);
        
        if(!isBulk) {
            document.getElementById('mapel-nilai-single').value = '';
            document.getElementById('mapel-tugas-single').value = '0';
            document.getElementById('mapel-praktek-single').value = '0';
            document.getElementById('mapel-predikat-single').value = '';
        }
        window.loadMonitoringMapel();
    } catch(err) { alert("Gagal menyetor nilai: " + err.message); }
    
    btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai'; btn.disabled = false;
};

// Fungsi Baru: Menampilkan UI Tabel Monitoring sesuai input parameter
window.loadMonitoringMapel = async function() {
    const area = document.getElementById('monitoring-mapel-area');
    if(!area) return;

    const bulan = document.getElementById('mapel-bulan').value;
    const mapel = document.getElementById('mapel-nama').value;
    const jenis = document.getElementById('mapel-jenis-penilaian').value;

    if(!bulan || !mapel) {
        area.innerHTML = `<div class="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center text-slate-400 font-bold"><i class="fa-solid fa-table mr-2"></i> Pilih Bulan dan Mapel untuk memonitor data tersimpan.</div>`;
        return;
    }

    area.innerHTML = `<div class="text-center p-6 text-blue-500 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data sinkronisasi...</div>`;

    try {
        const { db } = await import('./firebase-init.js');
        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        const qN = query(collection(db, "NilaiMapel"), where("bulan", "==", bulan), where("mapel", "==", mapel), where("jenisPenilaian", "==", jenis));
        const snapN = await getDocs(qN);
        
        let htmlRows = '';
        snapN.forEach(d => {
            const data = d.data();
            htmlRows += `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td class="p-2 font-bold text-slate-800">${data.namaSiswa}</td>
                    <td class="p-2 text-center text-slate-600">${data.tugas || 0}</td>
                    <td class="p-2 text-center text-slate-600">${data.praktek || 0}</td>
                    <td class="p-2 text-center font-bold text-amber-600">${data.adab || '-'}</td>
                    <td class="p-2 text-center font-black text-blue-600">${data.nilai}</td>
                    <td class="p-2 text-center text-xs text-slate-500">${new Date(data.updatedAt).toLocaleDateString('id-ID')}</td>
                </tr>
            `;
        });

        if(!htmlRows) htmlRows = `<tr><td colspan="6" class="p-6 text-center text-slate-400 font-bold">Belum ada data disetor untuk kombinasi ini.</td></tr>`;

        area.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                <div class="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <h3 class="font-black text-sm"><i class="fa-solid fa-database text-blue-400 mr-2"></i> Tabel Monitoring Sinkronisasi: ${mapel} (${jenis})</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 text-xs uppercase">
                            <tr><th class="p-3">Siswa</th><th class="p-3 text-center">N. Tugas</th><th class="p-3 text-center">N. Praktek</th><th class="p-3 text-center">Adab</th><th class="p-3 text-center">N. Akhir</th><th class="p-3 text-center">Terakhir Disimpan</th></tr>
                        </thead>
                        <tbody>${htmlRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    } catch(e) {
        area.innerHTML = `<div class="p-6 bg-red-50 text-red-500 text-center font-bold border border-red-200 rounded-2xl">Gagal memuat monitoring data.</div>`;
    }
};

// ==========================================
// TAB 2: INPUT TAHFIDZ & ASRAMA (MUSYRIF)
// ==========================================
window.renderInputTahfidz = function() {
    const area = document.getElementById('raport-content-area');
    const optAnak = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus').sort((a,b) => (a.nama||'').localeCompare(b.nama||'')).map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');

    area.innerHTML = `
        <div class="bg-teal-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-teal-500 relative overflow-hidden">
            <h2 class="text-xl font-black text-teal-900 mb-6 border-b border-teal-200 pb-4"><i class="fa-solid fa-book-quran mr-2 text-teal-500"></i> Setor Nilai Tahfidz & Kepengasuhan</h2>
            <form id="form-input-tahfidz" onsubmit="window.simpanInputTahfidz(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Bulan & Tahun Evaluasi</label>
                        <input type="month" id="tahfidz-bulan" onchange="document.getElementById('lbl-semester-tahfidz').innerText = window.getSemesterFromBulan(this.value); window.tarikDataAutoSantri();" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-teal-900 focus:outline-teal-500 bg-white" required>
                        <p class="text-[10px] font-black text-teal-600 mt-1" id="lbl-semester-tahfidz">Pilih Bulan Terlebih Dahulu</p>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-500 uppercase block mb-1">Pilih Siswa / Santri</label>
                        <select id="tahfidz-siswa" onchange="window.tarikDataAutoSantri()" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-teal-900 focus:outline-teal-500 bg-white cursor-pointer" required>
                            <option value="">-- Pilih Siswa --</option>${optAnak}
                        </select>
                        <p class="text-[9px] text-teal-600 font-bold mt-1"><i class="fa-solid fa-bolt mr-1 text-yellow-500"></i> Memilih siswa & bulan otomatis menarik rata-rata Tahfidz & Poin Asrama.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-book-open-reader mr-1 text-teal-600"></i> Capaian Tahfidz</h3>
                        <div class="space-y-3">
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Capaian Hafalan Terakhir (Cth: Juz 30, An-Naba)</label><input type="text" id="tahfidz-capaian" placeholder="Juz ..., Surah ..." class="w-full border-2 p-2.5 rounded-lg text-sm font-bold focus:outline-teal-500 bg-white border-slate-200" required></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Rata-rata Ziyadah</label><input type="number" step="0.1" id="tahfidz-ziyadah" value="0" class="w-full border-2 border-teal-200 p-2 rounded-lg text-sm font-black text-center text-teal-700 bg-teal-50 focus:outline-teal-500"></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Rata-rata Muraja'ah</label><input type="number" step="0.1" id="tahfidz-murajaah" value="0" class="w-full border-2 border-amber-200 p-2 rounded-lg text-sm font-black text-center text-amber-700 bg-amber-50 focus:outline-amber-500"></div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white/60 border border-white p-4 rounded-xl shadow-sm">
                        <h3 class="font-black text-slate-700 text-sm mb-3 border-b border-slate-200 pb-2"><i class="fa-solid fa-bed mr-1 text-teal-600"></i> Kepengasuhan & Akhlaq</h3>
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Total Poin Pelanggaran</label><input type="number" id="tahfidz-pelanggaran" value="0" class="w-full border-2 border-rose-200 p-2 rounded-lg text-sm font-black text-center text-rose-600 bg-rose-50 focus:outline-rose-500"></div>
                                <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Total Poin Prestasi</label><input type="number" id="tahfidz-prestasi" value="0" class="w-full border-2 border-emerald-200 p-2 rounded-lg text-sm font-black text-center text-emerald-600 bg-emerald-50 focus:outline-emerald-500"></div>
                            </div>
                            <div><label class="text-[10px] font-bold text-slate-500 uppercase block">Predikat Akhlaq / Adab</label>
                                <select id="tahfidz-akhlaq" class="w-full border-2 border-slate-200 p-2.5 rounded-lg text-sm font-bold focus:outline-teal-500 bg-white cursor-pointer" required>
                                    <option value="A (Sangat Baik)">A (Sangat Baik)</option>
                                    <option value="B (Baik)" selected>B (Baik)</option>
                                    <option value="C (Cukup)">C (Cukup)</option>
                                    <option value="D (Kurang)">D (Kurang)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button type="submit" id="btn-simpan-input-tahfidz" class="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-black px-10 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg float-right"><i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai Tahfidz</button>
                <div class="clear-both"></div>
            </form>
        </div>
    `;
};

window.tarikDataAutoSantri = async function() {
    const sVal = document.getElementById('tahfidz-siswa').value;
    const bVal = document.getElementById('tahfidz-bulan').value;
    if(!sVal || !bVal) return;
    const [idSiswa, namaSiswa] = sVal.split('|');
    
    try {
        const qT = query(collection(db, "Tahfidz"), where("idSiswa", "==", idSiswa));
        const snapT = await getDocs(qT);
        let totalZ = 0, countZ = 0, totalM = 0, countM = 0;
        
        snapT.forEach(d => {
            const item = d.data();
            if(item.tanggal && item.tanggal.startsWith(bVal)) {
                if(item.ziyadah && item.ziyadah.poin) { totalZ += Number(item.ziyadah.poin); countZ++; }
                if(item.murajaah && item.murajaah.poin) { totalM += Number(item.murajaah.poin); countM++; }
            }
        });
        
        document.getElementById('tahfidz-ziyadah').value = countZ > 0 ? (totalZ/countZ).toFixed(1) : 0;
        document.getElementById('tahfidz-murajaah').value = countM > 0 ? (totalM/countM).toFixed(1) : 0;

        const qA = query(collection(db, "Kepengasuhan"), where("idSiswa", "==", idSiswa));
        const snapA = await getDocs(qA);
        let poinPelanggaran = 0, poinPrestasi = 0;
        
        snapA.forEach(d => {
            const item = d.data();
            if(item.tanggal && item.tanggal.startsWith(bVal)) {
                if(item.kategori === 'Pelanggaran') poinPelanggaran += Number(item.poin || 0);
                if(item.kategori === 'Prestasi') poinPrestasi += Number(item.poin || 0);
            }
        });
        
        document.getElementById('tahfidz-pelanggaran').value = poinPelanggaran;
        document.getElementById('tahfidz-prestasi').value = poinPrestasi;
    } catch(e) { console.error("Gagal menarik data otomatis:", e); }
};

window.simpanInputTahfidz = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-input-tahfidz'); btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    const bulan = document.getElementById('tahfidz-bulan').value;
    const [idSiswa, namaSiswa] = document.getElementById('tahfidz-siswa').value.split('|');

    const payload = {
        idSiswa, namaSiswa, bulan,
        capaian: document.getElementById('tahfidz-capaian').value,
        rataZiyadah: Number(document.getElementById('tahfidz-ziyadah').value),
        rataMurajaah: Number(document.getElementById('tahfidz-murajaah').value),
        pelanggaran: Number(document.getElementById('tahfidz-pelanggaran').value),
        prestasi: Number(document.getElementById('tahfidz-prestasi').value),
        akhlaq: document.getElementById('tahfidz-akhlaq').value,
        musyrif: window.currentUser.nama, updatedAt: new Date().toISOString()
    };

    try {
        const docId = `NT_${idSiswa}_${bulan}`;
        await setDoc(doc(db, "NilaiTahfidz", docId), payload);
        alert("Berhasil menyetor nilai Tahfidz & Kepengasuhan!");
        document.getElementById('form-input-tahfidz').reset();
        document.getElementById('lbl-semester-tahfidz').innerText = "Pilih Bulan Terlebih Dahulu";
    } catch(err) { alert("Gagal menyetor nilai: " + err.message); }
    
    btn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Setor Nilai Tahfidz'; btn.disabled = false;
};

// ==========================================
// FUNGSI SINKRON ABSENSI SISWA (PREMIUM ONLY)
// ==========================================
window.tarikAbsensiSiswa = async function(idSiswa, bulan) {
    if (typeof Swal !== 'undefined') Swal.fire({title: 'Mensinkronisasi Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    try {
        const q = query(collection(db, "AbsensiSiswa")); 
        const snap = await getDocs(q);
        let s = 0, i = 0, a = 0;
        
        snap.forEach(doc => {
            const data = doc.data();
            if(data.tanggal && data.tanggal.startsWith(bulan) && data.detailSiswa) {
                const status = data.detailSiswa.find(x => x.id === idSiswa)?.status;
                if(status === 'Sakit') s++;
                if(status === 'Izin') i++;
                if(status === 'Alpa') a++;
            }
        });
        
        document.getElementById('draft-sakit').value = s;
        document.getElementById('draft-izin').value = i;
        document.getElementById('draft-alpa').value = a;
        
        if (typeof Swal !== 'undefined') Swal.fire('Berhasil!', 'Data kehadiran ditarik dari jurnal absensi kelas.', 'success');
    } catch(e) {
        if (typeof Swal !== 'undefined') Swal.fire('Error', 'Gagal menarik data kehadiran.', 'error');
    }
};

// ==========================================
// TAB 3: PREVIEW & CETAK RAPORT (WALI KELAS/ADMIN)
// ==========================================
window.renderPreviewRaport = function() {
    const area = document.getElementById('raport-content-area');
    const optAnak = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus').sort((a,b) => (a.nama||'').localeCompare(b.nama||'')).map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');

    area.innerHTML = `
        <div class="bg-indigo-50 p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-indigo-500">
            <h2 class="text-xl font-black text-indigo-900 mb-6 border-b border-indigo-200 pb-4"><i class="fa-solid fa-file-signature mr-2 text-indigo-500"></i> Kompilasi & Preview Raport (Wali Kelas)</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase block mb-1">Jenis Raport</label>
                    <select id="prev-jenis" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-indigo-900 focus:outline-indigo-500 bg-white cursor-pointer" required>
                        <option value="Umum">Raport Akademik Umum</option>
                        <option value="Tahfidz">Raport Tahfidz & Kepengasuhan</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase block mb-1">Bulan & Tahun Evaluasi</label>
                    <input type="month" id="prev-bulan" onchange="document.getElementById('lbl-prev-semester').innerText = window.getSemesterFromBulan(this.value)" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-indigo-900 focus:outline-indigo-500 bg-white cursor-pointer" required>
                    <p class="text-[10px] font-black text-indigo-600 mt-1" id="lbl-prev-semester">Pilih Bulan Terlebih Dahulu</p>
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase block mb-1">Jenis Penilaian (Khusus Mapel)</label>
                    <select id="prev-jenis-penilaian" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-indigo-900 focus:outline-indigo-500 bg-white cursor-pointer" required>
                        <option value="Semua">Semua (Gabungan)</option>
                        <option value="Ulangan Harian">Ulangan Harian</option>
                        <option value="Ujian Tengah Semester (UTS)">Ujian Tengah Semester (UTS)</option>
                        <option value="Ujian Akhir Semester (UAS)">Ujian Akhir Semester (UAS)</option>
                        <option value="Tugas Akhir/Portofolio">Tugas Akhir/Portofolio</option>
                    </select>
                </div>
                <div>
                    <label class="text-xs font-black text-slate-500 uppercase block mb-1">Target Siswa</label>
                    <select id="prev-siswa" class="w-full border-2 border-white shadow-sm p-3 rounded-xl font-bold text-indigo-900 focus:outline-indigo-500 bg-white cursor-pointer" required>
                        <option value="">-- Pilih Siswa --</option>${optAnak}
                    </select>
                </div>
            </div>
            <button type="button" onclick="window.generatePreviewRaport()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3.5 rounded-xl shadow-md transition transform hover:-translate-y-1"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Tarik Data & Buat Draft Raport</button>
        </div>

        <div id="preview-result-area" class="hidden bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mb-6 animate-slide-up">
            </div>
    `;
};

window.generatePreviewRaport = async function() {
    const lembaga = window.appState.lembaga[0] || {};
    const isPremium = (lembaga.lisensiFitur || []).includes('raport_plus');

    const jenis = document.getElementById('prev-jenis').value;
    const bulan = document.getElementById('prev-bulan').value;
    const sVal = document.getElementById('prev-siswa').value;
    const jenisPenilaian = document.getElementById('prev-jenis-penilaian').value;
    const area = document.getElementById('preview-result-area');
    
    if(!bulan || !sVal) return alert("Silakan isi semua pilihan filter!");
    const [idSiswa, namaSiswa] = sVal.split('|');
    const semester = window.getSemesterFromBulan(bulan);
    
    area.innerHTML = `<div class="text-center p-10"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-3"></i><br><span class="font-bold text-slate-500">Mengkalkulasi Dokumen...</span></div>`;
    area.classList.remove('hidden');

    try {
        const { db } = await import('./firebase-init.js');
        const { collection, getDocs, query, where, getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

        if(jenis === 'Umum') {
            let qN;
            if(jenisPenilaian === 'Semua') {
                qN = query(collection(db, "NilaiMapel"), where("idSiswa", "==", idSiswa), where("bulan", "==", bulan));
            } else {
                qN = query(collection(db, "NilaiMapel"), where("idSiswa", "==", idSiswa), where("bulan", "==", bulan), where("jenisPenilaian", "==", jenisPenilaian));
            }

            const snapN = await getDocs(qN);
            let nilaiMapel = []; let totalNilai = 0;
            snapN.forEach(d => { const n = d.data(); nilaiMapel.push(n); totalNilai += n.nilai; });
            
            if(nilaiMapel.length === 0) return area.innerHTML = `<div class="text-center p-10 text-rose-500 font-bold"><i class="fa-solid fa-triangle-exclamation text-4xl mb-3 block"></i>Belum ada guru yang menyetor nilai akademik untuk filter ini di bulan tersebut.</div>`;
            
            const rataRata = (totalNilai / nilaiMapel.length).toFixed(1);
            let trMapel = nilaiMapel.map((m,i) => `<tr><td class="p-2 border text-center">${i+1}</td><td class="p-2 border">${m.mapel} ${jenisPenilaian === 'Semua' && m.jenisPenilaian ? `<span class="text-[9px] bg-slate-100 px-1 rounded block w-max">${m.jenisPenilaian}</span>` : ''}</td><td class="p-2 border text-center">${m.kkm}</td><td class="p-2 border text-center font-bold">${m.nilai}</td><td class="p-2 border text-center">${m.predikat}</td></tr>`).join('');

            window.tempDraftRaport = { jenis, semester, idSiswa, namaSiswa, nilaiMapel, rataRata, jenisPenilaian };

            const btnSyncAbsen = isPremium ? `<button type="button" onclick="window.tarikAbsensiSiswa('${idSiswa}', '${bulan}')" class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded ml-2 font-bold hover:bg-indigo-200 transition shadow-sm"><i class="fa-solid fa-sync mr-1"></i> Auto-Sync Data Kelas</button>` : `<span class="text-[9px] bg-slate-100 text-slate-400 px-2 py-1 rounded ml-2 font-bold cursor-not-allowed border shadow-sm" title="Sinkron Presensi Tersedia di Raport Plus"><i class="fa-solid fa-lock mr-1"></i> Auto-Sync Data Kelas</span>`;

            area.innerHTML = `
                <h3 class="text-xl font-black text-slate-800 text-center uppercase border-b-4 border-indigo-600 pb-4 mb-6">DRAFT RAPORT AKADEMIK UMUM<br><span class="text-sm font-bold text-slate-500">${namaSiswa} | ${semester} | Penilaian: ${jenisPenilaian}</span></h3>
                <div class="mb-6 overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead class="bg-slate-100 text-slate-700 font-bold"><tr><td class="p-2 border text-center w-10">No</td><td class="p-2 border">Mata Pelajaran</td><td class="p-2 border text-center w-16">KKM</td><td class="p-2 border text-center w-16">Nilai</td><td class="p-2 border text-center w-24">Predikat</td></tr></thead>
                        <tbody>${trMapel}<tr class="bg-indigo-50 font-black text-indigo-900"><td colspan="3" class="p-2 border text-right">RATA-RATA:</td><td colspan="2" class="p-2 border text-center">${rataRata}</td></tr></tbody>
                    </table>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 class="font-black text-sm text-slate-700 mb-3 flex items-center justify-between">
                            <span><i class="fa-solid fa-fingerprint text-indigo-500 mr-1"></i> Kehadiran Bulanan</span>
                            ${btnSyncAbsen}
                        </h4>
                        <div class="grid grid-cols-3 gap-3">
                            <div><label class="text-[10px] font-bold text-slate-500 block">Sakit</label><input type="number" id="draft-sakit" value="0" class="w-full border p-2 rounded text-center font-bold focus:outline-indigo-500 bg-white"></div>
                            <div><label class="text-[10px] font-bold text-slate-500 block">Izin</label><input type="number" id="draft-izin" value="0" class="w-full border p-2 rounded text-center font-bold focus:outline-indigo-500 bg-white"></div>
                            <div><label class="text-[10px] font-bold text-slate-500 block">Alpa</label><input type="number" id="draft-alpa" value="0" class="w-full border p-2 rounded text-center font-bold focus:outline-indigo-500 bg-white"></div>
                        </div>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 class="font-black text-sm text-slate-700 mb-3"><i class="fa-solid fa-comment-dots text-indigo-500 mr-1"></i> Catatan Wali Kelas</h4>
                        <textarea id="draft-catatan" rows="3" class="w-full border p-2 rounded text-xs font-medium focus:outline-indigo-500" placeholder="Tulis catatan wali kelas..." required></textarea>
                    </div>
                </div>
                <button type="button" onclick="window.simpanFinalRaport()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-xl shadow-lg transition text-lg"><i class="fa-solid fa-box-archive mr-2"></i> Simpan & ${isPremium?'Arsipkan, lalu ':''}Cetak PDF</button>
            `;
        } else {
            const docId = `NT_${idSiswa}_${bulan}`;
            const snap = await getDoc(doc(db, "NilaiTahfidz", docId));
            if(!snap.exists()) return area.innerHTML = `<div class="text-center p-10 text-rose-500 font-bold"><i class="fa-solid fa-triangle-exclamation text-4xl mb-3 block"></i>Belum ada Musyrif yang menyetor nilai Tahfidz untuk siswa ini di bulan tersebut.</div>`;
            
            const n = snap.data();
            window.tempDraftRaport = { jenis, semester, idSiswa, namaSiswa, capaian: n.capaian, rataZiyadah: n.rataZiyadah, rataMurajaah: n.rataMurajaah, pelanggaran: n.pelanggaran, prestasi: n.prestasi, akhlaq: n.akhlaq };

            area.innerHTML = `
                <h3 class="text-xl font-black text-slate-800 text-center uppercase border-b-4 border-teal-600 pb-4 mb-6">DRAFT RAPORT TAHFIDZ & ASRAMA<br><span class="text-sm font-bold text-slate-500">${namaSiswa} | ${semester}</span></h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-teal-50 p-4 rounded-xl border border-teal-100">
                        <h4 class="font-black text-sm text-teal-800 mb-2 border-b border-teal-200 pb-2">Nilai Tahfidz</h4>
                        <p class="text-xs font-bold text-slate-600 mb-1">Capaian: <span class="text-teal-700 font-black">${n.capaian}</span></p>
                        <p class="text-xs font-bold text-slate-600 mb-1">Rata Ziyadah: <span class="text-teal-700 font-black">${n.rataZiyadah}</span></p>
                        <p class="text-xs font-bold text-slate-600">Rata Muraja'ah: <span class="text-teal-700 font-black">${n.rataMurajaah}</span></p>
                    </div>
                    <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 class="font-black text-sm text-amber-800 mb-2 border-b border-amber-200 pb-2">Nilai Asrama</h4>
                        <p class="text-xs font-bold text-slate-600 mb-1">Pelanggaran: <span class="text-rose-600 font-black">${n.pelanggaran} Poin</span></p>
                        <p class="text-xs font-bold text-slate-600 mb-1">Prestasi: <span class="text-emerald-600 font-black">${n.prestasi} Poin</span></p>
                        <p class="text-xs font-bold text-slate-600">Akhlaq/Adab: <span class="text-amber-700 font-black">${n.akhlaq}</span></p>
                    </div>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <h4 class="font-black text-sm text-slate-700 mb-3"><i class="fa-solid fa-comment-dots text-teal-500 mr-1"></i> Catatan Musyrif / Kepala Asrama</h4>
                    <textarea id="draft-catatan" rows="3" class="w-full border p-2 rounded text-xs font-medium focus:outline-teal-500" placeholder="Tulis catatan asrama..." required></textarea>
                </div>
                <button type="button" onclick="window.simpanFinalRaport()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-xl shadow-lg transition text-lg"><i class="fa-solid fa-box-archive mr-2"></i> Simpan & ${isPremium?'Arsipkan, lalu ':''}Cetak PDF</button>
            `;
        }
    } catch(e) { area.innerHTML = `<div class="text-center p-10 text-rose-500 font-bold">Terjadi kesalahan sistem.</div>`; }
};

window.simpanFinalRaport = async function() {
    const d = window.tempDraftRaport;
    const ct = document.getElementById('draft-catatan').value;
    if(!ct) return alert("Catatan wajib diisi!");

    d.kelas = (window.appState.anak.find(a=>a.id===d.idSiswa)||{}).kelas || '-';
    d.catatan = ct;
    d.updatedAt = new Date().toISOString();

    if(d.jenis === 'Umum') {
        d.kehadiran = { sakit: document.getElementById('draft-sakit').value, izin: document.getElementById('draft-izin').value, alpa: document.getElementById('draft-alpa').value };
        d.waliKelas = window.currentUser.nama;
    } else {
        d.musyrif = window.currentUser.nama;
    }

    try {
        const lembaga = window.appState.lembaga[0] || {};
        // --- GEMBOK MODULAR ---
        const isPremium = (lembaga.lisensiFitur || []).includes('raport_plus');
        const docId = `RAPORT_${d.jenis}_${d.idSiswa}_${d.semester.replace(/\s+/g,'')}`;
        
        // JIKA TIDAK DIBELI, DATA TIDAK TERSIMPAN DI ARSIP FIRESTORE
        if(isPremium) {
            await setDoc(doc(db, "Raport", docId), d);
        }

        alert("Berhasil! Sistem akan mulai mencetak file PDF Anda.");
        document.getElementById('preview-result-area').classList.add('hidden');
        window.cetakRaportPDF(d, isPremium ? docId : null, d.jenis);
    } catch(err) { alert("Gagal memproses dokumen: " + err.message); }
};

// ==========================================
// TAB 4: ARSIP RAPORT (ADMIN/TU)
// ==========================================
window.renderArsipRaport = function() {
    const area = document.getElementById('raport-content-area');
    area.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div class="p-6 bg-slate-800 border-b border-slate-700 font-black text-white flex justify-between items-center">
                <span><i class="fa-solid fa-box-archive mr-2"></i> Pangkalan Data Arsip Raport Terpusat</span>
                <button onclick="window.loadArsipRaport()" class="text-xs bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-600 transition"><i class="fa-solid fa-sync mr-1"></i> Muat Ulang</button>
            </div>
            <div class="overflow-x-auto p-4 custom-scrollbar">
                <table class="w-full text-left text-sm whitespace-nowrap">
                    <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200 uppercase text-[10px]">
                        <tr><th class="p-3">Tgl Terbit</th><th class="p-3">Kategori</th><th class="p-3">Semester</th><th class="p-3">Nama Siswa</th><th class="p-3">Penanggung Jawab</th><th class="p-3 text-center">Aksi Dokumen</th></tr>
                    </thead>
                    <tbody id="tbody-arsip-raport"><tr><td colspan="6" class="text-center p-8 text-slate-400 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat Arsip...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    window.loadArsipRaport();
};

window.loadArsipRaport = async function() {
    const tbody = document.getElementById('tbody-arsip-raport');
    if(!tbody) return;
    try {
        const q = query(collection(db, "Raport"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(d => {
            const item = d.data();
            const badge = item.jenis === 'Umum' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700';
            const pj = item.jenis === 'Umum' ? item.waliKelas : item.musyrif;
            const tgl = new Date(item.updatedAt).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'});

            // PENGUBAHAN: Saat cetak ulang, lewatkan seluruh data objek langsung
            html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-500 text-xs">${tgl}</td>
                <td class="p-3"><span class="px-2 py-1 rounded text-[10px] font-black uppercase border ${badge}">${item.jenis}</span></td>
                <td class="p-3 font-bold text-slate-700 text-xs">${item.semester}</td>
                <td class="p-3 font-black text-slate-800">${item.namaSiswa} <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded ml-1">Kls ${item.kelas}</span></td>
                <td class="p-3 text-xs font-bold text-slate-500">${pj}</td>
                <td class="p-3 text-center">
                    <button onclick='window.cetakRaportPDF(${JSON.stringify(item).replace(/'/g, "&apos;")}, "${d.id}", "${item.jenis}")' class="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition font-bold text-xs shadow-sm mr-1"><i class="fa-solid fa-print"></i> Cetak Ulang PDF</button>
                    <button onclick="window.hapusArsipRaport('${d.id}')" class="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-2 py-1.5 rounded-lg transition font-bold text-xs shadow-sm"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Belum ada dokumen arsip raport.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-red-500 font-bold">Gagal memuat data.</td></tr>'; }
};

window.hapusArsipRaport = async function(id) {
    if(confirm("Yakin ingin menghapus dokumen raport final ini secara permanen dari Arsip? (Data mentah di Tahfidz/Mapel tidak akan terhapus)")) {
        try { await deleteDoc(doc(db, "Raport", id)); window.loadArsipRaport(); } catch(e) { alert("Gagal menghapus!"); }
    }
};

// ==========================================
// MESIN CETAK PDF RAPORT (NATIVE)
// ==========================================
window.cetakRaportPDF = async function(dataObj, idRaport, jenis) {
    if (typeof window.showGlobalLoading === "function") window.showGlobalLoading('Menyiapkan Dokumen PDF...');
    
    try {
        let data = dataObj;
        
        // Opsi fallback jika data tidak ter-pass sempurna dari memori
        if (!data || Object.keys(data).length === 0) {
            if (!idRaport) throw new Error("Data raport hilang dari memori (Mode Standar)");
            const docRef = doc(db, "Raport", idRaport);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) throw new Error("Dokumen Raport tidak ditemukan di database!");
            data = docSnap.data();
        }

        const lembaga = window.appState.lembaga[0] || {};
        const logoUrl = lembaga.logo || '';
        
        let headerHtml = `
            <div style="display:flex; align-items:center; justify-content:center; border-bottom:4px solid #1e3a8a; padding-bottom:15px; margin-bottom:20px;">
                ${logoUrl ? `<img src="${logoUrl}" style="height:80px; width:auto; margin-right:20px;">` : ''}
                <div style="text-align:center;">
                    <h1 style="margin:0; color:#1e3a8a; font-size:24px; font-weight:900; text-transform:uppercase;">${lembaga.namaLembaga || 'YAYASAN PENDIDIKAN'}</h1>
                    <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; color:#475569;">${lembaga.alamatLembaga || 'Alamat Belum Diatur'}</p>
                    <p style="margin:2px 0 0 0; font-size:12px; font-weight:bold; color:#475569;">Telp: ${lembaga.kontak || '-'} | Email: ${lembaga.email || '-'}</p>
                </div>
            </div>
            
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0; font-size:18px; font-weight:900; text-transform:uppercase;">LAPORAN HASIL BELAJAR (RAPORT ${jenis.toUpperCase()})</h2>
            </div>

            <table style="width:100%; margin-bottom:20px; font-size:14px; font-weight:bold; line-height:1.5;">
                <tr><td style="width:120px;">Nama Santri</td><td>: ${data.namaSiswa}</td><td style="width:120px;">Tahun Ajaran</td><td>: ${data.semester}</td></tr>
                <tr><td>Kelas/Halaqah</td><td>: ${data.kelas || '-'}</td><td>Wali/Musyrif</td><td>: ${jenis === 'Umum' ? data.waliKelas : data.musyrif}</td></tr>
            </table>
        `;

        let contentHtml = '';

        if (jenis === 'Umum') {
            const trMapel = (data.nilaiMapel||[]).map((m, i) => `
                <tr>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${i+1}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px;">${m.mapel || m.nama}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${m.kkm}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center; font-weight:bold;">${m.nilai}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${m.predikat.split(' ')[0]}</td>
                </tr>
            `).join('');

            contentHtml = `
                <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
                    <thead style="background-color:#e2e8f0; font-weight:bold; text-align:center;">
                        <tr>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:40px;">No</td>
                            <td style="border:1px solid #cbd5e1; padding:10px;">Mata Pelajaran</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:60px;">KKM</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:60px;">Nilai</td>
                            <td style="border:1px solid #cbd5e1; padding:10px; width:80px;">Predikat</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${trMapel}
                        <tr style="background-color:#f8fafc; font-weight:bold;">
                            <td colspan="3" style="border:1px solid #cbd5e1; padding:8px; text-align:right;">RATA-RATA NILAI :</td>
                            <td colspan="2" style="border:1px solid #cbd5e1; padding:8px; text-align:center;">${data.rataRata}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="display:flex; gap:20px; margin-bottom:20px;">
                    <div style="flex:1;">
                        <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Kehadiran</h4>
                        <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #cbd5e1;">
                            <tr><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">Sakit</td><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">${data.kehadiran?.sakit||0} Hari</td></tr>
                            <tr><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0;">Izin</td><td style="padding:6px 10px; border-bottom:1px solid #e2e8f0; text-align:center;">${data.kehadiran?.izin||0} Hari</td></tr>
                            <tr><td style="padding:6px 10px;">Tanpa Keterangan</td><td style="padding:6px 10px; text-align:center;">${data.kehadiran?.alpa||0} Hari</td></tr>
                        </table>
                    </div>
                    <div style="flex:2;">
                        <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Catatan Wali Kelas</h4>
                        <div style="border:1px solid #cbd5e1; padding:10px; min-height:85px; font-size:13px; border-radius:4px; font-style:italic;">
                            "${data.catatan}"
                        </div>
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
                    <tr style="background-color:#e2e8f0; font-weight:bold;">
                        <td colspan="2" style="border:1px solid #cbd5e1; padding:10px; text-align:center;">CAPAIAN TAHFIDZ AL-QUR'AN</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; width:40%; font-weight:bold;">Capaian Terakhir</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:900; color:#0f766e;">${data.capaian}</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Rata-Rata Nilai Ziyadah (Hafalan Baru)</td>
                        <td style="border:1px solid #cbd5e1; padding:10px;">${data.rataZiyadah}</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Rata-Rata Nilai Muraja'ah (Pengulangan)</td>
                        <td style="border:1px solid #cbd5e1; padding:10px;">${data.rataMurajaah}</td>
                    </tr>
                </table>

                <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
                    <tr style="background-color:#e2e8f0; font-weight:bold;">
                        <td colspan="2" style="border:1px solid #cbd5e1; padding:10px; text-align:center;">KEPENGASUHAN & ASRAMA</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; width:40%; font-weight:bold;">Total Poin Pelanggaran Kedisiplinan</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; color:#be123c;">${data.pelanggaran} Poin</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Total Poin Prestasi & Kebaikan</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; color:#047857;">${data.prestasi} Poin</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:bold;">Predikat Adab & Akhlaq</td>
                        <td style="border:1px solid #cbd5e1; padding:10px; font-weight:900;">${data.akhlaq}</td>
                    </tr>
                </table>

                <div style="margin-bottom:30px;">
                    <h4 style="margin:0 0 5px 0; font-size:14px; font-weight:bold; border-bottom:2px solid #cbd5e1; padding-bottom:5px;">Catatan Musyrif / Pembina Asrama</h4>
                    <div style="border:1px solid #cbd5e1; padding:15px; min-height:80px; font-size:13px; border-radius:4px; font-style:italic;">
                        "${data.catatan}"
                    </div>
                </div>
            `;
        }

        let footerHtml = `
            <table style="width:100%; font-size:14px; text-align:center; margin-top:50px;">
                <tr>
                    <td style="width:33%; padding-bottom:80px;">Mengetahui,<br>Orang Tua / Wali</td>
                    <td style="width:33%; padding-bottom:80px;"></td>
                    <td style="width:33%; padding-bottom:80px;">Diberikan di: Kantor Yayasan<br>Tanggal: ${new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}<br><br>${jenis === 'Umum' ? 'Wali Kelas' : 'Musyrif / Pembina'}</td>
                </tr>
                <tr>
                    <td style="font-weight:bold;">( ......................................... )</td>
                    <td style="font-weight:bold;">Mengetahui,<br>Kepala Sekolah / Mudir<br><br><br><br><br>( ......................................... )</td>
                    <td style="font-weight:bold;">( ${jenis === 'Umum' ? data.waliKelas : data.musyrif} )</td>
                </tr>
            </table>
        `;

        const finalHtml = `<div style="padding:40px; font-family:'Times New Roman', Times, serif; color:#0f172a; width:800px; background:#fff;">${headerHtml}${contentHtml}${footerHtml}</div>`;
        
        let containerPrint = document.getElementById('raport-pdf-container');
        if (!containerPrint) {
            containerPrint = document.createElement('div');
            containerPrint.id = 'raport-pdf-container';
            containerPrint.className = 'hidden absolute top-[-9999px] bg-white';
            document.body.appendChild(containerPrint);
        }
        containerPrint.innerHTML = finalHtml;

        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5],
            filename:     `Raport_${jenis}_${data.namaSiswa.replace(/\s+/g, '_')}_${data.semester.replace(/\s+/g, '')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        if (typeof window.hideGlobalLoading === "function") window.hideGlobalLoading();
        window.html2pdf().set(opt).from(containerPrint).save();

    } catch (error) {
        if (typeof window.hideGlobalLoading === "function") window.hideGlobalLoading();
        alert("Gagal merender PDF: " + error.message);
    }
};
