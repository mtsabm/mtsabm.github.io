import { db } from './firebase-init.js';
import { collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// FILE 9: KALENDER.JS (SISTEM KALENDER & HIJRIAH FIRESTORE)
// ==========================================

window.currentKalenderYear = new Date().getFullYear();
// Mode Kalender: 'Masehi' atau 'Pelajaran'
window.currentKalenderMode = 'Masehi'; 

window.changeKalenderMode = function(mode) {
    window.currentKalenderMode = mode;
    window.renderKalender();
};

window.changeKalenderYear = function(offset) {
    window.currentKalenderYear += offset;
    window.renderKalender();
};

window.toArabicNumeral = function(str) {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(str).replace(/[0-9]/g, function(w) {
        return arabicNumbers[+w];
    });
};

// =================================================================
// LISTENER REAL-TIME FIRESTORE UNTUK KALENDER
// =================================================================
window.listenKalenderFirestore = function() {
    if (!window.appState) window.appState = {};
    
    onSnapshot(collection(db, "Kalender"), (snapshot) => {
        window.appState.kalender = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (document.getElementById('kalender-12-months-grid')) {
            window.renderKalender();
        }
        if (document.getElementById('dashboard-kalender-container')) {
            window.renderDashboardKalender();
        }
    });
};

// =================================================================
// FUNGSI IMPOR & EKSPOR (FLEKSIBEL AUTO-DETECT REGION EXCEL)
// =================================================================
window.eksporKalenderCSV = function() {
    const agendas = window.appState.kalender || [];
    if (agendas.length === 0) return alert("Tidak ada data untuk diekspor.");

    // Gunakan titik koma (;) sebagai standar aman untuk Excel format Indonesia
    const separator = ';'; 
    const headers = ['judulAgenda', 'tanggalMulai', 'tanggalSelesai', 'tipeAgenda', 'warnaBg', 'warnaTeks', 'pengulangan'];
    
    // Tambahkan \uFEFF (BOM) agar Excel membaca encoding teks dengan sempurna
    let csvContent = "\uFEFF" + headers.join(separator) + "\n";

    agendas.forEach(row => {
        let rowData = headers.map(header => {
            let cell = row[header] === undefined ? "" : String(row[header]);
            return `"${cell.replace(/"/g, '""')}"`; 
        });
        csvContent += rowData.join(separator) + "\n";
    });

    // Gunakan Blob API agar unduhan file lebih stabil
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Backup_Kalender.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

window.imporKalenderCSV = function(event) {
    const file = event.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) return alert("File CSV kosong atau format salah.");

            // Deteksi otomatis apakah file menggunakan koma atau titik koma
            const headerLine = lines[0];
            const separator = headerLine.includes(';') ? ';' : ',';
            const headers = headerLine.split(separator).map(h => h.replace(/^"|"$/g, '').trim());
            
            let count = 0;

            for (let i = 1; i < lines.length; i++) {
                // Algoritma pembongkar CSV yang aman dari tanda kutip
                let row = [];
                let insideQuotes = false;
                let currentCell = '';
                for (let char of lines[i]) {
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === separator && !insideQuotes) {
                        row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

                let data = {};
                headers.forEach((header, index) => { data[header] = row[index] || ""; });

                // Generate ulang data pencocokan pengulangan
                if (data.tanggalMulai) {
                    const d = new Date(data.tanggalMulai);
                    data.masehiMatch = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    try { data.hijriMatch = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).format(d); } catch(err) { data.hijriMatch = ""; }
                }
                data.updatedAt = new Date();

                await addDoc(collection(db, "Kalender"), data);
                count++;
            }
            alert(`Selesai! Berhasil mengimpor ${count} agenda dari file Excel/CSV.`);
            document.getElementById('input-impor-kalender').value = '';
        } catch (error) {
            console.error(error);
            alert('Gagal mengimpor! Pastikan file adalah format CSV yang valid dari hasil ekspor sistem ini.');
        }
    };
    reader.readAsText(file);
};

