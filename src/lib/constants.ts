import type {
  HospitalClass,
  MachineStatus,
  PriorityCategory,
  ServiceType,
  Severity,
  VerificationStatus,
} from "@/types";

export const SERVICE_LABELS: Record<ServiceType, string> = {
  FISIOTERAPI: "Fisioterapi",
  HEMODIALISIS: "Hemodialisis / Cuci Darah",
  ALAT_BANTU_DENGAR: "Alat Bantu Dengar",
  OBAT_KRONIS: "Obat Penyakit Kronis",
};

export const SERVICE_SHORT: Record<ServiceType, string> = {
  FISIOTERAPI: "Fisioterapi",
  HEMODIALISIS: "Hemodialisis",
  ALAT_BANTU_DENGAR: "Alat Bantu Dengar",
  OBAT_KRONIS: "Obat Kronis",
};

export const CATEGORY_LABELS: Record<string, string> = {
  KAPASITAS: "Kapasitas",
  DUPLIKASI: "Duplikasi",
  KEWAJARAN_HARGA: "Kewajaran Harga",
  MASA_PENGGANTIAN: "Masa Penggantian",
  PEER_COMPARISON: "Perbandingan Peer",
  IOT: "Ketidaksesuaian IoT",
};

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  BARU: "BARU",
  DALAM_PEMERIKSAAN: "DALAM PEMERIKSAAN",
  MEMBUTUHKAN_KLARIFIKASI: "MEMBUTUHKAN KLARIFIKASI",
  RUJUK_AUDIT: "RUJUK AUDIT",
  DISETUJUI: "DISETUJUI",
  DITOLAK: "DITOLAK",
};

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  THERAPY: "THERAPY",
  STANDBY: "STANDBY",
  OFFLINE: "OFFLINE",
};

export const PRIORITY_LABELS: Record<PriorityCategory, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const HOSPITAL_CLASS_LABELS: Record<HospitalClass, string> = {
  A: "Kelas A",
  B: "Kelas B",
  C: "Kelas C",
  D: "Kelas D",
};

export const DEMO_BANNER_TEXT = "MODE DEMO — DATA SINTETIS";

export const DEMO_HOSPITAL_ID = "RS-H-001";
export const DEMO_HOSPITAL_NAME = "RS Sehat Sentosa";

export const PRIMARY_DEMO_CLAIM_ID = "CLM-2026-00123";
export const SECONDARY_DEMO_CLAIM_ID = "CLM-2026-00124";
export const DUPLICATE_DEMO_CLAIM_ID = "CLM-2026-00130";

export const HERO_CLAIM_DATE = "2026-10-05";

export const DEMO_ACTOR = "Petugas BPJS — Rina A. (Demo)";
export const SYSTEM_ACTOR = "KlaimSense Rule Engine";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/claims", label: "Klaim", icon: "FileText" },
  { href: "/hospitals", label: "Rumah Sakit", icon: "Building2" },
  { href: "/rules", label: "Aturan Deteksi", icon: "Scale" },
  { href: "/iot", label: "Monitoring IoT", icon: "Activity" },
  { href: "/evidence", label: "Evidence Center", icon: "FolderSearch" },
  { href: "/verification", label: "Daftar Periksa", icon: "ClipboardCheck" },
  { href: "/audit", label: "Audit Log", icon: "ScrollText" },
  { href: "/settings", label: "Pengaturan", icon: "Settings" },
] as const;

export const PROTOTYPE_LIMITATIONS = [
  "Prototype menggunakan data sintetis, bukan data pasien atau rumah sakit nyata.",
  "IoT masih berupa simulasi telemetri, bukan koneksi perangkat sungguhan.",
  "Edge AI masih berupa simulasi klasifikasi, bukan model terlatih tervalidasi.",
  "Multi-Agent AI merupakan simulasi arsitektur (deterministik/mock), bukan LLM produksi.",
  "RAG menggunakan knowledge base lokal prototype, bukan korpus peraturan resmi lengkap.",
  "Belum terintegrasi dengan sistem internal BPJS Kesehatan.",
  "Belum menggunakan data pasien nyata dalam bentuk apa pun.",
  "Keputusan akhir tetap berada pada petugas verifikasi manusia.",
  "Skor prioritas bersifat indikatif untuk membantu triase, bukan penilaian fraud.",
] as const;
