import { db } from './firebase-init.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ambil sesi aktif dari memori lokal
window.currentUser = JSON.parse(localStorage.getItem('yayasan_user_v2')) || null;

window.handleLogin = async function(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.innerHTML = 'Memverifikasi...';
    btn.disabled = true;

    const userVal = document.getElementById('login-user').value;
    const passVal = document.getElementById('login-pass').value;

    try {
        const q = query(collection(db, "Pegawai"), where("username", "==", userVal), where("password", "==", passVal));
        const snap = await getDocs(q);

        if (!snap.empty) {
            window.currentUser = { id: snap.docs[0].id, ...snap.docs[0].data() };
            localStorage.setItem('yayasan_user_v2', JSON.stringify(window.currentUser));
            location.reload(); // Muat ulang agar masuk ke sistem utama
        } else {
            alert('Username atau Password salah!');
        }
    } catch (e) {
        alert('Gagal menghubungi Firestore.');
    } finally {
        btn.innerHTML = 'Login';
        btn.disabled = false;
    }
};

window.handleLogout = function() {
    localStorage.removeItem('yayasan_user_v2');
    location.reload();
};

// Fungsi pengecekan akses (Diekspor ke main.js)
export function cekAksesSistem() {
    if (!window.currentUser) {
        document.getElementById('view-container').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full max-w-sm mx-auto mt-20">
                <form onsubmit="handleLogin(event)" class="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg w-full border border-slate-200 dark:border-slate-700 relative">
                    
                    <button type="button" onclick="window.location.reload(true)" class="absolute top-4 right-4 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 w-8 h-8 rounded-full flex items-center justify-center transition shadow-sm border border-slate-100" title="Muat Ulang Paksa (Hard Refresh)">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>

                    <div class="text-center mb-6 mt-2">
                        <i class="fa-solid fa-shield-halved text-4xl text-primary mb-2"></i>
                        <h2 class="text-2xl font-bold text-slate-800">Portal Yayasan</h2>
                    </div>
                    
                    <input type="text" id="login-user" placeholder="Username" class="w-full border-2 border-slate-200 p-3 mb-4 rounded-lg focus:outline-primary font-bold text-slate-700 bg-slate-50" required>
                    
                    <div class="relative mb-6">
                        <input type="password" id="login-pass" placeholder="Password" class="w-full border-2 border-slate-200 p-3 rounded-lg focus:outline-primary font-bold text-slate-700 bg-slate-50 pr-10" required>
                        <button type="button" onclick="let p=document.getElementById('login-pass'); let ic=document.getElementById('eye-icon'); if(p.type==='password'){p.type='text'; ic.className='fa-solid fa-eye-slash';}else{p.type='password'; ic.className='fa-solid fa-eye';}" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition">
                            <i id="eye-icon" class="fa-solid fa-eye text-lg"></i>
                        </button>
                    </div>

                    <button type="submit" id="btn-login" class="w-full bg-primary hover:bg-blue-700 text-white py-3.5 rounded-lg font-black shadow-lg transition transform hover:-translate-y-1 text-lg">Masuk</button>
                </form>
            </div>
        `;
        return false; // Hentikan proses render menu utama
    }
    return true; // Lanjut render menu utama
}