// =================================================================
// FUNGSI 1: RENDER KALENDER 12 BULAN (HALAMAN KALENDER PENDIDIKAN)
// =================================================================
window.renderKalender = function() {
    const grid12 = document.getElementById('kalender-12-months-grid');
    const yearLabel = document.getElementById('kalender-year-label');
    
    if (!grid12 || !yearLabel) return;

    // --- CEK LISENSI MODULAR ---
    const lembaga = (window.appState && window.appState.lembaga && window.appState.lembaga.length > 0) ? window.appState.lembaga[0] : {};
    const isPremium = (lembaga.lisensiFitur || []).includes('kalender_plus');

    yearLabel.textContent = window.currentKalenderYear;
    
    const headerContainer = yearLabel.parentElement;
    if (headerContainer && !document.getElementById('btn-sync-gcal') && !document.getElementById('btn-export-csv-kalender')) {
        
        // GEMBOK MODULAR: TOMBOL SINKRON G-CAL HANYA JIKA KALENDER PLUS
        if (isPremium) {
            const syncBtn = document.createElement('button');
            syncBtn.id = 'btn-sync-gcal';
            syncBtn.className = 'ml-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1 rounded text-sm font-bold shadow-sm flex items-center transition hidden md:flex';
            syncBtn.innerHTML = '<i class="fa-brands fa-google text-red-500 mr-2"></i> Sinkron';
            syncBtn.onclick = window.sinkronGoogleCalendar;
            headerContainer.appendChild(syncBtn);
        }
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'btn-export-csv-kalender';
        exportBtn.className = 'ml-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-bold shadow-sm flex items-center transition';
        exportBtn.innerHTML = '<i class="fa-solid fa-download mr-2"></i> Ekspor CSV';
        exportBtn.onclick = window.eksporKalenderCSV; 
        headerContainer.appendChild(exportBtn);

        const importLabel = document.createElement('label');
        importLabel.className = 'ml-2 bg-white border border-green-200 text-green-600 hover:bg-green-50 px-3 py-1 rounded text-sm font-bold shadow-sm flex items-center transition cursor-pointer';
        importLabel.innerHTML = '<i class="fa-solid fa-upload mr-2"></i> Impor CSV <input type="file" id="input-impor-kalender" accept=".csv" onchange="window.imporKalenderCSV(event)" class="hidden">'; 
        headerContainer.appendChild(importLabel);
    }

    grid12.innerHTML = '';

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const agendas = window.appState.kalender || [];
    const tasks = window.appState.tugas || [];
    
    const currentUser = window.currentUser || {};
    const isAdminOrKurikulum = currentUser.hakAkses === 'Super Admin' || currentUser.hakAkses === 'Administrator' || currentUser.hakAkses === 'Operator/TU' || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kurikulum'));

    const liburConfig = lembaga.libur || 'Hanya Ahad';
    let liburIndices = [];
    if(liburConfig.toLowerCase().includes('ahad')) liburIndices.push(0);
    if(liburConfig.toLowerCase().includes('jumat') || liburConfig.toLowerCase().includes("jum'at")) liburIndices.push(5);
    if(liburConfig.toLowerCase().includes('sabtu')) liburIndices.push(6);
    if(liburIndices.length === 0) liburIndices.push(0); 

    let allMonthsHTML = '';

    let loopMonths = [];
    if (window.currentKalenderMode === 'Pelajaran') {
        yearLabel.textContent = `${window.currentKalenderYear} / ${window.currentKalenderYear + 1}`;
        for(let i = 6; i <= 11; i++) loopMonths.push({m: i, y: window.currentKalenderYear}); 
        for(let i = 0; i <= 5; i++) loopMonths.push({m: i, y: window.currentKalenderYear + 1}); 
    } else {
        yearLabel.textContent = window.currentKalenderYear;
        for(let i = 0; i <= 11; i++) loopMonths.push({m: i, y: window.currentKalenderYear}); 
    }

    if (!window.appState.hariKerjaPerBulan) window.appState.hariKerjaPerBulan = {};

    for (let item of loopMonths) {
        let m = item.m;
        let currentGridYear = item.y;
        let hariKerjaAktif = 0; 

        const firstDay = new Date(currentGridYear, m, 1).getDay();
        const daysInMonth = new Date(currentGridYear, m + 1, 0).getDate();

        let startHijriMonth = '';
        let endHijriMonth = '';
        
        // GEMBOK MODULAR: HIJRIAH HANYA JIKA KALENDER PLUS
        if (isPremium) {
            try {
                const hijriFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { month: 'long' });
                startHijriMonth = hijriFormatter.format(new Date(currentGridYear, m, 1));
                endHijriMonth = hijriFormatter.format(new Date(currentGridYear, m, daysInMonth));
            } catch(e) { startHijriMonth = 'Hijriah'; endHijriMonth = 'Hijriah'; }
        }

        let monthHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-max hover:shadow-md transition-shadow pb-2 avoid-page-break">
                <div class="bg-teal-600 dark:bg-teal-700 text-white flex justify-between items-center py-2 px-3 rounded-t-xl">
                    <span class="text-[9px] sm:text-[10px] font-medium opacity-90 truncate max-w-[30%] text-left">${startHijriMonth}</span>
                    <span class="font-black tracking-wider text-sm sm:text-base shrink-0 mx-2">${monthNames[m].toUpperCase()} ${currentGridYear}</span>
                    <span class="text-[9px] sm:text-[10px] font-medium opacity-90 truncate max-w-[30%] text-right">${endHijriMonth}</span>
                </div>
                <div class="p-2 sm:p-3 flex flex-col">
                    <div class="grid grid-cols-7 gap-1 mb-1 border-b border-slate-100 dark:border-slate-700 pb-1">
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(0) ? 'text-red-500' : 'text-slate-500'}">Ahad</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(1) ? 'text-red-500' : 'text-slate-500'}">Sen</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(2) ? 'text-red-500' : 'text-slate-500'}">Sel</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(3) ? 'text-red-500' : 'text-slate-500'}">Rab</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(4) ? 'text-red-500' : 'text-slate-500'}">Kam</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(5) ? 'text-red-500' : 'text-slate-500'}">Jum</div>
                        <div class="text-center font-bold text-[10px] sm:text-xs ${liburIndices.includes(6) ? 'text-red-500' : 'text-slate-500'}">Sab</div>
                    </div>
                    <div class="grid grid-cols-7 gap-1">
        `;

        for (let i = 0; i < firstDay; i++) {
            monthHTML += `<div class="p-1 min-h-[40px] sm:min-h-[50px]"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(currentGridYear, m, day);
            const nextDateObj = new Date(currentGridYear, m, day + 1);
            const dateStr = `${currentGridYear}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const masehiMatchStr = `${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            
            let hijriSiang = '';
            let hijriMalam = '';
            let hijriMatchStr = '';
            
            // GEMBOK MODULAR: HANYA KALKULASI HIJRIAH JIKA KALENDER PLUS
            if (isPremium) {
                try {
                    let numSiang = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric' }).format(dateObj);
                    let numMalam = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric' }).format(nextDateObj);
                    hijriSiang = window.toArabicNumeral(numSiang);
                    hijriMalam = window.toArabicNumeral(numMalam);
                    hijriMatchStr = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).format(dateObj);
                } catch(e) {}
            }

            let isToday = dateStr === todayStr;
            let isHariLiburPekanan = liburIndices.includes(dateObj.getDay());
            let isTanggalMerah = isHariLiburPekanan;

            let textClass = isHariLiburPekanan ? 'text-red-500 font-bold' : 'text-slate-900 dark:text-slate-100 font-semibold';
            let bgStyle = ''; let textStyle = '';
            let borderClass = isToday ? 'border-purple-500 border-2' : 'border-slate-200 dark:border-slate-700 border';
            let markersHTML = ''; let tooltip = '';
            let hijriColorClass = 'text-teal-600 dark:text-teal-400';

            let activeAgenda = null;
            agendas.forEach(agenda => {
                let isMatch = false;
                
                const startOri = new Date(agenda.tanggalMulai);
                const endOri = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(startOri);
                startOri.setHours(0,0,0,0); endOri.setHours(23,59,59,999);

                const renderYear = typeof currentGridYear !== 'undefined' ? currentGridYear : currentYear;

                if (agenda.pengulangan === 'Tahunan (Masehi)') {
                    const yearDiff = endOri.getFullYear() - startOri.getFullYear();
                    const startVirtual = new Date(startOri); startVirtual.setFullYear(renderYear);
                    const endVirtual = new Date(endOri); endVirtual.setFullYear(renderYear + yearDiff);
                    if (dateObj >= startVirtual && dateObj <= endVirtual) isMatch = true;
                } else if (agenda.pengulangan === 'Tahunan (Hijriah)') {
                    if (agenda.hijriMatch === hijriMatchStr) isMatch = true;
                } else {
                    if (dateObj >= startOri && dateObj <= endOri) isMatch = true;
                }

                if (isMatch) {
                    activeAgenda = agenda;
                    bgStyle = `background-color: ${agenda.warnaBg || '#ffffff'};`;
                    textStyle = `color: ${agenda.warnaTeks || '#000000'};`;
                    textClass += ' font-bold';
                    
                    if(agenda.tipeAgenda === 'Libur') isTanggalMerah = true;
                    
                    let tglTeks = agenda.tanggalMulai;
                    if(agenda.tanggalSelesai && agenda.tanggalSelesai !== agenda.tanggalMulai) tglTeks += ` s/d ${agenda.tanggalSelesai}`;
                    tooltip += `${tglTeks} : ${agenda.judulAgenda}\n`;
                }
            });

            if (!isTanggalMerah) hariKerjaAktif++;

            const tasksToday = tasks.filter(t => t.tenggat === dateStr && t.status !== 'Selesai');
            if (tasksToday.length > 0) markersHTML += `<span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 absolute bottom-1 right-1 shadow-sm border border-white dark:border-slate-800" title="${tasksToday.length} Tugas"></span>`;
            if (isToday) {
                markersHTML += `<span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500 absolute bottom-1 left-1 shadow-sm border border-white dark:border-slate-800 animate-pulse" title="Hari Ini"></span>`;
                if (!activeAgenda) bgStyle = 'background-color: rgba(168, 85, 247, 0.1);'; 
            }

            let clickAction = isAdminOrKurikulum ? `onclick="window.openKalenderModal('${dateStr}')"` : '';
            let cursorClass = isAdminOrKurikulum ? 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-md transition-all duration-200' : 'cursor-default';

            monthHTML += `
                <div ${clickAction} class="p-1 rounded-md flex flex-col justify-center items-center relative ${borderClass} ${cursorClass} min-h-[45px] sm:min-h-[55px]" style="${bgStyle}" title="${tooltip.trim()}">
                    <span class="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-bold font-serif ${hijriColorClass}" style="${textStyle}">${hijriSiang}</span>
                    <span class="absolute top-0.5 right-1 text-[8px] sm:text-[9px] font-bold font-serif opacity-70 ${hijriColorClass}" style="${textStyle}">${hijriMalam}</span>
                    <span class="text-xs sm:text-sm ${textClass} ${isToday ? 'scale-110' : ''} z-0 mt-2 sm:mt-2.5" style="${textStyle}">${day}</span>
                    ${markersHTML}
                </div>
            `;
        }
        
        window.appState.hariKerjaPerBulan[`${currentGridYear}-${String(m+1).padStart(2,'0')}`] = hariKerjaAktif;

        let monthAgendas = [];
        agendas.forEach(agenda => {
            let isMonthMatch = false;
            let sortDateObj = new Date(agenda.tanggalMulai); 

            const startOri = new Date(agenda.tanggalMulai);
            const endOri = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(startOri);
            startOri.setHours(0,0,0,0); endOri.setHours(23,59,59,999);

            const firstDayOfMonth = new Date(currentGridYear, m, 1);
            const lastDayOfMonth = new Date(currentGridYear, m + 1, 0, 23, 59, 59);

            if (agenda.pengulangan === 'Tahunan (Masehi)') {
                const yearDiff = endOri.getFullYear() - startOri.getFullYear();
                const startVirtual = new Date(startOri); startVirtual.setFullYear(currentGridYear);
                const endVirtual = new Date(endOri); endVirtual.setFullYear(currentGridYear + yearDiff);
                if (startVirtual <= lastDayOfMonth && endVirtual >= firstDayOfMonth) {
                    isMonthMatch = true;
                    sortDateObj = startVirtual;
                }
            } else if (agenda.pengulangan === 'Tahunan (Hijriah)') {
                for (let d = 1; d <= daysInMonth; d++) {
                    try {
                        let hj = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).format(new Date(currentGridYear, m, d));
                        if(hj === agenda.hijriMatch) { 
                            isMonthMatch = true; 
                            sortDateObj = new Date(currentGridYear, m, d);
                            break; 
                        }
                    } catch(e){}
                }
            } else {
                if (startOri <= lastDayOfMonth && endOri >= firstDayOfMonth) {
                    isMonthMatch = true;
                }
            }

            if (isMonthMatch) monthAgendas.push({ ...agenda, sortDate: sortDateObj });
        });

        monthAgendas.sort((a, b) => a.sortDate - b.sortDate);

        let legendHTML = `<div class="mt-3 border-t border-slate-100 pt-2 flex flex-col gap-1.5">`;
        
        if (monthAgendas.length > 0) {
            monthAgendas.forEach(agenda => {
                let warnaKotak = agenda.warnaBg || '#ffffff';
                if(warnaKotak === '#ffffff') warnaKotak = '#cbd5e1'; 
                
                let startDay = agenda.sortDate.getDate();
                let startMonth = agenda.sortDate.getMonth() + 1;
                let tglTeks = startDay;
                
                if (agenda.tanggalSelesai && agenda.tanggalSelesai !== agenda.tanggalMulai) {
                    const startOri = new Date(agenda.tanggalMulai);
                    const endOri = new Date(agenda.tanggalSelesai);
                    startOri.setHours(0,0,0,0); endOri.setHours(0,0,0,0);
                    const diffDays = Math.round((endOri - startOri) / (1000 * 60 * 60 * 24));

                    const currentEnd = new Date(agenda.sortDate);
                    currentEnd.setDate(currentEnd.getDate() + diffDays);

                    let endDay = currentEnd.getDate();
                    let endMonth = currentEnd.getMonth() + 1;

                    if (startMonth !== endMonth) {
                        tglTeks = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
                    } else {
                        tglTeks = `${startDay} - ${endDay}`;
                    }
                }
                
                legendHTML += `
                    <div class="flex items-center text-[10px] sm:text-xs group cursor-pointer" onclick="window.openKalenderModal('${agenda.tanggalMulai}', '${encodeURIComponent(JSON.stringify(agenda)).replace(/'/g, "%27")}')">
                        <span class="w-3 h-3 rounded border mr-2 shrink-0 shadow-sm" style="background-color: ${warnaKotak};"></span>
                        <span class="font-black text-slate-700 mr-2 shrink-0 whitespace-nowrap text-left w-10">${tglTeks}</span>
                        <span class="font-medium text-slate-600 group-hover:text-teal-600 transition truncate">
                            ${agenda.judulAgenda}
                        </span>
                    </div>
                `;
            });
            legendHTML += `</div>`;
        } else {
            legendHTML = '';
        }

        let hariKerjaHTML = `
            <div class="mt-2 text-center text-[10px] sm:text-xs font-black text-indigo-700 bg-indigo-50 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                Total Hari Kerja: ${hariKerjaAktif} Hari
            </div>
        `;

        monthHTML += `</div>${legendHTML}${hariKerjaHTML}</div></div>`;
        allMonthsHTML += monthHTML;
    }

    grid12.innerHTML = allMonthsHTML;
};


