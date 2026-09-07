import { db } from './firebase-init.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// FUNGSI KOMPRESI, CLOUDINARY & PDF (YANG SEBELUMNYA TERHAPUS)
// ==========================================
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/deva5eknr/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "markaz";

window.uploadFotoCloudinary = async function(file, btnLoadingId) {
    const btn = document.getElementById(btnLoadingId);
    const textAsli = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengunggah...';
    btn.disabled = true;

    try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        btn.innerHTML = textAsli;
        btn.disabled = false;
        return data.secure_url;
    } catch (err) {
        console.error("Error upload:", err);
        btn.innerHTML = textAsli;
        btn.disabled = false;
        alert("Gagal mengunggah gambar!");
        return null;
    }
};

window.unduhPDF = function(elementId, namaFile) {
    const element = document.getElementById(elementId);
    html2pdf().set({ margin: 10, filename: namaFile, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save();
};

// ==========================================
// MODUL KONFIGURASI LEMBAGA & OPERASIONAL (SINGLE TENANT)
// ==========================================
window.toggleDisiplinFields = function() {
    const val = document.getElementById('lem-disiplin').value;
    const ftol = document.getElementById('field-toleransi');
    const fjam = document.getElementById('field-jam-kerja');
    const fgps = document.getElementById('field-gps');

    // Sembunyikan semua dulu
    if(ftol) ftol.classList.add('hidden');
    if(fjam) fjam.classList.add('hidden');
    if(fgps) fgps.classList.add('hidden');

    // Tampilkan sesuai aturan
    if(val) ftol.classList.remove('hidden'); // Berlaku untuk semua
    if(val === 'Semi Ketat' || val === 'Super Ketat') fjam.classList.remove('hidden');
    if(val === 'Super Ketat') fgps.classList.remove('hidden');
};


export function renderHalamanLembaga(container) {
    if(typeof window.tampilkanPopupTrial === 'function') window.tampilkanPopupTrial();
    
    const profil = window.appState.lembaga[0] || {}; 
    const currentUser = window.currentUser || {};
    const isSuperAdmin = currentUser.hakAkses === 'Super Admin';
    const lisensiFitur = profil.lisensiFitur || [];
    const hasPresensiPlus = window.cekLisensi('presensi_plus');
    
    container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow mb-6 border-t-4 border-primary relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-blue-100 text-blue-700 px-4 py-1 rounded-bl-xl text-[10px] font-black"><i class="fa-solid fa-puzzle-piece mr-1"></i> ${lisensiFitur.length} MODUL EKSTRA AKTIF</div>
            
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-2 gap-4 mt-2">
                <h2 class="text-xl font-bold">Konfigurasi Sistem Utama Lembaga</h2>
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('lembaga', 'Data_Lembaga')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Lembaga')" class="hidden"></label>
                </div>
            </div>
            
            <form id="form-lembaga" onsubmit="window.simpanLembaga(event)">
                <input type="hidden" id="lem-logo-url">
                
                <h3 class="font-semibold text-primary mt-4 mb-2">1. Identitas Dasar, Logo & Jabatan</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input type="text" id="lem-nama" placeholder="Nama Lembaga" class="border p-2 rounded focus:outline-primary" required>
                    <select id="lem-jenis" class="border p-2 rounded focus:outline-primary" required>
                        <option value="">-- Jenis Lembaga --</option>
                        <option value="Sekolah">Sekolah</option><option value="Panti">Panti</option>
                        <option value="Rumah Tahfidz">Rumah Tahfidz</option><option value="Pesantren">Pesantren</option><option value="Lainnya">Lainnya</option>
                    </select>
                    <div class="flex flex-col">
                        <label class="text-xs text-slate-500">Ganti Logo Lembaga</label>
                        <input type="file" id="lem-logo-file" accept="image/*" class="border p-1 rounded text-sm bg-white">
                    </div>
                    <div class="md:col-span-3">
                        <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Jabatan Pegawai (Pisahkan dengan koma)</label>
                        <input type="text" id="lem-jabatan" placeholder="Kepala, Guru, Tata Usaha" class="border p-2 rounded w-full border-blue-400 bg-blue-50 focus:outline-primary" required>
                    </div>
                    <div class="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Mata Pelajaran (Pisahkan koma)</label>
                            <input type="text" id="lem-mapel" placeholder="Cth: Matematika, Bahasa Indonesia, IPA" class="border p-2 rounded w-full border-green-400 bg-green-50 focus:outline-primary">
                        </div>
                        <div>
                            <label class="text-xs text-slate-500 font-bold block mb-1">Daftar Kelas (Pisahkan koma)</label>
                            <input type="text" id="lem-kelas-list" placeholder="Cth: Kelas 1A, Kelas 1B, Kelas 2A" class="border p-2 rounded w-full border-purple-400 bg-purple-50 focus:outline-primary">
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select id="lem-bentuk" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Bentuk Pendidikan --</option>
                        <option value="SD/MI">SD/MI</option><option value="SMP/MTs">SMP/MTs</option>
                        <option value="SMA/MA">SMA/MA</option><option value="Gabungan">Gabungan</option>
                        <option value="Pesantren">Pesantren</option><option value="PKBM/Non-Formal">PKBM/Non-Formal</option>
                    </select>
                    <select id="lem-status" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Status Lembaga --</option>
                        <option value="Negeri">Negeri</option><option value="Swasta">Swasta</option>
                    </select>
                    <input type="text" id="lem-npsn" placeholder="NPSN" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-nsm" placeholder="NSM" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-akreditasi" placeholder="Akreditasi" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-sk" placeholder="SK Pendirian" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-izin" placeholder="Izin Operasional" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-lks" placeholder="Tanda Daftar LKS (Khusus Panti)" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-npwp" placeholder="NPWP Lembaga" class="border p-2 rounded focus:outline-primary">
                    <input type="text" id="lem-rekening" placeholder="Rekening Bank Lembaga" class="border p-2 rounded focus:outline-primary">
                    
                    <div>
                        <label class="text-[10px] uppercase font-bold text-slate-500 block mb-1">Jumlah Ruangan Kelas</label>
                        <input type="number" id="lem-kelas" placeholder="Cth: 12" class="border p-2 rounded w-full focus:outline-primary">
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-bold text-slate-500 block mb-1">Total Kapasitas Asrama (Anak)</label>
                        <input type="number" id="lem-asrama" placeholder="Cth: 100" class="border p-2 rounded w-full border-teal-400 bg-teal-50 focus:outline-primary">
                    </div>
                </div>
                <textarea id="lem-alamat" placeholder="Alamat Lengkap Lembaga" class="border p-2 rounded w-full mb-4 focus:outline-primary" rows="2"></textarea>

                <h3 class="font-semibold text-primary mt-4 mb-2">2. Pengaturan Operasional & KBM</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <select id="lem-ops" class="border p-2 rounded focus:outline-primary" required>
                        <option value="">-- Jenis Operasional --</option>
                        <option value="Hanya Pendidikan">Hanya Pendidikan</option><option value="Hanya Pengasuhan">Hanya Pengasuhan</option>
                        <option value="Hanya Santunan">Hanya Santunan</option><option value="Pengasuhan dan Pendidikan">Pengasuhan dan Pendidikan</option>
                    </select>
                    <select id="lem-pend" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Jenis Pendidikan --</option>
                        <option value="Hanya Pendidikan Umum">Hanya Pendidikan Umum</option>
                        <option value="Hanya Pendidikan Agama/Tahfidz">Hanya Pendidikan Agama/Tahfidz</option>
                        <option value="Pendidikan Umum dan Tahfidz">Pendidikan Umum dan Tahfidz</option>
                    </select>
                    <select id="lem-kurikulum" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Sistem Kurikulum --</option>
                        <option value="Ikut Pemerintah">Ikut Pemerintah (Kemendikbud/Kemenag)</option>
                        <option value="Sistem Kuliah">Sistem Kuliah (SKS)</option>
                        <option value="Sistem Mandiri">Sistem Mandiri Yayasan</option>
                    </select>
                    <select id="lem-libur" class="border p-2 rounded focus:outline-primary">
                        <option value="">-- Hari Libur (1 Pekan) --</option>
                        <option value="Hanya Ahad">Hanya Ahad</option><option value="Hanya Jumat">Hanya Jum'at</option>
                        <option value="Sabtu-Ahad">Sabtu-Ahad</option><option value="Jumat dan Ahad">Jum'at dan Ahad</option><option value="Jumat dan Sabtu">Jum'at dan Sabtu</option>
                    </select>
                </div>

                <h3 class="font-semibold text-primary mt-4 mb-2">3. Pengaturan Waktu KBM & Presensi</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="border p-3 rounded bg-slate-50">
                        <label class="text-sm font-bold text-slate-600 block mb-2">KBM UMUM</label>
                        <input type="number" id="lem-umum-jp" placeholder="Durasi per JP (Menit)" class="border p-2 rounded w-full mb-2">
                        <div class="flex gap-2 mb-2">
                            <input type="time" id="lem-umum-masuk" class="border p-2 rounded w-full" title="Jam Masuk">
                            <input type="time" id="lem-umum-pulang" class="border p-2 rounded w-full" title="Jam Pulang">
                        </div>
                        <input type="number" id="lem-umum-frek" placeholder="Frekuensi Istirahat" class="border p-2 rounded w-full mb-2">
                        <input type="number" id="lem-umum-waktuist" placeholder="Lama Istirahat (Menit)" class="border p-2 rounded w-full">
                        <label class="text-[10px] uppercase font-bold text-slate-400 mt-2 block mb-1">Waktu Istirahat (Jam Mulai - Jam Selesai)</label>
                        <input type="text" id="lem-umum-istirahat" placeholder="Cth: 10:00-10:15, 12:00-12:30" class="border p-2 rounded w-full">
                    </div>
                    <div class="border p-3 rounded bg-slate-50">
                        <label class="text-sm font-bold text-slate-600 block mb-2">KBM TAHFIDZ</label>
                        <input type="number" id="lem-tahfidz-jp" placeholder="Durasi per JP (Menit)" class="border p-2 rounded w-full mb-2">
                        <div class="flex gap-2 mb-2">
                            <input type="time" id="lem-tahfidz-masuk" class="border p-2 rounded w-full" title="Jam Masuk">
                            <input type="time" id="lem-tahfidz-pulang" class="border p-2 rounded w-full" title="Jam Pulang">
                        </div>
                        <input type="number" id="lem-tahfidz-frek" placeholder="Frekuensi Istirahat" class="border p-2 rounded w-full mb-2">
                        <input type="number" id="lem-tahfidz-waktuist" placeholder="Lama Istirahat (Menit)" class="border p-2 rounded w-full">
                        <label class="text-[10px] uppercase font-bold text-slate-400 mt-2 block mb-1">Waktu Istirahat (Jam Mulai - Jam Selesai)</label>
                        <input type="text" id="lem-tahfidz-istirahat" placeholder="Cth: 10:00-10:15, 12:00-12:30" class="border p-2 rounded w-full">
                    </div>
                    
                    <div class="col-span-1 md:col-span-2 border p-4 rounded bg-orange-50 border-orange-200">
                        <label class="text-sm font-bold text-slate-700 block mb-1">Sistem Kedisiplinan Presensi Pegawai</label>
                        ${!hasPresensiPlus ? `<p class="text-[10px] font-bold text-amber-600 mb-2"><i class="fa-solid fa-lock mr-1"></i> Opsi Super Ketat (GPS) tersegel. Buka via Lisensi Presensi Pro.</p>` : ''}
                        
                        <select id="lem-disiplin" onchange="window.toggleDisiplinFields()" class="border p-2 rounded w-full focus:outline-primary mb-3 font-semibold text-orange-700" required>
                            <option value="">-- Pilih Tingkat Kedisiplinan --</option>
                            <option value="Longgar">1. Longgar (Absen Bebas, Input Telat Mandiri)</option>
                            <option value="Semi Ketat">2. Semi Ketat (Wajib Absen Sesuai Jam, Kalkulasi Telat Otomatis)</option>
                            <option value="Super Ketat" ${!hasPresensiPlus ? 'disabled' : ''}>3. Super Ketat (Sesuai Jam + Wajib Sesuai Koordinat GPS) ${!hasPresensiPlus ? '🔒' : ''}</option>
                        </select>

                        <div id="field-toleransi" class="hidden mb-3">
                            <label class="text-xs font-bold text-slate-500">Toleransi Keterlambatan (Menit)</label>
                            <input type="number" id="lem-toleransi-telat" placeholder="Cth: 15" class="border p-2 rounded w-full focus:outline-primary">
                        </div>

                        <div id="field-jam-kerja" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label class="text-xs font-bold text-slate-500">Jam Masuk Kerja Pegawai</label>
                                <input type="time" id="lem-jam-masuk-kerja" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500">Jam Pulang Kerja Pegawai</label>
                                <input type="time" id="lem-jam-pulang-kerja" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                        </div>

                        <div id="field-gps" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-bold text-slate-500">Koordinat GPS Kantor (Latitude, Longitude)</label>
                                <input type="text" id="lem-gps-kantor" placeholder="Cth: 2.9722, 99.6416 (Asahan)" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-500">Radius Toleransi Lokasi (Meter)</label>
                                <input type="number" id="lem-radius-gps" placeholder="Cth: 50" class="border p-2 rounded w-full focus:outline-primary">
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="font-semibold text-primary mt-4 mb-2">4. Pengaturan Tampilan Website</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-blue-50 p-4 rounded border border-blue-200">
                    <div class="col-span-1 md:col-span-2">
                        <label class="text-sm font-bold text-slate-600 block mb-1">Pilih Tema / Layout (Berubah Langsung Saat Dipilih)</label>
                        <select id="lem-tema" onchange="document.body.classList.remove('tema-1', 'tema-2', 'tema-3', 'tema-4', 'tema-5'); document.body.classList.add(this.value);" class="border p-2 rounded w-full focus:outline-primary font-semibold text-primary" required>
                            <option value="tema-1">Template 1: Klasik (Sidebar Kiri)</option>
                            <option value="tema-2">Template 2: Modern (Menu Navigasi Atas)</option>
                            <option value="tema-3">Template 3: Mengambang (Floating UI)</option>
                            <option value="tema-4">Template 4: Aplikasi Mobile / Windows (Start Screen)</option>
                            <option value="tema-5">Template 5: Terbalik (Sidebar Kanan)</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col md:flex-row gap-3">
                    <button type="submit" id="btn-simpan-lem" class="bg-primary hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full md:w-auto"><i class="fa-solid fa-save mr-2"></i> Simpan Konfigurasi Lembaga</button>
                    ${profil.id ? `
                    <button type="button" onclick="window.bukaModalWewenang()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold transition shadow-lg w-full md:w-auto"><i class="fa-solid fa-user-shield mr-2"></i> Atur Wewenang</button>
                    ` : ''}
                </div>
            </form>
        </div>

        ${profil.id ? `
        <div class="bg-white p-6 rounded-xl shadow mb-6 border-t-4 border-green-500">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h2 class="text-xl font-bold">Profil Resmi Tersimpan</h2>
                <button onclick="window.unduhPDF('cetak-profil-lembaga', 'Profil_${profil.namaLembaga.replace(/\s+/g, '_')}.pdf')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold shadow"><i class="fa-solid fa-file-pdf"></i> Unduh PDF</button>
            </div>
            
            <div id="cetak-profil-lembaga" class="p-8 bg-white text-slate-800">
                <div class="flex items-center space-x-6 border-b-2 border-slate-800 pb-4 mb-6">
                    ${profil.logo ? `<img src="${profil.logo}" class="h-24 w-24 object-contain">` : `<div class="h-24 w-24 bg-slate-200 flex items-center justify-center rounded font-bold text-slate-400">No Logo</div>`}
                    <div>
                        <h1 class="text-3xl font-black uppercase tracking-wide">${profil.namaLembaga}</h1>
                        <p class="text-lg font-semibold text-slate-600">${profil.jenisLembaga} - ${profil.statusLembaga || ''}</p>
                        <p class="text-sm">${profil.alamat || '-'}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div><span class="font-bold block text-slate-500 border-b mb-1">Legalitas & Identitas</span>
                        <table class="w-full">
                            <tr><td class="py-1 w-1/3">NPSN / NSM</td><td>: ${profil.npsn || '-'} / ${profil.nsm || '-'}</td></tr>
                            <tr><td class="py-1">Akreditasi</td><td>: ${profil.akreditasi || '-'}</td></tr>
                            <tr><td class="py-1">SK Pendirian</td><td>: ${profil.skPendirian || '-'}</td></tr>
                            <tr><td class="py-1">Izin / LKS</td><td>: ${profil.izinOperasional || '-'} / ${profil.lks || '-'}</td></tr>
                            <tr><td class="py-1">NPWP</td><td>: ${profil.npwp || '-'}</td></tr>
                        </table>
                    </div>
                    <div><span class="font-bold block text-slate-500 border-b mb-1">Operasional & Presensi</span>
                        <table class="w-full">
                            <tr><td class="py-1 w-1/3">Sistem Presensi</td><td>: <span class="font-bold text-orange-600">${profil.kedisiplinan || '-'}</span></td></tr>
                            ${profil.kedisiplinan === 'Semi Ketat' || profil.kedisiplinan === 'Super Ketat' ? `<tr><td class="py-1">Jam Kerja</td><td>: ${profil.jamMasukKerja || '-'} s/d ${profil.jamPulangKerja || '-'}</td></tr>` : ''}
                            <tr><td class="py-1">Bentuk Pend.</td><td>: ${profil.bentukPendidikan || '-'}</td></tr>
                            <tr><td class="py-1">Kapasitas Asrama</td><td>: ${profil.asrama || '0'} Anak</td></tr>
                            <tr><td class="py-1">Hari Libur</td><td>: ${profil.libur || '-'}</td></tr>
                        </table>
                    </div>
                    <div class="col-span-2 mt-4"><span class="font-bold block text-slate-500 border-b mb-1">Daftar Jabatan Resmi</span>
                        <div class="flex flex-wrap gap-2 mt-2">
                            ${(profil.daftarJabatan || '').split(',').map(j => `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">${j.trim()}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    `;

    if (profil.id) {
        setTimeout(() => {
            document.getElementById('lem-logo-url').value = profil.logo || '';
            document.getElementById('lem-nama').value = profil.namaLembaga || ''; document.getElementById('lem-jenis').value = profil.jenisLembaga || '';
            document.getElementById('lem-jabatan').value = profil.daftarJabatan || ''; document.getElementById('lem-bentuk').value = profil.bentukPendidikan || ''; 
            document.getElementById('lem-status').value = profil.statusLembaga || ''; document.getElementById('lem-npsn').value = profil.npsn || ''; 
            document.getElementById('lem-nsm').value = profil.nsm || ''; document.getElementById('lem-akreditasi').value = profil.akreditasi || ''; 
            document.getElementById('lem-sk').value = profil.skPendirian || ''; document.getElementById('lem-izin').value = profil.izinOperasional || ''; 
            document.getElementById('lem-lks').value = profil.lks || ''; document.getElementById('lem-npwp').value = profil.npwp || ''; 
            document.getElementById('lem-rekening').value = profil.rekening || ''; document.getElementById('lem-alamat').value = profil.alamat || ''; 
            document.getElementById('lem-kelas').value = profil.kelas || ''; document.getElementById('lem-asrama').value = profil.asrama || '';
            document.getElementById('lem-ops').value = profil.jenisOperasional || ''; document.getElementById('lem-pend').value = profil.jenisPendidikan || ''; 
            document.getElementById('lem-kurikulum').value = profil.kurikulum || ''; document.getElementById('lem-libur').value = profil.libur || ''; 
            document.getElementById('lem-umum-jp').value = profil.umumJp || ''; document.getElementById('lem-umum-masuk').value = profil.umumMasuk || ''; 
            document.getElementById('lem-umum-frek').value = profil.umumFrek || ''; document.getElementById('lem-umum-waktuist').value = profil.umumWaktu || ''; 
            document.getElementById('lem-tahfidz-jp').value = profil.tahfidzJp || ''; document.getElementById('lem-tahfidz-masuk').value = profil.tahfidzMasuk || ''; 
            document.getElementById('lem-tahfidz-frek').value = profil.tahfidzFrek || ''; document.getElementById('lem-tahfidz-waktuist').value = profil.tahfidzWaktu || ''; 
            
            // JIKA TIDAK PUNYA LISENSI PRESENSI PLUS, PAKSA TURUNKAN DISIPLIN KE SEMI KETAT JIKA SEBELUMNYA SUPER KETAT
            if (!hasPresensiPlus && profil.kedisiplinan === 'Super Ketat') {
                document.getElementById('lem-disiplin').value = 'Semi Ketat';
            } else {
                document.getElementById('lem-disiplin').value = profil.kedisiplinan || '';
            }

            document.getElementById('lem-tema').value = profil.temaWebsite || 'tema-1';
            document.getElementById('lem-mapel').value = profil.daftarMapel || '';
            document.getElementById('lem-umum-pulang').value = profil.umumPulang || '';
            document.getElementById('lem-tahfidz-pulang').value = profil.tahfidzPulang || '';
            document.getElementById('lem-kelas-list').value = profil.daftarKelas || '';
            document.getElementById('lem-umum-istirahat').value = profil.umumIstirahat || '';
            document.getElementById('lem-tahfidz-istirahat').value = profil.tahfidzIstirahat || '';

            document.getElementById('lem-toleransi-telat').value = profil.toleransiTelat || '';
            document.getElementById('lem-jam-masuk-kerja').value = profil.jamMasukKerja || '';
            document.getElementById('lem-jam-pulang-kerja').value = profil.jamPulangKerja || '';
            document.getElementById('lem-gps-kantor').value = profil.gpsKantor || '';
            document.getElementById('lem-radius-gps').value = profil.radiusGps || '';
            
            window.toggleDisiplinFields();
        }, 50);
    }
}

window.tempSkemaGaji = {};
window.bukaModalPenggajian = function() {
    const profil = window.appState.lembaga[0] || {};
    window.tempSkemaGaji = profil.skemaGaji || {};
    
    const daftarJabatan = (profil.daftarJabatan || '').split(',').map(j => j.trim()).filter(j => j);
    if(daftarJabatan.length === 0) return alert("Isi daftar jabatan di Form Lembaga terlebih dahulu!");
    
    let modal = document.getElementById('modal-gaji');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'modal-gaji';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 hidden';
        document.body.appendChild(modal);
    }
    
    let trs = daftarJabatan.map(j => {
        let skema = window.tempSkemaGaji[j] || { metode: 'Bulanan', nominal: 0, potTelat: 0, potAlpa: 0 };
        return `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 font-bold text-slate-700">${j}</td>
            <td class="p-2"><select class="border-2 border-indigo-200 p-2 w-full rounded-lg text-sm font-bold text-indigo-800 bg-indigo-50 skema-metode" data-jab="${j}"><option value="Bulanan" ${skema.metode==='Bulanan'?'selected':''}>Bulanan Tetap</option><option value="Per Kehadiran" ${skema.metode==='Per Kehadiran'?'selected':''}>Per Kehadiran (Sesi)</option><option value="Per JP" ${skema.metode==='Per JP'?'selected':''}>Per Jam Mengajar (JP)</option></select></td>
            <td class="p-2"><input type="number" class="border-2 border-slate-200 p-2 w-full rounded-lg text-sm font-bold skema-nominal" data-jab="${j}" value="${skema.nominal}" placeholder="Rp"></td>
            <td class="p-2"><input type="number" class="border-2 border-rose-200 p-2 w-full rounded-lg text-sm font-bold text-rose-600 bg-rose-50 skema-telat" data-jab="${j}" value="${skema.potTelat}" placeholder="Rp/Menit"></td>
            <td class="p-2"><input type="number" class="border-2 border-red-200 p-2 w-full rounded-lg text-sm font-bold text-red-600 bg-red-50 skema-alpa" data-jab="${j}" value="${skema.potAlpa}" placeholder="Rp/Hari"></td>
        </tr>`;
    }).join('');
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 border-t-4 border-emerald-500 animate-slide-up">
            <h3 class="text-2xl font-black mb-2 text-slate-800"><i class="fa-solid fa-coins text-emerald-500 mr-2"></i> Pengaturan Skema Gaji & Potongan per Jabatan</h3>
            <p class="text-sm font-bold text-slate-500 mb-4 border-b pb-4">Nominal akan dihitung secara otomatis setiap bulan berdasarkan rekam jejak presensi.</p>
            <div class="overflow-x-auto max-h-[60vh] custom-scrollbar border border-slate-200 rounded-xl">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-100 text-slate-600 border-b-2">
                        <tr><th class="p-3">Nama Jabatan</th><th class="p-3">Metode Penggajian</th><th class="p-3">Gaji Pokok / Rate (Rp)</th><th class="p-3">Potongan Telat/Menit (Rp)</th><th class="p-3">Potongan Alpa/Tidak Hadir (Rp)</th></tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
            <div class="mt-6 flex gap-3 justify-end pt-4 border-t">
                <button type="button" onclick="document.getElementById('modal-gaji').classList.add('hidden')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold transition">Tutup</button>
                <button type="button" onclick="window.simpanModalPenggajian()" class="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black shadow-lg transition">Terapkan Skema</button>
            </div>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanModalPenggajian = function() {
    const metodes = document.querySelectorAll('.skema-metode');
    const nominals = document.querySelectorAll('.skema-nominal');
    const telats = document.querySelectorAll('.skema-telat');
    const alpas = document.querySelectorAll('.skema-alpa');
    
    metodes.forEach((m, i) => {
        window.tempSkemaGaji[m.dataset.jab] = { metode: m.value, nominal: Number(nominals[i].value), potTelat: Number(telats[i].value), potAlpa: Number(alpas[i].value) };
    });
    alert("Skema gaji DITERAPKAN secara visual!\n\n⚠️ PENTING: Jangan lupa klik tombol biru 'Simpan Konfigurasi Lembaga' untuk mempermanenkannya ke Database.");
    document.getElementById('modal-gaji').classList.add('hidden');
};

window.simpanLembaga = async function(e) {
    e.preventDefault();
    const profil = window.appState.lembaga[0] || {}; 
    const id = profil.id; 
    
    let logoUrl = document.getElementById('lem-logo-url').value;
    const fileInput = document.getElementById('lem-logo-file');

    if (fileInput.files.length > 0) {
        const uploadedUrl = await window.uploadFotoCloudinary(fileInput.files[0], 'btn-simpan-lem');
        if (uploadedUrl) logoUrl = uploadedUrl;
    }

    const data = {
        namaLembaga: document.getElementById('lem-nama').value, jenisLembaga: document.getElementById('lem-jenis').value, 
        daftarJabatan: document.getElementById('lem-jabatan').value, logo: logoUrl,
        bentukPendidikan: document.getElementById('lem-bentuk').value, statusLembaga: document.getElementById('lem-status').value, 
        npsn: document.getElementById('lem-npsn').value, nsm: document.getElementById('lem-nsm').value, akreditasi: document.getElementById('lem-akreditasi').value, 
        skPendirian: document.getElementById('lem-sk').value, izinOperasional: document.getElementById('lem-izin').value, lks: document.getElementById('lem-lks').value, 
        npwp: document.getElementById('lem-npwp').value, rekening: document.getElementById('lem-rekening').value, alamat: document.getElementById('lem-alamat').value,
        kelas: document.getElementById('lem-kelas').value, asrama: document.getElementById('lem-asrama').value,
        jenisOperasional: document.getElementById('lem-ops').value, jenisPendidikan: document.getElementById('lem-pend').value, kurikulum: document.getElementById('lem-kurikulum').value, libur: document.getElementById('lem-libur').value,
        umumJp: document.getElementById('lem-umum-jp').value, umumMasuk: document.getElementById('lem-umum-masuk').value, umumFrek: document.getElementById('lem-umum-frek').value, umumWaktu: document.getElementById('lem-umum-waktuist').value,
        tahfidzJp: document.getElementById('lem-tahfidz-jp').value, tahfidzMasuk: document.getElementById('lem-tahfidz-masuk').value, tahfidzFrek: document.getElementById('lem-tahfidz-frek').value, tahfidzWaktu: document.getElementById('lem-tahfidz-waktuist').value,
        kedisiplinan: document.getElementById('lem-disiplin').value, temaWebsite: document.getElementById('lem-tema').value,
        daftarMapel: document.getElementById('lem-mapel').value,
        umumPulang: document.getElementById('lem-umum-pulang').value,
        tahfidzPulang: document.getElementById('lem-tahfidz-pulang').value,
        daftarKelas: document.getElementById('lem-kelas-list').value,
        umumIstirahat: document.getElementById('lem-umum-istirahat').value,
        tahfidzIstirahat: document.getElementById('lem-tahfidz-istirahat').value,
        skemaGaji: window.tempSkemaGaji,
        
        // Data Dinamis Presensi
        toleransiTelat: document.getElementById('lem-toleransi-telat').value,
        jamMasukKerja: document.getElementById('lem-jam-masuk-kerja').value,
        jamPulangKerja: document.getElementById('lem-jam-pulang-kerja').value,
        gpsKantor: document.getElementById('lem-gps-kantor').value,
        radiusGps: document.getElementById('lem-radius-gps').value
    };

    try {
        if (id) await updateDoc(doc(db, "Lembaga", id), data); 
        else await addDoc(collection(db, "Lembaga"), data);
        alert("Berhasil! Konfigurasi Utama telah tersimpan.");
    } catch (err) { alert("Gagal menyimpan data!"); }
};

// ==========================================
// MODUL PEGAWAI & MANAJEMEN AKUN
// ==========================================
window.currentPegawaiPhotos = [];

window.renderFotoGallery = function() {
    const container = document.getElementById('peg-foto-gallery');
    const fileInput = document.getElementById('peg-foto-file');
    if (!container) return;
    
    if (window.currentPegawaiPhotos.length >= 5) {
        fileInput.disabled = true; fileInput.classList.add('bg-slate-200', 'cursor-not-allowed');
    } else {
        fileInput.disabled = false; fileInput.classList.remove('bg-slate-200', 'cursor-not-allowed');
    }

    container.innerHTML = window.currentPegawaiPhotos.map((url, i) => `
        <div class="relative inline-block mr-3 mb-3 rounded-xl shadow-sm bg-white p-1 border-2 ${i === 0 ? 'border-indigo-500' : 'border-slate-200'}">
            <img src="${url}" onclick="window.jadikanFotoUtama(${i})" class="h-20 w-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" title="${i === 0 ? 'Foto Utama Saat Ini' : 'Klik untuk jadikan Foto Utama'}">
            <button type="button" onclick="window.hapusFotoPegawai(${i})" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700 shadow border-2 border-white"><i class="fa-solid fa-times"></i></button>
            ${i === 0 ? `<span class="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow pointer-events-none">UTAMA</span>` : ''}
        </div>
    `).join('');
};

window.jadikanFotoUtama = function(index) {
    if (index === 0) return; 
    const temp = window.currentPegawaiPhotos[0];
    window.currentPegawaiPhotos[0] = window.currentPegawaiPhotos[index];
    window.currentPegawaiPhotos[index] = temp;
    window.renderFotoGallery();
};

window.hapusFotoPegawai = function(index) {
    window.currentPegawaiPhotos.splice(index, 1); window.renderFotoGallery();
};

window.handleJabatanCheck = function(safeId) {
    if(safeId) {
        const chk = document.getElementById('chk-' + safeId);
        const box = document.getElementById('presensi-opts-' + safeId);
        if(chk && box) {
            if(chk.checked) box.classList.remove('hidden'); else box.classList.add('hidden');
        }
    }
    
    let isGuru = false;
    document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
        if(el.value.toLowerCase().includes('guru')) isGuru = true;
    });
    const areaGuru = document.getElementById('area-guru-general');
    if(areaGuru) {
        if(isGuru) areaGuru.classList.remove('hidden');
        else areaGuru.classList.add('hidden');
    }
};

window.handleTipePresensiChange = function(safeId) {
    const val = document.getElementById('presensi-val-' + safeId).value;
    const cicoOpts = document.getElementById('cico-opts-' + safeId);
    if(cicoOpts) {
        if(val === 'CICO') cicoOpts.classList.remove('hidden');
        else cicoOpts.classList.add('hidden');
    }
};

window.toggleAreaRekening = function() {
    const val = document.getElementById('peg-jenis-rek').value;
    const area = document.getElementById('area-rekening');
    if(area) {
        if(val) area.classList.remove('hidden');
        else area.classList.add('hidden');
    }
};

// Fungsi Cetak PDF
window.cetakProfilPegawai = function(id) {
    const item = window.appState.pegawai.find(x => x.id === id);
    if(!item) return;
    
    const foto = (item.fotoProfil && item.fotoProfil.length > 0) ? item.fotoProfil[0] : `https://ui-avatars.com/api/?name=${item.nama || 'Pegawai'}&background=e2e8f0&color=475569&size=150`;
    const jabatans = (item.detailJabatan || []).map(d => d.namaJabatan).join(', ') || '-';
    
    const html = `
        <div class="p-8 bg-white text-slate-800 font-sans" style="width: 800px;">
            <div class="flex border-b-4 border-primary pb-4 mb-6 items-center">
                <img src="${foto}" style="width: 120px; height: 160px; object-fit: cover;" class="rounded border shadow">
                <div class="ml-6 flex-1">
                    <h1 class="text-3xl font-black uppercase tracking-wide text-primary">${item.nama}</h1>
                    <p class="text-xl font-bold text-slate-600 mt-1">${jabatans}</p>
                    <p class="text-sm mt-3 font-semibold text-slate-500"><i class="fa-solid fa-phone mr-2"></i> ${item.noHp || '-'}</p>
                    <p class="text-sm font-semibold text-slate-500 mt-1"><i class="fa-solid fa-envelope mr-2"></i> ${item.email || '-'}</p>
                    <p class="text-sm font-semibold text-slate-500 mt-1"><i class="fa-solid fa-location-dot mr-2"></i> ${item.alamat || '-'}</p>
                </div>
            </div>
            <h3 class="font-bold text-lg border-b-2 border-slate-200 mb-3 text-slate-700 pb-1">Biodata Lengkap & Kepegawaian</h3>
            <table class="w-full text-sm mb-6">
                <tr><td class="py-2 w-1/3 font-semibold text-slate-500">NIP / NIY</td><td>: ${item.nip || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">NIK Identitas</td><td>: ${item.nik || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Jenis Kelamin</td><td>: ${item.jk || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Tempat, Tgl Lahir</td><td>: ${item.tempatLahir || '-'}, ${item.tglLahir || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Pendidikan Terakhir</td><td>: ${item.pendidikan || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Tanggal Bergabung</td><td>: ${item.tglGabung || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Status Pegawai</td><td>: <span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-black">${item.statusPegawai || 'Tetap'}</span></td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Hak Akses Sistem</td><td>: <span class="bg-slate-200 px-2 py-1 rounded text-[10px] font-bold">${item.hakAkses || 'Staf Biasa'}</span></td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Username Akun</td><td>: ${item.username || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Rekening / E-Wallet</td><td>: ${item.jenisRek ? `${item.namaBank} (${item.noRek}) a.n ${item.atasNama}` : '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">NPWP</td><td>: ${item.npwp || '-'}</td></tr>
                ${item.detailJabatan && item.detailJabatan.some(j => j.namaJabatan.toLowerCase().includes('guru')) ? `
                <tr><td class="py-2 font-semibold text-slate-500">NUPTK</td><td>: ${item.nuptk || '-'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Serdik / PPG</td><td>: ${item.serdik || 'Belum'}</td></tr>
                <tr><td class="py-2 font-semibold text-slate-500">Wali Kelas</td><td>: ${item.waliKelas && item.waliKelas !== '' ? item.waliKelas : 'Bukan Wali Kelas'}</td></tr>
                ` : ''}
            </table>
        </div>
    `;
    document.getElementById('hidden-pdf-container').innerHTML = html;
    window.unduhPDF('hidden-pdf-container', `Profil_${item.nama.replace(/\s+/g, '_')}.pdf`);
};

export function renderHalamanPegawai(container) {
    window.currentPegawaiPhotos = [];
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarJabatan = profilLembaga.daftarJabatan ? profilLembaga.daftarJabatan.split(',').map(j => j.trim()) : [];
    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()).filter(k=>k) : [];
    
    const currentUser = window.currentUser || {};
    const isPegawaiBiasa = currentUser.hakAkses === 'Pegawai';

    const daftarMapel = profilLembaga.daftarMapel ? profilLembaga.daftarMapel.split(',').map(m => m.trim()) : [];
    
    let checkboxJabatanHTML = daftarJabatan.length > 0 ? daftarJabatan.map(j => {
        const isGuru = j.toLowerCase().includes('guru');
        const safeJ = j.replace(/\s+/g, '-');
        return `
        <div class="mb-3 p-3 border rounded-xl bg-white shadow-sm hover:border-indigo-300 transition">
            <label class="inline-flex items-center cursor-pointer font-bold text-slate-700 hover:text-indigo-600">
                <input type="checkbox" id="chk-${safeJ}" name="peg-jabatan-chk" value="${j}" onchange="window.handleJabatanCheck('${safeJ}')" class="mr-3 h-5 w-5 text-indigo-600 rounded"> ${j}
            </label>
            <div id="presensi-opts-${safeJ}" class="hidden mt-3 ml-8 border-l-4 border-indigo-200 pl-4 py-1">
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-2 tracking-wider">Mode Presensi:</label>
                <select id="presensi-val-${safeJ}" onchange="window.handleTipePresensiChange('${safeJ}')" class="border border-slate-200 p-2.5 rounded-lg text-sm w-full md:w-3/4 focus:outline-indigo-500 bg-slate-50 text-slate-700 font-semibold cursor-pointer">
                    <option value="Kelas">Presensi Sesuai Kelas (Khusus Guru)</option>
                    <option value="CICO">Presensi Cek In & Cek Out (CICO)</option>
                    <option value="1x">Presensi 1 Kali (Harian)</option>
                    <option value="Tanpa Presensi">Tanpa Presensi</option>
                </select>
                
                <div id="cico-opts-${safeJ}" class="hidden mt-3 md:w-3/4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                    <label class="text-[11px] uppercase font-black text-emerald-600 block mb-1">Daftar Sesi CICO (Jam Masuk - Jam Keluar):</label>
                    <p class="text-[9px] font-bold text-emerald-500 mb-2">Pisahkan dengan koma jika lebih dari 1 sesi.</p>
                    <input type="text" id="cico-val-${safeJ}" class="border border-emerald-300 p-2 rounded w-full bg-white text-emerald-800 font-bold text-sm" placeholder="Cth: 08:00-12:00, 13:00-17:00">
                </div>
                ${isGuru ? `
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-1 mt-2 text-green-600">Mapel yang Diampu (Bisa lebih dari 1):</label>
                <div class="border border-green-200 p-2 rounded-lg bg-green-50 text-sm max-h-32 overflow-y-auto custom-scrollbar">
                    ${daftarMapel.map(m => `<label class="flex items-center space-x-2 mb-1 cursor-pointer"><input type="checkbox" class="mapel-chk-${safeJ} form-checkbox text-green-600 rounded" value="${m}"> <span class="text-green-700 font-semibold">${m}</span></label>`).join('')}
                </div>
                <label class="text-[11px] uppercase font-black text-slate-400 block mb-1 mt-2 text-blue-600">Kuota Jam Mengajar (JP/Pekan):</label>
                <input type="number" id="kuota-val-${safeJ}" class="border border-blue-200 p-2 rounded-lg text-sm w-full bg-blue-50 text-blue-700 font-bold" placeholder="Cth: 24">
                ` : `<input type="hidden" id="kuota-val-${safeJ}" value="0">`}
            </div>
        </div>`;
    }).join('') : `<div class="bg-red-50 text-red-500 font-bold p-4 rounded-xl col-span-2 border border-red-200"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Harap isi "Daftar Jabatan Pegawai" di Konfigurasi Lembaga terlebih dahulu!</div>`;

    let kartuPegawaiHTML = '';
    if (!isPegawaiBiasa) {
        kartuPegawaiHTML = window.appState.pegawai.map((item) => {
            const foto = (item.fotoProfil && item.fotoProfil.length > 0) ? item.fotoProfil[0] : `https://ui-avatars.com/api/?name=${item.nama || 'Pegawai'}&background=e2e8f0&color=475569`;
            const jabatans = (item.detailJabatan || []).map(d => `<span class="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">${d.namaJabatan} ${d.mapel && d.mapel.length > 0 ? `<span class="text-green-600">(${Array.isArray(d.mapel) ? d.mapel.join(', ') : d.mapel})</span>` : ''}</span>`).join(' ');
            
            const badgeWali = item.waliKelas ? `<span class="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black border border-purple-200 mt-1"><i class="fa-solid fa-star mr-1"></i> Wali Kelas ${item.waliKelas}</span>` : '';

            let badgeWarna = item.hakAkses === 'Administrator' || item.hakAkses === 'Super Admin' ? 'bg-rose-50 text-rose-600 border-rose-200' : (item.hakAkses === 'Operator/TU' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200');

            return `
            <div class="bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col relative group transform hover:-translate-y-1">
                <div class="h-24 bg-gradient-to-br from-slate-700 to-slate-900 w-full relative overflow-hidden">
                    <div class="absolute inset-0 bg-white opacity-5 pattern-dots"></div>
                </div>
                <div class="px-6 pb-6 relative flex-1 flex flex-col">
                    <div class="flex justify-between items-end -mt-10 mb-4">
                        <img src="${foto}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-white z-10">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black tracking-wide border ${badgeWarna} shadow-sm">${item.hakAkses || 'Pegawai Biasa'}</span>
                    </div>
                    <h3 class="text-lg font-black text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">${item.nama || '-'}</h3>
                    <p class="text-[10px] font-black text-slate-400 mb-4"><i class="fa-solid fa-id-card mr-1"></i> NIP/NIK: <span class="font-bold text-slate-500">${item.nip ? item.nip : (item.nik || '-')}</span></p>
                    
                    <div class="flex-1 mb-5">
                        <div class="flex flex-wrap gap-1.5">${jabatans || '<span class="text-xs text-red-400 font-medium bg-red-50 px-2 py-1 rounded">Belum ditetapkan</span>'} ${badgeWali}</div>
                    </div>
                    
                    <div class="border-t border-slate-100 pt-4 flex justify-between gap-2 mt-auto">
                        <button onclick="window.cetakProfilPegawai('${item.id}')" class="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-print mr-1.5"></i> Cetak</button>
                        <button onclick="window.editPegawai('${item.id}')" class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center"><i class="fa-solid fa-pen mr-1.5"></i> Edit</button>
                        <button onclick="window.hapusPegawai('${item.id}')" class="w-11 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm mb-8 border-t-4 border-indigo-500 relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><i class="fa-solid fa-users-gear text-9xl"></i></div>
            
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-4 relative z-10 gap-4">
                <h2 class="text-2xl font-black text-slate-800">${isPegawaiBiasa ? 'Biodata Profil Anda' : 'Formulir Data Pegawai & Akun Sistem'}</h2>
                ${!isPegawaiBiasa ? `
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('pegawai', 'Data_Pegawai')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Pegawai')" class="hidden"></label>
                </div>` : ''}
            </div>
            
            <form id="form-pegawai" onsubmit="window.simpanPegawai(event)" class="relative z-10">
                <input type="hidden" id="peg-id">
                
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div class="xl:col-span-2 space-y-6">
                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3"><i class="fa-solid fa-id-badge mr-2"></i> Identitas Utama</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" id="peg-nama" placeholder="Nama Lengkap (Wajib)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50" required>
                                <select id="peg-jk" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50" required>
                                    <option value="">-- Jenis Kelamin --</option><option value="Laki-Laki">Laki-Laki</option><option value="Perempuan">Perempuan</option>
                                </select>
                                <input type="text" id="peg-nik" placeholder="NIK KTP (Opsional)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50">
                                <input type="text" id="peg-nip" placeholder="NIP / NIY (Opsional)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50">
                                <input type="email" id="peg-email" placeholder="Email Aktif (Opsional)" class="border-2 border-slate-200 p-3.5 rounded-xl focus:outline-indigo-500 font-semibold text-slate-700 bg-slate-50 md:col-span-2">
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3 mt-6"><i class="fa-solid fa-address-book mr-2"></i> Biodata Tambahan & Personal</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Status Pegawai</label><select id="peg-status-pegawai" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-bold text-slate-700 cursor-pointer"><option value="">-- Pilih Status --</option><option value="Tetap">Tetap</option><option value="Kontrak (PKWT)">Kontrak (PKWT)</option><option value="Harian">Harian</option><option value="Freelance">Freelance</option></select></div>
                                <div>
        <label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Pendidikan Terakhir</label>
        <select id="peg-pendidikan" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-bold text-slate-700 cursor-pointer">
            <option value="">-- Pilih --</option>
            <option value="SMA/Sederajat">SMA/Sederajat</option>
            <option value="D1-D3">D1-D3</option>
            <option value="S1/D4">S1/D4</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
        </select>
    </div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">NPWP</label><input type="text" id="peg-npwp" placeholder="Opsional" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Mulai Bergabung</label><input type="date" id="peg-tgl-gabung" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Tempat Lahir</label><input type="text" id="peg-tempat-lahir" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Tanggal Lahir</label><input type="date" id="peg-tgl-lahir" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Nomor HP / WA</label><input type="text" id="peg-nohp" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium"></div>
                                
                                <div class="md:col-span-3"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Alamat Domisili</label><textarea id="peg-alamat" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-medium" rows="2"></textarea></div>
                                
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Status Pernikahan</label><select id="peg-pernikahan" onchange="document.getElementById('area-anak').classList.toggle('hidden', this.value==='Belum Menikah')" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-bold text-slate-700 cursor-pointer"><option value="Belum Menikah">Belum Menikah</option><option value="Menikah">Menikah</option><option value="Cerai">Cerai</option></select></div>
                                <div id="area-anak" class="hidden"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Jumlah Anak</label><input type="number" id="peg-jml-anak" placeholder="Cth: 2" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-bold text-slate-700"></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Berasrama?</label><select id="peg-asrama" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-slate-50 font-bold text-slate-700 cursor-pointer"><option value="Tidak">Tidak Berasrama</option><option value="Ya">Tinggal di Asrama</option></select></div>
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3 mt-6"><i class="fa-solid fa-file-contract mr-2"></i> Portofolio & Informasi CV</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="md:col-span-2"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Bio / Tentang Saya</label><textarea id="peg-bio" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-white font-bold text-slate-700 shadow-sm" rows="2" placeholder="Ceritakan deskripsi singkat tentang diri Anda..."></textarea></div>
                                
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Riwayat Pendidikan (Lengkap)</label><textarea id="peg-riwayat-pend" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-white font-medium custom-scrollbar" rows="4" placeholder="Cth:\n- SD Negeri 1 (2000-2006)\n- S1 Sistem Komputer Universitas Royal (2012-2016)"></textarea></div>
                                <div><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Pengalaman Kerja</label><textarea id="peg-riwayat-kerja" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-white font-medium custom-scrollbar" rows="4" placeholder="Cth:\n- Guru Honorer SMPN 2 (2016-2018)\n- Kepala Asrama Panti (2019-Sekarang)"></textarea></div>
                                
                                <div class="md:col-span-2"><label class="text-[10px] font-bold text-slate-400 mb-1 block uppercase">Keahlian Khusus & Hobi (Pisahkan Koma)</label><textarea id="peg-keahlian" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-indigo-500 bg-white font-bold text-indigo-700 shadow-sm" rows="2" placeholder="Cth: Menguasai HTML & CSS, Modifikasi Motor PCX, Desain Web"></textarea></div>
                                
                                <div><label class="text-[10px] font-bold text-pink-500 mb-1 block uppercase"><i class="fa-brands fa-instagram mr-1"></i> Username Instagram</label><input type="text" id="peg-sosmed-ig" placeholder="Cth: @GasMainJauh" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-pink-500 bg-white font-bold text-slate-700 shadow-sm"></div>
                                <div><label class="text-[10px] font-bold text-blue-600 mb-1 block uppercase"><i class="fa-brands fa-linkedin mr-1"></i> LinkedIn / Facebook</label><input type="text" id="peg-sosmed-in" placeholder="URL Link Profil / Username" class="border-2 border-slate-200 p-3 rounded-xl w-full focus:outline-blue-500 bg-white font-bold text-slate-700 shadow-sm"></div>
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3 mt-6"><i class="fa-solid fa-money-check-dollar mr-2"></i> Info Keuangan & Pembayaran</h3>
                            <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                                <label class="text-[10px] font-bold text-emerald-600 mb-2 block uppercase">Pilihan Rekening / E-Wallet</label>
                                <select id="peg-jenis-rek" onchange="window.toggleAreaRekening()" class="border-2 border-emerald-200 p-3 rounded-xl w-full md:w-1/2 focus:outline-emerald-500 bg-white font-bold text-emerald-800 cursor-pointer">
                                    <option value="">-- Belum Diatur --</option>
                                    <option value="Bank">Rekening Bank</option>
                                    <option value="E-Wallet">E-Wallet (Dana / OVO / Gopay / LinkAja)</option>
                                </select>
                                <div id="area-rekening" class="hidden mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-emerald-200 pt-4">
                                    <div class="md:col-span-2"><label class="text-[10px] font-bold text-emerald-600 mb-1 block uppercase">Nama Bank / E-Wallet</label><input type="text" id="peg-nama-bank" placeholder="Cth: Bank Syariah Indonesia (BSI)" class="border-2 border-emerald-200 p-3 rounded-xl w-full focus:outline-emerald-500 bg-white font-bold text-slate-700"></div>
                                    <div><label class="text-[10px] font-bold text-emerald-600 mb-1 block uppercase">Nomor Rekening / HP</label><input type="text" id="peg-no-rek" placeholder="Opsional" class="border-2 border-emerald-200 p-3 rounded-xl w-full focus:outline-emerald-500 bg-white font-bold text-slate-700"></div>
                                    <div><label class="text-[10px] font-bold text-emerald-600 mb-1 block uppercase">Atas Nama Rekening</label><input type="text" id="peg-atas-nama" placeholder="Opsional" class="border-2 border-emerald-200 p-3 rounded-xl w-full focus:outline-emerald-500 bg-white font-bold text-slate-700"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                            <h3 class="font-bold text-indigo-400 text-xs uppercase tracking-wider mb-3"><i class="fa-solid fa-key mr-2"></i> Kredensial Akses</h3>
                            <div class="space-y-3">
                                <input type="text" id="peg-user" placeholder="Username (Cth: ahmad123)" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-bold text-indigo-900 shadow-sm" ${isPegawaiBiasa ? 'readonly title="Hubungi Admin untuk mengganti Username"' : ''}>
                                <input type="password" id="peg-pass" placeholder="${isPegawaiBiasa ? 'Kosongkan bila tak ubah sandi' : 'Password Sistem'}" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-bold text-indigo-900 shadow-sm">
                                <select id="peg-hak" class="border-2 border-white p-3 rounded-xl w-full focus:outline-indigo-500 font-black text-indigo-600 shadow-sm cursor-pointer ${isPegawaiBiasa ? 'hidden' : ''}">
                                    <option value="">-- Hak Akses Web --</option>
                                    <option value="Administrator">Administrator (Penuh)</option>
                                    <option value="Operator/TU">Operator / TU</option>
                                    <option value="Pegawai">Pegawai Biasa</option>
                                </select>
                            </div>
                            
                            <div class="mt-4 pt-4 border-t border-indigo-200/50">
                                <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Tautan Akun Google SSO</label>
                                <input type="text" id="peg-google-email" readonly placeholder="Belum Tertaut" class="border-2 border-white p-3 rounded-xl w-full font-bold text-slate-500 shadow-sm bg-slate-100/50 mb-2">
                                <button type="button" onclick="window.sinkronGoogleAuth()" class="w-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 py-3 rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center"><i class="fa-brands fa-google text-lg mr-2"></i> Sinkronkan Google</button>
                            </div>
                        </div>

                        <div>
                            <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2"><i class="fa-solid fa-camera mr-2"></i> Foto Profil CV</h3>
                            <input type="file" id="peg-foto-file" accept="image/*" class="border-2 border-slate-200 p-2 bg-white rounded-xl text-sm w-full font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer">
                            <div id="peg-foto-gallery" class="flex flex-wrap mt-3 gap-2"></div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 border-t border-slate-100 pt-6 ${isPegawaiBiasa ? 'hidden' : ''}">
                    <h3 class="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4"><i class="fa-solid fa-sitemap mr-2"></i> Penempatan Jabatan & Tugas</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${checkboxJabatanHTML}
                    </div>
                    
                    <div id="area-guru-general" class="hidden mt-6 p-5 bg-teal-50 border border-teal-100 rounded-xl">
                        <h4 class="font-bold text-teal-800 text-sm mb-3"><i class="fa-solid fa-graduation-cap mr-2"></i> Info Tambahan Khusus Guru</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label class="text-[10px] font-bold text-teal-600 mb-1 block uppercase">NUPTK</label><input type="text" id="peg-nuptk" placeholder="Opsional" class="border-2 border-teal-200 p-3 rounded-xl w-full focus:outline-teal-500 bg-white font-bold text-slate-700"></div>
                            <div><label class="text-[10px] font-bold text-teal-600 mb-1 block uppercase">Sertifikasi (Serdik)</label><select id="peg-serdik" class="border-2 border-teal-200 p-3 rounded-xl w-full focus:outline-teal-500 bg-white font-bold text-slate-700 cursor-pointer"><option value="">-- Pilih --</option><option value="Belum">Belum PPG / Serdik</option><option value="Sudah">Sudah Sertifikasi (Serdik)</option></select></div>
                            <div>
                                <label class="text-[10px] font-bold text-teal-600 mb-1 block uppercase">Tugas Tambahan: Wali Kelas</label>
                                <select id="peg-walikelas" class="border-2 border-teal-200 p-3 rounded-xl w-full focus:outline-teal-500 bg-white font-bold text-slate-700 cursor-pointer">
                                    <option value="">-- Bukan Wali Kelas --</option>
                                    ${daftarKelas.map(k => `<option value="${k}">${k}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                    <button type="submit" id="btn-simpan-peg" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-xl font-black text-lg transition shadow-xl transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Profil</button>
                    <button type="button" onclick="document.getElementById('form-pegawai').reset(); document.getElementById('btn-batal-peg').classList.add('hidden'); document.getElementById('peg-pass').disabled=false; document.getElementById('peg-hak').disabled=false; document.getElementById('area-anak').classList.add('hidden');" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-4 rounded-xl hidden font-bold transition" id="btn-batal-peg">Batal Edit</button>
                </div>
            </form>
        </div>

        ${isPegawaiBiasa ? '' : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            ${kartuPegawaiHTML || '<div class="col-span-full text-center p-10 bg-white rounded-3xl text-slate-400 font-bold border border-slate-100 shadow-sm"><i class="fa-solid fa-ghost text-4xl mb-3 block opacity-50"></i> Belum ada data pegawai yang terdaftar</div>'}
        </div>
        `}
        
        <div id="hidden-pdf-container" class="hidden absolute top-[-9999px] left-[-9999px] bg-white"></div>
    `;
    window.renderFotoGallery();

    if (isPegawaiBiasa && currentUser.id) {
        setTimeout(() => {
            window.editPegawai(currentUser.id);
            const btnBatal = document.getElementById('btn-batal-peg');
            if (btnBatal) btnBatal.classList.add('hidden');
        }, 50);
    }
}

window.simpanPegawai = async function(e) {
    e.preventDefault();
    const id = document.getElementById('peg-id').value;
    
    const userAktif = window.currentUser || {};
    const isOperator = userAktif.hakAkses === 'Operator/TU';
    const isPegawaiBiasa = userAktif.hakAkses === 'Pegawai';
    const isSelf = userAktif.id === id;

    if (isPegawaiBiasa && !isSelf && id) return alert("Akses Ditolak!");

    let detailJabatan = [];
    let hakToSave = document.getElementById('peg-hak').value;
    let passToSave = document.getElementById('peg-pass').value;
    let userToSave = document.getElementById('peg-user').value;
    
    let waliKelasToSave = '';
    let originalUser = null;
    let googleAkunToSave = '';

    if (id) {
        originalUser = window.appState.pegawai.find(x => x.id === id);
        googleAkunToSave = originalUser.googleAkun || ''; // Pertahankan akun Google yang sudah tertaut
        
        if (isPegawaiBiasa) {
            detailJabatan = originalUser.detailJabatan || [];
            hakToSave = originalUser.hakAkses;
            userToSave = originalUser.username; 
            waliKelasToSave = originalUser.waliKelas || '';
            if (passToSave.trim() === '') passToSave = originalUser.password;
        } else if (isOperator) {
            hakToSave = originalUser.hakAkses; 
            if (!isSelf && passToSave.trim() === '') passToSave = originalUser.password; 
            document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
            });
            const wkEl = document.getElementById('peg-walikelas');
            if (wkEl) waliKelasToSave = wkEl.value;
        } else {
            document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
            });
            const wkEl = document.getElementById('peg-walikelas');
            if (wkEl) waliKelasToSave = wkEl.value;
        }
    } else {
        document.querySelectorAll('input[name="peg-jabatan-chk"]:checked').forEach(el => {
                const safeJ = el.value.replace(/\s+/g, '-');
                const mapels = Array.from(document.querySelectorAll(`.mapel-chk-${safeJ}:checked`)).map(cb => cb.value);
                const kuota = document.getElementById(`kuota-val-${safeJ}`)?.value || 0;
                const cicoOpts = document.getElementById(`cico-val-${safeJ}`)?.value || '';
                detailJabatan.push({ namaJabatan: el.value, tipePresensi: document.getElementById(`presensi-val-${safeJ}`).value, mapel: mapels, kuota: kuota, cicoOpts: cicoOpts });
        });
        const wkEl = document.getElementById('peg-walikelas');
        if (wkEl) waliKelasToSave = wkEl.value;
    }

    const fileInput = document.getElementById('peg-foto-file');
    if (fileInput.files.length > 0) {
        const uploadedUrl = await window.uploadFotoCloudinary(fileInput.files[0], 'btn-simpan-peg');
        if (uploadedUrl) window.currentPegawaiPhotos.push(uploadedUrl);
    }

    const pernikahanVal = document.getElementById('peg-pernikahan').value;
    const jmlAnakVal = pernikahanVal !== 'Belum Menikah' ? (document.getElementById('peg-jml-anak').value || '0') : '0';

    const data = {
        nama: document.getElementById('peg-nama').value, jk: document.getElementById('peg-jk').value, 
        nik: document.getElementById('peg-nik').value, nip: document.getElementById('peg-nip').value, email: document.getElementById('peg-email').value,
        tempatLahir: document.getElementById('peg-tempat-lahir').value, tglLahir: document.getElementById('peg-tgl-lahir').value, pendidikan: document.getElementById('peg-pendidikan').value, 
        noHp: document.getElementById('peg-nohp').value, tglGabung: document.getElementById('peg-tgl-gabung').value, alamat: document.getElementById('peg-alamat').value,
        statusPegawai: document.getElementById('peg-status-pegawai').value, npwp: document.getElementById('peg-npwp').value,
        jenisRek: document.getElementById('peg-jenis-rek').value, namaBank: document.getElementById('peg-nama-bank').value, noRek: document.getElementById('peg-no-rek').value, atasNama: document.getElementById('peg-atas-nama').value,
        nuptk: document.getElementById('peg-nuptk').value, serdik: document.getElementById('peg-serdik').value,
        
        pernikahan: pernikahanVal, jmlAnak: jmlAnakVal, asrama: document.getElementById('peg-asrama').value,
        bio: document.getElementById('peg-bio').value, riwayatPend: document.getElementById('peg-riwayat-pend').value,
        riwayatKerja: document.getElementById('peg-riwayat-kerja').value, keahlian: document.getElementById('peg-keahlian').value,
        sosmedIg: document.getElementById('peg-sosmed-ig').value, sosmedIn: document.getElementById('peg-sosmed-in').value,
        
        googleAkun: googleAkunToSave, username: userToSave, password: passToSave, hakAkses: hakToSave,
        fotoProfil: window.currentPegawaiPhotos, detailJabatan: detailJabatan, waliKelas: waliKelasToSave
    };

    try {
        if (id) await updateDoc(doc(db, "Pegawai", id), data); else await addDoc(collection(db, "Pegawai"), data);
        
        if (waliKelasToSave) {
            const safeKelasId = waliKelasToSave.replace(/\s+/g, '-').toUpperCase();
            await setDoc(doc(db, "Kelas", safeKelasId), {
                nama: waliKelasToSave, waliKelas: data.nama, noHpWali: data.noHp, updatedAt: new Date().toISOString()
            }, { merge: true });
        }
        
        if (id && originalUser && originalUser.waliKelas && originalUser.waliKelas !== waliKelasToSave) {
            const oldKelasId = originalUser.waliKelas.replace(/\s+/g, '-').toUpperCase();
            await setDoc(doc(db, "Kelas", oldKelasId), {
                waliKelas: "Belum diatur", noHpWali: "-", updatedAt: new Date().toISOString()
            }, { merge: true });
        }
        
        document.getElementById('form-pegawai').reset(); 
        document.getElementById('btn-batal-peg').classList.add('hidden');
        document.getElementById('peg-pass').disabled = false;
        document.getElementById('peg-hak').disabled = false;
        document.getElementById('area-anak').classList.add('hidden');
        
        renderHalamanPegawai(document.getElementById('view-container'));
    } catch (err) { alert("Gagal menyimpan profil!"); }
};

window.editPegawai = function(id) {
    const item = window.appState.pegawai.find(x => x.id === id);
    if (item) {
        const userAktif = window.currentUser || {};
        const isOperator = userAktif.hakAkses === 'Operator/TU';
        const isPegawaiBiasa = userAktif.hakAkses === 'Pegawai';
        const isSelf = userAktif.id === id;

        if (isPegawaiBiasa && !isSelf) return alert("Akses Ditolak!");

        document.getElementById('peg-id').value = item.id;
        document.getElementById('peg-nama').value = item.nama || ''; document.getElementById('peg-jk').value = item.jk || ''; 
        document.getElementById('peg-nik').value = item.nik || ''; document.getElementById('peg-nip').value = item.nip || ''; document.getElementById('peg-email').value = item.email || '';
        document.getElementById('peg-tempat-lahir').value = item.tempatLahir || ''; document.getElementById('peg-tgl-lahir').value = item.tglLahir || ''; document.getElementById('peg-pendidikan').value = item.pendidikan || '';
        document.getElementById('peg-nohp').value = item.noHp || ''; document.getElementById('peg-tgl-gabung').value = item.tglGabung || ''; document.getElementById('peg-alamat').value = item.alamat || '';
        document.getElementById('peg-status-pegawai').value = item.statusPegawai || ''; document.getElementById('peg-npwp').value = item.npwp || '';
        document.getElementById('peg-jenis-rek').value = item.jenisRek || ''; document.getElementById('peg-nama-bank').value = item.namaBank || ''; document.getElementById('peg-no-rek').value = item.noRek || ''; document.getElementById('peg-atas-nama').value = item.atasNama || '';
        document.getElementById('peg-nuptk').value = item.nuptk || ''; document.getElementById('peg-serdik').value = item.serdik || '';
        
        document.getElementById('peg-pernikahan').value = item.pernikahan || 'Belum Menikah';
        document.getElementById('peg-jml-anak').value = item.jmlAnak || '';
        document.getElementById('area-anak').classList.toggle('hidden', (item.pernikahan || 'Belum Menikah') === 'Belum Menikah');
        document.getElementById('peg-asrama').value = item.asrama || 'Tidak';
        document.getElementById('peg-bio').value = item.bio || '';
        document.getElementById('peg-riwayat-pend').value = item.riwayatPend || '';
        document.getElementById('peg-riwayat-kerja').value = item.riwayatKerja || '';
        document.getElementById('peg-keahlian').value = item.keahlian || '';
        document.getElementById('peg-sosmed-ig').value = item.sosmedIg || '';
        document.getElementById('peg-sosmed-in').value = item.sosmedIn || '';
        document.getElementById('peg-google-email').value = item.googleAkun || 'Belum Tertaut';

        const userInput = document.getElementById('peg-user');
        const passInput = document.getElementById('peg-pass');
        const hakInput = document.getElementById('peg-hak');
        const wkEl = document.getElementById('peg-walikelas');

        if (isPegawaiBiasa) {
            userInput.value = item.username || '';
            userInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            passInput.value = ''; passInput.disabled = false;
            hakInput.value = item.hakAkses || 'Pegawai'; hakInput.disabled = true;
        } else if (isOperator && !isSelf) {
            userInput.value = item.username || '';
            passInput.value = '********'; passInput.disabled = true;
            passInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai'; hakInput.disabled = true;
            hakInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            if(wkEl) wkEl.value = item.waliKelas || '';
        } else if (isOperator && isSelf) {
            userInput.value = item.username || '';
            passInput.value = item.password || ''; passInput.disabled = false;
            passInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai'; hakInput.disabled = true;
            hakInput.classList.add('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            if(wkEl) wkEl.value = item.waliKelas || '';
        } else {
            userInput.value = item.username || '';
            passInput.value = item.password || ''; passInput.disabled = false;
            passInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            hakInput.value = item.hakAkses || 'Pegawai'; hakInput.disabled = false;
            hakInput.classList.remove('bg-slate-200', 'cursor-not-allowed', 'text-slate-400');
            if(wkEl) wkEl.value = item.waliKelas || '';
        }
        
        window.currentPegawaiPhotos = item.fotoProfil ? [...item.fotoProfil] : [];
        window.renderFotoGallery();
        window.toggleAreaRekening();

        const jabatans = item.detailJabatan || [];
        document.querySelectorAll('input[name="peg-jabatan-chk"]').forEach(el => {
            const safeJ = el.value.replace(/\s+/g, '-');
            const match = jabatans.find(d => d.namaJabatan === el.value);
            if (match) {
                el.checked = true; document.getElementById(`presensi-opts-${safeJ}`).classList.remove('hidden'); document.getElementById(`presensi-val-${safeJ}`).value = match.tipePresensi;
                
                if (match.mapel) {
                    if (Array.isArray(match.mapel)) {
                        match.mapel.forEach(m => { const chk = document.querySelector(`.mapel-chk-${safeJ}[value="${m}"]`); if (chk) chk.checked = true; });
                    } else if (typeof match.mapel === 'string') {
                        const chk = document.querySelector(`.mapel-chk-${safeJ}[value="${match.mapel}"]`); if (chk) chk.checked = true;
                    }
                }
                const kuotaInp = document.getElementById(`kuota-val-${safeJ}`); if(kuotaInp) kuotaInp.value = match.kuota || '';
                if(match.tipePresensi === 'CICO') document.getElementById(`cico-opts-${safeJ}`).classList.remove('hidden');
                const cicoInp = document.getElementById(`cico-val-${safeJ}`); if(cicoInp) cicoInp.value = match.cicoOpts || '';

            } else { el.checked = false; document.getElementById(`presensi-opts-${safeJ}`).classList.add('hidden'); }
        });
        
        window.handleJabatanCheck(null);
        document.getElementById('btn-batal-peg').classList.remove('hidden'); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ==========================================
// FUNGSI SINKRONISASI GOOGLE AUTH (SSO)
// ==========================================
window.sinkronGoogleAuth = async function() {
    const id = document.getElementById('peg-id').value;
    if(!id) return alert("Simpan profil terlebih dahulu ke Database sebelum menautkan akun Google!");
    
    if(window.currentUser.id !== id) return alert("Akses Ditolak! Anda hanya diizinkan untuk menautkan akun Google pada profil Anda sendiri.");

    try {
        const { app, db } = await import('./firebase-init.js');
        const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        
        const result = await signInWithPopup(auth, provider);
        const userGoogle = result.user;
        
        // Simpan Email Google ke Firestore
        await updateDoc(doc(db, "Pegawai", id), { googleAkun: userGoogle.email });
        
        // Update tampilan & session aktif
        document.getElementById('peg-google-email').value = userGoogle.email;
        window.currentUser.googleAkun = userGoogle.email;
        localStorage.setItem('yayasan_user_v2', JSON.stringify(window.currentUser));
        
        alert("Berhasil! Akun Google " + userGoogle.email + " telah tertaut secara permanen dengan profil Anda.");
    } catch(e) {
        console.error("Error Google Sync:", e);
        alert("Gagal menautkan akun Google: " + e.message);
    }
};

window.tempIdPegawaiHapus = null;

window.hapusPegawai = async function(id) {
    const userAktif = window.currentUser || {};
    
    // Aturan Khusus: Operator/TU wajib pakai Token PIN
    if (userAktif.hakAkses === 'Operator/TU') {
        window.tempIdPegawaiHapus = id;
        window.bukaModalOtorisasiHapusPegawai();
        return;
    }

    if (confirm("Yakin ingin menghapus pegawai ini?")) {
        try { await deleteDoc(doc(db, "Pegawai", id)); } 
        catch (err) { alert("Gagal menghapus data!"); }
    }
};

window.bukaModalOtorisasiHapusPegawai = function() {
    let modal = document.getElementById('modal-otorisasi-pegawai');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'modal-otorisasi-pegawai';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 hidden';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border-t-4 border-rose-500 animate-slide-up text-center">
            <i class="fa-solid fa-lock text-5xl text-rose-500 mb-4"></i>
            <h3 class="text-xl font-black text-slate-800 mb-2">Otorisasi Dibutuhkan</h3>
            <p class="text-xs text-slate-500 mb-4">Sebagai Operator/TU, Anda memerlukan PIN otorisasi dari Kepala/Admin untuk menghapus data pegawai.</p>
            <input type="text" id="input-token-pegawai" placeholder="Masukkan 6 Digit PIN" class="w-full border-2 border-rose-200 p-3 rounded-xl font-black text-center tracking-widest text-lg focus:outline-rose-500 mb-4 bg-rose-50">
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.prosesCekTokenPegawai()" class="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl shadow-lg transition">Verifikasi & Hapus</button>
                <button type="button" onclick="window.mintaTokenPegawai(this)" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition">Minta PIN ke Kepala</button>
                <button type="button" onclick="document.getElementById('modal-otorisasi-pegawai').classList.add('hidden')" class="w-full text-slate-400 hover:text-slate-600 font-bold py-2 transition text-sm mt-2">Batal</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.mintaTokenPegawai = async function(btn) {
    const ori = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Meminta...'; btn.disabled = true;
    try {
        const tokenAcak = Math.floor(100000 + Math.random() * 900000).toString();
        await setDoc(doc(db, "SistemOtorisasi", "token_hapus"), {
            token: tokenAcak,
            updatedAt: new Date().toISOString(),
            requester: window.currentUser?.nama || 'Operator/TU',
            actionDetail: 'Penghapusan Data Pegawai',
            status: "Pending"
        });
        alert("Permintaan berhasil dikirim! Silakan minta PIN dari Kepala/Admin (dapat dilihat di Dasbor mereka).");
    } catch(e) { alert("Gagal meminta token."); }
    btn.innerHTML = ori; btn.disabled = false;
};

window.prosesCekTokenPegawai = async function() {
    let input = document.getElementById('input-token-pegawai').value.trim();
    if(!input) return alert("Masukkan PIN terlebih dahulu!");
    try {
        const snap = await getDocs(query(collection(db, "SistemOtorisasi")));
        let validToken = "";
        snap.forEach(d => { if(d.id === "token_hapus") validToken = d.data().token; });
        
        if(input === validToken && validToken !== "") {
            await setDoc(doc(db, "SistemOtorisasi", "token_hapus"), { token: "", status: "Used" });
            document.getElementById('modal-otorisasi-pegawai').classList.add('hidden');
            if(window.tempIdPegawaiHapus) {
                await deleteDoc(doc(db, "Pegawai", window.tempIdPegawaiHapus));
                alert("Otorisasi Berhasil. Data Pegawai telah dihapus!");
                window.tempIdPegawaiHapus = null;
            }
        } else {
            alert("PIN Otorisasi Salah atau Kadaluarsa!");
        }
    } catch(e) { alert("Gagal memverifikasi PIN."); }
};

// ==========================================
// MODUL ABSENSI, CUTI & KBM (SUPER CANGGIH, GPS & REAL-TIME)
// ==========================================

window.getLocalISOString = function() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

window.waktuKeMenit = function(waktuStr) {
    if (!waktuStr) return 0;
    // Otomatis ubah titik menjadi titik dua agar tidak error
    const str = waktuStr.replace('.', ':'); 
    if (!str.includes(':')) return 0;
    const [h, m] = str.split(':').map(Number);
    return (h * 60) + m;
};

// Fungsi Generate Slot Jam berdasarkan Konfigurasi Lembaga
window.generateSlotWaktu = function(lembaga) {
    let slots = [];
    try {
        let curMins = window.waktuKeMenit(lembaga.umumMasuk || "07:00");
        let durasi = Number(lembaga.umumJp || 40);
        let endMins = window.waktuKeMenit(lembaga.umumPulang || "14:00");
        let breaks = (lembaga.umumIstirahat || '').split(',').filter(x => x).map(s => {
            const [bs, be] = s.split('-'); return { start: window.waktuKeMenit(bs), end: window.waktuKeMenit(be) };
        });
        
        let jamKe = 1;
        while (curMins < endMins && jamKe <= 15) {
            let activeBreak = breaks.find(b => curMins >= b.start && curMins < b.end);
            if (activeBreak) { curMins = activeBreak.end; continue; }
            let slotEnd = curMins + durasi;
            let hitBreak = breaks.find(b => slotEnd > b.start && curMins < b.start);
            if (hitBreak) slotEnd = hitBreak.start; 
            slots.push({ jamKe: jamKe, start: curMins, end: slotEnd });
            curMins = slotEnd; if (!hitBreak) jamKe++;
        }
    } catch(e) {}
    return slots;
};

// Fungsi Kalkulasi Keterlambatan Otomatis (Semi Ketat / Super Ketat)
window.hitungKeterlambatan = function(tipe, jamTxt, lembaga) {
    if (lembaga.kedisiplinan === 'Longgar') return Number(document.getElementById('input-keterlambatan-manual')?.value || 0);
    
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const toleransi = Number(lembaga.toleransiTelat || 0);
    let targetMins = 0;

    if (tipe === '1x' || tipe === 'CICO') {
        targetMins = window.waktuKeMenit(lembaga.jamMasukKerja || '07:00');
    } else if (tipe === 'Kelas' || tipe === 'Inval') {
        const slots = window.generateSlotWaktu(lembaga);
        const firstJam = Number(jamTxt.split('-')[0].replace('Jam ','').trim());
        const slot = slots.find(s => s.jamKe === firstJam);
        if(slot) targetMins = slot.start; else return 0;
    }

    const diff = curMins - targetMins;
    if (diff > toleransi) return diff - toleransi;
    return 0;
};

// Fungsi Haversine Formula untuk Jarak GPS
window.hitungJarakGPS = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Validasi GPS untuk Super Ketat
window.validasiGPS = async function(lembaga) {
    if (lembaga.kedisiplinan !== 'Super Ketat') return true;
    if (!lembaga.gpsKantor || !lembaga.radiusGps) { alert("GPS/Radius Kantor belum diatur di menu Lembaga!"); return false; }
    
    const [latK, lonK] = lembaga.gpsKantor.split(',').map(Number);
    const radius = Number(lembaga.radiusGps);

    try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
        const dist = window.hitungJarakGPS(pos.coords.latitude, pos.coords.longitude, latK, lonK);
        if (dist > radius) {
            alert(`⚠️ AKSES DITOLAK!\n\nSistem Super Ketat mendeteksi Anda di luar area absensi.\nJarak Anda: ${Math.round(dist)} meter.\nBatas Maksimal: ${radius} meter.`);
            return false;
        }
        return true;
    } catch(e) {
        alert("Gagal membaca lokasi GPS. Pastikan Izin Lokasi diaktifkan pada browser/perangkat Anda!");
        return false;
    }
};

window.jalankanJam = function() {
    if(window.timerJam) clearInterval(window.timerJam);
    window.timerJam = setInterval(() => {
        const elJam = document.getElementById('jam-realtime');
        const elTanggal = document.getElementById('tgl-realtime');
        if(elJam && elTanggal) {
            const now = new Date();
            elJam.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
            elTanggal.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }, 1000);
};

window.gantiUIAbsen = function() {
    const seleksi = document.getElementById('pilih-jabatan-absen');
    if (!seleksi || seleksi.selectedIndex === -1) return;
    
    const tipe = seleksi.options[seleksi.selectedIndex].dataset.tipe;
    ['area-cico', 'area-1x', 'area-kelas', 'area-tanpa'].forEach(id => {
        const el = document.getElementById(id); if(el) el.classList.add('hidden');
    });

    if (tipe === 'CICO') document.getElementById('area-cico').classList.remove('hidden');
    else if (tipe === '1x') document.getElementById('area-1x').classList.remove('hidden'); 
    else if (tipe === 'Kelas') document.getElementById('area-kelas').classList.remove('hidden'); 
    else if (tipe === 'Tanpa Presensi') document.getElementById('area-tanpa').classList.remove('hidden'); 
};

window.bukaModalIzin = function() {
    let modal = document.getElementById('modal-izin');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-izin';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-orange-500 animate-slide-up">
            <h3 class="text-xl font-black text-slate-800 mb-2"><i class="fa-solid fa-person-walking-arrow-right text-orange-500 mr-2"></i> Izin Tinggalkan Lokasi</h3>
            <p class="text-xs text-slate-500 mb-4 border-b pb-3">Notifikasi akan dikirimkan ke dashboard Kepala.</p>
            <form onsubmit="window.simpanIzin(event)">
                <label class="text-sm font-bold text-slate-700 block mb-1">Alasan Keluar (Wajib):</label>
                <textarea id="izin-alasan" required rows="3" class="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-orange-500 mb-4 bg-slate-50"></textarea>
                <div class="flex gap-2">
                    <button type="button" onclick="document.getElementById('modal-izin').classList.add('hidden')" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition">Batal</button>
                    <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl shadow-lg transition">Kirim Izin</button>
                </div>
            </form>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanIzin = async function(e) {
    e.preventDefault();
    try {
        await addDoc(collection(db, "Cuti"), { pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Izin Keluar Lokasi", alasan: document.getElementById('izin-alasan').value, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString() });
        alert("Izin diajukan!"); document.getElementById('modal-izin').classList.add('hidden');
    } catch(err) { alert("Gagal!"); }
};

window.bukaModalSusulan = function() {
    let modal = document.getElementById('modal-susulan');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-susulan';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-blue-500 animate-slide-up">
            <h3 class="text-xl font-black text-slate-800 mb-2"><i class="fa-solid fa-clock-rotate-left text-blue-500 mr-2"></i> Presensi Susulan</h3>
            <form onsubmit="window.simpanSusulan(event)">
                <label class="text-sm font-bold text-slate-700 block mb-1">Tanggal, Jam & Alasan:</label>
                <textarea id="susulan-alasan" required rows="3" class="w-full border-2 border-slate-200 rounded-xl p-3 focus:outline-blue-500 mb-4 bg-slate-50"></textarea>
                <div class="flex gap-2">
                    <button type="button" onclick="document.getElementById('modal-susulan').classList.add('hidden')" class="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl">Batal</button>
                    <button type="submit" class="flex-1 bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg">Kirim Susulan</button>
                </div>
            </form>
        </div>`;
    modal.classList.remove('hidden');
};

window.simpanSusulan = async function(e) {
    e.preventDefault();
    try {
        await addDoc(collection(db, "Cuti"), { pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Presensi Susulan", alasan: document.getElementById('susulan-alasan').value, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString() });
        alert("Susulan diajukan!"); document.getElementById('modal-susulan').classList.add('hidden');
    } catch(err) { alert("Gagal!"); }
};

window.ajukanCuti = async function(event) {
    event.preventDefault();
    const tglMulai = document.getElementById('cuti-mulai').value;
    const tglSampai = document.getElementById('cuti-sampai').value;
    const alasan = document.getElementById('cuti-alasan').value;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...'; btn.disabled = true;

    try {
        await addDoc(collection(db, "Cuti"), {
            pengajuId: window.currentUser.id, pengaju: window.currentUser.nama, jenis: "Cuti / Izin Harian", alasan: alasan, 
            tanggalMulai: tglMulai, tanggalSampai: tglSampai, tanggal: window.getLocalISOString(), status: "Pending", createdAt: new Date().toISOString()
        });
        alert("Cuti/izin berhasil diajukan!"); event.target.reset(); document.getElementById('form-cuti-container').classList.add('hidden');
    } catch(e) { alert("Gagal."); } finally { btn.innerHTML = oriText; btn.disabled = false; }
};

// ================= FUNGSI SIMPAN NON-KELAS (CICO / 1X) =================
window.simpanAbsenLain = async function(event, tipe, status) {
    const btn = event.currentTarget; const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-3xl mb-3 block"></i><span class="text-xl">MEREKAM...</span>'; btn.disabled = true;

    const lembaga = window.appState.lembaga[0] || {};
    const gpsValid = await window.validasiGPS(lembaga);
    if (!gpsValid) { btn.innerHTML = oriHTML; btn.disabled = false; return; }

    const now = new Date(); const dateStr = window.getLocalISOString(); 
    const curMins = window.waktuKeMenit(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }));
    const sessionUser = window.currentUser;
    const jabatanSel = document.getElementById('pilih-jabatan-absen');
    const jabStr = jabatanSel ? jabatanSel.value : 'Pegawai';
    const detailPegawai = window.appState.pegawai.find(p => p.id === sessionUser.id) || {};
    
    // PERBAIKAN: Gunakan jamPulangKerja, bukan umumPulang
    if (tipe === '1x' && lembaga.kedisiplinan !== 'Longgar') {
        const jamPulangMins = window.waktuKeMenit(lembaga.jamPulangKerja || "15:00");
        if (curMins > jamPulangMins) {
            alert(`⚠️ GAGAL PRESENSI!\n\nSaat ini sudah lewat Jam Pulang Kerja Pegawai (${lembaga.jamPulangKerja}). Anda tidak bisa lagi melakukan presensi harian.`);
            btn.innerHTML = oriHTML; btn.disabled = false; return;
        }
    }

    try {
        const qCek = query(collection(db, "Absensi"), where("idGuru", "==", sessionUser.id), where("tanggal", "==", dateStr));
        const snapCek = await getDocs(qCek); let myTodayAbs = []; snapCek.forEach(d => myTodayAbs.push(d.data()));

        if (tipe === '1x') {
            if (myTodayAbs.some(x => x.tipe === '1x' && x.jabatan === jabStr)) {
                alert("Anda sudah merekam kehadiran harian untuk jabatan ini hari ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return;
            }
            const telatMins = window.hitungKeterlambatan('1x', null, lembaga);
            let msg = `Presensi harian berhasil direkam!`;
            if (telatMins > 0) msg = `Terdeteksi Keterlambatan: ${telatMins} Menit.\n\nPresensi tetap berhasil direkam!`;
            
            await addDoc(collection(db, "Absensi"), {
                idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                tipe: '1x', status: 'Hadir Harian', kelas: '-', mapel: '-', jamTxt: '-', 
                keterangan: telatMins > 0 ? `Terlambat ${telatMins} Menit` : 'Tepat Waktu', 
                jabatan: jabStr, terlambat: telatMins, createdAt: new Date().toISOString()
            });
            alert(msg); window.navigate('absensi'); return;
        }

        let arrJabatan = jabStr.split(',').map(s => s.trim());
        for (let idx=0; idx < arrJabatan.length; idx++) {
            let jabatan = arrJabatan[idx];
            let telatMins = 0; let activeSesiStr = '';

            let jabConfig = (detailPegawai.detailJabatan || []).find(d => d.namaJabatan === jabatan);
            if(!jabConfig || !jabConfig.cicoOpts) { alert(`Waktu sesi CICO belum diatur untuk jabatan ${jabatan}! Hubungi Admin.`); btn.innerHTML = oriHTML; btn.disabled = false; return; }
            
            let sesiCICO = jabConfig.cicoOpts.split(',').map(s => {
                let p = s.split('-'); return { str: s.trim(), startMins: window.waktuKeMenit(p[0]), endMins: window.waktuKeMenit(p[1]) };
            }).filter(s => s.startMins > 0);

            if (sesiCICO.length === 0) { alert(`Format sesi CICO salah untuk ${jabatan}!`); btn.innerHTML = oriHTML; btn.disabled = false; return; }

            // PERBAIKAN: Cari Sesi Aktif dengan Batasan Bawah (Maks 60 menit sebelum sesi dimulai)
            const toleransiLimit = Number(lembaga.toleransiTelat || 0);
            let activeSesi = null;
            for (let i = 0; i < sesiCICO.length; i++) {
                // Sesi valid HANYA jika waktu sekarang >= (jam mulai - toleransi) DAN waktu sekarang <= (jam akhir + 30 menit)
                if (curMins >= (sesiCICO[i].startMins - toleransiLimit) && curMins <= (sesiCICO[i].endMins + 30)) { 
                    activeSesi = sesiCICO[i]; break; 
                }
            }

            if (!activeSesi) { 
                alert(`⚠️ GAGAL PRESENSI CICO!\n\nAnda melakukan absen di luar rentang waktu sesi yang berlaku untuk jabatan ${jabatan}.\n(Anda hanya bisa absen paling cepat ${toleransiLimit} menit sebelum sesi dimulai).`); 
                btn.innerHTML = oriHTML; btn.disabled = false; return; 
            }
            activeSesiStr = activeSesi.str;

            let myCicoSesiIni = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.jamTxt === activeSesiStr);
            let isCekInSesiIni = myCicoSesiIni.some(x => x.status === 'Cek In');
            let isCekOutSesiIni = myCicoSesiIni.some(x => x.status === 'Cek Out');

            if (status === 'Cek In') {
                let myAllIn = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.status === 'Cek In').length;
                let myAllOut = myTodayAbs.filter(x => x.tipe === 'CICO' && x.jabatan === jabatan && x.status === 'Cek Out').length;
                
                if (myAllIn > myAllOut) { alert("⚠️ GAGAL CEK IN!\nAnda belum melakukan Cek Out pada sesi CICO sebelumnya!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                if (isCekInSesiIni) { alert("Anda sudah melakukan Cek In untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                
                if(lembaga.kedisiplinan !== 'Longgar') {
                    telatMins = curMins - activeSesi.startMins;
                    if(telatMins > (lembaga.toleransiTelat||0)) telatMins -= (lembaga.toleransiTelat||0); else telatMins = 0;
                } else { telatMins = Number(document.getElementById('input-keterlambatan-manual')?.value || 0); }
            } 
            else if (status === 'Cek Out') {
                if (!isCekInSesiIni) { alert("Harap Cek In terlebih dahulu untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                if (isCekOutSesiIni) { alert("Anda sudah Cek Out untuk sesi ini!"); btn.innerHTML = oriHTML; btn.disabled = false; return; }
                
                let cinData = myCicoSesiIni.find(x => x.status === 'Cek In');
                let durasi = curMins - window.waktuKeMenit(cinData.waktu);
                alert(`Sesi ${activeSesiStr} Selesai!\nTotal Kehadiran: ${Math.floor(durasi/60)} Jam ${durasi%60} Menit.`);
            }

            await addDoc(collection(db, "Absensi"), {
                idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                tipe: tipe, status: status, kelas: '-', mapel: '-', jamTxt: activeSesiStr, 
                keterangan: telatMins > 0 ? `Terlambat ${telatMins} Menit` : 'Tepat Waktu', 
                jabatan: jabatan, terlambat: telatMins, createdAt: new Date().toISOString()
            });
        }
        
        window.navigate('absensi'); 
    } catch(e) { alert("Gagal merekam presensi."); btn.innerHTML = oriHTML; btn.disabled = false; }
};

window.simpanPresensiKelas = async function(event, mode) {
    event.preventDefault();
    const isReguler = mode === 'Reguler';
    const selectId = isReguler ? 'presensi-kelas-select' : 'presensi-inval-select';
    const inputKetId = isReguler ? 'presensi-keterangan' : 'presensi-inval-keterangan';
    
    const select = document.getElementById(selectId);
    if(!select || !select.value) return alert("Pilih jadwal kelas pada dropdown terlebih dahulu!");
    
    const lembaga = window.appState.lembaga[0] || {};
    const now = new Date(); 
    const curMins = window.waktuKeMenit(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }));
    let jamPulangMins = window.waktuKeMenit(lembaga.umumPulang || "15:00");
    if (curMins > jamPulangMins && lembaga.kedisiplinan !== 'Longgar') {
        return alert(`⚠️ GAGAL PRESENSI KELAS!\n\nSaat ini sudah lewat Jam Pulang Lembaga (${lembaga.umumPulang}). Sesi kehadiran sudah ditutup.`);
    }

    const gpsValid = await window.validasiGPS(lembaga);
    if (!gpsValid) return;

    const btn = event.target.querySelector('button[type="submit"]');
    const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true;

    // Memecah value dropdown yang telah disesuaikan
    const valSplits = select.value.split('|');
    const idJadwal = valSplits[0];
    const kelas = valSplits[1];
    const mapel = valSplits[2];
    const jamTxt = valSplits[3];
    const idGuruAsli = valSplits[4] || '';
    const namaGuruAsli = valSplits[5] || '';
    
    let keterangan = document.getElementById(inputKetId).value || '';
    const dateStr = window.getLocalISOString();
    const sessionUser = window.currentUser;

    try {
        const { getDocs, query, collection, where, addDoc, doc, updateDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        // Cek apakah kelas di jam ini SUDAH DIISI absensinya oleh siapapun
        const qCek = query(collection(db, "Absensi"), where("tanggal", "==", dateStr), where("kelas", "==", kelas), where("jamTxt", "==", jamTxt));
        const snapCek = await getDocs(qCek);
        let sudahDiisi = false;
        snapCek.forEach(d => {
            let t = d.data().tipe;
            if(t === 'Kelas' || t === 'Inval') sudahDiisi = true;
        });
        if (sudahDiisi) {
            alert("⚠️ KELAS SUDAH TERISI!\nSesi kelas ini sudah direkam presensinya oleh guru asli atau guru pengganti lain.");
            btn.innerHTML = oriHTML; btn.disabled = false; return;
        }

        const telatMins = window.hitungKeterlambatan(mode === 'Reguler' ? 'Kelas' : 'Inval', jamTxt, lembaga);
        if (telatMins > 0) {
            keterangan = `(Telat ${telatMins}M) ` + keterangan;
        }

        if (mode === 'Inval') {
            // Cek apakah sudah ada pengajuan pending
            const qPending = query(collection(db, "PengajuanInval"), where("tanggal", "==", dateStr), where("kelas", "==", kelas), where("jamTxt", "==", jamTxt), where("status", "==", "Pending"));
            const snapPending = await getDocs(qPending);
            if (!snapPending.empty) {
                alert("Pengajuan inval untuk sesi kelas ini sudah dikirim dan sedang menunggu persetujuan.");
                btn.innerHTML = oriHTML; btn.disabled = false; return;
            }

            await addDoc(collection(db, "PengajuanInval"), {
                pengajuId: sessionUser.id, pengajuNama: sessionUser.nama,
                idGuruAsli: idGuruAsli, namaGuruAsli: namaGuruAsli,
                kelas: kelas, mapel: mapel, jamTxt: jamTxt, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                keterangan: keterangan, terlambat: telatMins, status: "Pending", createdAt: now.toISOString()
            });
            
            alert("Pengajuan Inval berhasil dikirim!\nSilakan tunggu persetujuan dari Guru Asli, Operator/TU, atau Administrator. Jika sudah disetujui, Anda dapat mengisi Absen Siswa melalui Tabel Histori di bawah.");
            window.navigate('absensi');
        } else {
            if (telatMins > 0) alert(`Terdeteksi Keterlambatan: ${telatMins} Menit!\n\nSistem akan melanjutkan ke form absen siswa.`);
            await addDoc(collection(db, "Absensi"), {
                idGuru: sessionUser.id, namaGuru: sessionUser.nama, tanggal: dateStr,
                waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                tipe: 'Kelas', status: 'Reguler', kelas: kelas, mapel: mapel, jamTxt: jamTxt, 
                keterangan: keterangan, terlambat: telatMins, jabatan: `Guru (${kelas})`, createdAt: now.toISOString()
            });
            window.bukaModalAbsenSiswa(kelas, mapel, jamTxt, dateStr);
        }
    } catch(e) { 
        alert("Gagal memproses presensi."); 
    } finally { 
        btn.innerHTML = oriHTML; btn.disabled = false; 
    }
};

// Fungsi Eksekusi Persetujuan Inval
window.setujuiInval = async function(idInval) {
    if(!confirm("Setujui pengajuan inval ini? Guru pengganti akan otomatis terekam hadir.")) return;
    try {
        const { doc, getDoc, updateDoc, collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const snap = await getDoc(doc(db, "PengajuanInval", idInval));
        if(!snap.exists()) return;
        const data = snap.data();
        
        await addDoc(collection(db, "Absensi"), {
            idGuru: data.pengajuId, namaGuru: data.pengajuNama, tanggal: data.tanggal,
            waktu: data.waktu, tipe: 'Inval', status: 'Inval',
            kelas: data.kelas, mapel: data.mapel, jamTxt: data.jamTxt,
            keterangan: data.keterangan || 'Inval Disetujui', terlambat: data.terlambat || 0,
            jabatan: `Guru (${data.kelas})`, createdAt: new Date().toISOString()
        });
        
        await updateDoc(doc(db, "PengajuanInval", idInval), { status: "Disetujui", approvedBy: window.currentUser.nama });
        alert("Inval disetujui! Guru pengganti sekarang bisa mengisi absen siswa di menu Histori.");
        window.navigate('absensi');
    } catch(e) { alert("Gagal menyetujui."); }
};

window.tolakInval = async function(idInval) {
    if(!confirm("Tolak pengajuan inval ini?")) return;
    try {
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        await updateDoc(doc(db, "PengajuanInval", idInval), { status: "Ditolak", rejectedBy: window.currentUser.nama });
        window.navigate('absensi');
    } catch(e) { alert("Gagal menolak."); }
};

// ================= GABUNG JADWAL =================
function mergeJadwal(jadwalArray) {
    if(jadwalArray.length === 0) return [];
    let merged = [];
    let current = { ...jadwalArray[0], jamMulai: jadwalArray[0].jamKe, jamSelesai: jadwalArray[0].jamKe };
    for(let i = 1; i < jadwalArray.length; i++) {
        let next = jadwalArray[i];
        if(next.kelas === current.kelas && next.mapel === current.mapel && next.idGuru === current.idGuru && next.jamKe === current.jamSelesai + 1) {
            current.jamSelesai = next.jamKe;
        } else {
            merged.push(current);
            current = { ...next, jamMulai: next.jamKe, jamSelesai: next.jamKe };
        }
    }
    merged.push(current);
    return merged;
}

// ================= MODAL ARSIP PRESENSI (TU/ADMIN) =================
window.bukaModalArsip = async function() {
    const btn = document.getElementById('btn-buka-arsip');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat...'; btn.disabled = true; }
    try {
        const snapAbsen = await getDocs(collection(db, "Absensi"));
        let allAbsen = []; snapAbsen.forEach(d => allAbsen.push({id: d.id, ...d.data()}));
        window.rawAllAbsensi = allAbsen.sort((a, b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));

        let modal = document.getElementById('modal-arsip');
        if (!modal) {
            modal = document.createElement('div'); modal.id = 'modal-arsip'; modal.className = 'fixed inset-0 bg-slate-900/90 z-[110] flex items-center justify-center p-4 hidden'; document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] animate-slide-up">
                <div class="p-6 border-b flex justify-between items-center bg-indigo-600 text-white rounded-t-2xl">
                    <div><h3 class="text-2xl font-black"><i class="fa-solid fa-box-archive mr-2"></i> Arsip Presensi</h3><p class="text-sm font-medium text-indigo-200 mt-1">Gunakan filter pada header tabel untuk mencari data spesifik.</p></div>
                    <button onclick="document.getElementById('modal-arsip').classList.add('hidden')" class="text-white hover:text-red-300 text-3xl font-bold transition"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="p-6 flex-1 overflow-hidden flex flex-col bg-slate-50">
                    <div class="overflow-x-auto flex-1 border border-slate-300 rounded-xl shadow-sm bg-white custom-scrollbar">
                        <table class="w-full text-left text-sm" id="table-arsip">
                            <thead class="bg-slate-100 text-slate-700 border-b-2 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="p-3 w-10 text-center">No</th>
                                    <th class="p-3"><input type="text" placeholder="Filter Tgl..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="tanggal"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Nama..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="namaGuru"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Jabatan..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="jabatan"></th>
                                    <th class="p-3"><input type="text" placeholder="Filter Status/Jam..." class="w-full border p-1 rounded text-xs filter-arsip" data-col="status"></th>
                                </tr>
                            </thead>
                            <tbody id="tbody-arsip"></tbody>
                        </table>
                    </div>
                </div>
                <div class="p-6 border-t bg-white rounded-b-2xl flex justify-between items-center">
                    <span class="text-sm font-bold text-slate-500" id="info-arsip-count">Total: ${allAbsen.length} Data</span>
                    <button onclick="window.prosesArsipkanData()" class="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-3 rounded-xl shadow-lg transition"><i class="fa-solid fa-trash-can-arrow-up mr-2"></i> Ekspor CSV & Bersihkan DB</button>
                </div>
            </div>`;
        modal.classList.remove('hidden'); window.renderTabelArsip(window.rawAllAbsensi);

        document.querySelectorAll('.filter-arsip').forEach(inp => {
            inp.addEventListener('keyup', function() {
                const term = this.value.toLowerCase(); const col = this.dataset.col;
                const filtered = window.rawAllAbsensi.filter(x => String(x[col] || '').toLowerCase().includes(term));
                window.renderTabelArsip(filtered);
            });
        });
    } catch(e) { alert("Gagal memuat arsip."); } 
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-box-archive mr-2"></i> Arsip Presensi'; btn.disabled = false; }
};

window.renderTabelArsip = function(dataArray) {
    const tbody = document.getElementById('tbody-arsip'); if(!tbody) return;
    document.getElementById('info-arsip-count').innerText = `Menampilkan: ${dataArray.length} Data`;
    tbody.innerHTML = dataArray.map((x, i) => `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 text-center">${i+1}</td><td class="p-3 font-bold">${x.tanggal}</td><td class="p-3 font-black text-indigo-700">${x.namaGuru}</td><td class="p-3">${x.jabatan} <span class="text-[10px] bg-slate-200 px-1 rounded ml-1">${x.tipe}</span></td><td class="p-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">${x.status} (${x.waktu}) ${x.jamTxt !== '-' ? x.jamTxt : ''}</span></td></tr>`).join('') || `<tr><td colspan="5" class="p-6 text-center text-slate-400">Data tidak ditemukan.</td></tr>`;
};

window.prosesArsipkanData = async function() {
    if(!confirm("PERINGATAN!\nTindakan ini akan:\n1. Mengunduh data ke .CSV\n2. MENGHAPUS SEMUA DATA PRESENSI PERMANEN dari database.\n\nLanjutkan?")) return;
    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Nama Pegawai,Jabatan,Tipe,Status,Waktu,Sesi/Jam,Keterangan\n";
    window.rawAllAbsensi.forEach(r => { csvContent += `"${r.tanggal}","${r.namaGuru}","${r.jabatan}","${r.tipe}","${r.status}","${r.waktu}","${r.jamTxt}","${r.keterangan || '-'}"\r\n`; });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Arsip_Absensi_${window.getLocalISOString()}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    try {
        const snap = await getDocs(collection(db, "Absensi"));
        snap.forEach(d => deleteDoc(doc(db, "Absensi", d.id))); 
        alert("Pembersihan database selesai!"); document.getElementById('modal-arsip').classList.add('hidden'); window.navigate('absensi');
    } catch(e) { alert("Gagal membersihkan database."); }
};

// ================= RE-RENDER TABEL HISTORI SAJA (FILTER) =================
window.filterTabelHistori = function() {
    const tglMulai = document.getElementById('filter-hist-start').value;
    const tglSampai = document.getElementById('filter-hist-end').value;
    const bodyTabel = document.getElementById('tbody-histori');
    
    if(!tglMulai || !tglSampai) return alert("Pilih tanggal rentang awal dan akhir!");

    let filtered = window.rawHistoriSaya.filter(h => h.tanggal >= tglMulai && h.tanggal <= tglSampai);
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    let displayRows = [];
    let processedCICO = new Set();

    filtered.forEach(h => {
        if (h.tipe === 'CICO') {
            const key = `${h.tanggal}_${h.jabatan}`;
            if (processedCICO.has(key)) return;
            processedCICO.add(key);
            
            const cicos = filtered.filter(x => x.tipe === 'CICO' && x.tanggal === h.tanggal && x.jabatan === h.jabatan);
            const cin = cicos.find(x => x.status === 'Cek In');
            const cout = cicos.find(x => x.status === 'Cek Out');
            
            displayRows.push({
                tanggal: h.tanggal, jabatan: h.jabatan || 'Pegawai',
                waktu: `<span class="text-emerald-600 font-bold block mb-1">IN: <span class="text-slate-700">${cin ? cin.waktu : '-'}</span></span> <span class="text-rose-600 font-bold block">OUT: <span class="text-slate-700">${cout ? cout.waktu : '-'}</span></span>`,
                keterangan: `<span class="italic text-slate-400">${cin?.keterangan || 'Tidak ada catatan'}</span>`
            });
        } else if (h.tipe === '1x' || h.tipe === 'Rapat') {
            let badgeTipe = h.tipe === 'Rapat' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
            displayRows.push({
                tanggal: h.tanggal, jabatan: h.jabatan || 'Pegawai',
                waktu: `<span class="${badgeTipe} px-2 py-1 rounded font-black whitespace-nowrap">Pkl ${h.waktu}</span>`,
                keterangan: `<span class="italic text-slate-400">${h.keterangan || 'Hadir'}</span> <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded ml-1 font-bold">${h.tipe}</span>`
            });
        } else if (h.tipe === 'Pending Inval') {
            displayRows.push({
                tanggal: h.tanggal,
                jabatan: `<span class="font-bold text-slate-800">Guru (${h.kelas})</span> <span class="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded ml-1 uppercase font-black" title="Menunggu Persetujuan">PENDING INVAL</span>`,
                waktu: `<span class="font-bold text-slate-700 whitespace-nowrap">Pkl ${h.waktu}</span> <br> <span class="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1 rounded mt-1 inline-block">${h.jamTxt}</span>`,
                keterangan: `<span class="font-black text-slate-700 block mb-0.5">${h.mapel}</span> <span class="text-xs text-amber-500 font-bold italic block mb-1"><i class="fa-solid fa-hourglass-half mr-1"></i> Menunggu Persetujuan dari ${h.namaGuruAsli || 'Guru Asli'}...</span>`
            });
        } else if (h.tipe === 'Kelas' || h.tipe === 'Inval') {
            const as = window.rawHistoriSiswa.find(s => s.tanggal === h.tanggal && s.kelas === h.kelas && s.jamTxt === h.jamTxt);
            let jmlHadirText = `<button type="button" onclick="window.bukaModalAbsenSiswa('${h.kelas}', '${h.mapel}', '${h.jamTxt}', '${h.tanggal}')" class="mt-1 text-white font-bold bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded shadow-sm transition text-[10px] cursor-pointer"><i class="fa-solid fa-hand-pointer mr-1"></i> Klik Absen Siswa</button>`;
            if (as && as.detailSiswa) {
                const jmlHadir = as.detailSiswa.filter(ds => ds.status === 'Hadir').length;
                jmlHadirText = `<button type="button" onclick="window.bukaModalAbsenSiswa('${h.kelas}', '${h.mapel}', '${h.jamTxt}', '${h.tanggal}')" class="mt-1 text-emerald-700 font-black bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded shadow-sm transition cursor-pointer" title="Klik untuk edit"><i class="fa-solid fa-pen-to-square mr-1"></i> ${jmlHadir} Anak Hadir</button>`;
            }
            
            displayRows.push({
                tanggal: h.tanggal,
                jabatan: `<span class="font-bold text-slate-800">Guru (${h.kelas})</span> ${h.status==='Inval'?'<span class="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded ml-1 uppercase font-black">INVAL</span>':''}`,
                waktu: `<span class="font-bold text-slate-700 whitespace-nowrap">Pkl ${h.waktu}</span> <br> <span class="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-1 rounded mt-1 inline-block">${h.jamTxt}</span>`,
                keterangan: `<span class="font-black text-slate-700 block mb-0.5">${h.mapel}</span> <span class="text-xs text-slate-500 italic block mb-1">${h.keterangan || '-'}</span> ${jmlHadirText}`
            });
        }
    });

    bodyTabel.innerHTML = displayRows.map((r, idx) => `
        <tr class="border-b hover:bg-slate-50 text-sm transition">
            <td class="p-3 text-center font-medium">${idx + 1}</td>
            <td class="p-3 font-bold text-slate-700 whitespace-nowrap">${r.tanggal}</td>
            <td class="p-3 leading-tight">${r.jabatan}</td>
            <td class="p-3 leading-tight">${r.waktu}</td>
            <td class="p-3 leading-tight">${r.keterangan}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="p-6 text-center text-slate-400 font-medium">Tidak ada histori di rentang tanggal tersebut.</td></tr>';
};

// ================= RENDER UTAMA ABSENSI =================
export async function renderHalamanAbsensi(container) {
    if(typeof window.tampilkanPopupTrial === 'function') window.tampilkanPopupTrial();

    container.innerHTML = `<div class="text-center p-20"><i class="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-500 mb-4"></i><p class="font-bold text-slate-500 text-lg">Mensinkronisasi Sistem Presensi Real-Time...</p></div>`;

    const lembaga = window.appState.lembaga[0] || {};
    const sessionUser = window.currentUser || {};
    const detailJabs = (window.appState.pegawai.find(p => p.id === sessionUser.id) || sessionUser).detailJabatan || [];
    
    // --- CEK LISENSI MODULAR & HAK AKSES ---
    const hasPresensiPlus = window.cekLisensi('presensi_plus');
    const isSA_Admin = ['Super Admin', 'Administrator'].includes(sessionUser.hakAkses);
    const isOpTU = sessionUser.hakAkses === 'Operator/TU';
    
    const jabatan1x = detailJabs.filter(d => d.tipePresensi === '1x');
    const jabatanLain = detailJabs.filter(d => d.tipePresensi !== '1x');
    let opsiJabatanArray = [];
    if (jabatan1x.length > 0) {
        const listNama = jabatan1x.map(d => d.namaJabatan).join(', ');
        opsiJabatanArray.push(`<option value="${listNama}" data-tipe="1x">📌 Hadir Harian (${listNama})</option>`);
    }
    jabatanLain.forEach(d => {
        opsiJabatanArray.push(`<option value="${d.namaJabatan}" data-tipe="${d.tipePresensi}">📌 ${d.namaJabatan} (${d.tipePresensi})</option>`);
    });
    const opsiJabatan = opsiJabatanArray.join('');

    const hariKerja = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const hariIniStr = hariKerja[now.getDay()];
    const todayISO = window.getLocalISOString();

    const liburConfig = lembaga.libur || 'Hanya Ahad';
    let liburIndices = [];
    if(liburConfig.toLowerCase().includes('ahad')) liburIndices.push(0);
    if(liburConfig.toLowerCase().includes('jumat') || liburConfig.toLowerCase().includes("jum'at")) liburIndices.push(5);
    if(liburConfig.toLowerCase().includes('sabtu')) liburIndices.push(6);
    if(liburIndices.length === 0) liburIndices.push(0);

    let isLiburPekanan = liburIndices.includes(now.getDay());
    let isTanggalMerah = false;
    let namaLibur = '';
    
    if (hasPresensiPlus) {
        (window.appState.kalender || []).forEach(agenda => {
            if(agenda.tipeAgenda === 'Libur') {
                const start = new Date(agenda.tanggalMulai); start.setHours(0,0,0,0);
                const end = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(start); end.setHours(23,59,59,999);
                if(now >= start && now <= end) { isTanggalMerah = true; namaLibur = agenda.judulAgenda; }
            }
        });
    }

    let liburMessage = '';
    if(isTanggalMerah) liburMessage = `Sistem presensi ditutup karena bertepatan dengan tanggal merah: ${namaLibur}`;
    else if(isLiburPekanan) liburMessage = `Sistem presensi ditutup karena bertepatan dengan hari libur pekanan lembaga.`;

    let todayAbsensi = []; window.rawHistoriSaya = []; window.rawHistoriSiswa = [];
    let activeRapatList = []; 
    let pendingInvalList = [];

    try {
        const { db } = await import('./firebase-init.js');
        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        const snapToday = await getDocs(query(collection(db, "Absensi"), where("tanggal", "==", todayISO)));
        snapToday.forEach(doc => { const d = doc.data(); todayAbsensi.push({id: doc.id, ...d}); if(d.idGuru === sessionUser.id) window.rawHistoriSaya.push({id: doc.id, ...d}); });

        const snapHist = await getDocs(query(collection(db, "Absensi"), where("idGuru", "==", sessionUser.id)));
        snapHist.forEach(doc => { const d = doc.data(); if(d.tanggal !== todayISO) window.rawHistoriSaya.push({id: doc.id, ...d}); });

        const snapSiswa = await getDocs(query(collection(db, "AbsensiSiswa"), where("idGuru", "==", sessionUser.id)));
        snapSiswa.forEach(doc => window.rawHistoriSiswa.push(doc.data()));

        if (hasPresensiPlus) {
            const snapRapat = await getDocs(query(collection(db, "Rapat"), where("status", "==", "Aktif")));
            snapRapat.forEach(doc => activeRapatList.push({ id: doc.id, ...doc.data() }));

            // TAMPILKAN PENGAJUAN INVAL JIKA USER ADALAH ADMIN/TU ATAU GURU ASLI, DAN TAMBAHKAN KE HISTORI PENGAJU
            const snapInval = await getDocs(query(collection(db, "PengajuanInval"), where("status", "==", "Pending")));
            snapInval.forEach(doc => {
                const d = doc.data();
                if (d.tanggal === todayISO && (isSA_Admin || isOpTU || d.idGuruAsli === sessionUser.id)) {
                    pendingInvalList.push({ id: doc.id, ...d });
                }
                if (d.pengajuId === sessionUser.id) {
                    window.rawHistoriSaya.push({ id: doc.id, tipe: 'Pending Inval', ...d });
                }
            });
        }
    } catch(e) { console.error("Gagal sinkron absen", e); }

    const isKelasTerisi = (kelas, mapel, jamTxt) => todayAbsensi.some(a => (a.tipe === "Kelas" || a.tipe === "Inval") && a.kelas === kelas && a.jamTxt === jamTxt);

    const toleransi = Number(lembaga.toleransiTelat || 0);
    const slots = window.generateSlotWaktu(lembaga);
    const isValidTime = (jamMulai, jamSelesai) => {
        if (lembaga.kedisiplinan === 'Longgar') return true;
        const slotMulai = slots.find(s => s.jamKe === jamMulai);
        const slotSelesai = slots.find(s => s.jamKe === jamSelesai);
        if (!slotMulai || !slotSelesai) return false;
        return curMins >= (slotMulai.start - toleransi) && curMins <= (slotSelesai.end + toleransi + 30);
    };

    let jadwalRaw = (window.appState.jadwal || []).filter(j => j.idGuru === sessionUser.id && j.hari === hariIniStr).sort((a,b) => a.jamKe - b.jamKe);
    let dropdownHTML = mergeJadwal(jadwalRaw).filter(j => !isKelasTerisi(j.kelas, j.mapel, `${j.jamMulai}-${j.jamSelesai}`) && isValidTime(j.jamMulai, j.jamSelesai)).map(j => {
        let jamTxt = j.jamMulai === j.jamSelesai ? `Jam ${j.jamMulai}` : `Jam ${j.jamMulai}-${j.jamSelesai}`;
        return `<option value="${j.id}|${j.kelas}|${j.mapel}|${jamTxt}">${jamTxt} - ${j.kelas} (${j.mapel})</option>`;
    }).join('');
    if(!dropdownHTML) dropdownHTML = '<option value="">(Belum ada jadwal yang sesuai jam / Kosong)</option>';

    let jadwalLainRaw = (window.appState.jadwal || []).filter(j => j.idGuru !== sessionUser.id && j.hari === hariIniStr).sort((a,b) => a.jamKe - b.jamKe);
    let dropdownInvalHTML = mergeJadwal(jadwalLainRaw).filter(j => !isKelasTerisi(j.kelas, j.mapel, `${j.jamMulai}-${j.jamSelesai}`) && isValidTime(j.jamMulai, j.jamSelesai)).map(j => {
        let jamTxt = j.jamMulai === j.jamSelesai ? `Jam ${j.jamMulai}` : `Jam ${j.jamMulai}-${j.jamSelesai}`;
        return `<option value="${j.id}|${j.kelas}|${j.mapel}|${jamTxt}|${j.idGuru}|${j.namaGuru}">${jamTxt}: ${j.kelas} (${j.mapel}) - Milik ${j.namaGuru}</option>`;
    }).join('');
    if(!dropdownInvalHTML) dropdownInvalHTML = '<option value="">(Tidak ada kelas kosong di jam ini)</option>';

    let rapatHTML = '';
    let btnBukaRapat = '';

    if (hasPresensiPlus) {
        if (activeRapatList.length > 0) {
            rapatHTML = activeRapatList.map(r => {
                const formatterRp = new Intl.NumberFormat('id-ID');
                const isAdminAtauKepala = isSA_Admin || isOpTU || (sessionUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala'));

                let isMulai = true; let jadwalText = '';
                if (r.tanggalMulai && r.waktuMulai) {
                    const jadwalDate = new Date(`${r.tanggalMulai}T${r.waktuMulai}:00`);
                    isMulai = now >= jadwalDate;
                    jadwalText = `${r.tanggalMulai.split('-').reverse().join('/')} pkl ${r.waktuMulai}`;
                } else { jadwalText = `Dibuka spontan: ${r.waktuBuka}`; }

                let btnEdit = isAdminAtauKepala ? `<button onclick="window.editModalRapat('${r.id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3.5 rounded-xl font-bold shadow-lg transition flex items-center justify-center md:mr-2 w-full md:w-auto mt-2 md:mt-0" title="Revisi Jadwal"><i class="fa-solid fa-pen-to-square"></i></button>` : '';
                let btnTutup = isAdminAtauKepala ? `<button onclick="window.tutupRapat('${r.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-3.5 rounded-xl font-bold shadow-lg transition flex items-center justify-center w-full md:w-auto mt-2 md:mt-0" title="Tutup Sesi Rapat"><i class="fa-solid fa-power-off"></i></button>` : '';

                if (r.peserta && Array.isArray(r.peserta) && !r.peserta.includes(sessionUser.id)) {
                    if (isAdminAtauKepala) {
                        return `
                        <div class="bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl p-6 shadow-xl mb-6 text-white flex flex-col md:flex-row justify-between items-center border border-slate-500 relative overflow-hidden">
                            <div class="relative z-10 w-full md:w-auto text-center md:text-left mb-4 md:mb-0">
                                <span class="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm"><i class="fa-solid fa-eye mr-1"></i> Mode Pemantauan (Bukan Peserta)</span>
                                <h3 class="text-2xl font-black tracking-tight mb-1">${r.judul}</h3>
                                <p class="text-slate-300 text-xs font-medium mb-1">${r.deskripsi || 'Tidak ada deskripsi'}</p>
                                <p class="text-slate-300 text-xs font-medium">Peserta: ${r.peserta.length} Org | Honor: Rp ${formatterRp.format(r.nominalHonor || 0)} | <i class="fa-regular fa-clock"></i> Jadwal: ${jadwalText}</p>
                            </div>
                            <div class="relative z-10 flex flex-col md:flex-row gap-0 md:gap-2 w-full md:w-auto">
                                ${btnEdit}${btnTutup}
                            </div>
                        </div>`;
                    }
                    return ''; 
                }

                const sudahHadir = todayAbsensi.some(a => a.tipe === 'Rapat' && a.idRapat === r.id && a.idGuru === sessionUser.id);
                let actionBtn = '';
                
                if (!isMulai) {
                    actionBtn = `<button disabled class="flex-1 md:flex-none bg-slate-200 text-slate-400 font-black px-8 py-3.5 rounded-xl shadow cursor-not-allowed flex items-center justify-center"><i class="fa-solid fa-clock mr-2"></i> Belum Mulai</button>`;
                } else if (sudahHadir) {
                    actionBtn = `<div class="bg-emerald-500/20 border border-emerald-400 text-emerald-100 font-black px-6 py-3.5 rounded-xl shadow-inner w-full md:w-auto text-center flex items-center justify-center"><i class="fa-solid fa-check-double mr-2"></i> Anda Sudah Hadir</div>`;
                } else {
                    actionBtn = `<button onclick="window.hadirRapat('${r.id}', '${r.judul}')" class="flex-1 md:flex-none bg-white text-indigo-700 hover:bg-indigo-50 font-black px-8 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-1 flex items-center justify-center"><i class="fa-solid fa-hand-sparkles mr-2"></i> Klik Hadir Rapat</button>`;
                }

                return `
                <div class="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 shadow-xl mb-6 text-white flex flex-col md:flex-row justify-between items-center border border-purple-400/30 relative overflow-hidden">
                    <div class="absolute -right-10 -top-10 opacity-10 pointer-events-none"><i class="fa-solid fa-users-viewfinder text-9xl"></i></div>
                    <div class="relative z-10 w-full md:w-auto text-center md:text-left mb-4 md:mb-0">
                        <span class="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm"><i class="fa-solid fa-circle ${isMulai?'text-red-400 animate-pulse':'text-yellow-400'} mr-1"></i> ${isMulai?'Rapat Sedang Berlangsung':'Rapat Terjadwal'}</span>
                        <h3 class="text-2xl font-black tracking-tight mb-1">${r.judul}</h3>
                        <p class="text-indigo-100 text-xs font-medium mb-1">${r.deskripsi || ''}</p>
                        <p class="text-indigo-200 text-[10px] font-bold mt-2"><i class="fa-regular fa-clock mr-1"></i> Jadwal: ${jadwalText}</p>
                    </div>
                    <div class="relative z-10 flex flex-col md:flex-row gap-0 md:gap-2 w-full md:w-auto">
                        ${actionBtn}
                        ${btnEdit}
                        ${btnTutup}
                    </div>
                </div>`;
            }).join('');
        }

        if (isSA_Admin || isOpTU || (sessionUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala'))) {
            btnBukaRapat = `<button onclick="window.bukaModalRapat()" class="bg-purple-100 hover:bg-purple-600 text-purple-700 hover:text-white font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition ml-2 flex items-center"><i class="fa-solid fa-users-viewfinder md:mr-2"></i> <span class="hidden md:inline">Buat Rapat</span></button>`;
        }
    }

    let invalApprovalHTML = '';
    if (pendingInvalList.length > 0) {
        invalApprovalHTML = pendingInvalList.map(inv => `
            <div class="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 p-4 rounded-xl shadow-sm mb-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-slide-up">
                <div>
                    <span class="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 inline-block"><i class="fa-solid fa-handshake-angle mr-1"></i> Persetujuan Inval</span>
                    <h4 class="font-black text-slate-800 text-lg">${inv.pengajuNama} <span class="text-[10px] bg-slate-200 text-slate-500 px-1 rounded mx-1">menggantikan</span> ${inv.namaGuruAsli || 'Guru Asli'}</h4>
                    <p class="text-xs font-bold text-slate-600 mt-1"><i class="fa-solid fa-chalkboard-user text-indigo-500 mr-1"></i> Kelas ${inv.kelas} | ${inv.mapel} | ${inv.jamTxt}</p>
                    <p class="text-[10px] text-slate-500 italic mt-1 font-medium">Alasan Pengganti: ${inv.keterangan || '-'}</p>
                </div>
                <div class="flex gap-2 w-full md:w-auto">
                    <button onclick="window.tolakInval('${inv.id}')" class="flex-1 md:flex-none bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl font-bold text-xs transition shadow-sm">Tolak</button>
                    <button onclick="window.setujuiInval('${inv.id}')" class="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs transition shadow-md"><i class="fa-solid fa-check mr-1"></i> Setujui Inval</button>
                </div>
            </div>
        `).join('');
    }

    container.innerHTML = `
        <div class="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-2xl shadow-xl mb-8 text-center border-b-4 border-indigo-500 relative overflow-hidden">
            <div class="absolute top-0 right-0 opacity-10"><i class="fa-solid fa-clock text-9xl -mt-4 -mr-4"></i></div>
            <h2 class="text-indigo-300 font-semibold tracking-wider text-sm mb-2 uppercase">Waktu Presensi Saat Ini</h2>
            <p id="jam-realtime" class="text-5xl md:text-6xl font-black text-white tracking-widest drop-shadow-lg mb-2">00:00:00</p>
            <p id="tgl-realtime" class="text-lg md:text-xl font-medium text-slate-300">Memuat Tanggal...</p>
        </div>

        ${rapatHTML}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                ${invalApprovalHTML}

                <div class="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100">
                    <div class="flex justify-between items-center mb-6 border-b pb-4">
                        <div class="flex items-center">
                            <div class="bg-blue-100 text-blue-600 p-3 rounded-xl mr-4"><i class="fa-solid fa-clipboard-user text-2xl"></i></div>
                            <h3 class="font-black text-2xl text-slate-800">Panel Presensi Anda</h3>
                        </div>
                        <div class="flex items-center">
                            ${isSA_Admin || isOpTU ? `<button onclick="window.bukaModalArsip()" id="btn-buka-arsip" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition flex items-center"><i class="fa-solid fa-box-archive md:mr-2"></i> <span class="hidden md:inline">Arsip</span></button>` : ''}
                            ${btnBukaRapat}
                        </div>
                    </div>
                    
                    ${(isLiburPekanan || isTanggalMerah) ? `
                    <div class="bg-red-50 border border-red-200 p-8 rounded-2xl text-center shadow-inner mb-8">
                        <i class="fa-solid fa-calendar-xmark text-6xl text-red-400 mb-4 block animate-bounce"></i>
                        <h3 class="text-2xl font-black text-red-600 tracking-wide mb-2">PRESENSI DITUTUP</h3>
                        <p class="text-red-500 font-bold">${liburMessage}</p>
                    </div>
                    ` : `
                    ${lembaga.kedisiplinan === 'Longgar' ? `
                    <div class="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                        <label class="font-bold text-xs text-orange-800 block mb-1">Disiplin Longgar: Input Manual Keterlambatan (Menit):</label>
                        <input type="number" id="input-keterlambatan-manual" placeholder="0 (Kosongkan jika tepat waktu)" class="border border-orange-300 p-2 rounded-lg w-full max-w-xs focus:outline-orange-500 font-bold text-orange-900 bg-white">
                    </div>` : ''}

                    ${opsiJabatan ? `
                    <div class="mb-8">
                        <label class="font-bold text-sm text-slate-500 block mb-2"><i class="fa-solid fa-briefcase mr-1"></i> Pilih Tugas/Jabatan Hari Ini:</label>
                        <select id="pilih-jabatan-absen" onchange="window.gantiUIAbsen()" class="border-2 border-indigo-200 p-4 rounded-xl w-full font-bold text-indigo-800 bg-indigo-50 shadow-inner focus:outline-indigo-500 cursor-pointer appearance-none">
                            ${opsiJabatan}
                        </select>
                    </div>
                    ` : `<div class="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6 flex items-center"><i class="fa-solid fa-triangle-exclamation text-2xl mr-3"></i> Belum ada jabatan dengan sistem presensi yang terdaftar.</div>`}

                    <div id="area-kelas" class="hidden mb-6">
                        <form onsubmit="window.simpanPresensiKelas(event, 'Reguler')" class="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm">
                            <p class="text-lg font-black text-blue-800 mb-4"><i class="fa-solid fa-chalkboard-user mr-2 text-blue-600"></i> Absensi Kelas Mengajar Anda:</p>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-bold text-blue-700 block mb-1">Pilih Jam & Mapel yang Berjalan:</label>
                                    <select id="presensi-kelas-select" class="w-full p-3 border-2 border-blue-200 rounded-xl font-bold text-blue-900 bg-white focus:outline-blue-500 cursor-pointer" required>
                                        <option value="">-- Silakan Pilih --</option>
                                        ${dropdownHTML}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-blue-700 block mb-1">Keterangan / Jurnal Singkat (Opsional):</label>
                                    <input type="text" id="presensi-keterangan" placeholder="Contoh: Mengisi materi Bab 2..." class="w-full p-3 border-2 border-blue-200 rounded-xl font-medium text-slate-700 bg-white focus:outline-blue-500">
                                </div>
                                <button type="submit" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black py-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                    <i class="fa-solid fa-clipboard-check mr-2"></i> KONFIRMASI HADIR & ABSEN SISWA
                                </button>
                            </div>
                        </form>
                    </div>

                    <div id="area-cico" class="hidden grid grid-cols-2 gap-4 md:gap-6 mb-6">
                        <button onclick="window.simpanAbsenLain(event, 'CICO', 'Cek In')" class="group bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-person-walking-arrow-right text-4xl mb-3 block group-hover:scale-110 transition"></i><span class="text-xl">CEK IN</span>
                        </button>
                        <button onclick="window.simpanAbsenLain(event, 'CICO', 'Cek Out')" class="group bg-gradient-to-br from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(244,63,94,0.3)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-person-walking-dashed-line-arrow-right text-4xl mb-3 block group-hover:scale-110 transition"></i><span class="text-xl">CEK OUT</span>
                        </button>
                    </div>
                    
                    <div id="area-1x" class="hidden mb-6">
                        <button onclick="window.simpanAbsenLain(event, '1x', 'Hadir Harian')" class="w-full group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black py-8 rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.4)] transform hover:-translate-y-1 transition duration-200">
                            <i class="fa-solid fa-fingerprint text-5xl mb-3 block group-hover:scale-110 transition"></i><span class="text-2xl tracking-wide">HADIR HARI INI</span>
                        </button>
                    </div>
                    
                    <div id="area-tanpa" class="hidden mb-6 bg-amber-50 p-6 border border-amber-200 rounded-xl text-amber-800 font-bold text-center">
                        <i class="fa-solid fa-mug-hot text-4xl mb-3 block text-amber-400"></i>Jabatan ini tidak mewajibkan rekam presensi harian.
                    </div>
                    `}

                    <div class="mt-8 pt-6 border-t border-slate-200">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <h4 class="font-bold text-sm text-slate-600"><i class="fa-solid fa-clock-rotate-left mr-2 text-indigo-500"></i> Rekam Jejak Kehadiran Anda (Universal):</h4>
                            <div class="flex items-center space-x-2 bg-slate-50 p-2 border border-slate-200 rounded-lg w-full sm:w-auto">
                                <input type="date" id="filter-hist-start" value="${todayISO}" class="border border-slate-200 rounded p-1 text-xs focus:outline-indigo-500 flex-1">
                                <span class="text-xs font-bold text-slate-400">-</span>
                                <input type="date" id="filter-hist-end" value="${todayISO}" class="border border-slate-200 rounded p-1 text-xs focus:outline-indigo-500 flex-1">
                                <button onclick="window.filterTabelHistori()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-bold transition"><i class="fa-solid fa-filter"></i></button>
                            </div>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-inner">
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 text-slate-600 border-b">
                                    <tr><th class="p-3 text-center">No</th><th class="p-3">Tanggal</th><th class="p-3">Jabatan</th><th class="p-3">Waktu Terekam</th><th class="p-3">Keterangan</th></tr>
                                </thead>
                                <tbody id="tbody-histori">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                ${!(isLiburPekanan || isTanggalMerah) ? `
                <div class="bg-white rounded-2xl shadow-lg border border-slate-100 mt-6 overflow-hidden">
                    <button onclick="document.getElementById('form-inval-container').classList.toggle('hidden')" class="w-full flex justify-between items-center bg-orange-50 hover:bg-orange-100 p-6 transition">
                        <span class="font-black text-xl text-orange-600"><i class="fa-solid fa-people-arrows mr-2"></i> Ajukan Inval (Gantikan Guru Lain)</span>
                        <i class="fa-solid fa-chevron-down text-orange-600 text-xl"></i>
                    </button>
                    <div id="form-inval-container" class="hidden p-6 pt-2 space-y-4 bg-white">
                        <p class="text-[11px] font-bold text-orange-700 bg-orange-100 p-3 rounded-lg mb-4 border border-orange-200"><i class="fa-solid fa-info-circle mr-1"></i> Pengajuan Inval memerlukan persetujuan dari Guru Asli, Operator/TU, atau Administrator sebelum direkam ke Histori.</p>
                        <form onsubmit="window.simpanPresensiKelas(event, 'Inval')" class="space-y-4">
                            <div>
                                <label class="text-xs font-bold text-slate-600 block mb-1">Pilih Kelas Kosong Hari Ini:</label>
                                <select id="presensi-inval-select" class="w-full p-3 border-2 border-orange-200 rounded-xl font-bold text-orange-900 bg-orange-50 focus:outline-orange-500 cursor-pointer" required>
                                    <option value="">-- Pilih Kelas & Mapel Guru Lain --</option>
                                    ${dropdownInvalHTML}
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-bold text-slate-600 block mb-1">Keterangan Inval (Opsional):</label>
                                <input type="text" id="presensi-inval-keterangan" placeholder="Contoh: Menggantikan karena sakit..." class="w-full p-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 bg-white focus:outline-orange-500">
                            </div>
                            <button type="submit" class="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-black py-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                <i class="fa-solid fa-paper-plane mr-2"></i> AJUKAN PERSETUJUAN INVAL
                            </button>
                        </form>
                    </div>
                </div>` : ''}
            </div>

            <div>
                <div class="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col justify-start overflow-hidden mb-6">
                    <button onclick="document.getElementById('form-cuti-container').classList.toggle('hidden')" class="w-full flex justify-between items-center bg-indigo-50 hover:bg-indigo-100 p-6 transition">
                        <span class="font-black text-xl text-indigo-700"><i class="fa-solid fa-envelope-open-text mr-2"></i> Pengajuan Cuti Harian</span>
                        <i class="fa-solid fa-chevron-down text-indigo-700 text-xl"></i>
                    </button>
                    <div id="form-cuti-container" class="hidden p-6 pt-4 space-y-4">
                        <form onsubmit="window.ajukanCuti(event)" class="space-y-4">
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-regular fa-calendar-check text-indigo-500 w-5"></i> Mulai Tanggal</label><input type="date" id="cuti-mulai" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50" required></div>
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-regular fa-calendar-xmark text-rose-500 w-5"></i> Sampai Tanggal</label><input type="date" id="cuti-sampai" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50" required></div>
                            <div><label class="text-sm font-bold text-slate-600 mb-1 flex items-center"><i class="fa-solid fa-pen-clip text-amber-500 w-5"></i> Keterangan Lengkap</label><textarea id="cuti-alasan" class="border-2 border-slate-200 p-3 rounded-xl w-full bg-slate-50 placeholder-slate-400" rows="3" placeholder="Jelaskan alasan cuti Anda..." required></textarea></div>
                            <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white py-4 rounded-xl font-black shadow-lg transform hover:-translate-y-1 transition text-lg mt-2">
                                <i class="fa-solid fa-paper-plane mr-2"></i> KIRIM PENGAJUAN
                            </button>
                        </form>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <button onclick="window.bukaModalIzin()" class="bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 p-5 rounded-xl font-black transition shadow-lg border border-slate-200 hover:border-orange-200 flex items-center justify-between group">
                        <span class="flex items-center"><i class="fa-solid fa-person-walking-arrow-right text-orange-500 mr-3 text-2xl group-hover:scale-110 transition"></i> Izin Keluar Lokasi</span>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </button>
                    ${hasPresensiPlus ? `
                    <button onclick="window.bukaModalSusulan()" class="bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-5 rounded-xl font-black transition shadow-lg border border-slate-200 hover:border-blue-200 flex items-center justify-between group">
                        <span class="flex items-center"><i class="fa-solid fa-clock-rotate-left text-blue-500 mr-3 text-2xl group-hover:scale-110 transition"></i> Ajukan Presensi Susulan</span>
                        <i class="fa-solid fa-arrow-right text-slate-300"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    window.filterTabelHistori(); 
    window.jalankanJam();
    if(opsiJabatan && !(isLiburPekanan || isTanggalMerah)) window.gantiUIAbsen(); 
}

window.bukaModalAbsenSiswa = function(kelas, mapel, jamTxt, dateStr) {
    const siswaKelas = (window.appState.anak || []).filter(a => a.kelas === kelas);
    let modal = document.getElementById('modal-absen-siswa');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'modal-absen-siswa';
        modal.className = 'fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center backdrop-blur-sm hidden p-4';
        document.body.appendChild(modal);
    }

    let tabelSiswa = '';
    if(siswaKelas.length === 0) {
        tabelSiswa = `<div class="p-6 text-center text-red-500 font-bold bg-red-50 rounded-xl">Belum ada siswa yang terdaftar di ${kelas}.</div>`;
    } else {
        tabelSiswa = `
        <table class="w-full text-left text-sm mb-4">
            <thead class="bg-slate-100 text-slate-600 border-b-2">
                <tr><th class="p-3">Nama Siswa</th><th class="p-3 text-center">Hadir</th><th class="p-3 text-center">Izin</th><th class="p-3 text-center">Sakit</th><th class="p-3 text-center">Alpa</th></tr>
            </thead>
            <tbody>
                ${siswaKelas.map(s => {
                    let st = 'Hadir'; // default
                    const as = window.rawHistoriSiswa.find(x => x.tanggal === dateStr && x.kelas === kelas && x.jamTxt === jamTxt);
                    if (as && as.detailSiswa) {
                        const rec = as.detailSiswa.find(x => x.idSiswa === s.id);
                        if (rec) st = rec.status;
                    }
                    return `
                    <tr class="border-b hover:bg-slate-50">
                        <td class="p-3 font-bold text-slate-700">${s.nama}</td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Hadir" ${st==='Hadir'?'checked':''} class="w-4 h-4 text-emerald-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Izin" ${st==='Izin'?'checked':''} class="w-4 h-4 text-blue-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Sakit" ${st==='Sakit'?'checked':''} class="w-4 h-4 text-orange-500 cursor-pointer"></td>
                        <td class="p-3 text-center"><input type="radio" name="abs-${s.id}" value="Alpa" ${st==='Alpa'?'checked':''} class="w-4 h-4 text-red-500 cursor-pointer"></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 md:p-8 flex flex-col max-h-[90vh] animate-slide-up border-t-4 border-indigo-500">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
                <div><h3 class="text-2xl font-black text-indigo-800"><i class="fa-solid fa-users-viewfinder mr-2"></i> Presensi Siswa</h3><p class="text-sm font-bold text-slate-500 mt-1">${kelas} | ${mapel} | ${jamTxt}</p></div>
                <button onclick="document.getElementById('modal-absen-siswa').classList.add('hidden'); window.navigate('absensi');" class="text-red-500 hover:text-red-700 text-3xl font-bold bg-red-50 w-10 h-10 rounded-full flex items-center justify-center transition"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">${tabelSiswa}</div>
            <div class="mt-6 border-t pt-4">
                <button onclick="window.simpanAbsenSiswa(event, '${kelas}', '${mapel}', '${jamTxt}', '${dateStr}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black shadow-lg transition text-lg transform hover:-translate-y-1"><i class="fa-solid fa-cloud-arrow-up mr-2"></i> Simpan Absen Siswa</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.simpanAbsenSiswa = async function(event, kelas, mapel, jamTxt, dateStr) {
    const btn = event.target;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; btn.disabled = true;
    
    const siswaKelas = (window.appState.anak || []).filter(a => a.kelas === kelas);
    let rekapan = [];
    siswaKelas.forEach(s => { 
        const rad = document.querySelector(`input[name="abs-${s.id}"]:checked`); 
        if(rad) rekapan.push({ idSiswa: s.id, namaSiswa: s.nama, status: rad.value }); 
    });
    
    const data = { 
        tanggal: dateStr, kelas: kelas, mapel: mapel, jamTxt: jamTxt, 
        idGuru: window.currentUser.id, namaGuru: window.currentUser.nama, 
        detailSiswa: rekapan, updatedAt: new Date().toISOString() 
    };
    
    try { 
        // Cek apakah data sudah ada sebelumnya
        const qCek = query(collection(db, "AbsensiSiswa"), where("tanggal", "==", dateStr), where("kelas", "==", kelas), where("jamTxt", "==", jamTxt));
        const snap = await getDocs(qCek);
        
        if (!snap.empty) {
            // Jika ada, cukup Update agar tidak dobel
            await updateDoc(doc(db, "AbsensiSiswa", snap.docs[0].id), data);
        } else {
            // Jika belum ada, buat baru
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "AbsensiSiswa"), data); 
        }
        
        alert("Presensi siswa Selesai!"); 
        document.getElementById('modal-absen-siswa').classList.add('hidden'); 
        window.navigate('absensi'); 
    } catch(e) { 
        alert("Gagal merekam."); btn.innerHTML = 'Simpan Absen Siswa'; btn.disabled = false; 
    }
};

// ================= FUNGSI WIDGET DASBOR (PERBAIKAN INDEX FIRESTORE) =================
window.loadDashboardKehadiran = async function() {
    const widget = document.getElementById('dashboard-absen-widget');
    if(!widget) return;
    
    if(!window.getLocalISOString) {
        window.getLocalISOString = function() {
            const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
    }
    const todayISO = window.getLocalISOString();
    
    try {
        const q1 = query(collection(db, "Absensi"), where("tanggal", "==", todayISO));
        const snap1 = await getDocs(q1);
        let absenGuru = []; 
        snap1.forEach(d => {
            const data = d.data();
            if(data.tipe === 'Kelas' || data.tipe === 'Inval') absenGuru.push(data);
        });
        
        const q2 = query(collection(db, "AbsensiSiswa"), where("tanggal", "==", todayISO));
        const snap2 = await getDocs(q2);
        let absenSiswa = []; snap2.forEach(d => absenSiswa.push(d.data()));
        
        const daftarKelas = (window.appState.lembaga[0]?.daftarKelas || '').split(',').map(k => k.trim()).filter(k => k);
        
        let html = `<table class="w-full text-left text-sm"><thead class="bg-indigo-50 text-indigo-800 border-b"><tr><th class="p-4 rounded-tl-xl w-32">Kelas Ruang</th><th class="p-4">Guru yang Mengajar Hari Ini</th><th class="p-4 rounded-tr-xl text-center">Kehadiran Siswa</th></tr></thead><tbody>`;
        
        if(daftarKelas.length === 0) {
            html += `<tr><td colspan="3" class="p-6 text-center text-slate-500 font-medium">Belum ada kelas terdaftar di menu Lembaga.</td></tr>`;
        } else {
            daftarKelas.forEach(k => {
                const guruKelasIni = absenGuru.filter(a => a.kelas === k);
                const listGuru = guruKelasIni.map(g => `<span class="inline-block bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] m-0.5 font-bold border border-blue-200">${g.namaGuru} ${g.status==='Inval'?'<span class="text-orange-600">(Inval)</span>':''} <span class="opacity-50 mx-1">|</span> ${g.mapel}</span>`).join('');
                
                const rekamSiswa = absenSiswa.filter(a => a.kelas === k);
                let setHadir = new Set(); let setTotal = new Set();
                rekamSiswa.forEach(rekam => {
                    (rekam.detailSiswa || []).forEach(ds => {
                        setTotal.add(ds.idSiswa);
                        if(ds.status === 'Hadir') setHadir.add(ds.idSiswa);
                    });
                });
                
                html += `
                <tr class="border-b hover:bg-slate-50 transition duration-200">
                    <td class="p-4 font-black text-slate-700">${k}</td>
                    <td class="p-4 leading-relaxed">${listGuru || '<span class="text-slate-400 text-xs italic font-medium">Belum ada kelas yang dimulai</span>'}</td>
                    <td class="p-4 text-center font-black ${setHadir.size === setTotal.size && setTotal.size > 0 ? 'text-emerald-600' : 'text-orange-500'}">${setTotal.size > 0 ? `${setHadir.size} dari ${setTotal.size} Anak` : '-'}</td>
                </tr>`;
            });
        }
        html += `</tbody></table>`;
        widget.innerHTML = html;
    } catch(e) {
        widget.innerHTML = '<div class="text-center text-red-500 p-6 font-bold"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Gagal memuat data kehadiran.</div>';
    }
};

// ==========================================
// MESIN EKSPOR & IMPOR CSV MULTI-DATA
// ==========================================
window.eksporDataCSV = function(stateKey, fileName) {
    const data = window.appState[stateKey] || [];
    if (data.length === 0) return alert("Tidak ada data untuk diekspor.");
    const separator = ';';
    
    // 1. Tentukan urutan prioritas header manual agar rapi
    const prioritasHeader = {
        'pegawai': ['nama', 'nik', 'nip', 'jk', 'tempatLahir', 'tglLahir', 'agama', 'pendidikan', 'statusPegawai', 'hakAkses', 'username', 'noHp', 'email', 'alamat', 'npwp', 'nuptk', 'serdik', 'waliKelas'],
        'anak': ['nama', 'nisn', 'nis', 'nik', 'jk', 'kelas', 'statusAkademik', 'status', 'tempatLahir', 'tglLahir', 'agama', 'namaAyah', 'namaIbu', 'noHpWali', 'alamat'],
        'lembaga': ['namaLembaga', 'npsn', 'nsm', 'jenisLembaga', 'statusLembaga', 'bentukPendidikan', 'alamat']
    };

    let headers = prioritasHeader[stateKey] || [];
    
    // 2. Ambil sisa key yang mungkin tidak ada di daftar prioritas (dinamis)
    let headersSet = new Set(headers);
    data.forEach(item => Object.keys(item).forEach(k => {
        if(k !== 'id' && !headersSet.has(k)) headersSet.add(k);
    }));
    headers = Array.from(headersSet);
    
    let csvContent = "\uFEFF" + headers.join(separator) + "\n";
    data.forEach(row => {
        let rowData = headers.map(header => {
            let cell = row[header];
            if (typeof cell === 'object' && cell !== null) cell = JSON.stringify(cell);
            if (cell === undefined || cell === null) cell = "";
            return `"${String(cell).replace(/"/g, '""')}"`;
        });
        csvContent += rowData.join(separator) + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName + ".csv");
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
};

window.imporDataCSV = function(event, collectionName) {
    const file = event.target.files[0];
    if(!file) return;
    const btn = event.target.parentElement;
    const oriHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Proses...';
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                alert("File CSV kosong atau format salah.");
                btn.innerHTML = oriHTML; return;
            }
            
            const separator = lines[0].includes(';') ? ';' : ',';
            const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
            
            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                let row = []; let insideQuotes = false; let currentCell = '';
                for (let char of lines[i]) {
                    if (char === '"') insideQuotes = !insideQuotes;
                    else if (char === separator && !insideQuotes) { row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim()); currentCell = ''; }
                    else currentCell += char;
                }
                row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                
                let data = {};
                let isValidRow = false;
                headers.forEach((header, index) => {
                    let val = row[index] || "";
                    try { if((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) val = JSON.parse(val); } catch(err){}
                    data[header] = val;
                    if(val !== "") isValidRow = true;
                });
                
                if(isValidRow) {
                    data.updatedAt = new Date().toISOString();
                    await addDoc(collection(db, collectionName), data);
                    count++;
                }
            }
            alert(`Selesai! Berhasil mengimpor ${count} baris data ke ${collectionName}.`);
        } catch (error) { 
            alert('Gagal mengimpor data! Pastikan format CSV valid hasil dari Ekspor sistem ini.'); 
        } finally {
            btn.innerHTML = oriHTML;
            event.target.value = '';
        }
    };
    reader.readAsText(file);
};

// ==========================================
// MODUL ANAK (DATA SISWA / SANTRI LENGKAP)
// ==========================================
window.toggleTransportasiAnak = function() {
    const val = document.getElementById('anak-jenis-tinggal').value;
    const area = document.getElementById('area-transportasi');
    if(area) {
        if(val === 'Asrama') area.classList.add('hidden');
        else area.classList.remove('hidden');
    }
};

export function renderHalamanAnak(container) {
    const currentUser = window.currentUser || {};
    const isBolehAksiAnak = ['Super Admin', 'Administrator', 'Operator/TU'].includes(currentUser.hakAkses);
    
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()) : [];
    
    let barisTabel = window.appState.anak.map((item, index) => `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 text-center">${index + 1}</td>
            <td class="p-3">
                <div class="font-bold text-slate-800">${item.nama || '-'}</div>
                <div class="text-[10px] text-slate-500">${item.nisn ? 'NISN: '+item.nisn : ''} ${item.nis ? ' | NIS: '+item.nis : ''}</div>
            </td>
            <td class="p-3 text-center font-bold text-indigo-600">${item.kelas || '-'}</td>
            <td class="p-3 text-center text-sm">${item.jk || '-'}</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded text-[10px] font-bold ${item.statusAkademik === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${item.statusAkademik || 'Aktif'}</span>
                <span class="px-2 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-700 mt-1 block w-max mx-auto">${item.status || '-'}</span>
            </td>
            ${isBolehAksiAnak ? `
            <td class="p-3 flex justify-center space-x-2">
                <button onclick="window.editAnak('${item.id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa-solid fa-pen"></i> Edit</button>
                <button onclick="window.hapusAnak('${item.id}')" class="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition"><i class="fa-solid fa-trash"></i></button>
            </td>
            ` : ''}
        </tr>
    `).join('');

    container.innerHTML = `
        ${isBolehAksiAnak ? `
        <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-indigo-500">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
                <h2 class="text-xl font-black text-slate-800"><i class="fa-solid fa-user-graduate text-indigo-500 mr-2"></i> Formulir Data Lengkap Anak (Siswa/Santri)</h2>
                <div class="flex gap-2">
                    <button type="button" onclick="window.eksporDataCSV('anak', 'Data_Siswa')" class="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center"><i class="fa-solid fa-download mr-2"></i> Ekspor CSV</button>
                    <label class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer flex items-center"><i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" accept=".csv" onchange="window.imporDataCSV(event, 'Anak')" class="hidden"></label>
                </div>
            </div>
            
            <form id="form-anak" onsubmit="window.simpanAnak(event)">
                <input type="hidden" id="anak-id">
                
                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-id-card mr-2"></i> 1. Identitas Utama Siswa</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Nama Lengkap Siswa</label>
                        <input type="text" id="anak-nama" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-bold bg-white" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">NISN</label>
                        <input type="text" id="anak-nisn" placeholder="Opsional" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">NIS Sekolah</label>
                        <input type="text" id="anak-nis" placeholder="Opsional" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">NIK Kependudukan</label>
                        <input type="text" id="anak-nik" placeholder="Opsional" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Jenis Kelamin</label>
                        <select id="anak-jk" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white" required>
                            <option value="">-- Pilih --</option><option value="Laki-Laki">Laki-Laki</option><option value="Perempuan">Perempuan</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Tempat Lahir</label>
                        <input type="text" id="anak-tempat-lahir" placeholder="Opsional" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Tanggal Lahir</label>
                        <input type="date" id="anak-tgl-lahir" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Agama</label>
                        <select id="anak-agama" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                            <option value="Islam">Islam</option><option value="Kristen">Kristen</option><option value="Katolik">Katolik</option><option value="Hindu">Hindu</option><option value="Buddha">Buddha</option><option value="Konghucu">Konghucu</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Golongan Darah</label>
                        <select id="anak-goldarah" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                            <option value="">-- Pilih --</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                        </select>
                    </div>
                    <div class="flex gap-2 col-span-1 md:col-span-2">
                        <div class="w-1/2">
                            <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Anak Ke</label>
                            <input type="number" id="anak-ke" placeholder="Cth: 1" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                        </div>
                        <div class="w-1/2">
                            <label class="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Jml Saudara Kandung</label>
                            <input type="number" id="anak-jml-saudara" placeholder="Cth: 3" class="border-2 p-2.5 rounded-lg focus:outline-indigo-500 w-full font-medium bg-white">
                        </div>
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-graduation-cap mr-2"></i> 2. Data Akademik & Status</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                        <label class="text-[10px] font-bold text-blue-700 block mb-1 uppercase">Kelas Penempatan</label>
                        <select id="anak-kelas" class="border-2 border-blue-200 p-2.5 rounded-lg focus:outline-blue-500 w-full font-black text-blue-800 bg-white" required>
                            <option value="">-- Pilih Kelas --</option>
                            ${daftarKelas.map(k => `<option value="${k}">${k}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-blue-700 block mb-1 uppercase">Status Siswa</label>
                        <select id="anak-status-akademik" class="border-2 p-2.5 border-blue-200 rounded-lg focus:outline-blue-500 w-full font-black text-blue-800 bg-white" required>
                            <option value="Aktif">Aktif</option><option value="Lulus">Lulus</option><option value="Pindah (Mutasi)">Pindah (Mutasi)</option><option value="Drop Out (DO)">Drop Out (DO)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-blue-700 block mb-1 uppercase">Tahun Masuk / Angkt.</label>
                        <input type="number" id="anak-tahun-masuk" placeholder="Cth: 2023" class="border-2 border-blue-200 p-2.5 rounded-lg focus:outline-blue-500 w-full font-medium bg-white">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-blue-700 block mb-1 uppercase">Kategori Beasiswa</label>
                        <select id="anak-status" class="border-2 border-blue-200 p-2.5 rounded-lg focus:outline-blue-500 w-full font-medium bg-white" required>
                            <option value="Reguler">Reguler / Umum</option><option value="Yatim">Yatim</option><option value="Piatu">Piatu</option><option value="Yatim Piatu">Yatim Piatu</option><option value="Dhuafa">Dhuafa</option>
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-bold text-blue-700 block mb-1 uppercase">Asal Sekolah Sebelumnya</label>
                        <input type="text" id="anak-asal-sekolah" placeholder="Cth: SMPN 1 Kisaran" class="border-2 border-blue-200 p-2.5 rounded-lg focus:outline-blue-500 w-full font-medium bg-white">
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-house-chimney mr-2"></i> 3. Data Tempat Tinggal & Jarak</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div class="md:col-span-3">
                        <label class="text-[10px] font-bold text-emerald-700 block mb-1 uppercase">Alamat Lengkap Siswa</label>
                        <textarea id="anak-alamat" rows="2" placeholder="Sertakan RT/RW, Desa, Kecamatan..." class="border-2 border-emerald-200 p-2.5 rounded-lg focus:outline-emerald-500 w-full font-medium bg-white"></textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-emerald-700 block mb-1 uppercase">Jenis Tempat Tinggal</label>
                        <select id="anak-jenis-tinggal" onchange="window.toggleTransportasiAnak()" class="border-2 border-emerald-200 p-2.5 rounded-lg focus:outline-emerald-500 w-full font-bold text-emerald-800 bg-white" required>
                            <option value="">-- Pilih --</option><option value="Bersama Orang Tua">Bersama Orang Tua</option><option value="Bersama Wali">Bersama Wali</option><option value="Asrama">Asrama / Pesantren</option><option value="Kos">Kos / Kontrak</option>
                        </select>
                    </div>
                    <div id="area-transportasi" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-bold text-emerald-700 block mb-1 uppercase">Moda Transportasi</label>
                            <select id="anak-transportasi" class="border-2 border-emerald-200 p-2.5 rounded-lg focus:outline-emerald-500 w-full font-medium bg-white">
                                <option value="">-- Pilih --</option><option value="Jalan Kaki">Jalan Kaki</option><option value="Sepeda">Sepeda</option><option value="Sepeda Motor">Sepeda Motor</option><option value="Antar Jemput Sekolah">Antar Jemput Sekolah</option><option value="Kendaraan Umum">Kendaraan Umum</option><option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-emerald-700 block mb-1 uppercase">Jarak Tempuh ke Sekolah</label>
                            <select id="anak-jarak" class="border-2 border-emerald-200 p-2.5 rounded-lg focus:outline-emerald-500 w-full font-medium bg-white">
                                <option value="">-- Pilih --</option><option value="Kurang dari 1 km">Kurang dari 1 km</option><option value="1 - 3 km">1 - 3 km</option><option value="3 - 5 km">3 - 5 km</option><option value="5 - 10 km">5 - 10 km</option><option value="Lebih dari 10 km">Lebih dari 10 km</option>
                            </select>
                        </div>
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-users mr-2"></i> 4. Data Orang Tua / Wali</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div class="space-y-4 border-r-0 md:border-r-2 border-orange-200 pr-0 md:pr-4">
                        <h4 class="font-black text-orange-700 border-b border-orange-200 pb-2">DATA AYAH KANDUNG</h4>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Nama Ayah</label><input type="text" id="anak-nama-ayah" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-bold bg-white"></div>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">NIK Ayah</label><input type="text" id="anak-nik-ayah" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Pendidikan</label><select id="anak-pend-ayah" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"><option value="">-- Pilih --</option><option value="Tidak Sekolah">Tidak Sekolah</option><option value="SD/Sederajat">SD/Sederajat</option><option value="SMP/Sederajat">SMP/Sederajat</option><option value="SMA/Sederajat">SMA/Sederajat</option><option value="D1-D3">D1-D3</option><option value="S1/D4">S1/D4</option><option value="S2/S3">S2/S3</option></select></div>
                            <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Pekerjaan</label><input type="text" id="anak-pek-ayah" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"></div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h4 class="font-black text-orange-700 border-b border-orange-200 pb-2">DATA IBU KANDUNG</h4>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Nama Ibu</label><input type="text" id="anak-nama-ibu" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-bold bg-white"></div>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">NIK Ibu</label><input type="text" id="anak-nik-ibu" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"></div>
                        <div class="grid grid-cols-2 gap-2">
                            <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Pendidikan</label><select id="anak-pend-ibu" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"><option value="">-- Pilih --</option><option value="Tidak Sekolah">Tidak Sekolah</option><option value="SD/Sederajat">SD/Sederajat</option><option value="SMP/Sederajat">SMP/Sederajat</option><option value="SMA/Sederajat">SMA/Sederajat</option><option value="D1-D3">D1-D3</option><option value="S1/D4">S1/D4</option><option value="S2/S3">S2/S3</option></select></div>
                            <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Pekerjaan</label><input type="text" id="anak-pek-ibu" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"></div>
                        </div>
                    </div>
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-orange-200 pt-4">
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Penghasilan Orang Tua</label><select id="anak-penghasilan" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"><option value="">-- Pilih --</option><option value="< Rp 1 Juta">< Rp 1 Juta</option><option value="Rp 1 - 3 Juta">Rp 1 - 3 Juta</option><option value="Rp 3 - 5 Juta">Rp 3 - 5 Juta</option><option value="Rp 5 - 10 Juta">Rp 5 - 10 Juta</option><option value="> Rp 10 Juta">> Rp 10 Juta</option></select></div>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">No HP / WA Ortu (Aktif)</label><input type="text" id="anak-nohp-wali" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-bold bg-white"></div>
                        <div><label class="text-[10px] font-bold text-orange-700 block mb-1 uppercase">Nama Wali (Jika ikut wali)</label><input type="text" id="anak-wali" placeholder="Opsional" class="border-2 border-orange-200 p-2.5 rounded-lg focus:outline-orange-500 w-full font-medium bg-white"></div>
                    </div>
                </div>

                <h3 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3"><i class="fa-solid fa-notes-medical mr-2"></i> 5. Bantuan Sosial & Kesehatan</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <div><label class="text-[10px] font-bold text-rose-700 block mb-1 uppercase">Nomor KIP / PIP</label><input type="text" id="anak-nokip" placeholder="Opsional" class="border-2 border-rose-200 p-2.5 rounded-lg focus:outline-rose-500 w-full font-medium bg-white"></div>
                    <div><label class="text-[10px] font-bold text-rose-700 block mb-1 uppercase">Nomor PKH / KKS</label><input type="text" id="anak-nopkh" placeholder="Opsional" class="border-2 border-rose-200 p-2.5 rounded-lg focus:outline-rose-500 w-full font-medium bg-white"></div>
                    <div><label class="text-[10px] font-bold text-rose-700 block mb-1 uppercase">Riwayat Penyakit Tertentu</label><input type="text" id="anak-riwayat-penyakit" placeholder="Opsional, pisahkan koma" class="border-2 border-rose-200 p-2.5 rounded-lg focus:outline-rose-500 w-full font-medium bg-white"></div>
                </div>

                <div class="flex space-x-3 pt-4 border-t border-slate-100">
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition transform hover:-translate-y-0.5"><i class="fa-solid fa-save mr-2"></i> Simpan Data Siswa</button>
                    <button type="button" onclick="document.getElementById('form-anak').reset(); document.getElementById('anak-id').value=''; window.toggleTransportasiAnak();" class="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hidden hover:bg-slate-300 transition" id="btn-batal-anak">Batal Edit</button>
                </div>
            </form>
        </div>
        ` : `
        <div class="bg-blue-50 text-blue-700 p-5 rounded-2xl font-bold border border-blue-200 shadow-sm mb-6 flex items-center">
            <i class="fa-solid fa-shield-halved text-2xl mr-3"></i> 
            Mode Hanya Baca: Anda tidak memiliki wewenang untuk menambah atau mengubah Data Anak.
        </div>
        `}

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-600 border-b-2">
                    <tr>
                        <th class="p-4 text-center w-12">No</th>
                        <th class="p-4">Nama Siswa & Identitas</th>
                        <th class="p-4 text-center">Kelas</th>
                        <th class="p-4 text-center">L/P</th>
                        <th class="p-4 text-center">Status</th>
                        ${isBolehAksiAnak ? '<th class="p-4 text-center">Aksi</th>' : ''}
                    </tr>
                </thead>
                <tbody>${barisTabel || `<tr><td colspan="${isBolehAksiAnak ? '6' : '5'}" class="text-center p-8 text-slate-400 font-medium">Belum ada data siswa terdaftar</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

window.simpanAnak = async function(e) {
    e.preventDefault();
    const id = document.getElementById('anak-id').value;
    const data = {
        nama: document.getElementById('anak-nama').value,
        nisn: document.getElementById('anak-nisn').value,
        nis: document.getElementById('anak-nis').value,
        nik: document.getElementById('anak-nik').value,
        jk: document.getElementById('anak-jk').value,
        tempatLahir: document.getElementById('anak-tempat-lahir').value,
        tglLahir: document.getElementById('anak-tgl-lahir').value,
        agama: document.getElementById('anak-agama').value,
        golDarah: document.getElementById('anak-goldarah').value,
        anakKe: document.getElementById('anak-ke').value,
        jmlSaudara: document.getElementById('anak-jml-saudara').value,
        
        kelas: document.getElementById('anak-kelas').value,
        statusAkademik: document.getElementById('anak-status-akademik').value,
        tahunMasuk: document.getElementById('anak-tahun-masuk').value,
        status: document.getElementById('anak-status').value,
        asalSekolah: document.getElementById('anak-asal-sekolah').value,
        
        alamat: document.getElementById('anak-alamat').value,
        jenisTinggal: document.getElementById('anak-jenis-tinggal').value,
        asrama: document.getElementById('anak-jenis-tinggal').value === 'Asrama' ? 'Ya' : 'Tidak',
        transportasi: document.getElementById('anak-transportasi').value,
        jarak: document.getElementById('anak-jarak').value,
        
        namaAyah: document.getElementById('anak-nama-ayah').value,
        nikAyah: document.getElementById('anak-nik-ayah').value,
        pendidikanAyah: document.getElementById('anak-pend-ayah').value,
        pekerjaanAyah: document.getElementById('anak-pek-ayah').value,
        
        namaIbu: document.getElementById('anak-nama-ibu').value,
        nikIbu: document.getElementById('anak-nik-ibu').value,
        pendidikanIbu: document.getElementById('anak-pend-ibu').value,
        pekerjaanIbu: document.getElementById('anak-pek-ibu').value,
        
        penghasilanOrtu: document.getElementById('anak-penghasilan').value,
        noHpWali: document.getElementById('anak-nohp-wali').value,
        wali: document.getElementById('anak-wali').value,
        
        noKip: document.getElementById('anak-nokip').value,
        noPkh: document.getElementById('anak-nopkh').value,
        riwayatPenyakit: document.getElementById('anak-riwayat-penyakit').value
    };

    try {
        if (id) {
            data.updatedAt = new Date().toISOString();
            await updateDoc(doc(db, "Anak", id), data);
        } else {
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "Anak"), data);
        }
        
        document.getElementById('form-anak').reset();
        document.getElementById('anak-id').value = '';
        document.getElementById('btn-batal-anak').classList.add('hidden');
        window.toggleTransportasiAnak();
    } catch (err) { alert("Gagal menyimpan data!"); }
};

window.editAnak = function(id) {
    const item = window.appState.anak.find(x => x.id === id);
    if (item) {
        document.getElementById('anak-id').value = item.id;
        document.getElementById('anak-nama').value = item.nama || '';
        document.getElementById('anak-nisn').value = item.nisn || '';
        document.getElementById('anak-nis').value = item.nis || '';
        document.getElementById('anak-nik').value = item.nik || '';
        document.getElementById('anak-jk').value = item.jk || '';
        document.getElementById('anak-tempat-lahir').value = item.tempatLahir || '';
        document.getElementById('anak-tgl-lahir').value = item.tglLahir || '';
        document.getElementById('anak-agama').value = item.agama || 'Islam';
        document.getElementById('anak-goldarah').value = item.golDarah || '';
        document.getElementById('anak-ke').value = item.anakKe || '';
        document.getElementById('anak-jml-saudara').value = item.jmlSaudara || '';
        
        document.getElementById('anak-kelas').value = item.kelas || '';
        document.getElementById('anak-status-akademik').value = item.statusAkademik || 'Aktif';
        document.getElementById('anak-tahun-masuk').value = item.tahunMasuk || '';
        document.getElementById('anak-status').value = item.status || 'Reguler';
        document.getElementById('anak-asal-sekolah').value = item.asalSekolah || '';
        
        document.getElementById('anak-alamat').value = item.alamat || '';
        document.getElementById('anak-jenis-tinggal').value = item.jenisTinggal || '';
        document.getElementById('anak-transportasi').value = item.transportasi || '';
        document.getElementById('anak-jarak').value = item.jarak || '';
        
        document.getElementById('anak-nama-ayah').value = item.namaAyah || '';
        document.getElementById('anak-nik-ayah').value = item.nikAyah || '';
        document.getElementById('anak-pend-ayah').value = item.pendidikanAyah || '';
        document.getElementById('anak-pek-ayah').value = item.pekerjaanAyah || '';
        
        document.getElementById('anak-nama-ibu').value = item.namaIbu || '';
        document.getElementById('anak-nik-ibu').value = item.nikIbu || '';
        document.getElementById('anak-pend-ibu').value = item.pendidikanIbu || '';
        document.getElementById('anak-pek-ibu').value = item.pekerjaanIbu || '';
        
        document.getElementById('anak-penghasilan').value = item.penghasilanOrtu || '';
        document.getElementById('anak-nohp-wali').value = item.noHpWali || '';
        document.getElementById('anak-wali').value = item.wali || '';
        
        document.getElementById('anak-nokip').value = item.noKip || '';
        document.getElementById('anak-nopkh').value = item.noPkh || '';
        document.getElementById('anak-riwayat-penyakit').value = item.riwayatPenyakit || '';
        
        document.getElementById('btn-batal-anak').classList.remove('hidden');
        window.toggleTransportasiAnak();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.hapusAnak = async function(id) {
    if (confirm("Yakin ingin menghapus permanen data siswa ini?")) {
        try { await deleteDoc(doc(db, "Anak", id)); } catch (err) { alert("Gagal!"); }
    }
};

// =================================================================
// MODUL PENGATURAN HAK AKSES & WEWENANG MENU 
// =================================================================
window.tempWewenangMatrix = {};

window.bukaModalWewenang = function() {
    const profilLembaga = window.appState.lembaga[0] || {};
    if (!profilLembaga.id) return alert("Simpan Konfigurasi Lembaga terlebih dahulu sebelum mengatur wewenang!");

    const daftarJabatan = profilLembaga.daftarJabatan ? profilLembaga.daftarJabatan.split(',').map(j => j.trim()).filter(j => j) : [];
    if (daftarJabatan.length === 0) return alert("Daftar Jabatan masih kosong! Harap isi di pengaturan lembaga.");

    // Tarik data Wewenang yang sudah tersimpan (jika ada) ke variabel temporary
    window.tempWewenangMatrix = profilLembaga.wewenangMatrix ? JSON.parse(JSON.stringify(profilLembaga.wewenangMatrix)) : {};
    
    let modal = document.getElementById('modal-wewenang');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-wewenang';
        modal.className = 'fixed inset-0 bg-slate-900 bg-opacity-50 z-[70] flex items-center justify-center backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 border-t-4 border-indigo-500 transform transition-all relative flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-center mb-4 border-b pb-3">
                <h3 class="text-xl font-black text-slate-800"><i class="fa-solid fa-user-shield text-indigo-500 mr-2"></i> Pengaturan Wewenang Akses Menu</h3>
                <button onclick="document.getElementById('modal-wewenang').classList.add('hidden')" class="text-red-500 hover:text-red-700 text-2xl font-bold"><i class="fa-solid fa-times"></i></button>
            </div>
            
            <div class="flex flex-col md:flex-row flex-1 overflow-hidden gap-4 mt-2">
                <div class="w-full md:w-1/3 flex flex-col border-r pr-2 overflow-y-auto custom-scrollbar">
                    <label class="text-sm font-bold text-slate-500 mb-3 bg-slate-100 p-2 rounded text-center">1. Pilih Jabatan</label>
                    <div class="flex flex-col gap-2" id="wewenang-jabatan-list">
                        ${daftarJabatan.map(j => `<button type="button" onclick="window.pilihJabatanWewenang('${j}')" id="btn-jab-${j.replace(/\s+/g, '-')}" class="text-left px-4 py-3 rounded-lg border font-bold hover:bg-indigo-50 transition wewenang-jab-btn text-slate-700">${j}</button>`).join('')}
                    </div>
                </div>
                <div class="w-full md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar pl-2">
                    <label class="text-sm font-bold text-slate-500 mb-3 bg-slate-100 p-2 rounded text-center" id="label-menu-wewenang">2. Centang Menu yang Bisa Diakses</label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="wewenang-menu-list">
                        </div>
                </div>
            </div>

            <div class="mt-6 border-t pt-4 flex justify-end">
                <button onclick="window.simpanWewenangMatrix()" id="btn-simpan-wewenang" class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg transition"><i class="fa-solid fa-save mr-2"></i> Simpan Matriks Wewenang</button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    // Pilih jabatan pertama secara otomatis saat terbuka
    window.pilihJabatanWewenang(daftarJabatan[0]); 
};

window.pilihJabatanWewenang = function(jabatan) {
    // Reset warna tombol sebelah kiri
    const allBtns = document.querySelectorAll('.wewenang-jab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('bg-indigo-500', 'text-white', 'border-indigo-600');
        btn.classList.add('bg-white', 'text-slate-700');
    });
    
    // Beri warna aktif pada tombol yang diklik
    const activeBtn = document.getElementById('btn-jab-' + jabatan.replace(/\s+/g, '-'));
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-slate-700');
        activeBtn.classList.add('bg-indigo-500', 'text-white', 'border-indigo-600');
    }

    document.getElementById('label-menu-wewenang').innerHTML = `2. Hak Akses Menu untuk: <span class="text-indigo-600 font-black">${jabatan}</span>`;

    // Buat daftar Checkbox berdasarkan `MENU_ITEMS` dari router.js
    const menus = window.MENU_ITEMS_GLOBAL || [];
    const activeMenus = window.tempWewenangMatrix[jabatan] || [];
    
    const listHTML = menus.map(m => {
        const isChecked = activeMenus.includes(m.id) ? 'checked' : '';
        // Dashboard dikunci mati agar semua orang pasti bisa melihat halaman awal
        const isDashboard = m.id === 'dashboard' ? 'checked disabled title="Dashboard wajib untuk semua jabatan"' : isChecked; 
        
        return `
        <label class="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-indigo-50 transition border-slate-200">
            <input type="checkbox" onchange="window.toggleWewenangMenu('${jabatan}', '${m.id}', this.checked)" class="w-5 h-5 text-indigo-600 mr-3 rounded accent-indigo-600" ${isDashboard}>
            <span class="font-bold text-slate-700"><i class="fa-solid ${m.icon} w-6 text-slate-400"></i> ${m.label}</span>
        </label>
        `;
    }).join('');

    document.getElementById('wewenang-menu-list').innerHTML = listHTML;
};

window.toggleWewenangMenu = function(jabatan, menuId, isChecked) {
    if (!window.tempWewenangMatrix[jabatan]) window.tempWewenangMatrix[jabatan] = [];
    
    if (isChecked) {
        if (!window.tempWewenangMatrix[jabatan].includes(menuId)) window.tempWewenangMatrix[jabatan].push(menuId);
    } else {
        window.tempWewenangMatrix[jabatan] = window.tempWewenangMatrix[jabatan].filter(id => id !== menuId);
    }
};

window.simpanWewenangMatrix = async function() {
    const profilLembaga = window.appState.lembaga[0];
    const btn = document.getElementById('btn-simpan-wewenang');
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';
    btn.disabled = true;

    try {
        // Simpan Object Matrix ke Firestore Dokumen Lembaga
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), {
            wewenangMatrix: window.tempWewenangMatrix
        });
        alert("Wewenang berhasil disimpan! Halaman akan dimuat ulang agar menu navigasi dapat disesuaikan otomatis.");
        location.reload(); 
    } catch (error) {
        alert("Gagal menyimpan wewenang! Pastikan internet stabil.");
        btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Matriks Wewenang';
        btn.disabled = false;
    }
};

// ==========================================
// KONTROL PRESENSI RAPAT (FITUR KHUSUS)
// ==========================================
window.bukaModalRapat = function() {
    const pegawais = window.appState.pegawai || [];
    let chkPegawai = pegawais.map(p => `
        <label class="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer border-b border-slate-100">
            <input type="checkbox" name="rapat-peserta-chk" value="${p.id}" class="w-4 h-4 text-purple-600 rounded">
            <span class="text-xs font-bold text-slate-700">${p.nama} <span class="text-[9px] text-slate-400">(${p.hakAkses})</span></span>
        </label>
    `).join('');

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Buat Jadwal Rapat Baru',
            html: `
                <input type="text" id="rapat-judul" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-purple-500 text-center mb-3" placeholder="Judul Rapat..." required>
                <textarea id="rapat-deskripsi" rows="2" class="w-full border-2 border-slate-200 p-3 rounded-xl font-medium focus:outline-purple-500 mb-3" placeholder="Deskripsi/Agenda rapat..." required></textarea>
                <div class="grid grid-cols-2 gap-3 mb-3 text-left">
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">Tgl Mulai</label><input type="date" id="rapat-tgl" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-purple-500" required></div>
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">Pukul</label><input type="time" id="rapat-wkt" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-purple-500" required></div>
                </div>
                
                <label class="text-[10px] font-bold text-slate-500 uppercase block text-left mb-1">Target Peserta (Wajib Hadir):</label>
                <div class="mb-3 max-h-40 overflow-y-auto border-2 border-slate-200 p-2 rounded-xl text-left bg-slate-50 custom-scrollbar">
                    <label class="flex items-center gap-2 p-1.5 hover:bg-purple-100 bg-purple-50 rounded cursor-pointer border-b border-purple-200 mb-1">
                        <input type="checkbox" onchange="document.querySelectorAll('input[name=\\'rapat-peserta-chk\\']').forEach(cb => cb.checked = this.checked)" class="w-4 h-4 text-purple-600 rounded">
                        <span class="text-xs font-black text-purple-800">Pilih Semua Pegawai</span>
                    </label>
                    ${chkPegawai || '<p class="text-xs text-slate-400 text-center py-2">Belum ada pegawai</p>'}
                </div>

                <label class="text-[10px] font-bold text-slate-500 uppercase block text-left mb-1">Nominal Honor Rapat (Rp):</label>
                <input type="number" id="rapat-nominal" class="w-full border-2 border-slate-200 p-3 rounded-xl font-black text-purple-700 focus:outline-purple-500 text-center" placeholder="Ketik 0 jika gratis/rutin" required>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-save mr-1"></i> Buat Rapat',
            confirmButtonColor: '#7e22ce',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const judul = document.getElementById('rapat-judul').value;
                const deskripsi = document.getElementById('rapat-deskripsi').value;
                const tgl = document.getElementById('rapat-tgl').value;
                const wkt = document.getElementById('rapat-wkt').value;
                const nominal = document.getElementById('rapat-nominal').value;
                const peserta = Array.from(document.querySelectorAll('input[name="rapat-peserta-chk"]:checked')).map(cb => cb.value);
                
                if (!judul || !deskripsi || !tgl || !wkt || nominal === '' || peserta.length === 0) { 
                    Swal.showValidationMessage('Semua kolom wajib diisi & minimal 1 peserta dipilih!'); return false; 
                }
                return { judul, deskripsi, tgl, wkt, nominal: Number(nominal), peserta };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({title: 'Membuat Jadwal...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
                try {
                    const { db, app } = await import('./firebase-init.js');
                    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                    const { getDatabase, ref, push } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
                    
                    const now = new Date();
                    await addDoc(collection(db, "Rapat"), {
                        judul: result.value.judul, deskripsi: result.value.deskripsi,
                        tanggalMulai: result.value.tgl, waktuMulai: result.value.wkt,
                        nominalHonor: result.value.nominal, peserta: result.value.peserta,
                        status: "Aktif", pembuat: window.currentUser.nama,
                        waktuBuka: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
                        tanggal: window.getLocalISOString(), createdAt: now.toISOString()
                    });

                    // BROADCAST NOTIFIKASI
                    await push(ref(getDatabase(app), 'Pemberitahuan'), {
                        judul: `[Undangan Rapat] ${result.value.judul}`,
                        isi: `Jadwal: ${result.value.tgl.split('-').reverse().join('/')} pkl ${result.value.wkt}. Agenda: ${result.value.deskripsi}.`,
                        pengirim: window.currentUser.nama, timestamp: Date.now()
                    });

                    Swal.fire('Berhasil!', 'Rapat terjadwal dan notifikasi terkirim ke seluruh pegawai.', 'success');
                    window.navigate('absensi'); 
                } catch(e) { Swal.fire('Error', 'Gagal membuka rapat.', 'error'); }
            }
        });
    } else { alert('Gagal memuat UI. Coba muat ulang halaman.'); }
};

window.editModalRapat = async function(idRapat) {
    Swal.fire({title: 'Memuat Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    try {
        const { db, app } = await import('./firebase-init.js');
        const { doc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const { getDatabase, ref, push } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
        
        const rSnap = await getDoc(doc(db, "Rapat", idRapat));
        if(!rSnap.exists()) return Swal.fire('Error', 'Data tidak ditemukan', 'error');
        const data = rSnap.data();

        const pegawais = window.appState.pegawai || [];
        let chkPegawai = pegawais.map(p => `
            <label class="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded cursor-pointer border-b border-slate-100">
                <input type="checkbox" name="rapat-peserta-chk" value="${p.id}" class="w-4 h-4 text-amber-600 rounded" ${(data.peserta||[]).includes(p.id)?'checked':''}>
                <span class="text-xs font-bold text-slate-700">${p.nama} <span class="text-[9px] text-slate-400">(${p.hakAkses})</span></span>
            </label>
        `).join('');

        Swal.fire({
            title: 'Revisi Data Rapat',
            html: `
                <input type="text" id="rapat-judul" value="${data.judul}" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-amber-500 text-center mb-3" placeholder="Judul rapat" required>
                <textarea id="rapat-deskripsi" rows="2" class="w-full border-2 border-slate-200 p-3 rounded-xl font-medium focus:outline-amber-500 mb-3" placeholder="Deskripsi/Agenda...">${data.deskripsi||''}</textarea>
                <div class="grid grid-cols-2 gap-3 mb-3 text-left">
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">Tgl Mulai</label><input type="date" id="rapat-tgl" value="${data.tanggalMulai||''}" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-amber-500" required></div>
                    <div><label class="text-[10px] font-bold text-slate-500 uppercase">Pukul</label><input type="time" id="rapat-wkt" value="${data.waktuMulai||''}" class="w-full border-2 border-slate-200 p-2.5 rounded-xl font-bold focus:outline-amber-500" required></div>
                </div>
                
                <label class="text-[10px] font-bold text-slate-500 uppercase block text-left mb-1">Revisi Peserta:</label>
                <div class="mb-3 max-h-40 overflow-y-auto border-2 border-slate-200 p-2 rounded-xl text-left bg-slate-50 custom-scrollbar">
                    <label class="flex items-center gap-2 p-1.5 hover:bg-amber-100 bg-amber-50 rounded cursor-pointer border-b border-amber-200 mb-1">
                        <input type="checkbox" onchange="document.querySelectorAll('input[name=\\'rapat-peserta-chk\\']').forEach(cb => cb.checked = this.checked)" class="w-4 h-4 text-amber-600 rounded">
                        <span class="text-xs font-black text-amber-800">Pilih Semua Pegawai</span>
                    </label>
                    ${chkPegawai || '<p class="text-xs text-slate-400 text-center py-2">Belum ada pegawai</p>'}
                </div>

                <label class="text-[10px] font-bold text-slate-500 uppercase block text-left mb-1">Revisi Honor (Rp):</label>
                <input type="number" id="rapat-nominal" value="${data.nominalHonor||0}" class="w-full border-2 border-slate-200 p-3 rounded-xl font-black text-amber-700 focus:outline-amber-500 text-center" required>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-save mr-1"></i> Simpan Revisi',
            confirmButtonColor: '#f59e0b',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const judul = document.getElementById('rapat-judul').value;
                const deskripsi = document.getElementById('rapat-deskripsi').value;
                const tgl = document.getElementById('rapat-tgl').value;
                const wkt = document.getElementById('rapat-wkt').value;
                const nominal = document.getElementById('rapat-nominal').value;
                const peserta = Array.from(document.querySelectorAll('input[name="rapat-peserta-chk"]:checked')).map(cb => cb.value);
                
                if (!judul || !deskripsi || !tgl || !wkt || nominal==='' || peserta.length===0) { 
                    Swal.showValidationMessage('Semua kolom wajib diisi & minimal 1 peserta dipilih!'); return false; 
                }
                return { judul, deskripsi, tgl, wkt, nominal: Number(nominal), peserta };
            }
        }).then(async (res) => {
            if (res.isConfirmed) {
                Swal.fire({title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
                await updateDoc(doc(db, "Rapat", idRapat), {
                    judul: res.value.judul, deskripsi: res.value.deskripsi,
                    tanggalMulai: res.value.tgl, waktuMulai: res.value.wkt,
                    nominalHonor: res.value.nominal, peserta: res.value.peserta,
                    updatedAt: new Date().toISOString()
                });
                
                await push(ref(getDatabase(app), 'Pemberitahuan'), {
                    judul: `[Revisi Jadwal] ${res.value.judul}`,
                    isi: `Mohon perhatikan jadwal baru: ${res.value.tgl.split('-').reverse().join('/')} pkl ${res.value.wkt}. Agenda: ${res.value.deskripsi}.`,
                    pengirim: window.currentUser.nama, timestamp: Date.now()
                });

                Swal.fire('Berhasil!', 'Jadwal rapat direvisi dan notifikasi perubahan telah disiarkan.', 'success');
                window.navigate('absensi');
            }
        });
    } catch(e) { Swal.fire('Error', 'Gagal memuat data', 'error'); }
};

window.hadirRapat = async function(idRapat, judul) {
    if (typeof Swal !== 'undefined') Swal.fire({title: 'Merekam Kehadiran...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    try {
        const { db } = await import('./firebase-init.js');
        const { collection, addDoc, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        const rapatSnap = await getDoc(doc(db, "Rapat", idRapat));
        const nominalHonor = rapatSnap.exists() ? (rapatSnap.data().nominalHonor || 0) : 0;

        const now = new Date();
        await addDoc(collection(db, "Absensi"), {
            idGuru: window.currentUser.id,
            namaGuru: window.currentUser.nama,
            tanggal: window.getLocalISOString(),
            waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' }),
            tipe: 'Rapat',
            status: 'Hadir Rapat',
            idRapat: idRapat,
            honorRapat: nominalHonor, 
            keterangan: `Hadir Rapat: ${judul}`,
            jabatan: window.currentUser.hakAkses || 'Pegawai',
            kelas: '-', mapel: '-', jamTxt: '-', terlambat: 0,
            createdAt: now.toISOString()
        });
        if (typeof Swal !== 'undefined') Swal.fire('Berhasil!', 'Kehadiran rapat Anda telah tercatat dan masuk ke Histori.', 'success');
        else alert('Berhasil tercatat!');
        window.navigate('absensi');
    } catch(e) { 
        if (typeof Swal !== 'undefined') Swal.fire('Error', 'Gagal merekam presensi rapat.', 'error');
        else alert('Gagal');
    }
};

window.tutupRapat = async function(idRapat) {
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Tutup Sesi Rapat?',
            text: "Pegawai tidak akan bisa melakukan presensi untuk rapat ini lagi.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Tutup Rapat',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({title: 'Menutup Sesi...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
                try {
                    const { db } = await import('./firebase-init.js');
                    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
                    await updateDoc(doc(db, "Rapat", idRapat), { status: "Selesai", closedAt: new Date().toISOString() });
                    Swal.fire('Ditutup!', 'Presensi rapat telah diakhiri.', 'success');
                    window.navigate('absensi');
                } catch(e) { Swal.fire('Error', 'Gagal menutup rapat', 'error'); }
            }
        });
    }
};

// ==========================================
// POP-UP MASA UJI COBA (TRIAL)
// ==========================================
window.tampilkanPopupTrial = function() {
    const lembaga = (window.appState && window.appState.lembaga && window.appState.lembaga[0]) ? window.appState.lembaga[0] : {};
    const trialEnd = lembaga.masaUjiCobaAkhir || "";
    
    if (trialEnd) {
        const today = new Date().toISOString().split('T')[0];
        if (today <= trialEnd) {
            if (!document.getElementById('trial-popup-banner')) {
                const div = document.createElement('div');
                div.id = 'trial-popup-banner';
                div.className = 'fixed bottom-4 right-4 z-[9999] bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm border-2 border-white animate-fade-in';
                div.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation text-4xl animate-pulse"></i>
                    <div>
                        <h4 class="font-black text-sm uppercase tracking-wider">Masa Uji Coba Aktif!</h4>
                        <p class="text-[10px] font-bold mt-1 leading-relaxed text-yellow-100">Sistem Premium berjalan otomatis hingga batas <b>${trialEnd}</b>. Segera hubungi Super Admin untuk melanjutkan berlangganan.</p>
                    </div>
                    <button onclick="this.parentElement.remove()" class="text-white hover:text-red-200 absolute top-2 right-2"><i class="fa-solid fa-times"></i></button>
                `;
                document.body.appendChild(div);
                
                if(typeof Swal !== 'undefined' && !window.hasShownTrialAlert) {
                    Swal.fire({
                        title: 'TRIAL PREMIUM AKTIF!',
                        html: `Sistem mendeteksi Anda sedang berada dalam masa <b>Uji Coba</b> yang akan berakhir pada tanggal <b class="text-amber-600">${trialEnd}</b>.<br><br>Seluruh modul dan fitur lanjutan saat ini telah terbuka. Harap ingatkan bagian terkait untuk segera melunasi pembayaran sebelum sistem mengunci fitur secara otomatis pada tanggal tersebut.`,
                        icon: 'info',
                        confirmButtonText: 'Ya, Saya Mengerti',
                        confirmButtonColor: '#f59e0b',
                        backdrop: `rgba(0,0,0,0.8)`
                    });
                    window.hasShownTrialAlert = true;
                }
            }
        }
    }
};

// ==========================================
// HALAMAN PENGATURAN PAKET LISENSI MODULAR (KHUSUS SA)
// ==========================================
export function renderHalamanLisensi(container) {
    if(typeof window.tampilkanPopupTrial === 'function') window.tampilkanPopupTrial();

    const profilLembaga = window.appState.lembaga[0] || {};
    const fiturAktif = profilLembaga.lisensiFitur || []; 
    const trialEnd = profilLembaga.masaUjiCobaAkhir || "";

    const chk = (kode, nama, desc, icon) => `
        <label class="flex items-start p-4 border-2 border-slate-200 rounded-2xl cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition bg-white shadow-sm group">
            <input type="checkbox" name="fitur-premium-chk" value="${kode}" class="mt-1 w-6 h-6 text-amber-500 rounded cursor-pointer accent-amber-500" ${fiturAktif.includes(kode) ? 'checked' : ''}>
            <div class="ml-4">
                <span class="font-black text-slate-800 text-lg group-hover:text-amber-700 block mb-1"><i class="fa-solid ${icon} text-amber-500 mr-2"></i> ${nama}</span>
                <span class="text-xs font-bold text-slate-500 leading-relaxed block">${desc}</span>
            </div>
        </label>
    `;

    container.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl w-full p-8 md:p-10 flex flex-col border-t-4 border-amber-500 relative">
            <div class="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><i class="fa-solid fa-store text-9xl text-amber-500"></i></div>
            <div class="flex justify-between items-start mb-6 border-b border-slate-100 pb-6 relative z-10">
                <div>
                    <h2 class="text-3xl font-black text-slate-800"><i class="fa-solid fa-store text-amber-500 mr-3"></i> Manajemen Modul Aplikasi</h2>
                    <p class="text-sm font-bold text-slate-500 mt-2">Atur modul premium apa saja yang telah dilanggan dan berhak diakses oleh lembaga ini.</p>
                </div>
            </div>
            
            <form onsubmit="window.simpanLisensiPage(event)" class="relative z-10 flex flex-col">
                <div class="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-2xl shadow-sm">
                    <h4 class="font-black text-blue-900 mb-2 uppercase tracking-wider"><i class="fa-solid fa-clock-rotate-left text-blue-600 mr-2"></i> Pengaturan Masa Uji Coba (Trial)</h4>
                    <p class="text-xs font-bold text-blue-700 mb-4">Selama masa uji coba belum terlewat, semua modul akan <b class="bg-blue-200 px-1 rounded">TERBUKA OTOMATIS</b> meskipun tidak dicentang di bawah ini.</p>
                    <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Berlaku Sampai Tanggal:</label>
                    <input type="date" id="lisensi-trial-date" value="${trialEnd}" class="border-2 border-white p-3 rounded-xl w-full md:w-1/3 font-bold text-blue-800 focus:outline-blue-500 shadow-sm cursor-pointer">
                    <button type="button" onclick="document.getElementById('lisensi-trial-date').value=''" class="ml-2 text-xs font-bold text-red-500 hover:text-red-700 transition">Hapus Trial</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    ${chk('presensi_plus', 'Presensi Rapat & Pro', 'Modul jadwal rapat interaktif, absensi susulan, deteksi kalender libur, serta mode kedisiplinan Super Ketat (GPS).', 'fa-users-viewfinder')}
                    ${chk('kalender_plus', 'Kalender Lanjutan', 'Integrasi kalender Hijriah otomatis, pengulangan agenda tahunan, dan notifikasi hari nasional di dasbor.', 'fa-calendar-plus')}
                    ${chk('raport_plus', 'E-Raport Pro & CBT', 'Fitur input nilai rapor massal (bulk entry), tarik nilai CBT otomatis, dan arsip raport permanen.', 'fa-laptop-code')}
                    ${chk('keuangan_plus', 'Keuangan Terpadu', 'Pembayaran SPP yang terhubung langsung ke Portal Ortu, modul manajemen Beasiswa, dan Input Kas Massal.', 'fa-sack-dollar')}
                    ${chk('tahfidz_plus', 'Analitik Tahfidz', 'Grafik perkembangan visual capaian santri, riwayat detail, dan widget laporan kepengasuhan di dasbor utama.', 'fa-chart-line')}
                    ${chk('ortu_portal', 'Akses Portal Ortu', 'Sistem pengiriman notifikasi khusus / tagihan ke aplikasi wali murid, serta pantauan kehadiran secara realtime.', 'fa-mobile-screen')}
                    ${chk('tugas_pegawai', 'Manajemen Tugas', 'Papan Kanban Kanban board interaktif untuk pendelegasian tugas pegawai dan pemberitahuan realtime.', 'fa-list-check')}
                    ${chk('ppdb_online', 'Sistem PPDB Online', 'Web publik pendaftaran siswa baru yang bisa auto-sinkron ke Sisfo, integrasi QRIS, dan tombol lulus/gagal.', 'fa-address-card')}
                </div>
                
                <div class="bg-amber-50 p-6 border border-amber-200 rounded-2xl mb-8 flex items-start">
                    <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-500 mr-4 mt-1"></i>
                    <p class="text-sm font-bold text-amber-800 leading-relaxed">Peringatan: Jika Masa Trial kosong/berakhir, Modul yang tidak dicentang di sini akan otomatis "digembok" dan dihilangkan dari tampilan menu seluruh akun pegawai secara instan.</p>
                </div>

                <div class="flex justify-end">
                    <button type="submit" id="btn-simpan-lisensi-page" class="w-full md:w-auto md:px-12 bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg"><i class="fa-solid fa-save mr-2"></i> Terapkan & Gembok Sistem</button>
                </div>
            </form>
        </div>
    `;
}

window.simpanLisensiPage = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-lisensi-page');
    const ori = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menerapkan Gembok...';
    btn.disabled = true;

    const checkedFitur = Array.from(document.querySelectorAll('input[name="fitur-premium-chk"]:checked')).map(cb => cb.value);
    const trialDate = document.getElementById('lisensi-trial-date').value;
    const profilLembaga = window.appState.lembaga[0];

    if (!profilLembaga || !profilLembaga.id) {
        alert("Lembaga belum terdaftar! Silakan isi Data Lembaga terlebih dahulu.");
        btn.innerHTML = ori; btn.disabled = false; return;
    }

    try {
        const { db } = await import('./firebase-init.js');
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { lisensiFitur: checkedFitur, masaUjiCobaAkhir: trialDate });
        window.appState.lembaga[0].lisensiFitur = checkedFitur;
        window.appState.lembaga[0].masaUjiCobaAkhir = trialDate;
        
        alert("Sistem berhasil diperbarui! Gembok dan akses fitur telah diselaraskan dengan modul dan masa trial yang dipilih.");
        window.navigate('dashboard'); 
        location.reload(); 
    } catch(err) {
        alert('Terjadi kesalahan saat mengubah lisensi: ' + err.message);
        btn.innerHTML = ori; btn.disabled = false;
    }
};