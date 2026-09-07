import { db } from './firebase-init.js';
import { collection, addDoc, doc, deleteDoc, getDocs, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// FUNGSI DINAMIS FORM KEPENGASUHAN
window.toggleAsramaFields = function() {
    const kat = document.getElementById('asrama-kategori').value;
    const fHarian = document.getElementById('field-harian');
    const fTindakan = document.getElementById('field-tindakan');
    
    fHarian.classList.add('hidden');
    fTindakan.classList.add('hidden');

    if (kat === 'Rutinitas Harian') {
        fHarian.classList.remove('hidden');
    } else {
        fTindakan.classList.remove('hidden');
        const lblBentuk = document.getElementById('lbl-bentuk-kejadian');
        const lblSolusi = document.getElementById('lbl-solusi-tindakan');
        
        if (kat === 'Pelanggaran') { lblBentuk.innerText = "Isi / Bentuk Pelanggaran"; lblSolusi.innerText = "Tindakan / Hukuman (Takzir)"; } 
        else if (kat === 'Prestasi') { lblBentuk.innerText = "Bentuk Prestasi / Kebaikan"; lblSolusi.innerText = "Penghargaan / Reward"; } 
        else if (kat === 'Kesehatan') { lblBentuk.innerText = "Keluhan Sakit"; lblSolusi.innerText = "Tindakan Medis / Obat"; }
    }
};

window.toggleBulkAsrama = function() {
    const isBulk = document.getElementById('mode-bulk-asrama').checked;
    if (isBulk) {
        document.getElementById('asrama-siswa-single').classList.add('hidden');
        document.getElementById('asrama-siswa-bulk').classList.remove('hidden');
    } else {
        document.getElementById('asrama-siswa-single').classList.remove('hidden');
        document.getElementById('asrama-siswa-bulk').classList.add('hidden');
    }
};

export async function renderHalamanKepengasuhan(container) {
    const currentUser = window.currentUser || {};
    const isSA_Admin = ['Super Admin', 'Administrator', 'Operator/TU'].includes(currentUser.hakAkses);
    const userJabs = (currentUser.detailJabatan || []).map(j => j.namaJabatan.toLowerCase());
    
    const isMudirOrHead = userJabs.some(j => j.includes('kepala') || j.includes('ketua') || j.includes('mudir'));
    const canAssignPlotting = isSA_Admin || isMudirOrHead || userJabs.some(j => j.includes('pengasuh'));
    const isStrictMusyrif = !isSA_Admin && !isMudirOrHead;

    let anakList = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus' && a.asrama === 'Ya');
    if (isStrictMusyrif) anakList = anakList.filter(a => a.musyrifPengasuh === currentUser.nama);

    let optAnak = anakList.map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');
    let chkAnak = anakList.map(a => `<label class="flex items-center space-x-2 bg-white p-2 border rounded cursor-pointer hover:bg-emerald-50"><input type="checkbox" name="bulk-santri-asrama" value="${a.id}|${a.nama}" class="w-4 h-4 text-emerald-600 rounded"><span class="text-xs font-bold text-slate-700">${a.nama}</span></label>`).join('');

    const daftarMusyrif = (window.appState.pegawai || []).filter(p => {
        const jabs = (p.detailJabatan || []).map(j => j.namaJabatan.toLowerCase());
        return jabs.some(j => j.includes('pengasuh') || j.includes('musyrif') || j.includes('pembina') || j.includes('asrama'));
    });

    const anakAsrama = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus' && a.asrama === 'Ya');

    container.innerHTML = `
    ${canAssignPlotting ? `
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-indigo-500">
        <h2 class="text-xl font-black text-slate-800 mb-6 border-b pb-4"><i class="fa-solid fa-users-gear text-indigo-500 mr-2"></i> Plotting Anak Asuh (Kamar / Halaqah)</h2>
        <form id="form-plotting" onsubmit="window.simpanPlotting(event)">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pilih Musyrif / Pengasuh</label>
                    <select id="plot-musyrif" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold bg-slate-50 focus:outline-indigo-500 cursor-pointer" required>
                        <option value="">-- Pilih Musyrif --</option>
                        ${daftarMusyrif.map(p => `<option value="${p.nama}">${p.nama}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Pilih Santri Asrama (Bisa lebih dari 1)</label>
                    <div class="max-h-48 overflow-y-auto custom-scrollbar border-2 border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                        ${anakAsrama.length > 0 ? anakAsrama.map(a => `
                        <label class="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition">
                            <input type="checkbox" name="plot-santri-chk" value="${a.id}" class="w-4 h-4 text-indigo-600 rounded">
                            <span class="font-bold text-slate-700 text-sm flex-1">${a.nama} <span class="text-[10px] font-bold text-indigo-500 ml-1 bg-indigo-50 px-1 rounded border border-indigo-100">Kls ${a.kelas||'-'}</span></span>
                            <span class="text-[9px] font-black ${a.musyrifPengasuh ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-rose-500 bg-rose-50 border border-rose-200'} px-2 py-0.5 rounded-full whitespace-nowrap">${a.musyrifPengasuh || 'Belum Diplot'}</span>
                        </label>`).join('') : '<p class="text-xs text-slate-400 font-bold text-center py-4">Tidak ada data santri asrama.</p>'}
                    </div>
                </div>
            </div>
            <button type="submit" id="btn-simpan-plot" class="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Plotting</button>
        </form>
    </div>
    ` : ''}

    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-emerald-500 relative overflow-hidden">
        ${isStrictMusyrif ? `<div class="absolute top-0 right-0 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-bl-xl text-[10px] font-black"><i class="fa-solid fa-user-shield mr-1"></i> MODE MUSYRIF</div>` : ''}
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h2 class="text-xl font-black text-slate-800"><i class="fa-solid fa-bed text-emerald-500 mr-2"></i> Jurnal Kepengasuhan Spesifik</h2>
            <label class="flex items-center cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition">
                <input type="checkbox" id="mode-bulk-asrama" onchange="window.toggleBulkAsrama()" class="mr-2 w-4 h-4 text-emerald-600 rounded">
                <span class="text-xs font-bold text-slate-700">Mode Input Massal</span>
            </label>
        </div>

        <form id="form-pengasuhan" onsubmit="window.simpanKepengasuhan(event)">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="md:col-span-3">
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pilih Santri Binaan Anda</label>
                    <select id="asrama-siswa-single" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold bg-slate-50 focus:outline-emerald-500 cursor-pointer">
                        <option value="">-- Pilih Satu Siswa --</option>${optAnak}
                    </select>
                    <div id="asrama-siswa-bulk" class="hidden grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border-2 border-slate-200 p-3 rounded-xl max-h-40 overflow-y-auto">
                        ${chkAnak || '<p class="text-xs text-slate-400 font-bold col-span-full text-center">Belum ada santri binaan.</p>'}
                    </div>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Tanggal Kejadian</label>
                    <input type="date" id="asrama-tgl" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold bg-slate-50 focus:outline-emerald-500" required>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Kategori Laporan</label>
                    <select id="asrama-kategori" onchange="window.toggleAsramaFields()" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold bg-slate-50 focus:outline-emerald-500 cursor-pointer" required>
                        <option value="Rutinitas Harian">Rutinitas / Kegiatan Harian</option>
                        <option value="Pelanggaran">Pelanggaran Disiplin</option>
                        <option value="Prestasi">Prestasi & Kebaikan</option>
                        <option value="Kesehatan">Kesehatan & Sakit</option>
                    </select>
                </div>
            </div>

            <!-- FIELD RUTINITAS HARIAN -->
            <div id="field-harian" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div>
                    <label class="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Status Pelaksanaan</label>
                    <select id="asrama-status-rutin" class="w-full border-2 border-blue-200 p-3 rounded-xl font-bold bg-white focus:outline-blue-500 cursor-pointer">
                        <option value="Terlaksana Semua">Semua Rutinitas Terlaksana</option>
                        <option value="Ada yang Bolong">Ada Kegiatan yang Terlewat</option>
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Keterangan / Alasan</label>
                    <input type="text" id="asrama-ket-rutin" placeholder="Cth: Sholat subuh terlambat, dll..." class="w-full border-2 border-blue-200 p-3 rounded-xl font-medium bg-white focus:outline-blue-500">
                </div>
            </div>

            <!-- FIELD PELANGGARAN / PRESTASI / KESEHATAN -->
            <div id="field-tindakan" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <div>
                    <label id="lbl-bentuk-kejadian" class="text-[10px] font-bold text-orange-600 uppercase mb-1 block">Bentuk Kejadian</label>
                    <textarea id="asrama-bentuk" rows="2" placeholder="Jelaskan detailnya di sini..." class="w-full border-2 border-orange-200 p-3 rounded-xl font-medium bg-white focus:outline-orange-500"></textarea>
                </div>
                <div>
                    <label id="lbl-solusi-tindakan" class="text-[10px] font-bold text-orange-600 uppercase mb-1 block">Tindakan / Solusi</label>
                    <textarea id="asrama-tindakan" rows="2" placeholder="Tindakan yang diberikan..." class="w-full border-2 border-orange-200 p-3 rounded-xl font-medium bg-white focus:outline-orange-500"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label class="text-[10px] font-bold text-orange-600 uppercase mb-1 block">Poin Tersesuaikan (Opsional)</label>
                    <input type="number" id="asrama-poin" value="0" class="w-full border-2 border-orange-200 p-3 rounded-xl font-bold bg-white focus:outline-orange-500">
                </div>
            </div>

            <button type="submit" id="btn-simpan-asrama" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Catatan</button>
        </form>
    </div>
    
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-5 bg-slate-50 border-b border-slate-200 font-black text-slate-700"><i class="fa-solid fa-list-check mr-2"></i> Riwayat Jurnal Kepengasuhan</div>
        <div class="overflow-x-auto p-4 custom-scrollbar">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                    <tr><th class="p-3">Tanggal</th><th class="p-3">Nama Santri</th><th class="p-3">Kategori</th><th class="p-3">Detail & Tindakan</th><th class="p-3 text-center">Poin</th><th class="p-3">Pencatat</th><th class="p-3 text-center">Aksi</th></tr>
                </thead>
                <tbody id="tbody-pengasuhan"><tr><td colspan="7" class="text-center p-8 text-slate-400 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data...</td></tr></tbody>
            </table>
        </div>
    </div>
    `;
    
    setTimeout(() => { document.getElementById('asrama-tgl').value = new Date().toISOString().split('T')[0]; }, 50);
    window.loadDataKepengasuhan();
}

window.simpanPlotting = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-plot');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;

    const musyrifName = document.getElementById('plot-musyrif').value;
    const checkedSantri = Array.from(document.querySelectorAll('input[name="plot-santri-chk"]:checked')).map(cb => cb.value);

    if (checkedSantri.length === 0) {
        alert("Pilih minimal 1 santri terlebih dahulu!");
        btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Plotting'; btn.disabled = false;
        return;
    }

    try {
        for (const idSiswa of checkedSantri) {
            await updateDoc(doc(db, "Anak", idSiswa), { musyrifPengasuh: musyrifName, updatedAt: new Date().toISOString() });
            const studentIndex = window.appState.anak.findIndex(a => a.id === idSiswa);
            if (studentIndex > -1) window.appState.anak[studentIndex].musyrifPengasuh = musyrifName;
        }
        alert(`Berhasil! ${checkedSantri.length} santri telah diplot ke Musyrif/ah: ${musyrifName}.`);
        window.navigate('kepengasuhan');
    } catch (err) { alert("Gagal menyimpan plotting!"); }
    
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Plotting'; btn.disabled = false;
};

window.loadDataKepengasuhan = async function() {
    const tbody = document.getElementById('tbody-pengasuhan');
    if(!tbody) return;
    
    const currentUser = window.currentUser || {};
    const isSA_Admin = ['Super Admin', 'Administrator', 'Operator/TU'].includes(currentUser.hakAkses);
    const userJabs = (currentUser.detailJabatan || []).map(j => j.namaJabatan.toLowerCase());
    const isHead = userJabs.some(j => j.includes('kepala') || j.includes('ketua') || j.includes('mudir'));

    try {
        const q = query(collection(db, "Kepengasuhan"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(d => {
            const item = d.data();
            if (!isSA_Admin && !isHead && item.pencatat !== currentUser.nama) return;
            
            let badge = 'bg-slate-100 text-slate-700';
            if(item.kategori === 'Pelanggaran') badge = 'bg-red-100 text-red-700 border-red-200';
            if(item.kategori === 'Prestasi') badge = 'bg-green-100 text-green-700 border-green-200';
            if(item.kategori === 'Kesehatan') badge = 'bg-orange-100 text-orange-700 border-orange-200';
            if(item.kategori === 'Rutinitas Harian') badge = 'bg-blue-100 text-blue-700 border-blue-200';

            const canDelete = isSA_Admin || isHead || item.pencatat === currentUser.nama;
            let detailHtml = '';
            if (item.kategori === 'Rutinitas Harian') {
                detailHtml = `<span class="font-bold text-slate-800">${item.statusRutin}</span><br><span class="text-[10px] text-slate-500">${item.ketRutin || '-'}</span>`;
            } else {
                detailHtml = `<span class="font-bold text-slate-800 block leading-tight mb-1">${item.bentuk}</span><span class="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-100 px-1 rounded block w-max"><i class="fa-solid fa-arrow-right"></i> ${item.tindakan || 'Belum ada tindakan'}</span>`;
            }

            html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-600 whitespace-nowrap">${item.tanggal}</td>
                <td class="p-3 font-black text-indigo-700">${item.namaSiswa}</td>
                <td class="p-3"><span class="px-2.5 py-1 rounded text-[10px] font-black uppercase border ${badge}">${item.kategori}</span></td>
                <td class="p-3 text-sm">${detailHtml}</td>
                <td class="p-3 text-center font-black text-slate-800">${item.poin || 0}</td>
                <td class="p-3 text-xs font-bold text-slate-500">${item.pencatat}</td>
                <td class="p-3 text-center">
                    ${canDelete ? `<button onclick="window.hapusKepengasuhan('${d.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition"><i class="fa-solid fa-trash"></i></button>` : '-'}
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center p-8 text-slate-400 font-medium">Belum ada catatan kepengasuhan Anda.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-red-500 font-bold">Gagal memuat data.</td></tr>'; }
};

window.simpanKepengasuhan = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-asrama');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;
    
    const isBulk = document.getElementById('mode-bulk-asrama').checked;
    let targetSantri = [];

    if (isBulk) {
        targetSantri = Array.from(document.querySelectorAll('input[name="bulk-santri-asrama"]:checked')).map(cb => {
            const spl = cb.value.split('|'); return { id: spl[0], nama: spl[1] };
        });
        if (targetSantri.length === 0) {
            alert("Pilih minimal 1 santri untuk mode massal!");
            btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Catatan'; btn.disabled = false; return;
        }
    } else {
        const val = document.getElementById('asrama-siswa-single').value;
        if (!val) { alert("Pilih santri terlebih dahulu!"); btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Catatan'; btn.disabled = false; return; }
        const spl = val.split('|'); targetSantri.push({ id: spl[0], nama: spl[1] });
    }

    const kat = document.getElementById('asrama-kategori').value;
    const baseData = {
        tanggal: document.getElementById('asrama-tgl').value,
        kategori: kat,
        pencatat: window.currentUser.nama,
        createdAt: new Date().toISOString()
    };

    if (kat === 'Rutinitas Harian') {
        baseData.statusRutin = document.getElementById('asrama-status-rutin').value;
        baseData.ketRutin = document.getElementById('asrama-ket-rutin').value;
        baseData.poin = 0;
    } else {
        baseData.bentuk = document.getElementById('asrama-bentuk').value;
        baseData.tindakan = document.getElementById('asrama-tindakan').value;
        baseData.poin = Number(document.getElementById('asrama-poin').value) || 0;
    }

    try {
        for (const s of targetSantri) {
            await addDoc(collection(db, "Kepengasuhan"), { ...baseData, idSiswa: s.id, namaSiswa: s.nama });
        }
        document.getElementById('form-pengasuhan').reset();
        document.getElementById('asrama-tgl').value = new Date().toISOString().split('T')[0];
        window.toggleAsramaFields();
        window.loadDataKepengasuhan();
        alert(`Berhasil menyimpan catatan untuk ${targetSantri.length} santri.`);
    } catch(err) { alert("Gagal menyimpan data!"); }
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Catatan'; btn.disabled = false;
};

window.hapusKepengasuhan = async function(id) {
    if(confirm("Yakin ingin menghapus catatan ini secara permanen?")) {
        try { await deleteDoc(doc(db, "Kepengasuhan", id)); window.loadDataKepengasuhan(); } catch(e) { alert("Gagal menghapus!"); }
    }
};
