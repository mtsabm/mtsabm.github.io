// ==========================================
// MODUL ADMIN PPDB (Terhubung ke Google Sheet via API)
// ==========================================

// URL APPS SCRIPT (Sesuaikan dengan URL Deploy Anda yang terbaru)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwi4n8N6pHx8Nft8F2W0uXUPuts7ccxqUetPF6s94ya2PZEceCyibDNFQd7cWKmYoXXPQ/exec";

let rawDataPPDB = [];

export async function renderHalamanPPDB(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-64">
            <i class="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-500 mb-4"></i>
            <h2 class="text-xl font-bold text-slate-600">Mensinkronisasi Data PPDB dari Server...</h2>
        </div>
    `;

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getAllData`);
        const result = await response.json();

        if (result.success) {
            rawDataPPDB = result.data;
            buildUIPPDB(container);
        } else {
            throw new Error("Gagal mengambil data dari server");
        }
    } catch (error) {
        container.innerHTML = `
            <div class="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 text-center font-bold">
                <i class="fa-solid fa-triangle-exclamation text-4xl mb-3"></i><br>
                Gagal memuat data PPDB. Periksa koneksi internet atau konfigurasi URL Apps Script Anda.
            </div>
        `;
    }
}

function buildUIPPDB(container) {
    // Hitung Statistik
    const totalPendaftar = rawDataPPDB.length;
    const totalLulus = rawDataPPDB.filter(d => d['Status Kelulusan'] && d['Status Kelulusan'].includes('Lulus')).length;
    const totalDaftarUlang = rawDataPPDB.filter(d => d['Status Daftar Ulang'] === 'Tuntas').length;
    const totalDitolak = rawDataPPDB.filter(d => d['Status Kelulusan'] === 'Ditolak').length;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-address-card text-indigo-500 mr-2"></i> Dasbor Manajemen PPDB</h2>
            <button onclick="window.eksporCSV_PPDB()" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg shadow transition flex items-center">
                <i class="fa-solid fa-download mr-2"></i> Ekspor CSV
            </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500 flex flex-col justify-center">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Total Pendaftar</p>
                <h3 class="text-3xl font-black text-slate-700">${totalPendaftar} <span class="text-sm">Anak</span></h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500 flex flex-col justify-center">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Dinyatakan Lulus</p>
                <h3 class="text-3xl font-black text-emerald-600">${totalLulus} <span class="text-sm">Anak</span></h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 flex flex-col justify-center">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Selesai Daftar Ulang</p>
                <h3 class="text-3xl font-black text-indigo-600">${totalDaftarUlang} <span class="text-sm">Anak</span></h3>
            </div>
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500 flex flex-col justify-center">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Ditolak / Gugur</p>
                <h3 class="text-3xl font-black text-rose-600">${totalDitolak} <span class="text-sm">Anak</span></h3>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                <input type="text" id="ppdb-search" onkeyup="window.filterTablePPDB()" placeholder="Cari Nama / NIK / No Daftar..." class="w-full md:w-1/3 border border-slate-300 p-2 rounded-lg text-sm focus:outline-indigo-500">
                <select id="ppdb-filter-status" onchange="window.filterTablePPDB()" class="w-full md:w-1/4 border border-slate-300 p-2 rounded-lg text-sm focus:outline-indigo-500 bg-white">
                    <option value="">Semua Status</option>
                    <option value="Sedang Diproses">Sedang Diproses (Baru)</option>
                    <option value="Lulus">Lulus (Belum Daftar Ulang)</option>
                    <option value="Daftar Ulang Tuntas">Selesai Daftar Ulang</option>
                    <option value="Ditolak">Ditolak</option>
                </select>
            </div>
            
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left text-sm">
                    <thead class="bg-indigo-50 text-indigo-900 border-b-2">
                        <tr>
                            <th class="p-4 w-10 text-center">No</th>
                            <th class="p-4">Tgl Daftar & No.Pendaftar</th>
                            <th class="p-4">Identitas Calon Siswa</th>
                            <th class="p-4">Asal Sekolah</th>
                            <th class="p-4 text-center">Status Kelulusan</th>
                            <th class="p-4 text-center">Aksi & Berkas</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-ppdb">
                        <!-- Render dari JS -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    window.filterTablePPDB();
}