// =================================================================
// FUNGSI 2: RENDER KALENDER 1 BULAN (HALAMAN DASHBOARD BAWAH)
// =================================================================
window.renderDashboardKalender = function() {
    const container = document.getElementById('dashboard-kalender-container');
    const label = document.getElementById('dashboard-kalender-month-label');
    
    if (!container || !label) return;

    // --- CEK LISENSI MODULAR ---
    const lembaga = (window.appState && window.appState.lembaga && window.appState.lembaga.length > 0) ? window.appState.lembaga[0] : {};
    const isPremium = (lembaga.lisensiFitur || []).includes('kalender_plus');

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); 
    
    const todayStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    label.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const agendas = window.appState.kalender || [];
    const tasks = window.appState.tugas || [];

    const currentUser = window.currentUser || {};
    const isAdminOrKurikulum = currentUser.hakAkses === 'Super Admin' || currentUser.hakAkses === 'Administrator' || currentUser.hakAkses === 'Operator/TU' || (currentUser.detailJabatan || []).some(j => j.namaJabatan.toLowerCase().includes('kurikulum'));

    const liburConfig = lembaga.libur || 'Hanya Ahad';
    let liburIndices = [];
    if(liburConfig.toLowerCase().includes('ahad')) liburIndices.push(0);
    if(liburConfig.toLowerCase().includes('jumat') || liburConfig.toLowerCase().includes("jum'at")) liburIndices.push(5);
    if(liburConfig.toLowerCase().includes('sabtu')) liburIndices.push(6);
    if(liburIndices.length === 0) liburIndices.push(0);

    let html = `
        <div class="grid grid-cols-7 gap-1 sm:gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(0) ? 'text-red-500' : 'text-slate-500'}">Ahad</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(1) ? 'text-red-500' : 'text-slate-500'}">Sen</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(2) ? 'text-red-500' : 'text-slate-500'}">Sel</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(3) ? 'text-red-500' : 'text-slate-500'}">Rab</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(4) ? 'text-red-500' : 'text-slate-500'}">Kam</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(5) ? 'text-red-500' : 'text-slate-500'}">Jum</div>
            <div class="text-center font-bold text-[10px] sm:text-sm ${liburIndices.includes(6) ? 'text-red-500' : 'text-slate-500'}">Sab</div>
        </div>
        <div class="grid grid-cols-7 gap-1 sm:gap-2">
    `;

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="p-1 sm:p-2 min-h-[50px] sm:min-h-[70px]"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentYear, currentMonth, day);
        const nextDateObj = new Date(currentYear, currentMonth, day + 1);
        const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const masehiMatchStr = `${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        
        let hijriSiang = '';
        let hijriMalam = '';
        let hijriMatchStr = '';
        
        if (isPremium) {
            try {
                let numSiang = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric' }).format(dateObj);
                let numMalam = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric' }).format(nextDateObj);
                hijriSiang = window.toArabicNumeral(numSiang);
                hijriMalam = window.toArabicNumeral(numMalam);
                hijriMatchStr = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).format(dateObj);
            } catch(e) {}
        }

        let isToday = dateStr === todayStr;
        let isHariLiburPekanan = liburIndices.includes(dateObj.getDay()); 

        let textClass = isHariLiburPekanan ? 'text-red-500 font-bold' : 'text-slate-900 dark:text-slate-100 font-semibold';
        let bgStyle = '';
        let textStyle = '';
        let borderClass = isToday ? 'border-purple-500 border-2' : 'border-slate-200 dark:border-slate-700 border';
        let markersHTML = '';
        let tooltip = '';
        let hijriColorClass = 'text-teal-600 dark:text-teal-400';

        let activeAgenda = null;
        agendas.forEach(agenda => {
                let isMatch = false;
                
                const startOri = new Date(agenda.tanggalMulai);
                const endOri = agenda.tanggalSelesai ? new Date(agenda.tanggalSelesai) : new Date(startOri);
                startOri.setHours(0,0,0,0); endOri.setHours(23,59,59,999);

                const renderYear = typeof currentGridYear !== 'undefined' ? currentGridYear : currentYear;

                if (agenda.pengulangan === 'Tahunan (Masehi)') {
                    const yearDiff = endOri.getFullYear() - startOri.getFullYear();
                    const startVirtual = new Date(startOri); startVirtual.setFullYear(renderYear);
                    const endVirtual = new Date(endOri); endVirtual.setFullYear(renderYear + yearDiff);
                    if (dateObj >= startVirtual && dateObj <= endVirtual) isMatch = true;
                } else if (agenda.pengulangan === 'Tahunan (Hijriah)') {
                    if (agenda.hijriMatch === hijriMatchStr) isMatch = true;
                } else {
                    if (dateObj >= startOri && dateObj <= endOri) isMatch = true;
                }

                if (isMatch) {
                    activeAgenda = agenda;
                    bgStyle = `background-color: ${agenda.warnaBg || '#ffffff'};`;
                    textStyle = `color: ${agenda.warnaTeks || '#000000'};`;
                    textClass += ' font-bold';
                    
                    let tglTeks = agenda.tanggalMulai;
                    if(agenda.tanggalSelesai && agenda.tanggalSelesai !== agenda.tanggalMulai) tglTeks += ` s/d ${agenda.tanggalSelesai}`;
                    tooltip += `${tglTeks} : ${agenda.judulAgenda}\n`;
                }
            });

        const tasksToday = tasks.filter(t => t.tenggat === dateStr && t.status !== 'Selesai');
        if (tasksToday.length > 0) {
            markersHTML += `<span class="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 absolute bottom-1 right-1 shadow-sm border border-white dark:border-slate-800" title="${tasksToday.length} Tugas"></span>`;
        }

        if (isToday) {
            markersHTML += `<span class="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500 absolute bottom-1 left-1 shadow-sm border border-white dark:border-slate-800 animate-pulse" title="Hari Ini"></span>`;
            if (!activeAgenda) bgStyle = 'background-color: rgba(168, 85, 247, 0.1);'; 
        }

        let clickAction = isAdminOrKurikulum ? `onclick="window.openKalenderModal('${dateStr}')"` : '';
        let cursorClass = isAdminOrKurikulum ? 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-md transition-all duration-200' : 'cursor-default';

        html += `
            <div ${clickAction} class="p-1 sm:p-2 rounded-lg flex flex-col justify-center items-center relative ${borderClass} ${cursorClass} min-h-[50px] sm:min-h-[70px]"
                 style="${bgStyle}" title="${tooltip.trim()}">
                <span class="absolute top-0.5 left-1 text-[9px] sm:text-xs font-bold font-serif ${hijriColorClass}" style="${textStyle}">${hijriSiang}</span>
                <span class="absolute top-0.5 right-1 text-[9px] sm:text-xs font-bold font-serif opacity-70 ${hijriColorClass}" style="${textStyle}">${hijriMalam}</span>
                <span class="text-sm sm:text-lg ${textClass} ${isToday ? 'scale-110' : ''} z-0 mt-2 sm:mt-3" style="${textStyle}">${day}</span>
                ${markersHTML}
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
};

