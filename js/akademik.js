import { db } from './firebase-init.js';
import { collection, addDoc, doc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// STATE & FUNGSI BANTUAN WAKTU
// ==========================================
window.currentKelasAbjad = null;
const HARI_KERJA_GLOBAL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

function waktuKeMenit(waktuStr) {
    if (!waktuStr || !waktuStr.includes(':')) return 0;
    const [h, m] = waktuStr.split(':').map(Number);
    return (h * 60) + m;
}

function menitKeWaktu(menitTtl) {
    const h = Math.floor(menitTtl / 60).toString().padStart(2, '0');
    const m = (menitTtl % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

// Menghitung jam mulai dan selesai berurutan, mendukung pengecualian (exceptions) per hari
function kalkulasiSlotWaktuOtomatis(slots) {
    let waktuSekarangDefault = null;
    let waktuSekarangHari = {};
    HARI_KERJA_GLOBAL.forEach(h => waktuSekarangHari[h] = null);

    return slots.map((s, index) => {
        if (!s.exceptions) s.exceptions = {};
        if (!s.times) s.times = {};

        // Patokan dasar dari slot pertama
        if (index === 0) {
            const startMin = s.startStr ? waktuKeMenit(s.startStr) : waktuKeMenit("07:30");
            waktuSekarangDefault = startMin;
            HARI_KERJA_GLOBAL.forEach(h => waktuSekarangHari[h] = startMin);
        }

        // Kalkulasi Default (Kolom Kiri Utama)
        const durasiDefault = Number(s.durasiMenit || 40);
        const slotStartDef = waktuSekarangDefault;
        const slotEndDef = slotStartDef + durasiDefault;
        waktuSekarangDefault = slotEndDef;

        s.startStr = menitKeWaktu(slotStartDef);
        s.endStr = menitKeWaktu(slotEndDef);

        // Kalkulasi per masing-masing Hari (Tabel Sel)
        HARI_KERJA_GLOBAL.forEach(h => {
            const durasiHariIni = s.exceptions[h] !== undefined ? Number(s.exceptions[h]) : durasiDefault;
            const slotStartHari = waktuSekarangHari[h];
            const slotEndHari = slotStartHari + durasiHariIni;
            waktuSekarangHari[h] = slotEndHari;

            s.times[h] = {
                startStr: menitKeWaktu(slotStartHari),
                endStr: menitKeWaktu(slotEndHari),
                durasi: durasiHariIni,
                isCustom: s.exceptions[h] !== undefined
            };
        });

        return s;
    });
}

function getRosterSlots(kelas, profilLembaga) {
    const customConfig = profilLembaga.rosterConfigManual || {};
    let kelasConfig = customConfig[kelas];

    // Konversi jika format lama (array)
    if (Array.isArray(kelasConfig)) kelasConfig = { mode: 'manual', slots: kelasConfig };

    if (kelasConfig && kelasConfig.mode === 'manual' && kelasConfig.slots && kelasConfig.slots.length > 0) {
        return kalkulasiSlotWaktuOtomatis(kelasConfig.slots);
    }

    // Default fallback otomatis
    let curMins = waktuKeMenit(profilLembaga.umumMasuk || "07:00");
    let durasi = Number(profilLembaga.umumJp || 40);
    let endMins = waktuKeMenit(profilLembaga.umumPulang || "14:00");
    let breaks = [];
    if (profilLembaga.umumIstirahat) {
        breaks = profilLembaga.umumIstirahat.split(',').map(s => {
            const [bs, be] = s.split('-'); return { start: waktuKeMenit(bs), end: waktuKeMenit(be) };
        });
    }

    let defaultSlots = [];
    let jamKe = 1;
    while (curMins < endMins && jamKe <= 12) {
        let activeBreak = breaks.find(b => curMins >= b.start && curMins < b.end);
        if (activeBreak) {
            defaultSlots.push({ id: 'slot_' + Math.random().toString(36).substr(2, 9), type: 'break', label: 'Istirahat', durasiMenit: activeBreak.end - activeBreak.start, exceptions: {} });
            curMins = activeBreak.end; continue;
        }

        let slotEnd = curMins + durasi;
        let hitBreak = breaks.find(b => slotEnd > b.start && curMins < b.start);
        if (hitBreak) slotEnd = hitBreak.start;

        defaultSlots.push({ id: 'slot_' + Math.random().toString(36).substr(2, 9), type: 'jam', jamKe: jamKe, durasiMenit: slotEnd - curMins, exceptions: {} });
        curMins = slotEnd; if (!hitBreak) jamKe++;
    }
    return kalkulasiSlotWaktuOtomatis(defaultSlots);
}

// ==========================================
// DRAG AND DROP JADWAL GURU
// ==========================================
window.dragStartJadwal = function(event, idGuru, namaGuru, mapel) {
    event.dataTransfer.setData('application/json', JSON.stringify({ idGuru, namaGuru, mapel }));
    event.dataTransfer.effectAllowed = 'copy';
    event.target.classList.add('opacity-50', 'scale-95');
};
window.dragEndJadwal = function(event) { event.target.classList.remove('opacity-50', 'scale-95'); };
window.allowDropJadwal = function(event) { event.preventDefault(); event.currentTarget.classList.add('bg-indigo-100', 'border-indigo-400'); };
window.dragLeaveJadwal = function(event) { event.currentTarget.classList.remove('bg-indigo-100', 'border-indigo-400'); };

window.dropJadwal = async function(event, hari, jamKe, kelasTarget) {
    event.preventDefault();
    event.currentTarget.classList.remove('bg-indigo-100', 'border-indigo-400');
    const rawData = event.dataTransfer.getData('application/json');
    if (!rawData) return;

    const data = JSON.parse(rawData);
    const jadwalSemua = window.appState.jadwal || [];

    const profilGuru = window.appState.pegawai.find(p => p.id === data.idGuru);
    if (profilGuru) {
        const jf = (profilGuru.detailJabatan || []).find(j => j.namaJabatan.toLowerCase().includes('guru'));
        if (jf) {
            const maxKuota = Number(jf.kuota || 0);
            const terpakai = jadwalSemua.filter(j => j.idGuru === data.idGuru).length;
            const isOverwritingOwnSlot = jadwalSemua.some(j => j.hari === hari && j.jamKe === jamKe && j.kelas === kelasTarget && j.idGuru === data.idGuru);
            if (!isOverwritingOwnSlot && terpakai >= maxKuota) {
                return alert(`❌ GAGAL!\n\nSisa Kuota JP untuk Guru ${data.namaGuru} sudah habis (${maxKuota} JP maksimal).`);
            }
        }
    }

    const bentrok = jadwalSemua.find(j => j.hari === hari && j.jamKe === jamKe && j.idGuru === data.idGuru && j.kelas !== kelasTarget);
    if (bentrok) return alert(`❌ BENTROK!\n\nGuru ${data.namaGuru} sudah memiliki jadwal mengajar di ${bentrok.kelas} pada hari ${hari} Jam ke-${jamKe}.`);

    const jadwalEksisting = jadwalSemua.find(j => j.hari === hari && j.jamKe === jamKe && j.kelas === kelasTarget);
    const payloadDB = { kelas: kelasTarget, hari: hari, jamKe: jamKe, idGuru: data.idGuru, namaGuru: data.namaGuru, mapel: data.mapel, updatedAt: new Date() };

    try {
        if (jadwalEksisting) await updateDoc(doc(db, "Jadwal", jadwalEksisting.id), payloadDB);
        else await addDoc(collection(db, "Jadwal"), payloadDB);
    } catch (error) { alert("Gagal menyimpan jadwal."); }
};

window.hapusJadwal = async function(idJadwal) {
    if(confirm("Kosongkan jam pelajaran ini?")) await deleteDoc(doc(db, "Jadwal", idJadwal));
};

// ==========================================
// FUNGSI MANIPULASI SLOT ROSTER MANUAL LANGSUNG
// ==========================================
window.tambahSlotRosterManual = async function(kelas, tipe) {
    const profilLembaga = window.appState.lembaga[0] || {};
    if (!profilLembaga.id) return alert("Simpan profil lembaga terlebih dahulu.");

    let currentSlots = getRosterSlots(kelas, profilLembaga);
    let nextJamKe = 1;
    currentSlots.forEach(s => {
        if (s.type === 'jam' && s.jamKe >= nextJamKe) nextJamKe = s.jamKe + 1;
    });

    let newSlot = {};
    if (tipe === 'jam') {
        newSlot = { id: 'slot_' + Math.random().toString(36).substr(2, 9), type: 'jam', jamKe: nextJamKe, durasiMenit: 40 };
    } else {
        newSlot = { id: 'slot_' + Math.random().toString(36).substr(2, 9), type: 'break', label: 'Istirahat', durasiMenit: 30 };
    }

    currentSlots.push(newSlot);
    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);

    let configManual = profilLembaga.rosterConfigManual || {};
    let kelasConfig = configManual[kelas];
    if (Array.isArray(kelasConfig)) kelasConfig = { mode: 'manual', slots: currentSlots };
    else if (kelasConfig) kelasConfig.slots = currentSlots;
    else kelasConfig = { mode: 'manual', slots: currentSlots };
    configManual[kelas] = kelasConfig;

    try {
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual;
        window.navigate('akademik');
    } catch (e) { alert("Gagal menambahkan slot: " + e.message); }
};

window.ubahDurasiSlot = async function(kelas, slotId, menitBaru) {
    const menit = Number(menitBaru);
    if (isNaN(menit) || menit <= 0) return alert("Durasi menit harus berupa angka valid lebih dari 0!");

    const profilLembaga = window.appState.lembaga[0] || {};
    let currentSlots = getRosterSlots(kelas, profilLembaga);
    const idx = currentSlots.findIndex(s => s.id === slotId);
    if (idx === -1) return;

    currentSlots[idx].durasiMenit = menit;
    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);

    let configManual = profilLembaga.rosterConfigManual || {};
    let kelasConfig = configManual[kelas] || { mode: 'manual', slots: [] };
    kelasConfig.slots = currentSlots;
    configManual[kelas] = kelasConfig;

    try {
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual;
        window.navigate('akademik');
    } catch (e) { alert("Gagal memperbarui durasi menit."); }
};

window.hapusSlotRosterManual = async function(kelas, slotId) {
    if (!confirm("Hapus baris slot jadwal ini?")) return;
    const profilLembaga = window.appState.lembaga[0] || {};
    let currentSlots = getRosterSlots(kelas, profilLembaga);
    currentSlots = currentSlots.filter(s => s.id !== slotId);

    let jamCounter = 1;
    currentSlots.forEach(s => { if (s.type === 'jam') s.jamKe = jamCounter++; });
    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);

    let configManual = profilLembaga.rosterConfigManual || {};
    let kelasConfig = configManual[kelas] || { mode: 'manual', slots: [] };
    kelasConfig.slots = currentSlots;
    configManual[kelas] = kelasConfig;

    try {
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual;
        window.navigate('akademik');
    } catch (e) { alert("Gagal menghapus slot."); }
};