window.filterTablePPDB = function() {
    const search = document.getElementById('ppdb-search').value.toLowerCase();
    const statusFilter = document.getElementById('ppdb-filter-status').value;
    const tbody = document.getElementById('tbody-ppdb');

    let filtered = rawDataPPDB.filter(d => {
        const nama = (d['Nama Calon Siswa'] || '').toLowerCase();
        const nik = (d['NIK'] || '').toString().toLowerCase();
        const noDaftar = (d['No. Pendaftaran'] || '').toString().toLowerCase();
        const status = d['Status Kelulusan'] || '';

        const matchSearch = nama.includes(search) || nik.includes(search) || noDaftar.includes(search);
        const matchStatus = statusFilter === "" || status.includes(statusFilter);

        return matchSearch && matchStatus;
    });

    // Urutkan dari yang terbaru
    filtered.sort((a, b) => new Date(b['Waktu Daftar']) - new Date(a['Waktu Daftar']));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-bold">Tidak ada data pendaftar yang cocok.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((d, i) => {
        let badgeColor = d['Status Kelulusan'].includes('Lulus') ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 
                         (d['Status Kelulusan'] === 'Ditolak' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300');
        
        let dDate = new Date(d['Waktu Daftar']);
        let tglFormat = !isNaN(dDate) ? dDate.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : '-';

        return `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-4 text-center font-bold text-slate-500">${i + 1}</td>
            <td class="p-4">
                <span class="block text-[10px] font-bold text-slate-400 mb-1">${tglFormat}</span>
                <span class="font-black text-indigo-700">${d['No. Pendaftaran'] || '-'}</span>
            </td>
            <td class="p-4">
                <span class="block font-bold text-slate-800">${d['Nama Calon Siswa']}</span>
                <span class="text-[10px] text-slate-500 font-medium">NIK: ${d['NIK'].toString().replace(/'/g, "")} | ${d['Jenis Kelamin']}</span>
            </td>
            <td class="p-4 text-slate-600 font-medium">${d['Asal Sekolah']}</td>
            <td class="p-4 text-center">
                <span class="px-3 py-1.5 rounded-lg text-[10px] font-black border ${badgeColor} inline-block">${d['Status Kelulusan']}</span>
                ${d['Status Daftar Ulang'] === 'Tuntas' ? `<span class="block text-[9px] text-emerald-600 font-black mt-1"><i class="fa-solid fa-check-double"></i> Daftar Ulang Tuntas</span>` : ''}
            </td>
            <td class="p-4 text-center flex justify-center gap-2">
                <button onclick="window.lihatDetailPPDB('${d['NIK'].toString().replace(/'/g, "")}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-lg text-xs font-bold transition border border-indigo-200" title="Lihat Berkas & Detail"><i class="fa-solid fa-folder-open"></i></button>
                <button onclick="window.ubahStatusPPDB('${d['NIK'].toString().replace(/'/g, "")}', '${d['Nama Calon Siswa']}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition border border-slate-300" title="Ubah Status Kelulusan"><i class="fa-solid fa-pen-to-square"></i></button>
            </td>
        </tr>
        `;
    }).join('');
};

