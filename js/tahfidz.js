import { db } from './firebase-init.js';
import { collection, addDoc, doc, deleteDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

if (typeof window.Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
}

const DAFTAR_SURAH = [
    "1. Al-Fatihah", "2. Al-Baqarah", "3. Ali 'Imran", "4. An-Nisa'", "5. Al-Ma'idah", "6. Al-An'am", "7. Al-A'raf", "8. Al-Anfal", "9. At-Tawbah", "10. Yunus", 
    "11. Hud", "12. Yusuf", "13. Ar-Ra'd", "14. Ibrahim", "15. Al-Hijr", "16. An-Nahl", "17. Al-Isra'", "18. Al-Kahf", "19. Maryam", "20. Taha", 
    "21. Al-Anbiya'", "22. Al-Hajj", "23. Al-Mu'minun", "24. An-Nur", "25. Al-Furqan", "26. Asy-Syu'ara'", "27. An-Naml", "28. Al-Qasas", "29. Al-'Ankabut", "30. Ar-Rum", 
    "31. Luqman", "32. As-Sajdah", "33. Al-Ahzab", "34. Saba'", "35. Fatir", "36. Yasin", "37. As-Saffat", "38. Sad", "39. Az-Zumar", "40. Ghafir", 
    "41. Fussilat", "42. Asy-Syura", "43. Az-Zukhruf", "44. Ad-Dukhan", "45. Al-Jasiyah", "46. Al-Ahqaf", "47. Muhammad", "48. Al-Fath", "49. Al-Hujurat", "50. Qaf", 
    "51. Az-Zariyat", "52. At-Tur", "53. An-Najm", "54. Al-Qamar", "55. Ar-Rahman", "56. Al-Waqi'ah", "57. Al-Hadid", "58. Al-Mujadilah", "59. Al-Hasyr", "60. Al-Mumtahanah", 
    "61. As-Saff", "62. Al-Jumu'ah", "63. Al-Munafiqun", "64. At-Taghabun", "65. At-Talaq", "66. At-Tahrim", "67. Al-Mulk", "68. Al-Qalam", "69. Al-Haqqah", "70. Al-Ma'arij", 
    "71. Nuh", "72. Al-Jinn", "73. Al-Muzzammil", "74. Al-Muddassir", "75. Al-Qiyamah", "76. Al-Insan", "77. Al-Mursalat", "78. An-Naba'", "79. An-Nazi'at", "80. 'Abasa", 
    "81. At-Takwir", "82. Al-Infithar", "83. Al-Muthaffifin", "84. Al-Insyiqaq", "85. Al-Buruj", "86. Ath-Thariq", "87. Al-A'la", "88. Al-Ghasyiyah", "89. Al-Fajr", "90. Al-Balad", 
    "91. Asy-Syams", "92. Al-Lail", "93. Adh-Dhuha", "94. Asy-Syarh", "95. At-Tin", "96. Al-'Alaq", "97. Al-Qadr", "98. Al-Bayyinah", "99. Az-Zalzalah", "100. Al-'Adiyat", 
    "101. Al-Qari'ah", "102. At-Takatsur", "103. Al-'Ashr", "104. Al-Humazah", "105. Al-Fil", "106. Quraisy", "107. Al-Ma'un", "108. Al-Kautsar", "109. Al-Kafirun", "110. An-Nashr", 
    "111. Al-Lahab", "112. Al-Ikhlas", "113. Al-Falaq", "114. An-Nas"
];

const JUZ_DATA = [
    { juz: 1, startS: "1. Al-Fatihah", startA: 1, endS: "2. Al-Baqarah", endA: 141 }, { juz: 2, startS: "2. Al-Baqarah", startA: 142, endS: "2. Al-Baqarah", endA: 252 },
    { juz: 3, startS: "2. Al-Baqarah", startA: 253, endS: "3. Ali 'Imran", endA: 92 }, { juz: 4, startS: "3. Ali 'Imran", startA: 93, endS: "4. An-Nisa'", endA: 23 },
    { juz: 5, startS: "4. An-Nisa'", startA: 24, endS: "4. An-Nisa'", endA: 147 }, { juz: 6, startS: "4. An-Nisa'", startA: 148, endS: "5. Al-Ma'idah", endA: 81 },
    { juz: 7, startS: "5. Al-Ma'idah", startA: 82, endS: "6. Al-An'am", endA: 110 }, { juz: 8, startS: "6. Al-An'am", startA: 111, endS: "7. Al-A'raf", endA: 87 },
    { juz: 9, startS: "7. Al-A'raf", startA: 88, endS: "8. Al-Anfal", endA: 40 }, { juz: 10, startS: "8. Al-Anfal", startA: 41, endS: "9. At-Tawbah", endA: 92 },
    { juz: 11, startS: "9. At-Tawbah", startA: 93, endS: "11. Hud", endA: 5 }, { juz: 12, startS: "11. Hud", startA: 6, endS: "12. Yusuf", endA: 52 },
    { juz: 13, startS: "12. Yusuf", startA: 53, endS: "14. Ibrahim", endA: 52 }, { juz: 14, startS: "15. Al-Hijr", startA: 1, endS: "16. An-Nahl", endA: 128 },
    { juz: 15, startS: "17. Al-Isra'", startA: 1, endS: "18. Al-Kahf", endA: 74 }, { juz: 16, startS: "18. Al-Kahf", startA: 75, endS: "20. Taha", endA: 135 },
    { juz: 17, startS: "21. Al-Anbiya'", startA: 1, endS: "22. Al-Hajj", endA: 78 }, { juz: 18, startS: "23. Al-Mu'minun", startA: 1, endS: "25. Al-Furqan", endA: 20 },
    { juz: 19, startS: "25. Al-Furqan", startA: 21, endS: "27. An-Naml", endA: 55 }, { juz: 20, startS: "27. An-Naml", startA: 56, endS: "29. Al-'Ankabut", endA: 45 },
    { juz: 21, startS: "29. Al-'Ankabut", startA: 46, endS: "33. Al-Ahzab", endA: 30 }, { juz: 22, startS: "33. Al-Ahzab", startA: 31, endS: "36. Yasin", endA: 27 },
    { juz: 23, startS: "36. Yasin", startA: 28, endS: "39. Az-Zumar", endA: 31 }, { juz: 24, startS: "39. Az-Zumar", startA: 32, endS: "41. Fussilat", endA: 46 },
    { juz: 25, startS: "41. Fussilat", startA: 47, endS: "45. Al-Jasiyah", endA: 37 }, { juz: 26, startS: "46. Al-Ahqaf", startA: 1, endS: "51. Az-Zariyat", endA: 30 },
    { juz: 27, startS: "51. Az-Zariyat", startA: 31, endS: "57. Al-Hadid", endA: 29 }, { juz: 28, startS: "58. Al-Mujadilah", startA: 1, endS: "66. At-Tahrim", endA: 12 },
    { juz: 29, startS: "67. Al-Mulk", startA: 1, endS: "77. Al-Mursalat", endA: 50 }, { juz: 30, startS: "78. An-Naba'", startA: 1, endS: "114. An-Nas", endA: 6 }
];

window.saveLocalTahfidz = function() {
    const isBulk = document.getElementById('mode-bulk-tahfidz').checked;
    if (!isBulk) return;
    const inputs = document.querySelectorAll('#area-bulk-tahfidz input, #area-bulk-tahfidz select');
    let data = {};
    inputs.forEach(el => { if(el.id) data[el.id] = el.value; });
    localStorage.setItem('tahfidz_bulk_temp', JSON.stringify(data));
};

window.loadLocalTahfidz = function() {
    const raw = localStorage.getItem('tahfidz_bulk_temp');
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        for (let key in data) {
            const el = document.getElementById(key);
            if (el) el.value = data[key];
        }
    } catch(e) {}
};