window.ubahJamMulaiAwal = async function(kelas, jamMulaiBaru) {
    if (!jamMulaiBaru || !jamMulaiBaru.includes(':')) return;
    const profilLembaga = window.appState.lembaga[0] || {};
    let currentSlots = getRosterSlots(kelas, profilLembaga);
    if (currentSlots.length === 0) return;

    currentSlots[0].startStr = jamMulaiBaru;
    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);

    let configManual = profilLembaga.rosterConfigManual || {};
    let kelasConfig = configManual[kelas] || { mode: 'manual', slots: [] };
    kelasConfig.slots = currentSlots;
    configManual[kelas] = kelasConfig;

    try {
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual;
        window.navigate('akademik');
    } catch (e) { alert("Gagal memperbarui jam mulai."); }
};

window.toggleModeRoster = async function(kelas, isManual) {
    const profilLembaga = window.appState.lembaga[0] || {};
    let configManual = profilLembaga.rosterConfigManual || {};
    
    let existingData = configManual[kelas];
    if (Array.isArray(existingData)) existingData = { mode: 'manual', slots: existingData };
    if (!existingData) existingData = { mode: 'otomatis', slots: [] };

    existingData.mode = isManual ? 'manual' : 'otomatis';
    if (isManual && existingData.slots.length === 0) {
        existingData.slots = getRosterSlots(kelas, { ...profilLembaga, rosterConfigManual: {} });
    }
    configManual[kelas] = existingData;

    try { await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual; window.navigate('akademik');
    } catch (e) { alert("Gagal mengubah mode roster."); }
};