window.lihatDetailPPDB = function(nik) {
    const data = rawDataPPDB.find(d => d['NIK'].toString().replace(/'/g, "") === nik.toString());
    if (!data) return;

    let modal = document.getElementById('modal-detail-ppdb');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-detail-ppdb';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }

    const tLink = (url, name) => url ? `<a href="${url}" target="_blank" class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded border border-blue-200 text-xs font-bold hover:bg-blue-600 hover:text-white transition flex items-center justify-center"><i class="fa-solid fa-link mr-1"></i> ${name}</a>` : `<span class="bg-slate-100 text-slate-400 px-3 py-1.5 rounded text-xs font-bold block text-center">Tidak Ada</span>`;

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] animate-slide-up border-t-4 border-indigo-500">
            <div class="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                <div>
                    <h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-id-card-clip text-indigo-500 mr-2"></i> Detail Pendaftar: ${data['Nama Calon Siswa']}</h3>
                    <p class="text-xs font-bold text-slate-500 mt-1">No. Daftar: ${data['No. Pendaftaran']} | NIK: ${nik}</p>
                </div>
                <button onclick="document.getElementById('modal-detail-ppdb').classList.add('hidden')" class="text-slate-400 hover:text-red-500 text-3xl font-bold transition"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-black text-slate-700 border-b pb-2 mb-3 text-sm uppercase">Biodata Awal</h4>
                        <table class="w-full text-xs text-slate-600">
                            <tr><td class="py-1.5 font-bold w-1/3">NISN</td><td>: ${data['NISN'] || '-'}</td></tr>
                            <tr><td class="py-1.5 font-bold">TTL</td><td>: ${data['Tempat Lahir']}, ${data['Tanggal Lahir']}</td></tr>
                            <tr><td class="py-1.5 font-bold">Asal Sekolah</td><td>: ${data['Asal Sekolah'] || '-'}</td></tr>
                            <tr><td class="py-1.5 font-bold">Nama Ayah</td><td>: ${data['Nama Ayah'] || '-'}</td></tr>
                            <tr><td class="py-1.5 font-bold">Nama Ibu</td><td>: ${data['Nama Ibu'] || '-'}</td></tr>
                            <tr><td class="py-1.5 font-bold">No WhatsApp</td><td>: ${data['No. WhatsApp'] ? data['No. WhatsApp'].toString().replace(/'/g, "") : '-'}</td></tr>
                            <tr><td class="py-1.5 font-bold">Alamat Lengkap</td><td>: ${data['Alamat Domisili'] || '-'}</td></tr>
                        </table>
                    </div>
                    <div>
                        <h4 class="font-black text-slate-700 border-b pb-2 mb-3 text-sm uppercase">Berkas Awal Pendaftaran</h4>
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            ${tLink(data['Link Pas Foto'], 'Pas Foto')}
                            ${tLink(data['Link KK'], 'Kartu Keluarga')}
                            ${tLink(data['Link SKL'], 'SKL/Ijazah')}
                            ${tLink(data['Link Bukti Transfer'], 'Bukti Transfer')}
                        </div>
                    </div>
                </div>

                ${data['Status Daftar Ulang'] === 'Tuntas' ? `
                <div class="mt-6 border-t pt-6">
                    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                        <h4 class="font-black text-emerald-800 border-b border-emerald-200 pb-2 mb-3 text-sm uppercase"><i class="fa-solid fa-check-double mr-2"></i>Data Daftar Ulang (Dapodik & Asrama)</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <table class="w-full text-xs text-emerald-900">
                                <tr><td class="py-1.5 font-bold w-1/3">No KK (Dapodik)</td><td>: ${data['No KK (Dapodik)'] ? data['No KK (Dapodik)'].toString().replace(/'/g, "") : '-'}</td></tr>
                                <tr><td class="py-1.5 font-bold">Anak Ke / Sdr</td><td>: Ke-${data['Anak Ke (Dapodik)']} dari ${data['Jml Saudara (Dapodik)']}</td></tr>
                                <tr><td class="py-1.5 font-bold">Pendidikan Ortu</td><td>: ${data['Pendidikan Ortu (Dapodik)'] || '-'}</td></tr>
                                <tr><td class="py-1.5 font-bold">Penghasilan Ortu</td><td>: ${data['Penghasilan Ortu (Dapodik)'] || '-'}</td></tr>
                                <tr><td class="py-1.5 font-bold border-t border-emerald-200 pt-2">Gol. Darah / Fisik</td><td class="pt-2">: ${data['Golongan Darah (Medis)']} | ${data['Tinggi Badan (Medis)']}cm / ${data['Berat Badan (Medis)']}kg</td></tr>
                                <tr><td class="py-1.5 font-bold">Riwayat Penyakit</td><td>: ${data['Riwayat Penyakit (Medis)'] || '-'}</td></tr>
                                <tr><td class="py-1.5 font-bold border-t border-emerald-200 pt-2 text-indigo-700">Tajwid</td><td class="pt-2 text-indigo-700 font-bold">: ${data['Kemampuan Tajwid (Tahfidz)'] || '-'}</td></tr>
                                <tr><td class="py-1.5 font-bold text-indigo-700">Jumlah Hafalan</td><td class="text-indigo-700 font-bold">: ${data['Jumlah Hafalan (Tahfidz)'] || '-'}</td></tr>
                            </table>
                            <div>
                                <h5 class="font-bold text-[10px] text-emerald-700 uppercase mb-2">Berkas Daftar Ulang Lengkap:</h5>
                                <div class="grid grid-cols-2 gap-2">
                                    ${tLink(data['Link Akta Kelahiran'], 'Akta Kelahiran')}
                                    ${tLink(data['Link Raport'], 'Raport Akhir')}
                                    ${tLink(data['Link KTP Ortu'], 'KTP Ortu')}
                                    ${tLink(data['Link Ijazah'], 'Ijazah (Daftar Ulang)')}
                                    ${tLink(data['Link Berkas Lainnya'], 'Berkas Lain (KIP dll)')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ` : `<div class="mt-6 p-4 bg-amber-50 text-amber-600 text-center text-xs font-bold rounded-xl border border-amber-200"><i class="fa-solid fa-clock mr-2"></i> Belum melakukan Daftar Ulang / Berkas belum lengkap.</div>`}
            </div>
            
            <div class="p-6 border-t bg-slate-50 rounded-b-2xl shrink-0 flex justify-end">
                <button onclick="document.getElementById('modal-detail-ppdb').classList.add('hidden')" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl shadow transition">Tutup Detail</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.ubahStatusPPDB = function(nik, nama) {
    Swal.fire({
        title: `Ubah Status: ${nama}`,
        input: 'select',
        inputOptions: {
            'Sedang Diproses': 'Sedang Diproses (Baru)',
            'Lulus': 'Lulus (Arahkan Daftar Ulang)',
            'Ditolak': 'Ditolak / Gugur'
        },
        inputPlaceholder: 'Pilih status baru...',
        showCancelButton: true,
        confirmButtonText: 'Simpan Perubahan',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value) return 'Anda harus memilih status!';
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Menyimpan...', text: 'Mengupdate status di server.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const payload = new FormData();
            payload.append('action', 'updateStatus');
            payload.append('nik', nik);
            payload.append('status', result.value);

            try {
                const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: payload, mode: 'no-cors' });
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Status peserta telah diubah.', timer: 2000, showConfirmButton: false });
                
                // Refresh data otomatis
                const container = document.getElementById('view-container');
                if(container) renderHalamanPPDB(container);

            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan jaringan.' });
            }
        }
    });
};

window.eksporCSV_PPDB = function() {
    if (rawDataPPDB.length === 0) return alert("Tidak ada data untuk diekspor.");
    
    let headers = Object.keys(rawDataPPDB[0]);
    let csvContent = "\uFEFF" + headers.join(";") + "\n";
    
    rawDataPPDB.forEach(row => {
        let rowData = headers.map(header => {
            let cell = row[header] === undefined || row[header] === null ? "" : String(row[header]);
            return `"${cell.replace(/"/g, '""')}"`;
        });
        csvContent += rowData.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Arsip_Data_PPDB.csv`);
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
};