// =================================================================
// BUKA MODAL FORM AGENDA
// =================================================================
window.openKalenderModal = function(tanggalKlik = null, itemJsonString = null) {
    document.getElementById('form-kalender').reset();
    document.getElementById('kalender-id').value = ''; 
    document.getElementById('kalender-warna-bg').value = '#ffffff'; 
    document.getElementById('kalender-warna-teks').value = '#000000'; 
    document.getElementById('kalender-pengulangan').value = 'Tidak Ada'; 

    if (tanggalKlik) document.getElementById('kalender-mulai').value = tanggalKlik;

    if (itemJsonString) {
        let unescapedString = itemJsonString;
        try { unescapedString = decodeURIComponent(itemJsonString); } catch(e) {}
        
        unescapedString = String(unescapedString).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        const itemData = JSON.parse(unescapedString);
        
        document.getElementById('kalender-id').value = itemData.id || itemData.ID;
        document.getElementById('kalender-judul').value = itemData.judulAgenda;
        document.getElementById('kalender-mulai').value = itemData.tanggalMulai;
        document.getElementById('kalender-selesai').value = itemData.tanggalSelesai || '';
        document.getElementById('kalender-tipe').value = itemData.tipeAgenda;
        document.getElementById('kalender-warna-bg').value = itemData.warnaBg || '#ffffff';
        document.getElementById('kalender-warna-teks').value = itemData.warnaTeks || '#000000';
        document.getElementById('kalender-pengulangan').value = itemData.pengulangan || 'Tidak Ada';
        
        const btnHapus = document.getElementById('btn-hapus-kalender');
        if(btnHapus) btnHapus.classList.remove('hidden');
    } else {
        const btnHapus = document.getElementById('btn-hapus-kalender');
        if(btnHapus) btnHapus.classList.add('hidden');
    }
    
    if(typeof window.toggleModal === 'function') window.toggleModal('modal-kalender');
};