window.toggleExceptionSlot = async function(kelas, slotId, hari, isActive) {
    const profilLembaga = window.appState.lembaga[0] || {};
    let currentSlots = getRosterSlots(kelas, profilLembaga);
    const idx = currentSlots.findIndex(s => s.id === slotId);
    if (idx === -1) return;

    if (!currentSlots[idx].exceptions) currentSlots[idx].exceptions = {};
    
    if (isActive) {
        currentSlots[idx].exceptions[hari] = currentSlots[idx].durasiMenit; // Set default durasi awal
    } else {
        delete currentSlots[idx].exceptions[hari];
    }

    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);
    profilLembaga.rosterConfigManual[kelas].slots = currentSlots;
    try { await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: profilLembaga.rosterConfigManual }); window.navigate('akademik'); } 
    catch (e) { alert("Gagal mengatur exception hari."); }
};

window.ubahDurasiException = async function(kelas, slotId, hari, menitBaru) {
    const menit = Number(menitBaru);
    if (isNaN(menit) || menit < 0) return alert("Menit tidak valid.");

    const profilLembaga = window.appState.lembaga[0] || {};
    let currentSlots = getRosterSlots(kelas, profilLembaga);
    const idx = currentSlots.findIndex(s => s.id === slotId);
    if (idx === -1) return;

    currentSlots[idx].exceptions[hari] = menit;
    currentSlots = kalkulasiSlotWaktuOtomatis(currentSlots);
    profilLembaga.rosterConfigManual[kelas].slots = currentSlots;
    try { await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: profilLembaga.rosterConfigManual }); window.navigate('akademik'); } 
    catch (e) { alert("Gagal merubah durasi khusus."); }
};

