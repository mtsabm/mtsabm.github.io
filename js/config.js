// ==========================================
// FILE 1: CONFIG.JS (STATE & KONFIGURASI)
// ==========================================



// URL Backend Google Apps Script (Wajib disesuaikan)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7XPVzzhyszTiBiLp30Wb_BmFqzrlxWrFIHLjeHsoE4YKll6pv2BnTR1MY5ONIduhi/exec";

// Konfigurasi Cloudinary API
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/deva5eknr/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "markaz";

// Variabel Global
let compressedImageBlob = null;
let selectedFotoFile = null; 
let currentUser = null; 
let quillEditor = null;
let currentDataMasterTab = 'dm-tugas'; 
let currentAkademikTab = 'ak-dasbor'; 

// Master Menu (Untuk Rendering Navigasi Dinamis)
const MASTER_MENUS = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', color: 'text-primary' },
    { id: 'profil', icon: 'fa-id-badge', label: 'Profil Saya', color: 'text-indigo-500' },
    { id: 'kalender', icon: 'fa-calendar-alt', label: 'Kalender', color: 'text-teal-500' },
    { id: 'absensi', icon: 'fa-calendar-check', label: 'Absensi', color: 'text-slate-500' },
    { id: 'tugas', icon: 'fa-list-check', label: 'Tugas', color: 'text-slate-500' },
    { id: 'slip-gaji', icon: 'fa-file-invoice-dollar', label: 'Slip Gaji', color: 'text-slate-500' },
    { id: 'klaim', icon: 'fa-receipt', label: 'Klaim', color: 'text-slate-500' },
    { id: 'kontak', icon: 'fa-address-book', label: 'Kontak', color: 'text-slate-500' },
    { id: 'jurnal', icon: 'fa-book-open-reader', label: 'Jurnal', color: 'text-indigo-500' },
    { id: 'keuangan', icon: 'fa-vault', label: 'Keuangan', color: 'text-green-500' },
    { id: 'sarpras', icon: 'fa-boxes-stacked', label: 'Sarpras', color: 'text-orange-500' },
    { id: 'akademik', icon: 'fa-graduation-cap', label: 'Akademik', color: 'text-blue-500' },
    { id: 'arsip', icon: 'fa-folder-open', label: 'Arsip', color: 'text-yellow-500' }
];

// Matriks Wewenang Default (Fallback)
const DEFAULT_WEWENANG = {
    "Tata Usaha": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "arsip"],
    "Kepala RAY": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "jurnal", "akademik"],
    "Ketua Yayasan": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "keuangan", "arsip", "akademik"],
    "Sekretaris Yayasan": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "arsip"],
    "Bendahara Yayasan": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "keuangan"],
    "Bendahara RAY": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "keuangan"],
    "Pengasuh": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "jurnal"],
    "Musyrif": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "jurnal", "akademik"],
    "Musyrifah": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "jurnal", "akademik"],
    "Guru": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "akademik"],
    "Bid. Sarpras": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "sarpras"],
    "Bid. Kurikulum": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak", "akademik"],
    "Humas": ["dashboard", "profil", "kalender", "absensi", "tugas", "slip-gaji", "klaim", "kontak"]
};

let roleMatrix = JSON.parse(localStorage.getItem('portal_wewenang_matrix')) || DEFAULT_WEWENANG;

// Penyimpanan Data Terpusat (State Store)
let appData = {
    profil: { nama: "-", idPegawai: "-", jabatan: "-", sisaCuti: 0, kehadiran: 0 },
    dashboard: { pengumuman: "Belum ada pengumuman.", operasional: { totalWarga: 0, putri: 0, putra: 0 }, shiftHariIni: [], pendingApprovals: [], timeline: [] },
    tugas: [], cuti: [], klaim: [], kontak: [], absensi: [],
    kalender: [], 
    jurnal: [],
    keuangan: [],
    sarpras: [],
    peminjaman: [],
    dataMaster: { pegawai: [], anak: [], donatur: [], keuangan: [], surat: [] },
    akademik: { jadwal: [], jurnal: [], nilai: [], modul: [] }
};

// Pengaturan Header Tabel Modul Admin
const DM_CONFIG = {
    'dm-tugas': { sheet: 'Tugas', title: 'Tugas Operasional', headers: ['ID', 'Judul', 'Penanggung Jawab', 'Tenggat', 'Status'] },
    'dm-pegawai': { sheet: 'Users', title: 'Data Pegawai & Akun', headers: ['ID', 'Nama', 'Username', 'Jabatan', 'Role'] },
    'dm-anak': {
        title: 'Data Anak Asuh (Santri)',
        sheet: 'Anak',
        // Tambahkan header baru agar tampil lengkap di tabel depan
        headers: ['ID', 'Nama Anak', 'Status Anak', 'Pendidikan', 'Nama Wali', 'No Hp Wali', 'Pas Foto', 'Berkas Lain']
    },
    'dm-donatur': { sheet: 'Donatur', title: 'Data Donatur', headers: ['ID', 'Nama Donatur', 'Kategori', 'Nomor WA'] },
    'dm-keuangan': { sheet: 'Keuangan', title: 'Laporan Keuangan Dasar', headers: ['ID', 'Tanggal', 'Tipe Transaksi', 'Nominal', 'Keterangan'] },
    'dm-surat': { sheet: 'Surat', title: 'Arsip Surat Menyurat', headers: ['ID', 'Nomor Surat', 'Jenis Surat', 'Tanggal', 'Perihal'] },
    'dm-mapel': { sheet: 'Mapel', title: 'Data Mata Pelajaran', headers: ['ID', 'Kode Mapel', 'Nama Mapel', 'Kategori'] },
    'dm-kelas': { sheet: 'Kelas', title: 'Data Kelas & Ruangan', headers: ['ID', 'Nama Kelas', 'Wali Kelas', 'Kapasitas'] },
    'dm-lembaga': { sheet: 'Lembaga', title: 'Informasi Lembaga', headers: ['ID', 'Nama Lembaga', 'Jenis Operasional', 'Sistem KBM'] },
    'dm-payroll': { sheet: 'Payroll_Config', title: 'Konfigurasi Gaji', headers: ['ID', 'Nama Pegawai'] },
    'dm-piutang': { sheet: 'Hutang_Piutang', title: 'Hutang & Piutang', headers: ['ID', 'Nama Pegawai', 'Tipe', 'Sisa Hutang', 'Status'] }
};

const AK_CONFIG = {
    'Jadwal': { sheet: 'Akademik_Jadwal', title: 'Jadwal & Presensi', headers: ['Mata Pelajaran', 'Guru Pengajar', 'Hari', 'Jam', 'Kelas Ruang'] },
    'Jurnal': { sheet: 'Akademik_Jurnal', title: 'Jurnal Mengajar', headers: ['Tanggal', 'Guru Pengajar', 'Mata Pelajaran', 'Materi Pembelajaran', 'Catatan Kendala'] },
    'Nilai': { sheet: 'Akademik_Nilai', title: 'Buku Nilai', headers: ['Nama Anak', 'Mata Pelajaran', 'Kategori Ujian', 'Nilai Angka', 'Keterangan'] },
    'Modul': { sheet: 'Akademik_Modul', title: 'Bank Modul', headers: ['Judul Modul', 'Mata Pelajaran', 'Link Unduh', 'Pengunggah'] }
};