// =================================================================
// SUBMIT & HAPUS AGENDA (CRUD FIRESTORE)
// =================================================================
window.handleKalenderSubmit = async function(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('btn-submit-kalender');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memproses...';
    submitBtn.disabled = true;

    // --- CEK LISENSI MODULAR ---
    const lembaga = window.appState.lembaga[0] || {};
    const isPremium = (lembaga.lisensiFitur || []).includes('kalender_plus');

    const recordId = document.getElementById('kalender-id').value;
    const tglMulai = document.getElementById('kalender-mulai').value;
    
    // Kalkulasi Data Match untuk Pengulangan Otomatis
    const d = new Date(tglMulai);
    const mMatch = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    let hMatch = '';
    try { hMatch = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).format(d); } catch(e){}

    const data = {
        judulAgenda: document.getElementById('kalender-judul').value,
        tanggalMulai: tglMulai,
        tanggalSelesai: document.getElementById('kalender-selesai').value, 
        tipeAgenda: document.getElementById('kalender-tipe').value,
        warnaBg: document.getElementById('kalender-warna-bg').value,
        warnaTeks: document.getElementById('kalender-warna-teks').value,
        // GEMBOK MODULAR: PASTIKAN PENGULANGAN DIBATALKAN JIKA STANDAR
        pengulangan: isPremium ? document.getElementById('kalender-pengulangan').value : 'Tidak Ada',
        masehiMatch: mMatch,
        hijriMatch: hMatch,
        updatedAt: new Date()
    };

    try {
        if (recordId) await updateDoc(doc(db, "Kalender", recordId), data);
        else await addDoc(collection(db, "Kalender"), data);
        if(typeof window.toggleModal === 'function') window.toggleModal('modal-kalender');
    } catch (error) { alert('Gagal merekam ke database Firestore: ' + error.message); } 
    finally { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
};

