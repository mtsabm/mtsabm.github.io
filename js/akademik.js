import { db } from './firebase-init.js';
import { collection, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DRAG AND DROP & FUNGSI BANTUAN
// ==========================================
window.currentKelasAbjad = null;

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
                return alert(`❌ GAGAL! \n\nSisa Kuota JP untuk Guru ${data.namaGuru} sudah habis (${maxKuota} JP maksimal).`);
            }
        }
    }

    const bentrok = jadwalSemua.find(j => j.hari === hari && j.jamKe === jamKe && j.idGuru === data.idGuru && j.kelas !== kelasTarget);
    if (bentrok) return alert(`❌ BENTROK! \n\nGuru ${data.namaGuru} sudah memiliki jadwal mengajar di ${bentrok.kelas} pada hari ${hari} Jam ke-${jamKe}.`);

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
// MESIN PEMBENTUK GRID JADWAL
// ==========================================
function generateGridHTML(kelasTarget, timeSlots, hariKerja, isLiburFunc, jadwalSemua, isReadOnly = false) {
    let gridHTML = `<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 min-w-[900px]">`;
    gridHTML += `<h3 class="font-black text-xl text-indigo-800 mb-4 uppercase tracking-widest border-b pb-2"><i class="fa-solid fa-chalkboard text-indigo-500 mr-2"></i> ${kelasTarget}</h3>`;
    gridHTML += `<div class="grid grid-cols-8 gap-2">`;
    
    // Header Row
    gridHTML += `<div class="p-2"></div>`;
    hariKerja.forEach(hari => {
        const isLibur = isLiburFunc(hari);
        const headerClass = isLibur ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white';
        gridHTML += `<div class="${headerClass} font-black p-3 rounded-t-xl text-center shadow-sm uppercase tracking-widest text-sm flex flex-col justify-center"><span class="block">${hari}</span>${isLibur ? '<span class="text-[9px] font-bold bg-white/20 px-1 rounded mt-1">HARI LIBUR</span>' : ''}</div>`;
    });

    // Body Rows
    timeSlots.forEach(slot => {
        if (slot.type === 'break') {
            gridHTML += `<div class="col-span-1 p-2"></div><div class="col-span-7 bg-orange-100 border border-orange-200 text-orange-700 text-center font-black p-2 rounded-lg flex items-center justify-center tracking-[0.3em]"><i class="fa-solid fa-mug-hot mr-3"></i> WAKTU ISTIRAHAT (${slot.startStr} - ${slot.endStr})</div>`;
        } else {
            gridHTML += `<div class="bg-slate-100 text-slate-700 p-2 rounded-l-xl flex flex-col items-center justify-center shadow-inner text-sm border-r-4 border-indigo-400"><span class="font-black">JAM ${slot.jamKe}</span><span class="text-[10px] font-bold text-slate-400 mt-1">${slot.startStr} - ${slot.endStr}</span></div>`;
            
            hariKerja.forEach(hari => {
                const isLibur = isLiburFunc(hari);
                const jadwalIni = jadwalSemua.find(j => j.hari === hari && j.jamKe === slot.jamKe && j.kelas === kelasTarget);
                
                if (jadwalIni) {
                    gridHTML += `
                    <div class="relative bg-white border-2 ${isLibur ? 'border-red-400 bg-red-50/40' : 'border-indigo-500'} rounded-lg p-2 shadow-sm flex flex-col items-center justify-center text-center group cursor-default">
                        ${!isReadOnly ? `<button onclick="window.hapusJadwal('${jadwalIni.id}')" class="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-circle-xmark"></i></button>` : ''}
                        <h5 class="text-[11px] font-black text-slate-800 leading-tight mb-1">${jadwalIni.mapel}</h5>
                        <p class="text-[9px] font-bold ${isLibur ? 'text-red-700 bg-red-100' : 'text-indigo-600 bg-indigo-50'} px-2 py-0.5 rounded truncate max-w-full">${jadwalIni.namaGuru}</p>
                    </div>`;
                } else {
                    gridHTML += `
                    <div ${!isReadOnly ? `ondragover="window.allowDropJadwal(event)" ondragleave="window.dragLeaveJadwal(event)" ondrop="window.dropJadwal(event, '${hari}', ${slot.jamKe}, '${kelasTarget}')"` : ''}
                         class="border-2 ${isLibur ? 'border-red-200 bg-red-50/50 text-red-400 hover:border-red-400 hover:bg-red-100' : 'border-slate-200 bg-transparent text-slate-300 hover:border-indigo-400 hover:bg-indigo-50'} border-dashed rounded-lg p-2 h-16 flex flex-col items-center justify-center transition">
                        ${!isReadOnly ? `<i class="fa-solid fa-plus text-lg opacity-30 mb-1"></i><span class="text-[8px] font-bold uppercase tracking-widest opacity-50">Tarik Kesini</span>` : `<span class="text-[10px] font-bold opacity-30">Kosong</span>`}
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
    // Menutup div pembungkus legendJP
    legendJP += `</div>`;
    
    gridHTML += legendJP;
    
    // Menutup div pembungkus utama card (.min-w-[900px])
    gridHTML += `</div>`;
    
    return gridHTML;
}

// ==========================================
// RENDER UTAMA HALAMAN
// ==========================================
export function renderHalamanAkademik(container) {
    const profilLembaga = window.appState.lembaga[0] || {};
    const daftarKelas = profilLembaga.daftarKelas ? profilLembaga.daftarKelas.split(',').map(k => k.trim()) : [];
    const liburConfig = profilLembaga.libur || '';
    const jadwalSemua = window.appState.jadwal || [];
    const kalender = window.appState.kalender || [];

    // Kalkulasi Tanggal Minggu Ini (Sinkronisasi dengan Kalender Pendidikan)
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Ahad
    const weekDates = {};
    const namaHariInt = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    for(let i=0; i<7; i++) {
        let d = new Date(today);
        d.setDate(today.getDate() - currentDayOfWeek + i);
        let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        weekDates[namaHariInt[i]] = dateStr;
    }

    // Cek apakah hari tersebut adalah hari libur (dari master lembaga ATAU dari event kalender)
    const isLiburFunc = (hari) => {
        // Cek Libur Rutin Lembaga
        if (liburConfig.toLowerCase().includes(hari.toLowerCase())) return true;
        
        // Cek Libur dari Event Kalender Pendidikan pada minggu ini
        let dateStr = weekDates[hari];
        if(!dateStr) return false;
        let isHol = false;
        
        kalender.forEach(agenda => {
            if(agenda.tipeAgenda === 'Libur') {
                 const start = new Date(agenda.tanggalMulai);
                 const end = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(start);
                 start.setHours(0,0,0,0); end.setHours(23,59,59,999);
                 const curr = new Date(dateStr);
                 
                 // Kalkulasi untuk event berulang
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

    // Sidebar Draggable Guru (DIPISAH PER MAPEL)
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

    let timeSlots = [];
    try {
        let curMins = waktuKeMenit(profilLembaga.umumMasuk || "07:00");
        let durasi = Number(profilLembaga.umumJp || 40);
        let endMins = waktuKeMenit(profilLembaga.umumPulang || "14:00");
        let breaks = [];
        if (profilLembaga.umumIstirahat) {
            breaks = profilLembaga.umumIstirahat.split(',').map(s => {
                const [bs, be] = s.split('-'); return { start: waktuKeMenit(bs), end: waktuKeMenit(be) };
            });
        }
        let jamKe = 1;
        while (curMins < endMins && jamKe <= 15) {
            let activeBreak = breaks.find(b => curMins >= b.start && curMins < b.end);
            if (activeBreak) {
                timeSlots.push({ type: 'break', startStr: menitKeWaktu(activeBreak.start), endStr: menitKeWaktu(activeBreak.end) });
                curMins = activeBreak.end; continue;
            }
            let slotEnd = curMins + durasi;
            let hitBreak = breaks.find(b => slotEnd > b.start && curMins < b.start);
            if (hitBreak) slotEnd = hitBreak.start; 
            timeSlots.push({ type: 'jam', jamKe: jamKe, startStr: menitKeWaktu(curMins), endStr: menitKeWaktu(slotEnd) });
            curMins = slotEnd; if (!hitBreak) jamKe++;
        }
    } catch(e) {}

    const hariKerja = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

    let renderAreaHTML = '';
    if (window.currentKelasAbjad === 'SEMUA') {
        daftarKelas.forEach(kls => { renderAreaHTML += generateGridHTML(kls, timeSlots, hariKerja, isLiburFunc, jadwalSemua, true); });
    } else {
        renderAreaHTML = generateGridHTML(window.currentKelasAbjad, timeSlots, hariKerja, isLiburFunc, jadwalSemua, false);
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