window.terapkanRosterKeSemuaKelas = async function(kelasSumber) {
    if (!confirm(`Terapkan format tabel roster (JP, Istirahat, dan Pengecualian Hari) dari kelas ${kelasSumber} ke SEMUA KELAS lainnya?\n\nPerhatian: Jadwal Guru/Mapel tidak akan terhapus, ini hanya akan menyamakan bentuk tabel waktunya saja.`)) return;

    const profilLembaga = window.appState.lembaga[0] || {};
    const configManual = profilLembaga.rosterConfigManual || {};
    const sourceSlots = configManual[kelasSumber]?.slots;

    if (!sourceSlots || sourceSlots.length === 0) return alert("Roster kelas sumber kosong atau belum diubah menjadi mode manual!");

    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()) : [];
    
    daftarKelas.forEach(kls => {
        if (kls !== kelasSumber) {
            const clonedSlots = JSON.parse(JSON.stringify(sourceSlots));
            configManual[kls] = { mode: 'manual', slots: clonedSlots };
        }
    });

    try {
        await updateDoc(doc(db, "Lembaga", profilLembaga.id), { rosterConfigManual: configManual });
        profilLembaga.rosterConfigManual = configManual;
        alert("Roster berhasil diterapkan ke semua kelas!");
        window.navigate('akademik');
    } catch (e) { alert("Gagal menerapkan ke semua kelas."); }
};function generateGridHTML(kelasTarget, timeSlots, hariKerja, isLiburFunc, jadwalSemua, isReadOnly = false, isManualMode = false) {
    const jamAwal = (timeSlots.length > 0 && timeSlots[0].startStr) ? timeSlots[0].startStr : "07:30";

    let gridHTML = `<div class="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 min-w-[1200px]">`;
    gridHTML += `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-3 gap-3">
            <div>
                <h3 class="font-black text-xl text-indigo-800 uppercase tracking-wider flex items-center">
                    <i class="fa-solid fa-chalkboard text-indigo-500 mr-2"></i> ${kelasTarget}
                </h3>
                ${!isReadOnly ? `
                <label class="flex items-center cursor-pointer mt-2 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 w-max transition">
                    <input type="checkbox" onchange="window.toggleModeRoster('${kelasTarget}', this.checked)" class="w-4 h-4 text-indigo-600 rounded mr-2 cursor-pointer" ${isManualMode ? 'checked' : ''}>
                    <span class="text-xs text-indigo-800 font-bold">Gunakan Roster Mode Manual</span>
                </label>
                ` : ''}
            </div>
            ${(!isReadOnly && isManualMode) ? `
            <div class="flex flex-wrap items-center justify-end gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-sm">
                <div class="flex items-center bg-white px-2 py-1 rounded border border-slate-200">
                    <span class="text-xs font-bold text-slate-500 mr-1"><i class="fa-regular fa-clock mr-1"></i> Mulai:</span>
                    <input type="time" value="${jamAwal}" onchange="window.ubahJamMulaiAwal('${kelasTarget}', this.value)" class="border-0 p-0 rounded font-bold text-xs text-indigo-700 cursor-pointer focus:ring-0">
                </div>
                <button onclick="window.tambahSlotRosterManual('${kelasTarget}', 'jam')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3 py-2 rounded-lg transition shadow-sm flex items-center"><i class="fa-solid fa-plus mr-1"></i> Tambah JP</button>
                <button onclick="window.tambahSlotRosterManual('${kelasTarget}', 'break')" class="bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] px-3 py-2 rounded-lg transition shadow-sm flex items-center"><i class="fa-solid fa-mug-hot mr-1"></i> + Istirahat</button>
                <div class="w-px h-6 bg-slate-300 mx-1"></div>
                <button onclick="window.terapkanRosterKeSemuaKelas('${kelasTarget}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3 py-2 rounded-lg transition shadow-sm flex items-center" title="Copy format tabel ke semua kelas"><i class="fa-solid fa-copy mr-1"></i> Terapkan Semua</button>
            </div>
            ` : ''}
        </div>
    `;

    gridHTML += `<div class="grid grid-cols-8 gap-2">`;
    
    // Header Row
    gridHTML += `<div class="p-2 font-black text-[11px] text-slate-400 uppercase text-center flex flex-col items-center justify-center bg-slate-50 rounded-t-xl border-b-2 border-slate-200">Waktu Default <br> & Kolom Baris</div>`;
    hariKerja.forEach(hari => {
        const isLibur = isLiburFunc(hari);
        const headerClass = isLibur ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white';
        gridHTML += `<div class="${headerClass} font-black p-3 rounded-t-xl text-center shadow-sm uppercase tracking-widest text-sm flex flex-col justify-center"><span class="block">${hari}</span>${isLibur ? '<span class="text-[9px] font-bold bg-white/20 px-1 rounded mt-1">HARI LIBUR</span>' : ''}</div>`;
    });

    // Body Rows
    if (timeSlots.length === 0) {
        gridHTML += `<div class="col-span-8 p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">Belum ada baris jadwal. Aktifkan Mode Manual dan klik tombol "+ Tambah JP" di atas.</div>`;
    }

    timeSlots.forEach(slot => {
        if (slot.type === 'break') {
            gridHTML += `
            <div class="bg-orange-50 text-orange-700 p-2 rounded-l-xl flex flex-col items-center justify-center shadow-inner text-xs border-r-4 border-orange-400 group relative">
                <span class="font-black">ISTIRAHAT</span>
                ${(!isReadOnly && isManualMode) ? `
                <div class="flex items-center mt-1 gap-1">
                    <input type="number" value="${slot.durasiMenit}" onchange="window.ubahDurasiSlot('${kelasTarget}', '${slot.id}', this.value)" class="w-11 text-center font-bold text-[10px] border border-orange-200 rounded p-0.5 bg-white text-orange-900" title="Ubah menit">
                    <span class="text-[9px] text-slate-400">mnt</span>
                </div>
                ` : `<span class="text-[10px] font-bold text-orange-600 mt-0.5">${slot.durasiMenit} mnt</span>`}
                <span class="text-[9px] font-bold text-slate-400 mt-0.5">${slot.startStr}-${slot.endStr}</span>
                ${(!isReadOnly && isManualMode) ? `<button onclick="window.hapusSlotRosterManual('${kelasTarget}', '${slot.id}')" class="absolute -top-1 -left-1 text-red-500 hover:text-red-700 bg-white rounded-full w-5 h-5 shadow border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-times text-[10px]"></i></button>` : ''}
            </div>`;
            
            hariKerja.forEach(hari => {
                const tData = slot.times[hari];
                const isLibur = isLiburFunc(hari);

                let customUI = '';
                if (!isReadOnly && isManualMode) {
                    if (tData.isCustom) {
                        customUI = `
                        <div class="absolute inset-x-1 bottom-1 bg-white p-1 rounded border border-orange-300 shadow-sm flex flex-col items-center z-10 animate-fade-in">
                            <div class="flex items-center justify-between w-full border-b border-orange-100 pb-0.5 mb-0.5">
                                <span class="text-[7px] font-black text-orange-600">JAM KHUSUS</span>
                                <button onclick="window.toggleExceptionSlot('${kelasTarget}', '${slot.id}', '${hari}', false)" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-times text-[9px]"></i></button>
                            </div>
                            <div class="flex items-center justify-center gap-1 w-full mb-0.5">
                                <input type="number" value="${tData.durasi}" onchange="window.ubahDurasiException('${kelasTarget}', '${slot.id}', '${hari}', this.value)" class="w-9 text-center font-bold text-[9px] border rounded p-0.5 border-slate-300 focus:outline-indigo-500" title="Ubah menit">
                                <span class="text-[7px] font-bold text-slate-500">mnt</span>
                            </div>
                            <span class="text-[8px] font-bold text-orange-600">${tData.startStr} - ${tData.endStr}</span>
                        </div>`;
                    } else {
                        customUI = `<button onclick="window.toggleExceptionSlot('${kelasTarget}', '${slot.id}', '${hari}', true)" class="absolute bottom-1 right-1 text-slate-400 hover:text-orange-600 bg-white/80 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition z-10 shadow-sm" title="Buat durasi istirahat khusus di hari ini"><i class="fa-solid fa-clock text-[8px] mr-1"></i><span class="text-[8px] font-bold">Ubah JP</span></button>`;
                    }
                } else if (tData.isCustom) {
                     customUI = `<div class="absolute bottom-1 inset-x-1 flex flex-col items-center bg-white/80 rounded border border-orange-200 shadow-sm z-10 p-0.5"><span class="text-[7px] font-bold text-orange-600">${tData.durasi}mnt Khusus</span><span class="text-[8px] font-bold text-orange-600">${tData.startStr} - ${tData.endStr}</span></div>`;
                }

                gridHTML += `
                <div class="relative bg-orange-50/60 border-2 ${isLibur ? 'border-red-300 bg-red-50' : 'border-orange-200'} border-dashed rounded-lg p-2 h-full min-h-[75px] flex flex-col items-center justify-center text-center group">
                    <i class="fa-solid fa-mug-hot text-orange-400 mb-0.5 z-0"></i>
                    <span class="text-[9px] font-black text-orange-600 tracking-wider z-0">ISTIRAHAT</span>
                    ${customUI}
                </div>`;
            });

        } else {
            gridHTML += `
            <div class="bg-slate-100 text-slate-700 p-2 rounded-l-xl flex flex-col items-center justify-center shadow-inner text-sm border-r-4 border-indigo-400 group relative">
                <span class="font-black text-indigo-900 text-xs">JAM ${slot.jamKe}</span>
                ${(!isReadOnly && isManualMode) ? `
                <div class="flex items-center mt-1 gap-1">
                    <input type="number" value="${slot.durasiMenit}" onchange="window.ubahDurasiSlot('${kelasTarget}', '${slot.id}', this.value)" class="w-11 text-center font-bold text-[10px] border border-slate-300 rounded p-0.5 bg-white text-slate-800 focus:outline-indigo-500" title="Ubah menit">
                    <span class="text-[9px] text-slate-400 font-bold">mnt</span>
                </div>
                ` : `<span class="text-[10px] font-bold text-slate-600 mt-0.5">${slot.durasiMenit} mnt</span>`}
                <span class="text-[9px] font-bold text-slate-400 mt-0.5">${slot.startStr}-${slot.endStr}</span>
                ${(!isReadOnly && isManualMode) ? `<button onclick="window.hapusSlotRosterManual('${kelasTarget}', '${slot.id}')" class="absolute -top-1 -left-1 text-red-500 hover:text-red-700 bg-white rounded-full w-5 h-5 shadow border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-times text-[10px]"></i></button>` : ''}
            </div>`;
            
            hariKerja.forEach(hari => {
                const isLibur = isLiburFunc(hari);
                const tData = slot.times[hari];
                const jadwalIni = jadwalSemua.find(j => j.hari === hari && j.jamKe === slot.jamKe && j.kelas === kelasTarget);
                
                let customUI = '';
                if (!isReadOnly && isManualMode) {
                    if (tData.isCustom) {
                        customUI = `
                        <div class="absolute inset-x-1 bottom-1 bg-white p-1 rounded border border-indigo-200 shadow-sm flex flex-col items-center z-10 animate-fade-in">
                            <div class="flex items-center justify-between w-full border-b border-indigo-50 pb-0.5 mb-0.5">
                                <span class="text-[7px] font-black text-indigo-500">JAM KHUSUS</span>
                                <button onclick="window.toggleExceptionSlot('${kelasTarget}', '${slot.id}', '${hari}', false)" class="text-slate-300 hover:text-red-500"><i class="fa-solid fa-times text-[9px]"></i></button>
                            </div>
                            <div class="flex items-center justify-center gap-1 w-full mb-0.5">
                                <input type="number" value="${tData.durasi}" onchange="window.ubahDurasiException('${kelasTarget}', '${slot.id}', '${hari}', this.value)" class="w-9 text-center font-bold text-[9px] border rounded p-0.5 border-slate-300 focus:outline-indigo-500" title="Ubah menit">
                                <span class="text-[7px] font-bold text-slate-500">mnt</span>
                            </div>
                            <span class="text-[8px] font-bold text-indigo-600">${tData.startStr} - ${tData.endStr}</span>
                        </div>`;
                    } else {
                        customUI = `<button onclick="window.toggleExceptionSlot('${kelasTarget}', '${slot.id}', '${hari}', true)" class="absolute bottom-1 right-1 text-slate-400 hover:text-indigo-600 bg-white/80 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition z-10 shadow-sm" title="Buat durasi jp khusus di hari ini"><i class="fa-solid fa-clock text-[8px] mr-1"></i><span class="text-[8px] font-bold">Ubah JP</span></button>`;
                    }
                } else if (tData.isCustom) {
                     customUI = `<div class="absolute bottom-1 inset-x-1 flex flex-col items-center bg-white/80 rounded border border-indigo-200 shadow-sm z-10 p-0.5"><span class="text-[7px] font-bold text-indigo-600">${tData.durasi}mnt Khusus</span><span class="text-[8px] font-bold text-indigo-600">${tData.startStr} - ${tData.endStr}</span></div>`;
                }

                if (jadwalIni) {
                    gridHTML += `
                    <div class="relative bg-white border-2 ${isLibur ? 'border-red-400 bg-red-50/40' : 'border-indigo-500'} rounded-lg p-2 shadow-sm flex flex-col items-center justify-center text-center group cursor-default h-full min-h-[75px]">
                        ${!isReadOnly ? `<button onclick="window.hapusJadwal('${jadwalIni.id}')" class="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition z-10"><i class="fa-solid fa-circle-xmark"></i></button>` : ''}
                        <h5 class="text-[11px] font-black text-slate-800 leading-tight mb-1 z-0">${jadwalIni.mapel}</h5>
                        <p class="text-[9px] font-bold ${isLibur ? 'text-red-700 bg-red-100' : 'text-indigo-600 bg-indigo-50'} px-2 py-0.5 rounded truncate max-w-full z-0">${jadwalIni.namaGuru}</p>
                        ${customUI}
                    </div>`;
                } else {
                    gridHTML += `
                    <div ${!isReadOnly ? `ondragover="window.allowDropJadwal(event)" ondragleave="window.dragLeaveJadwal(event)" ondrop="window.dropJadwal(event, '${hari}', ${slot.jamKe}, '${kelasTarget}')"` : ''}
                         class="relative border-2 ${isLibur ? 'border-red-200 bg-red-50/50 text-red-400 hover:border-red-400 hover:bg-red-100' : 'border-slate-200 bg-transparent text-slate-400 hover:border-indigo-400 hover:bg-indigo-50'} border-dashed rounded-lg p-2 h-full min-h-[75px] flex flex-col items-center justify-center transition group">
                        ${!isReadOnly ? `<i class="fa-solid fa-plus text-lg opacity-30 mb-1 z-0"></i><span class="text-[8px] font-bold uppercase tracking-widest opacity-50 z-0">Tarik Kesini</span>` : `<span class="text-[10px] font-bold opacity-30">Kosong</span>`}
                        ${customUI}
                    </div>`;
                }
            });
        }
    });

    gridHTML += `</div>`;

    // Kalkulasi Total JP Per Mapel
    const jpMapel = {};
    jadwalSemua.filter(j => j.kelas === kelasTarget).forEach(j => {
        if(!jpMapel[j.mapel]) jpMapel[j.mapel] = 0;
        jpMapel[j.mapel]++;
    });
    
    let legendJP = `<div class="mt-6 pt-4 border-t border-slate-200"><h4 class="font-bold text-sm text-slate-600 mb-3"><i class="fa-solid fa-chart-bar mr-2"></i> Rekapitulasi Jam Pelajaran (JP)</h4>`;
    
    if (Object.keys(jpMapel).length === 0) {
        legendJP += `<div class="p-4 bg-slate-50 text-center text-xs font-bold text-slate-400 italic rounded-xl border border-slate-200">Belum ada jadwal terisi untuk kelas ini.</div>`;
    } else {
        let tbodyStr = '';
        let no = 1;
        for (let m in jpMapel) {
            tbodyStr += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-2 text-center text-xs text-slate-500 font-bold border-r border-slate-100">${no++}</td>
                <td class="p-2 text-xs font-bold text-slate-700">${m}</td>
                <td class="p-2 text-center border-l border-slate-100"><span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">${jpMapel[m]} JP</span></td>
            </tr>`;
        }
        legendJP += `
        <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
            <table class="w-full text-left bg-white">
                <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                    <tr>
                        <th class="p-2 text-center text-[10px] uppercase font-black w-12 border-r border-slate-200">No</th>
                        <th class="p-2 text-[10px] uppercase font-black">Mata Pelajaran</th>
                        <th class="p-2 text-center text-[10px] uppercase font-black w-24 border-l border-slate-200">Total JP</th>
                    </tr>
                </thead>
                <tbody>${tbodyStr}</tbody>
            </table>
        </div>`;
    }
    legendJP += `</div></div>`;
    gridHTML += legendJP;
    
    return gridHTML;
}

// ==========================================
// RENDER UTAMA HALAMAN AKADEMIK
// ==========================================
export function renderHalamanAkademik(container) {
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()) : [];
    const liburConfig = profilLembaga.libur || '';
    const jadwalSemua = window.appState.jadwal || [];
    const kalender = window.appState.kalender || [];

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const weekDates = {};
    const namaHariInt = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for(let i=0; i<7; i++) {
        let d = new Date(today);
        d.setDate(today.getDate() - currentDayOfWeek + i);
        let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        weekDates[namaHariInt[i]] = dateStr;
    }

    const isLiburFunc = (hari) => {
        if (liburConfig.toLowerCase().includes(hari.toLowerCase())) return true;
        let dateStr = weekDates[hari];
        if(!dateStr) return false;
        let isHol = false;
        
        kalender.forEach(agenda => {
            if(agenda.tipeAgenda === 'Libur') {
                 const start = new Date(agenda.tanggalMulai);
                 const end = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(start);
                 start.setHours(0,0,0,0); end.setHours(23,59,59,999);
                 const curr = new Date(dateStr);
                 
                 if (agenda.pengulangan === 'Tahunan (Masehi)') {
                     const yearDiff = end.getFullYear() - start.getFullYear();
                     start.setFullYear(curr.getFullYear());
                     end.setFullYear(curr.getFullYear() + yearDiff);
                 }
                 if(curr >= start && curr <= end) isHol = true;
            }
        });
        return isHol;
    };

    if (!window.currentKelasAbjad && daftarKelas.length > 0) window.currentKelasAbjad = daftarKelas[0];

    const daftarGuru = (window.appState.pegawai || []).filter(p => (p.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('guru') && j.mapel && j.mapel.length > 0));
    let peringatanKelas = '';
    if (daftarKelas.length === 0) peringatanKelas = `<div class="mb-4 bg-red-50 text-red-600 p-4 rounded-xl font-bold"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Daftar Kelas belum diatur di Menu Data Lembaga!</div>`;

    let daftarGuruHTML = daftarGuru.map(guru => {
        const jf = guru.detailJabatan.find(j => j.namaJabatan.toLowerCase().includes('guru'));
        const mapels = Array.isArray(jf.mapel) ? jf.mapel : (jf.mapel ? [jf.mapel] : []);
        const maxKuota = Number(jf.kuota || 0);
        const terpakai = jadwalSemua.filter(j => j.idGuru === guru.id).length;
        const sisa = maxKuota - terpakai;
        const isBisaDrag = sisa > 0;
        
        let mapelHTML = mapels.map(m => {
            const terpakaiMapel = jadwalSemua.filter(j => j.idGuru === guru.id && j.mapel === m).length;
            return `
            <div ${isBisaDrag ? `draggable="true" ondragstart="window.dragStartJadwal(event, '${guru.id}', '${guru.nama}', '${m}')" ondragend="window.dragEndJadwal(event)"` : `draggable="false" title="Kuota JP sudah habis!"`} 
                 class="flex items-center justify-between ${isBisaDrag ? 'bg-indigo-50 border-indigo-100 cursor-grab hover:bg-indigo-100 hover:border-indigo-300' : 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'} border p-2 rounded-lg transition group mt-1.5 shadow-sm">
                <span class="text-[10px] font-black ${isBisaDrag ? 'text-indigo-700' : 'text-slate-500'} uppercase truncate pr-2"><i class="fa-solid fa-book-open mr-1.5 opacity-50"></i> ${m}</span>
                <div class="flex items-center shrink-0">
                    <span class="text-[9px] bg-white ${isBisaDrag ? 'text-indigo-500 border-indigo-100' : 'text-slate-400 border-slate-200'} border px-1.5 py-0.5 rounded font-bold mr-2">${terpakaiMapel} JP</span>
                    <i class="fa-solid ${isBisaDrag ? 'fa-grip-vertical text-indigo-300 group-hover:text-indigo-500' : 'fa-lock text-slate-300'}"></i>
                </div>
            </div>`;
        }).join('');
        
        return `
        <div class="bg-white border-2 border-slate-200 p-3 rounded-xl mb-3 ${isBisaDrag ? 'hover:border-indigo-400 hover:shadow-md' : 'border-dashed bg-slate-50 opacity-80'} transition">
            <div class="flex items-center mb-1">
                <img src="${(guru.fotoProfil && guru.fotoProfil[0]) ? guru.fotoProfil[0] : 'https://ui-avatars.com/api/?name='+guru.nama}" class="w-9 h-9 rounded-full mr-3 border shadow-sm ${!isBisaDrag ? 'grayscale' : ''}">
                <div class="flex-1">
                    <h4 class="font-bold ${isBisaDrag ? 'text-slate-800' : 'text-slate-500'} text-sm leading-tight line-clamp-1" title="${guru.nama}">${guru.nama}</h4>
                    <span class="text-[10px] font-bold ${sisa < 0 ? 'text-red-500' : (sisa === 0 ? 'text-orange-500' : 'text-emerald-600')}">Sisa Kuota: ${sisa} JP</span>
                </div>
            </div>
            <div class="flex flex-col">
                ${mapelHTML || '<span class="text-[10px] text-red-500 italic font-medium">Belum ada mapel diatur</span>'}
            </div>
        </div>
        `;
    }).join('');

    const hariKerja = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

    const configManualGlobal = profilLembaga.rosterConfigManual || {};
    
    let renderAreaHTML = '';
    if (window.currentKelasAbjad === 'SEMUA') {
        daftarKelas.forEach(kls => {
            const cnf = configManualGlobal[kls];
            const isManual = (cnf && cnf.mode === 'manual') || Array.isArray(cnf);
            const timeSlots = getRosterSlots(kls, profilLembaga);
            renderAreaHTML += generateGridHTML(kls, timeSlots, hariKerja, isLiburFunc, jadwalSemua, true, isManual);
        });
    } else {
        const kls = window.currentKelasAbjad;
        const cnf = configManualGlobal[kls];
        const isManual = (cnf && cnf.mode === 'manual') || Array.isArray(cnf);
        const timeSlots = getRosterSlots(kls, profilLembaga);
        renderAreaHTML = generateGridHTML(kls, timeSlots, hariKerja, isLiburFunc, jadwalSemua, false, isManual);
    }

    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4">
            <h2 class="text-2xl font-black text-slate-800"><i class="fa-solid fa-chalkboard-user text-indigo-600 mr-2"></i> Papan Jadwal & Distribusi Jam</h2>
            <div class="flex items-center space-x-3 mt-4 md:mt-0">
                <span class="font-bold text-slate-500 text-sm">Fokus Kelas:</span>
                <select onchange="window.currentKelasAbjad = this.value; window.navigate('akademik');" class="border-2 border-indigo-200 bg-indigo-50 text-indigo-800 p-2.5 rounded-xl font-black focus:outline-indigo-500 cursor-pointer shadow-sm">
                    ${daftarKelas.map(k => `<option value="${k}" ${window.currentKelasAbjad === k ? 'selected' : ''}>${k}</option>`).join('')}
                    <option value="SEMUA" ${window.currentKelasAbjad === 'SEMUA' ? 'selected' : ''}>👁️ LIHAT SEMUA KELAS</option>
                </select>
            </div>
        </div>

        ${peringatanKelas}

        <div class="flex flex-col xl:flex-row gap-6">
            ${window.currentKelasAbjad !== 'SEMUA' ? `
            <div class="xl:w-1/4">
                <div class="bg-slate-50 border border-slate-200 p-5 rounded-2xl sticky top-4 shadow-inner">
                    <h3 class="font-black text-slate-700 border-b-2 border-slate-200 pb-3 mb-4 flex items-center justify-between">
                        <span><i class="fa-solid fa-users mr-2 text-indigo-500"></i> Seret Mapel Guru</span>
                        <span class="text-[10px] bg-slate-200 px-2 py-1 rounded-full font-bold uppercase">${daftarGuru.length} Orang</span>
                    </h3>
                    <div class="max-h-[650px] overflow-y-auto custom-scrollbar pr-2 pb-2">
                        ${daftarGuruHTML || '<p class="text-sm text-slate-400 font-semibold text-center italic mt-4">Belum ada Guru yang dikonfigurasi Mata Pelajarannya.</p>'}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="${window.currentKelasAbjad !== 'SEMUA' ? 'xl:w-3/4' : 'w-full'} overflow-x-auto custom-scrollbar pb-4">
                ${renderAreaHTML}
            </div>
        </div>
    `;
}