window.hapusAgendaKalender = async function() {
    const recordId = document.getElementById('kalender-id').value;
    if(recordId && confirm("Yakin ingin menghapus agenda ini?")) {
        try {
            await deleteDoc(doc(db, "Kalender", recordId));
            if(typeof window.toggleModal === 'function') window.toggleModal('modal-kalender');
        } catch(e) { alert("Gagal menghapus!"); }
    }
};

window.sinkronGoogleCalendar = async function() {
    alert("Persiapan Sinkronisasi Google Calendar...\nFitur autentikasi akan ditambahkan melalui Profil Pegawai.");
};

// =================================================================
// FUNGSI 3: WADAH HALAMAN (DIPANGGIL OLEH ROUTER)
// =================================================================
window.toggleModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.toggle('hidden');
};

export function renderHalamanKalender(container) {
    // --- CEK LISENSI MODULAR ---
    const lembaga = window.appState.lembaga[0] || {};
    const isPremium = (lembaga.lisensiFitur || []).includes('kalender_plus');

    container.innerHTML = `
        <style>
            /* CSS Khusus Mode Cetak PDF Bawaan Browser */
            @media print {
                body * { visibility: hidden; }
                #area-cetak-kalender, #area-cetak-kalender * { visibility: visible; }
                #area-cetak-kalender { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; background: white; }
                
                /* Memaksa grid 12 bulan menjadi 4 kolom atau 3 kolom saat Landscape di PDF */
                #kalender-12-months-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
                
                /* Perkecil font & hilangkan shadow agar rapi di kertas */
                .shadow-sm, .shadow-md { box-shadow: none !important; }
                .avoid-page-break { page-break-inside: avoid; break-inside: avoid; }
                .min-h-[45px] { min-height: 35px !important; }
            }
        </style>
        
        <div class="bg-white p-6 rounded-xl shadow mb-6 border-t-4 border-teal-500">
            <div class="flex flex-col xl:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                <h2 class="text-2xl font-black text-slate-800 whitespace-nowrap"><i class="fa-solid fa-calendar-days text-teal-600 mr-2"></i> Kalender Pendidikan</h2>
                <div class="flex flex-wrap items-center justify-end gap-2 bg-slate-100 p-2 rounded-lg w-full xl:w-auto">
                    <!-- Dropdown Mode Kalender -->
                    <select onchange="window.changeKalenderMode(this.value)" class="bg-white text-teal-700 font-bold border border-slate-300 rounded px-2 py-2 text-sm outline-none cursor-pointer">
                        <option value="Masehi" ${window.currentKalenderMode === 'Masehi' ? 'selected' : ''}>Mode: Tahun Masehi</option>
                        <option value="Pelajaran" ${window.currentKalenderMode === 'Pelajaran' ? 'selected' : ''}>Mode: Tahun Pelajaran</option>
                    </select>

                    <div class="flex items-center space-x-2">
                        <button onclick="window.changeKalenderYear(-1)" class="bg-white hover:bg-teal-50 text-teal-700 px-3 py-2 rounded shadow-sm font-bold transition"><i class="fa-solid fa-chevron-left"></i></button>
                        <span id="kalender-year-label" class="text-xl font-black text-teal-600 px-2 text-center whitespace-nowrap min-w-[80px]"></span>
                        <button onclick="window.changeKalenderYear(1)" class="bg-white hover:bg-teal-50 text-teal-700 px-3 py-2 rounded shadow-sm font-bold transition"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                    
                    <!-- TOMBOL CETAK BROWSER -->
                    <button onclick="window.print()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded shadow-sm font-bold transition flex items-center" title="Cetak / Simpan PDF dengan Pengaturan">
                        <i class="fa-solid fa-print md:mr-2"></i> <span class="hidden md:inline">Cetak PDF</span>
                    </button>
                </div>
            </div>
            
            <div id="area-cetak-kalender" class="p-2 bg-slate-50">
                <div id="kalender-12-months-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
            </div>
        </div>

        <!-- MODAL FORM AGENDA -->
        <div id="modal-kalender" class="hidden fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-t-4 border-teal-500 transform transition-all">
                <div class="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 class="text-xl font-black text-slate-800">Form Agenda Kalender</h3>
                    <button onclick="window.toggleModal('modal-kalender')" class="text-red-500 hover:text-red-700 text-xl font-bold"><i class="fa-solid fa-times"></i></button>
                </div>
                <form id="form-kalender" onsubmit="window.handleKalenderSubmit(event)">
                    <input type="hidden" id="kalender-id">
                    
                    <div class="mb-4">
                        <label class="text-sm font-bold text-slate-600 mb-1 block">Judul Agenda / Kegiatan</label>
                        <input type="text" id="kalender-judul" class="border-2 p-3 rounded-xl w-full focus:outline-teal-500 font-semibold text-slate-700" required>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 block">Mulai Tanggal</label>
                            <input type="date" id="kalender-mulai" class="border-2 p-3 rounded-xl w-full focus:outline-teal-500 font-medium" required>
                        </div>
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 block">Sampai Tanggal</label>
                            <input type="date" id="kalender-selesai" class="border-2 p-3 rounded-xl w-full focus:outline-teal-500 font-medium">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 block">Tipe Agenda</label>
                            <select id="kalender-tipe" class="border-2 p-3 rounded-xl w-full focus:outline-teal-500 font-semibold">
                                <option value="Akademik">Akademik</option>
                                <option value="Libur">Libur Resmi</option>
                                <option value="Kegiatan">Kegiatan Yayasan</option>
                                <option value="Ujian">Ujian / Evaluasi</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 flex justify-between">Pengulangan ${!isPremium ? '<i class="fa-solid fa-lock text-slate-400" title="Eksklusif Kalender Plus"></i>' : ''}</label>
                            <select id="kalender-pengulangan" class="border-2 p-3 rounded-xl w-full focus:outline-teal-500 font-semibold ${isPremium ? 'text-purple-700' : 'text-slate-400 bg-slate-100 cursor-not-allowed'}" ${!isPremium ? 'disabled' : ''}>
                                <option value="Tidak Ada">Tidak Ada</option>
                                ${isPremium ? `
                                <option value="Tahunan (Masehi)">Tahunan (Masehi)</option>
                                <option value="Tahunan (Hijriah)">Tahunan (Hijriah)</option>
                                ` : ''}
                            </select>
                            ${!isPremium ? `<p class="text-[9px] text-slate-400 mt-1">Hanya ada di Kalender Plus.</p>` : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-6 p-3 bg-slate-50 border rounded-xl">
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 block">Warna Kotak (Soft)</label>
                            <select id="kalender-warna-bg" class="border-2 p-2 rounded-lg w-full font-semibold outline-none">
                                <option value="#ffffff" style="background-color:#ffffff;">Putih Transparan (Default)</option>
                                <option value="#f1f5f9" style="background-color:#f1f5f9;">Silver Muda</option>
                                <option value="#fee2e2" style="background-color:#fee2e2;">Merah Soft</option>
                                <option value="#e0f2fe" style="background-color:#e0f2fe;">Biru Soft</option>
                                <option value="#dcfce3" style="background-color:#dcfce3;">Hijau Soft</option>
                                <option value="#fef9c3" style="background-color:#fef9c3;">Kuning Soft</option>
                                <option value="#f3e8ff" style="background-color:#f3e8ff;">Ungu Soft</option>
                                <option value="#ffedd5" style="background-color:#ffedd5;">Oranye Soft</option>
                                <option value="#cffafe" style="background-color:#cffafe;">Tosca Soft</option>
                                <option value="#ffe4e6" style="background-color:#ffe4e6;">Pink Soft</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm font-bold text-slate-600 mb-1 block">Warna Angka (Solid)</label>
                            <select id="kalender-warna-teks" class="border-2 p-2 rounded-lg w-full font-semibold outline-none text-white bg-slate-800">
                                <option value="#000000">Hitam (Default)</option>
                                <option value="#ffffff">Putih</option>
                                <option value="#dc2626" style="color:#dc2626;">Merah Solid</option>
                                <option value="#2563eb" style="color:#2563eb;">Biru Solid</option>
                                <option value="#16a34a" style="color:#16a34a;">Hijau Solid</option>
                                <option value="#ca8a04" style="color:#ca8a04;">Kuning Gelap</option>
                                <option value="#9333ea" style="color:#9333ea;">Ungu Solid</option>
                                <option value="#ea580c" style="color:#ea580c;">Oranye Solid</option>
                                <option value="#0d9488" style="color:#0d9488;">Tosca Solid</option>
                                <option value="#475569" style="color:#475569;">Abu-Abu Solid</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex space-x-2">
                        <button type="button" id="btn-hapus-kalender" onclick="window.hapusAgendaKalender()" class="hidden bg-red-100 hover:bg-red-200 text-red-600 px-4 py-3 rounded-xl font-bold transition"><i class="fa-solid fa-trash"></i></button>
                        <button type="submit" id="btn-submit-kalender" class="flex-1 bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-xl font-black text-lg shadow-lg transform hover:-translate-y-1 transition"><i class="fa-solid fa-save mr-2"></i> Simpan Agenda</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    window.listenKalenderFirestore();
}