window.toggleBulkTahfidz = function() {
    const isBulk = document.getElementById('mode-bulk-tahfidz').checked;
    if (isBulk) {
        document.getElementById('area-single-tahfidz').classList.add('hidden');
        document.getElementById('area-bulk-tahfidz').classList.remove('hidden');
        window.loadLocalTahfidz(); // Pulihkan data saat beralih ke bulk
    } else {
        document.getElementById('area-single-tahfidz').classList.remove('hidden');
        document.getElementById('area-bulk-tahfidz').classList.add('hidden');
    }
};

window.toggleMurajaahMode = function() {
    const mode = document.querySelector('input[name="murajaahModeMusyrif"]:checked').value;
    if (mode === 'surah') {
        document.getElementById('murajaah-juz-select').classList.add('hidden');
    } else {
        document.getElementById('murajaah-juz-select').classList.remove('hidden');
    }
};

window.autofillJuzSingle = function() {
    const j = parseInt(document.getElementById('murajaah-juz-select').value);
    if (!j) return;
    const data = JUZ_DATA.find(x => x.juz === j);
    if (data) {
        document.getElementById('mur-s-awal').value = data.startS;
        document.getElementById('mur-a-awal').value = data.startA;
        document.getElementById('mur-s-akhir').value = data.endS;
        document.getElementById('mur-a-akhir').value = data.endA;
    }
};

window.autofillBulkJuz = function(selectElem, id) {
    const j = parseInt(selectElem.value);
    if(!j) {
        document.getElementById(`mur-awal-${id}`).value = '';
        document.getElementById(`mur-akhir-${id}`).value = '';
        window.saveLocalTahfidz();
        return;
    }
    const data = JUZ_DATA.find(x => x.juz === j);
    if(data) {
        document.getElementById(`mur-awal-${id}`).value = `${data.startS} Ayat ${data.startA}`;
        document.getElementById(`mur-akhir-${id}`).value = `${data.endS} Ayat ${data.endA}`;
        window.saveLocalTahfidz();
    }
};

