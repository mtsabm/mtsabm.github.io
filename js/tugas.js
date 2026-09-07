import { db } from './firebase-init.js';
import { collection, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function renderHalamanTugas(container) {
    const currentUser = window.currentUser || {};
    const isSA_Admin = currentUser.hakAkses === 'Super Admin' || currentUser.hakAkses === 'Administrator' || currentUser.hakAkses === 'Operator/TU';
    const isHead = isSA_Admin || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala') || j.namaJabatan.toLowerCase().includes('ketua'));
    
    const tasks = window.appState.tugas || [];
    
    // Logika Visibilitas: Atasan melihat semua, bawahan hanya melihat tugas miliknya
    const visibleTasks = (isSA_Admin || isHead) ? tasks : tasks.filter(t => t.idPenerima === currentUser.id || t.idPembuat === currentUser.id);

    const todoTasks = visibleTasks.filter(t => t.status === 'To Do');
    const progressTasks = visibleTasks.filter(t => t.status === 'Progress');
    const doneTasks = visibleTasks.filter(t => t.status === 'Selesai');

    const daftarPegawai = window.appState.pegawai || [];
    let optPegawai = daftarPegawai.map(p => `<option value="${p.id}">${p.nama}</option>`).join('');

    const renderCard = (t) => {
        let prioColor = t.prioritas === 'Tinggi' ? 'rose' : (t.prioritas === 'Sedang' ? 'amber' : 'emerald');
        const canEdit = isSA_Admin || isHead || t.idPembuat === currentUser.id;
        
        return `
        <div draggable="true" ondragstart="window.dragStartTugas(event, '${t.id}')" class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-${prioColor}-300 transition cursor-grab active:cursor-grabbing mb-3 group relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-${prioColor}-400"></div>
            ${canEdit ? `<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                <button onclick="window.editTugas('${t.id}')" class="w-7 h-7 bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-600 rounded flex items-center justify-center text-xs transition shadow-sm"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.hapusTugas('${t.id}')" class="w-7 h-7 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded flex items-center justify-center text-xs transition shadow-sm"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
            <div class="flex items-center gap-2 mb-2 pl-2">
                <span class="bg-${prioColor}-50 text-${prioColor}-600 border border-${prioColor}-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">${t.prioritas}</span>
                <span class="text-[9px] font-bold text-slate-400"><i class="fa-regular fa-clock mr-1"></i> ${t.tenggatWaktu ? t.tenggatWaktu.split('-').reverse().join('/') : '-'}</span>
            </div>
            <h4 class="font-black text-slate-800 text-sm leading-tight mb-1 pr-12 pl-2">${t.judul}</h4>
            <p class="text-[10px] text-slate-500 line-clamp-2 mb-3 pl-2 leading-relaxed">${t.deskripsi}</p>
            <div class="flex items-center justify-between border-t border-slate-100 pt-3 pl-2">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black border border-indigo-200 shadow-inner">${t.namaPenerima ? t.namaPenerima.charAt(0).toUpperCase() : '?'}</div>
                    <div>
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Dikerjakan Oleh:</p>
                        <p class="text-[10px] font-bold text-slate-700 leading-none">${t.namaPenerima || 'Tanpa Nama'}</p>
                    </div>
                </div>
            </div>
        </div>`;
    };

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight"><i class="fa-solid fa-list-check text-amber-500 mr-2"></i> Papan Tugas (Kanban)</h2>
                <p class="text-xs font-bold text-slate-500 mt-1">Kelola tugas harian dan proyek dengan fitur seret & lepas (Drag & Drop).</p>
            </div>
            ${isSA_Admin || isHead ? `<button onclick="window.bukaModalTugas()" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg transition flex items-center transform hover:-translate-y-1 w-full md:w-auto justify-center"><i class="fa-solid fa-plus mr-2"></i> Buat Tugas Baru</button>` : ''}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-200px)] overflow-hidden">
            <div class="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col h-[500px] lg:h-full shadow-inner">
                <h3 class="font-black text-slate-700 mb-4 flex justify-between items-center border-b border-slate-200 pb-2"><span class="flex items-center"><div class="w-3 h-3 rounded-full bg-slate-400 mr-2 shadow-inner"></div> Menunggu (To Do)</span> <span class="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-xs shadow-sm">${todoTasks.length}</span></h3>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-1 pb-10 rounded-xl transition-colors duration-300" ondragover="window.allowDropTugas(event)" ondragleave="window.leaveDropTugas(event)" ondrop="window.dropTugas(event, 'To Do')">
                    ${todoTasks.length > 0 ? todoTasks.map(renderCard).join('') : '<div class="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold bg-white/50"><i class="fa-solid fa-box-open text-3xl mb-2 opacity-50 block"></i>Belum ada tugas.</div>'}
                </div>
            </div>

            <div class="bg-blue-50/50 rounded-2xl border border-blue-100 p-4 flex flex-col h-[500px] lg:h-full shadow-inner">
                <h3 class="font-black text-blue-800 mb-4 flex justify-between items-center border-b border-blue-200 pb-2"><span class="flex items-center"><div class="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-inner animate-pulse"></div> Sedang Dikerjakan</span> <span class="bg-white border border-blue-200 text-blue-800 px-2 py-0.5 rounded-lg text-xs shadow-sm">${progressTasks.length}</span></h3>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-1 pb-10 rounded-xl transition-colors duration-300" ondragover="window.allowDropTugas(event)" ondragleave="window.leaveDropTugas(event)" ondrop="window.dropTugas(event, 'Progress')">
                    ${progressTasks.length > 0 ? progressTasks.map(renderCard).join('') : '<div class="text-center p-8 border-2 border-dashed border-blue-200 rounded-xl text-blue-400 text-xs font-bold bg-white/50"><i class="fa-solid fa-people-carry-box text-3xl mb-2 opacity-50 block"></i>Tarik tugas ke sini.</div>'}
                </div>
            </div>

            <div class="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 flex flex-col h-[500px] lg:h-full shadow-inner">
                <h3 class="font-black text-emerald-800 mb-4 flex justify-between items-center border-b border-emerald-200 pb-2"><span class="flex items-center"><div class="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-inner"></div> Selesai (Done)</span> <span class="bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg text-xs shadow-sm">${doneTasks.length}</span></h3>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-1 pb-10 rounded-xl transition-colors duration-300" ondragover="window.allowDropTugas(event)" ondragleave="window.leaveDropTugas(event)" ondrop="window.dropTugas(event, 'Selesai')">
                    ${doneTasks.length > 0 ? doneTasks.map(renderCard).join('') : '<div class="text-center p-8 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-400 text-xs font-bold bg-white/50"><i class="fa-solid fa-flag-checkered text-3xl mb-2 opacity-50 block"></i>Belum ada tugas yang selesai.</div>'}
                </div>
            </div>
        </div>

        <div id="modal-tugas" class="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm hidden animate-fade-in">
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border-t-4 border-amber-500">
                <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                    <h3 class="text-xl font-black text-amber-900" id="modal-tugas-title"><i class="fa-solid fa-plus-circle mr-2"></i> Buat Tugas Baru</h3>
                    <button onclick="document.getElementById('modal-tugas').classList.add('hidden')" class="bg-white w-8 h-8 rounded-full text-amber-400 hover:text-red-500 hover:bg-red-50 text-lg transition flex justify-center items-center shadow-sm"><i class="fa-solid fa-times"></i></button>
                </div>
                <form onsubmit="window.simpanTugas(event)" class="p-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
                    <input type="hidden" id="tugas-id">
                    <div class="mb-4">
                        <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Judul Tugas</label>
                        <input type="text" id="tugas-judul" placeholder="Cth: Rekap Laporan Keuangan" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-amber-500 bg-slate-50" required>
                    </div>
                    <div class="mb-4">
                        <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Catatan Tambahan</label>
                        <textarea id="tugas-deskripsi" rows="3" placeholder="Jelaskan detail tugas di sini..." class="w-full border-2 border-slate-200 p-3 rounded-xl font-medium focus:outline-amber-500 bg-slate-50 text-sm"></textarea>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Serahkan Kepada</label>
                            <select id="tugas-penerima" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-amber-500 cursor-pointer text-sm" required>
                                <option value="">-- Pilih Pegawai --</option>
                                ${optPegawai}
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Tenggat Waktu</label>
                            <input type="date" id="tugas-deadline" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold focus:outline-amber-500 text-sm" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 border-t border-slate-100 pt-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Prioritas</label>
                            <select id="tugas-prioritas" class="w-full border-2 border-slate-200 p-3 rounded-xl font-black focus:outline-amber-500 cursor-pointer text-sm">
                                <option value="Rendah" class="text-emerald-600">🟢 Rendah</option>
                                <option value="Sedang" class="text-amber-600" selected>🟡 Sedang</option>
                                <option value="Tinggi" class="text-rose-600">🔴 Tinggi</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Status Awal</label>
                            <select id="tugas-status" class="w-full border-2 border-slate-200 p-3 rounded-xl font-black focus:outline-amber-500 cursor-pointer text-sm">
                                <option value="To Do" selected>To Do (Menunggu)</option>
                                <option value="Progress">Progress (Dikerjakan)</option>
                                <option value="Selesai">Selesai (Done)</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" id="btn-simpan-tugas" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1"><i class="fa-solid fa-save mr-2"></i> Simpan Tugas</button>
                </form>
            </div>
        </div>
    `;
}

// ================= HELPER & DRAG DROP FUNGSI =================
window.bukaModalTugas = function() {
    document.getElementById('tugas-id').value = '';
    ['judul', 'deskripsi', 'penerima', 'deadline'].forEach(id => document.getElementById(`tugas-${id}`).value = '');
    document.getElementById('tugas-prioritas').value = 'Sedang';
    document.getElementById('tugas-status').value = 'To Do';
    document.getElementById('modal-tugas-title').innerHTML = '<i class="fa-solid fa-plus-circle mr-2"></i> Buat Tugas Baru';
    document.getElementById('modal-tugas').classList.remove('hidden');
};

window.editTugas = function(id) {
    const t = window.appState.tugas.find(x => x.id === id);
    if(!t) return;
    document.getElementById('tugas-id').value = t.id;
    document.getElementById('tugas-judul').value = t.judul || '';
    document.getElementById('tugas-deskripsi').value = t.deskripsi || '';
    document.getElementById('tugas-penerima').value = t.idPenerima || '';
    document.getElementById('tugas-deadline').value = t.tenggatWaktu || '';
    document.getElementById('tugas-prioritas').value = t.prioritas || 'Sedang';
    document.getElementById('tugas-status').value = t.status || 'To Do';
    document.getElementById('modal-tugas-title').innerHTML = '<i class="fa-solid fa-pen mr-2"></i> Edit Tugas';
    document.getElementById('modal-tugas').classList.remove('hidden');
};

window.simpanTugas = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-tugas');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; btn.disabled = true;

    const id = document.getElementById('tugas-id').value;
    const idPenerima = document.getElementById('tugas-penerima').value;
    const penerimaObj = window.appState.pegawai.find(p => p.id === idPenerima);

    const data = {
        judul: document.getElementById('tugas-judul').value,
        deskripsi: document.getElementById('tugas-deskripsi').value,
        idPenerima: idPenerima,
        namaPenerima: penerimaObj ? penerimaObj.nama : 'Unknown',
        tenggatWaktu: document.getElementById('tugas-deadline').value,
        prioritas: document.getElementById('tugas-prioritas').value,
        status: document.getElementById('tugas-status').value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "Tugas", id), data);
        } else {
            data.idPembuat = window.currentUser.id;
            data.namaPembuat = window.currentUser.nama;
            data.createdAt = new Date().toISOString();
            await addDoc(collection(db, "Tugas"), data);
        }
        document.getElementById('modal-tugas').classList.add('hidden');
    } catch(err) { alert("Gagal menyimpan tugas!"); }
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Tugas'; btn.disabled = false;
};

window.hapusTugas = async function(id) {
    if(!confirm("Yakin ingin menghapus tugas ini?")) return;
    try { await deleteDoc(doc(db, "Tugas", id)); } catch(e) { alert("Gagal menghapus."); }
};

window.dragStartTugas = function(e, id) {
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => e.target.classList.add('opacity-40', 'scale-95', 'rotate-2'), 0);
};

window.allowDropTugas = function(e) {
    e.preventDefault();
    e.currentTarget.classList.add('bg-slate-200/60');
};

window.leaveDropTugas = function(e) {
    e.currentTarget.classList.remove('bg-slate-200/60');
};

window.dropTugas = async function(e, newStatus) {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-200/60');
    const id = e.dataTransfer.getData('text/plain');
    if(!id) return;
    
    const task = window.appState.tugas.find(t => t.id === id);
    if(!task) return;

    const currentUser = window.currentUser || {};
    const isSA_Admin = currentUser.hakAkses === 'Super Admin' || currentUser.hakAkses === 'Administrator' || currentUser.hakAkses === 'Operator/TU';
    const isHead = isSA_Admin || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kepala') || j.namaJabatan.toLowerCase().includes('ketua'));
    
    if (!isSA_Admin && !isHead && task.idPenerima !== currentUser.id && task.idPembuat !== currentUser.id) {
        return alert("Anda tidak memiliki akses untuk memindahkan tugas ini.");
    }

    if (task.status !== newStatus) {
        try { await updateDoc(doc(db, "Tugas", id), { status: newStatus, updatedAt: new Date().toISOString() }); } 
        catch(err) { console.error(err); }
    }
};

document.addEventListener('dragend', (e) => {
    if(e.target.classList) e.target.classList.remove('opacity-40', 'scale-95', 'rotate-2');
    document.querySelectorAll('.bg-slate-200\\/60').forEach(el => el.classList.remove('bg-slate-200/60'));
});