export async function renderHalamanTahfidz(container) {
    const currentUser = window.currentUser || {};
    const lembaga = window.appState.lembaga[0] || {};
    // --- GEMBOK MODULAR ---
    const isPremium = (lembaga.lisensiFitur || []).includes('tahfidz_plus');

    const isSA_Admin = ['Super Admin', 'Administrator', 'Operator/TU'].includes(currentUser.hakAkses);
    const userJabs = (currentUser.detailJabatan || []).map(j => j.namaJabatan.toLowerCase());
    const isHead = userJabs.some(j => j.includes('kepala') || j.includes('ketua') || j.includes('mudir'));
    const isMusyrifTahfidz = userJabs.some(j => j.includes('tahfidz') || j.includes('quran') || j.includes('pengasuh') || j.includes('musyrif'));
    const isStrictMusyrifTahfidz = !isSA_Admin && !isHead && isMusyrifTahfidz;

    let anakList = (window.appState.anak || []).filter(a => a.statusAkademik !== 'Lulus');
    if (isStrictMusyrifTahfidz) anakList = anakList.filter(a => a.musyrifPengasuh === currentUser.nama);

    let optAnak = anakList.map(a => `<option value="${a.id}|${a.nama}">${a.nama} (${a.kelas || '-'})</option>`).join('');

    let optSurah = '<option value="">Pilih Surah...</option>';
    if(typeof DAFTAR_SURAH !== 'undefined') {
        DAFTAR_SURAH.forEach(s => optSurah += `<option value="${s}">${s}</option>`);
    }

    let optJuz = '<option value="">Pilih Juz...</option>';
    for(let i=1; i<=30; i++) optJuz += `<option value="${i}">Juz ${i}</option>`;

    let ziyadahRows = anakList.map((a, i) => `
        <tr data-id="${a.id}" data-nama="${a.nama}" class="border-b border-slate-200 hover:bg-slate-50 transition">
            <td class="p-2 text-center font-bold text-slate-500">${i+1}</td>
            <td class="p-2 font-black text-slate-800">${a.nama}</td>
            <td class="p-2 bg-teal-50/30"><select id="ziy-surah-${a.id}" onchange="window.saveLocalTahfidz()" class="w-full border border-teal-200 p-1.5 rounded text-xs focus:outline-teal-500 bg-white font-semibold">${optSurah}</select></td>
            <td class="p-2 bg-teal-50/30"><input type="text" id="ziy-ayat-${a.id}" oninput="window.saveLocalTahfidz()" class="w-full border border-teal-200 p-1.5 rounded text-xs text-center font-bold bg-white" placeholder="Cth: 1-10"></td>
            <td class="p-2 bg-teal-50/30 border-r border-slate-200"><input type="number" step="0.1" id="ziy-poin-${a.id}" oninput="window.saveLocalTahfidz()" class="w-full border border-teal-200 p-1.5 rounded text-xs text-center font-black text-teal-700 bg-white" placeholder="Skor"></td>
        </tr>
    `).join('');

    let murajaahRows = anakList.map((a, i) => `
        <tr data-id="${a.id}" data-nama="${a.nama}" class="border-b border-slate-200 hover:bg-slate-50 transition">
            <td class="p-2 text-center font-bold text-slate-500">${i+1}</td>
            <td class="p-2 font-black text-slate-800">${a.nama}</td>
            <td class="p-2 bg-amber-50/30"><select id="mur-juz-${a.id}" class="w-full border border-amber-200 p-1.5 rounded text-xs focus:outline-amber-500 bg-white font-semibold" onchange="window.autofillBulkJuz(this, '${a.id}')">${optJuz}</select></td>
            <td class="p-2 bg-amber-50/30"><input type="text" id="mur-awal-${a.id}" oninput="window.saveLocalTahfidz()" class="w-full border border-amber-200 p-1.5 rounded text-xs font-bold bg-white" placeholder="Surah:Ayat Awal"></td>
            <td class="p-2 bg-amber-50/30"><input type="text" id="mur-akhir-${a.id}" oninput="window.saveLocalTahfidz()" class="w-full border border-amber-200 p-1.5 rounded text-xs font-bold bg-white" placeholder="Surah:Ayat Akhir"></td>
            <td class="p-2 bg-amber-50/30 border-r border-slate-200"><input type="number" step="0.1" id="mur-poin-${a.id}" oninput="window.saveLocalTahfidz()" class="w-full border border-amber-200 p-1.5 rounded text-xs text-center font-black text-amber-700 bg-white" placeholder="Skor"></td>
        </tr>
    `).join('');

    container.innerHTML = `
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 border-t-4 border-teal-500 relative overflow-hidden">
        ${isStrictMusyrifTahfidz ? `<div class="absolute top-0 right-0 bg-teal-100 text-teal-700 px-4 py-1 rounded-bl-xl text-[10px] font-black"><i class="fa-solid fa-user-shield mr-1"></i> MODE GURU TAHFIDZ</div>` : ''}
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-teal-100 pb-4 gap-4">
            <h2 class="text-xl font-black text-teal-900"><i class="fa-solid fa-book-quran text-teal-500 mr-2"></i> Laporan Tahfidz Terpadu</h2>
            <div class="flex gap-4 items-center w-full md:w-auto">
                <input type="date" id="global-tgl-tahfidz" class="border-2 border-slate-200 p-2 rounded-xl font-bold text-teal-900 focus:outline-teal-500 text-sm" required>
                <label class="flex items-center cursor-pointer bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition shadow-sm w-full md:w-auto justify-center">
                    <input type="checkbox" id="mode-bulk-tahfidz" onchange="window.toggleBulkTahfidz()" class="mr-2 w-4 h-4 text-teal-600 rounded">
                    <span class="text-xs font-bold text-slate-700">Mode Tabel Massal</span>
                </label>
            </div>
        </div>

        <div class="flex justify-center mb-6">
            <div class="bg-slate-50 border border-slate-200 p-2 rounded-xl flex gap-6 px-6">
                <label class="font-bold text-xs text-slate-500 pt-0.5"><i class="fa-regular fa-clock mr-1"></i> Sesi Tahfidz:</label>
                <label class="flex items-center font-bold text-sm text-teal-700 cursor-pointer"><input type="radio" name="globalSesi" value="Pagi" checked class="mr-1.5 w-4 h-4 text-teal-600"> Pagi</label>
                <label class="flex items-center font-bold text-sm text-teal-700 cursor-pointer"><input type="radio" name="globalSesi" value="Sore" class="mr-1.5 w-4 h-4 text-teal-600"> Sore / Malam</label>
            </div>
        </div>
        
        <form id="form-tahfidz" onsubmit="window.simpanTahfidz(event)">
            
            <div id="area-single-tahfidz">
                <div class="grid grid-cols-1 mb-6">
                    <label class="text-xs font-bold text-slate-700 uppercase mb-1 block">Pilih Santri Binaan Anda</label>
                    <select id="tahfidz-siswa-single" class="w-full border-2 border-slate-200 shadow-sm p-3 rounded-xl font-bold text-teal-900 focus:outline-teal-500 cursor-pointer">
                        <option value="">-- Pilih Satu Siswa --</option>${optAnak}
                    </select>
                </div>

                <div class="grid grid-cols-1 gap-y-6">
                    <div class="bg-teal-50 p-5 rounded-xl border border-teal-100">
                        <h4 class="font-black text-lg text-teal-800 flex items-center mb-3"><i class="fa-regular fa-sun mr-2"></i> Ziyadah (Hafalan Baru)</h4>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="md:col-span-2">
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Surah</label>
                                <select id="ziy-surah" class="w-full border p-2.5 rounded-lg font-semibold bg-white focus:outline-teal-500 cursor-pointer">${optSurah}</select>
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Ayat Awal - Akhir (Cth: 1-10)</label>
                                <input type="text" id="ziy-ayat" placeholder="Cth: 1-10" class="w-full border p-2.5 rounded-lg font-bold bg-white focus:outline-teal-500 text-center">
                            </div>
                            <div>
                                <div class="flex justify-between items-center mb-1"><label class="text-[10px] font-bold text-slate-500 uppercase">Poin Skor</label><button type="button" onclick="window.bukaModalRubrikTahfidz()" class="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full font-bold"><i class="fa-solid fa-info"></i></button></div>
                                <input type="number" step="0.1" id="ziy-poin" placeholder="0-100" class="w-full border-2 border-teal-200 p-2 rounded-lg font-black text-teal-700 bg-white focus:outline-teal-500 text-center">
                            </div>
                        </div>
                    </div>

                    <div class="bg-amber-50 p-5 rounded-xl border border-amber-100">
                        <h4 class="font-black text-lg text-amber-800 flex items-center mb-3"><i class="fa-solid fa-rotate-left mr-2"></i> Muraja'ah (Pengulangan)</h4>
                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-amber-200 pb-4">
                            <div class="flex items-center gap-4 w-full md:w-2/3">
                                <label class="font-bold text-xs text-slate-700 block">Mode Input:</label>
                                <label class="flex items-center cursor-pointer font-bold text-sm text-slate-600"><input type="radio" name="murajaahModeMusyrif" value="surah" checked onchange="window.toggleMurajaahMode()" class="mr-1 w-4 h-4 text-amber-600"> Per Surah</label>
                                <label class="flex items-center cursor-pointer font-bold text-sm text-slate-600"><input type="radio" name="murajaahModeMusyrif" value="juz" onchange="window.toggleMurajaahMode()" class="mr-1 w-4 h-4 text-amber-600"> Per Juz</label>
                                <select id="murajaah-juz-select" onchange="window.autofillJuzSingle()" class="hidden w-32 border border-amber-200 p-1.5 rounded-lg font-bold text-amber-800 bg-white focus:outline-amber-500 cursor-pointer text-xs">
                                    ${optJuz}
                                </select>
                            </div>
                            <div class="w-full md:w-1/3">
                                <div class="flex justify-between items-center mb-1"><label class="text-[10px] font-bold text-slate-500 uppercase block">Poin Skor</label><button type="button" onclick="window.bukaModalRubrikTahfidz()" class="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 rounded-full font-bold"><i class="fa-solid fa-info"></i></button></div>
                                <input type="number" step="0.1" id="mur-poin" placeholder="0-100" class="w-full border-2 border-amber-200 p-2 rounded-lg font-black text-amber-700 bg-white focus:outline-amber-500 text-center">
                            </div>
                        </div>

                        <div id="murajaah-surah-inputs" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white p-3 border rounded-lg shadow-sm">
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dari Surah & Ayat</label>
                                <div class="flex gap-2">
                                    <select id="mur-s-awal" class="w-2/3 border p-2 rounded font-semibold bg-slate-50 focus:outline-amber-500">${optSurah}</select>
                                    <input type="text" id="mur-a-awal" placeholder="Ayat" class="w-1/3 border p-2 rounded font-bold bg-slate-50 text-center">
                                </div>
                            </div>
                            <div class="bg-white p-3 border rounded-lg shadow-sm">
                                <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sampai Surah & Ayat</label>
                                <div class="flex gap-2">
                                    <select id="mur-s-akhir" class="w-2/3 border p-2 rounded font-semibold bg-slate-50 focus:outline-amber-500">${optSurah}</select>
                                    <input type="text" id="mur-a-akhir" placeholder="Ayat" class="w-1/3 border p-2 rounded font-bold bg-slate-50 text-center">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="area-bulk-tahfidz" class="hidden space-y-6">
                <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <div class="bg-teal-100 border-b border-teal-200 p-3 font-black text-teal-800 flex justify-between items-center"><span class="flex items-center"><i class="fa-regular fa-sun mr-2"></i> Input Massal Ziyadah (Hafalan Baru)</span><button type="button" class="text-xs bg-white text-teal-700 px-2 py-1 rounded shadow-sm font-bold" onclick="window.saveLocalTahfidz()">Save Draft</button></div>
                    <div class="overflow-x-auto custom-scrollbar p-2">
                        <table class="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                            <thead>
                                <tr>
                                    <th class="p-3 border-b border-slate-200 text-center text-xs text-slate-500 w-12">No</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-slate-600">Nama Santri</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-teal-700">Surah</th>
                                    <th class="p-3 border-b border-slate-200 text-center text-xs text-teal-700 w-32">Ayat (Awal-Akhir)</th>
                                    <th class="p-3 border-b border-slate-200 text-center text-xs text-teal-700 w-24">Skor</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-bulk-ziyadah">
                                ${ziyadahRows || '<tr><td colspan="5" class="text-center p-4 text-xs font-bold text-slate-400">Tidak ada santri binaan.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                    <div class="bg-amber-100 border-b border-amber-200 p-3 font-black text-amber-800 flex justify-between items-center"><span class="flex items-center"><i class="fa-solid fa-rotate-left mr-2"></i> Input Massal Muraja'ah (Pengulangan)</span><button type="button" class="text-xs bg-white text-amber-700 px-2 py-1 rounded shadow-sm font-bold" onclick="window.saveLocalTahfidz()">Save Draft</button></div>
                    <div class="overflow-x-auto custom-scrollbar p-2">
                        <table class="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                            <thead>
                                <tr>
                                    <th class="p-3 border-b border-slate-200 text-center text-xs text-slate-500 w-12">No</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-slate-600">Nama Santri</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-amber-700 w-28">Juz Auto-Fill</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-amber-700">Dari (Surah:Ayat)</th>
                                    <th class="p-3 border-b border-slate-200 text-xs text-amber-700">Sampai (Surah:Ayat)</th>
                                    <th class="p-3 border-b border-slate-200 text-center text-xs text-amber-700 w-24">Skor</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-bulk-murajaah">
                                ${murajaahRows || '<tr><td colspan="6" class="text-center p-4 text-xs font-bold text-slate-400">Tidak ada santri binaan.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <p class="text-[10px] text-slate-400 mt-2 font-bold text-center"><i class="fa-solid fa-circle-info mr-1"></i> <strong>Sistem Auto-Save (Draft):</strong> Ketikan Anda akan aman jika Anda tidak sengaja merefresh halaman. Jangan lupa klik Save Draft jika ingin pindah tab.</p>
            </div>

            <button type="submit" id="btn-simpan-tahfidz" class="mt-6 w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-black px-10 py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 text-lg"><i class="fa-solid fa-save mr-2"></i> Simpan Laporan Tahfidz</button>
        </form>
    </div>
    
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div class="p-5 bg-slate-50 border-b border-slate-200 font-black text-slate-700"><i class="fa-solid fa-table-list mr-2"></i> Riwayat Laporan Tahfidz Terpadu</div>
        <div class="overflow-x-auto p-4 custom-scrollbar">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                    <tr><th class="p-3">Tanggal</th><th class="p-3">Nama Santri</th><th class="p-3">Ziyadah</th><th class="p-3">Muraja'ah</th><th class="p-3">Musyrif</th><th class="p-3 text-center">Aksi</th></tr>
                </thead>
                <tbody id="tbody-tahfidz"><tr><td colspan="6" class="text-center p-8 text-slate-400 font-bold"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data...</td></tr></tbody>
            </table>
        </div>
    </div>

    ${isPremium ? `
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6">
        <h3 class="font-black text-slate-800 mb-4 border-b pb-3"><i class="fa-solid fa-chart-line mr-2 text-teal-500"></i> Analitik Kualitas & Riwayat Tahfidz</h3>
        <div class="flex flex-col md:flex-row gap-4 mb-6">
            <select id="grafik-siswa" class="w-full border-2 border-slate-200 p-3 rounded-xl font-bold bg-slate-50 focus:outline-teal-500 cursor-pointer">
                <option value="">-- Pilih Santri untuk Memuat Grafik --</option>
                ${optAnak}
            </select>
            <button type="button" onclick="window.loadGrafikTahfidzTerpadu()" class="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl shadow transition shrink-0"><i class="fa-solid fa-chart-pie mr-2"></i> Tampilkan Grafik</button>
        </div>
        <div class="relative w-full h-[400px] bg-slate-50 border border-slate-200 rounded-xl p-4 hidden" id="canvas-container">
            <canvas id="canvasTahfidz"></canvas>
        </div>
    </div>
    ` : `
    <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 mt-6 opacity-70 cursor-not-allowed">
        <div class="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <i class="fa-solid fa-lock text-4xl text-slate-400 mb-3 block"></i>
            <h3 class="font-black text-slate-700">Analitik Kualitas & Riwayat Grafik</h3>
            <p class="text-xs font-bold text-slate-500 mt-1">Fitur Grafik Santri secara visual eksklusif untuk Analitik Tahfidz (Premium).</p>
        </div>
    </div>
    `}

    <div id="modal-rubrik-tahfidz" class="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm hidden animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border-t-4 border-indigo-500">
            <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                <h3 class="text-lg font-black text-indigo-900"><i class="fa-solid fa-scale-balanced mr-2"></i> Pedoman Konversi Poin Tahfidz</h3>
                <button onclick="window.tutupModalRubrikTahfidz()" class="bg-white w-8 h-8 rounded-full text-indigo-400 hover:text-red-500 hover:bg-red-50 text-lg transition flex justify-center items-center shadow-sm"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border border-slate-200 p-4 rounded-xl bg-slate-50">
                    <h4 class="font-black text-slate-800 mb-2 border-b border-slate-200 pb-2">Standar Skor (Ziyadah / Muraja'ah)</h4>
                    <ul class="text-xs space-y-2 text-slate-600 font-medium">
                        <li><strong class="text-teal-600 block text-sm">90 - 100 (Mumtaz)</strong> Sangat Lancar tanpa salah, tajwid tepat.</li>
                        <li><strong class="text-blue-600 block text-sm">80 - 89 (Jayyid Jiddan)</strong> Baik, ada 1-2 kesalahan kecil dikoreksi sendiri.</li>
                        <li><strong class="text-amber-600 block text-sm">70 - 79 (Jayyid)</strong> Cukup lancar, dibantu musyrif 3-4 kali.</li>
                        <li><strong class="text-orange-600 block text-sm">60 - 69 (Maqbul)</strong> Tersendat, banyak bantuan, wajib diulang.</li>
                        <li><strong class="text-rose-600 block text-sm">&lt; 60 (Naqis)</strong> Hafalan tidak matang, wajib setor ulang.</li>
                    </ul>
                </div>
            </div>
            <div class="p-4 bg-slate-50 border-t border-slate-100">
                <button onclick="window.tutupModalRubrikTahfidz()" class="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition">Saya Mengerti</button>
            </div>
        </div>
    </div>
    `;
    
    setTimeout(() => { document.getElementById('global-tgl-tahfidz').value = new Date().toISOString().split('T')[0]; }, 50);
    window.loadDataTahfidz();
}

window.bukaModalRubrikTahfidz = function() { document.getElementById('modal-rubrik-tahfidz').classList.remove('hidden'); };
window.tutupModalRubrikTahfidz = function() { document.getElementById('modal-rubrik-tahfidz').classList.add('hidden'); };

window.tahfidzChartTerpadu = null;
window.loadGrafikTahfidzTerpadu = async function() {
    if (typeof window.Chart === 'undefined') return alert("Pustaka grafik sedang dimuat, mohon coba lagi.");
    const siswaVal = document.getElementById('grafik-siswa').value;
    if (!siswaVal) return alert("Pilih santri terlebih dahulu.");
    const idSiswa = siswaVal.split('|')[0];
    const canvasContainer = document.getElementById('canvas-container');
    
    try {
        const q = query(collection(db, "Tahfidz"), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        let mapMurajaah = {};
        
        snap.forEach(d => {
            const item = d.data();
            if (item.idSiswa === idSiswa && item.murajaah && item.murajaah.poin) {
                const m = item.murajaah;
                const key = m.surahAwal === m.surahAkhir ? m.surahAwal : `${m.surahAwal} - ${m.surahAkhir}`;
                mapMurajaah[key] = { poin: Number(m.poin), date: item.tanggal };
            }
        });

        const labelsMurajaah = Object.keys(mapMurajaah);
        if (labelsMurajaah.length === 0) {
            canvasContainer.classList.add('hidden');
            return alert("Belum ada data Muraja'ah untuk dibuatkan grafik analitik.");
        }

        canvasContainer.classList.remove('hidden');
        const now = new Date();
        const backgroundColors = labelsMurajaah.map(key => {
            const mData = mapMurajaah[key];
            const diffDays = Math.ceil(Math.abs(now - new Date(mData.date)) / (1000 * 60 * 60 * 24));
            let opacity = 1.0;
            if (diffDays > 180) opacity = 0.2; 
            else if (diffDays > 90) opacity = 0.5;
            else if (diffDays > 30) opacity = 0.75;
            if (mData.poin >= 90) return `rgba(13, 148, 136, ${opacity})`; 
            if (mData.poin >= 80) return `rgba(37, 99, 235, ${opacity})`; 
            if (mData.poin >= 70) return `rgba(217, 119, 6, ${opacity})`; 
            return `rgba(225, 29, 72, ${opacity})`; 
        });

        const dataPoints = labelsMurajaah.map(k => mapMurajaah[k].poin);
        const ctx = document.getElementById('canvasTahfidz').getContext('2d');
        if (window.tahfidzChartTerpadu) window.tahfidzChartTerpadu.destroy();
        
        window.tahfidzChartTerpadu = new window.Chart(ctx, {
            type: 'bar',
            data: { labels: labelsMurajaah, datasets: [{ label: 'Poin Kualitas Muraja\'ah', data: dataPoints, backgroundColor: backgroundColors, borderWidth: 1, borderColor: backgroundColors.map(c => c.replace(/[^,]+(?=\))/, '1.0')), borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    } catch (e) { alert("Gagal memuat grafik."); }
};

window.loadDataTahfidz = async function() {
    const tbody = document.getElementById('tbody-tahfidz');
    if(!tbody) return;

    const currentUser = window.currentUser || {};
    const isSA_Admin = ['Super Admin', 'Administrator', 'Operator/TU'].includes(currentUser.hakAkses);
    const userJabs = (currentUser.detailJabatan || []).map(j => j.namaJabatan.toLowerCase());
    const isHead = userJabs.some(j => j.includes('kepala') || j.includes('ketua') || j.includes('mudir'));

    try {
        const q = query(collection(db, "Tahfidz"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        let html = '';
        snap.forEach(d => {
            const item = d.data();
            if (!isSA_Admin && !isHead && item.guru !== currentUser.nama) return;
            const canDelete = isSA_Admin || isHead || item.guru === currentUser.nama;
            
            let ziy = '-';
            if(item.ziyadah && item.ziyadah.surah) {
                ziy = `<span class="px-1.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-800 mr-1 shadow-sm">${item.ziyadah.sesi}</span><span class="font-bold text-teal-900">${item.ziyadah.surah}</span><br><span class="text-[10px] bg-teal-50 px-1 rounded border border-teal-200">Ayat: ${item.ziyadah.ayatAwal}-${item.ziyadah.ayatAkhir}</span> <span class="font-black text-teal-600 text-xs ml-1">${item.ziyadah.poin} Poin</span>`;
            }

            let mur = '-';
            if(item.murajaah && item.murajaah.poin) {
                mur = `<span class="font-bold text-amber-900">${item.murajaah.surahAwal} <br>s/d ${item.murajaah.surahAkhir}</span><br><span class="font-black text-amber-600 text-xs">${item.murajaah.poin} Poin</span>`;
            }

            html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-3 font-bold text-slate-600 whitespace-nowrap">${item.tanggal}</td>
                <td class="p-3 font-black text-slate-800">${item.namaSiswa}</td>
                <td class="p-3 leading-tight border-l border-slate-100">${ziy}</td>
                <td class="p-3 leading-tight border-l border-r border-slate-100">${mur}</td>
                <td class="p-3 text-xs font-bold text-slate-500">${item.guru}</td>
                <td class="p-3 text-center">
                    ${canDelete ? `<button onclick="window.hapusTahfidz('${d.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition"><i class="fa-solid fa-trash"></i></button>` : '-'}
                </td>
            </tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Belum ada catatan tahfidz Anda.</td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-red-500 font-bold">Gagal memuat data.</td></tr>'; }
};

window.simpanTahfidz = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-simpan-tahfidz');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...'; btn.disabled = true;
    
    const isBulk = document.getElementById('mode-bulk-tahfidz').checked;
    const globalTgl = document.getElementById('global-tgl-tahfidz').value;
    const globalSesi = document.querySelector('input[name="globalSesi"]:checked').value;
    
    let payloads = [];

    if (isBulk) {
        const ziyadahRows = document.querySelectorAll('#tbody-bulk-ziyadah tr');
        
        ziyadahRows.forEach(trZiy => {
            const idSiswa = trZiy.dataset.id;
            const namaSiswa = trZiy.dataset.nama;
            
            const zSurah = document.getElementById(`ziy-surah-${idSiswa}`).value;
            const zAyatStr = document.getElementById(`ziy-ayat-${idSiswa}`).value;
            const zPoin = document.getElementById(`ziy-poin-${idSiswa}`).value;
            
            let ziyadah = null;
            if (zSurah && zPoin) {
                let aAwal = zAyatStr, aAkhir = zAyatStr;
                if (zAyatStr.includes('-')) { const pts = zAyatStr.split('-'); aAwal = pts[0].trim(); aAkhir = pts[1].trim(); }
                ziyadah = { sesi: globalSesi, surah: zSurah, ayatAwal: aAwal, ayatAkhir: aAkhir, poin: zPoin };
            }

            const mPoin = document.getElementById(`mur-poin-${idSiswa}`).value;
            let murajaah = null;
            if (mPoin) {
                murajaah = { 
                    mode: 'campuran', 
                    poin: mPoin, 
                    surahAwal: document.getElementById(`mur-awal-${idSiswa}`).value, 
                    surahAkhir: document.getElementById(`mur-akhir-${idSiswa}`).value 
                };
            }

            if (ziyadah || murajaah) {
                payloads.push({ idSiswa, namaSiswa, tanggal: globalTgl, ziyadah, murajaah, guru: window.currentUser.nama, createdAt: new Date().toISOString() });
            }
        });
        
        if (payloads.length === 0) {
            alert("Harap isi Ziyadah atau Muraja'ah untuk minimal 1 santri!");
            btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Laporan Tahfidz'; btn.disabled = false; return;
        }

    } else {
        const val = document.getElementById('tahfidz-siswa-single').value;
        if (!val) { alert("Pilih santri terlebih dahulu!"); btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Laporan Tahfidz'; btn.disabled = false; return; }
        const spl = val.split('|');
        
        const zSurah = document.getElementById('ziy-surah').value;
        const zAyatStr = document.getElementById('ziy-ayat').value;
        let ziyadah = null;
        if (zSurah && document.getElementById('ziy-poin').value) {
            let aAwal = zAyatStr, aAkhir = zAyatStr;
            if (zAyatStr.includes('-')) { const pts = zAyatStr.split('-'); aAwal = pts[0].trim(); aAkhir = pts[1].trim(); }
            ziyadah = { sesi: globalSesi, surah: zSurah, ayatAwal: aAwal, ayatAkhir: aAkhir, poin: document.getElementById('ziy-poin').value };
        }

        const mPoin = document.getElementById('mur-poin').value;
        let murajaah = null;
        if (mPoin) {
            murajaah = { mode: document.querySelector('input[name="murajaahModeMusyrif"]:checked').value, poin: mPoin, surahAwal: document.getElementById('mur-s-awal').value, ayatAwal: document.getElementById('mur-a-awal').value, surahAkhir: document.getElementById('mur-s-akhir').value, ayatAkhir: document.getElementById('mur-a-akhir').value };
        }

        if (!ziyadah && !murajaah) {
            alert("Harap isi Ziyadah atau Muraja'ah sebelum menyimpan!");
            btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Laporan Tahfidz'; btn.disabled = false; return;
        }

        payloads.push({ idSiswa: spl[0], namaSiswa: spl[1], tanggal: globalTgl, ziyadah, murajaah, guru: window.currentUser.nama, createdAt: new Date().toISOString() });
    }

    try {
        for (const p of payloads) await addDoc(collection(db, "Tahfidz"), p);
        if(!isBulk) {
            document.getElementById('form-tahfidz').reset();
            document.getElementById('global-tgl-tahfidz').value = new Date().toISOString().split('T')[0];
        } else {
            document.querySelectorAll('#tbody-bulk-ziyadah input, #tbody-bulk-murajaah input, #tbody-bulk-ziyadah select, #tbody-bulk-murajaah select').forEach(el => el.value = '');
            localStorage.removeItem('tahfidz_bulk_temp'); // Hapus memori browser jika simpan berhasil
        }
        window.loadDataTahfidz();
        alert(`Berhasil menyimpan laporan untuk ${payloads.length} santri.`);
    } catch(err) { alert("Gagal menyimpan data!"); }
    btn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Simpan Laporan Tahfidz'; btn.disabled = false;
};

window.hapusTahfidz = async function(id) {
    if(confirm("Yakin ingin menghapus jurnal hafalan ini secara permanen?")) {
        try { await deleteDoc(doc(db, "Tahfidz", id)); window.loadDataTahfidz(); } catch(e) { alert("Gagal menghapus!"); }
    }
};
