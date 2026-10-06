# KlaimSense

> **"Setiap klaim harus mungkin terjadi dan wajar tagihannya."**

Prototype aplikasi verifikasi klaim BPJS Kesehatan untuk **Healthkathon 2026**, kategori
**"Efisiensi Risiko pada Fasilitas Kesehatan"**.

KlaimSense membantu petugas BPJS memeriksa apakah sebuah layanan:

1. **Mungkin terjadi** berdasarkan kapasitas nyata rumah sakit (tempat tidur, tenaga, mesin, sesi).
2. **Wajar** berdasarkan aturan dan harga acuan.
3. **Tidak berulang** (duplikasi klaim).
4. **Tidak menunjukkan pola abnormal** dibandingkan rumah sakit sejenis.

> ⚠️ **Sistem hanya memberikan INDIKASI dan BUKTI.**
> KlaimSense **tidak pernah** memutuskan bahwa rumah sakit melakukan fraud, dan **tidak dapat
> menolak klaim secara otomatis**. Keputusan akhir tetap berada pada petugas BPJS (human-in-the-loop).

---

## 1. Tentang KlaimSense

KlaimSense menjawab dua pertanyaan utama:

| Pertanyaan | Cara menjawab |
| --- | --- |
| **"Mungkinkah layanan ini terjadi?"** | Membandingkan klaim dengan kapasitas nyata: jumlah tempat tidur, dokter, fisioterapis, mesin, ruang, dan sesi maksimal. |
| **"Wajarkah tagihannya?"** | Membandingkan dengan harga acuan, jumlah yang diperbolehkan, masa penggantian alat, aturan yang berlaku, dan pola rumah sakit sejenis. |

Alur sistem:

```
KLAIM MASUK
     ↓
RULE ENGINE  (deterministik)
     ↓
PEMERIKSAAN KAPASITAS
     ↓
PEMERIKSAAN DUPLIKASI
     ↓
PEMERIKSAAN KEWAJARAN HARGA
     ↓
PEMERIKSAAN MASA PENGGANTIAN
     ↓
PERBANDINGAN RUMAH SAKIT
     ↓
SKOR PRIORITAS
     ↓
DAFTAR KLAIM YANG PERLU DIPERIKSA
     ↓
SIMULASI IoT / EDGE AI
     ↓
PENYUSUNAN BUKTI  (multi-agent)
     ↓
VERIFIKASI MANUSIA
     ↓
KEPUTUSAN
     ↓
AUDIT LOG
```

---

## 2. Arsitektur

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App Router (UI)                  │
│  Dashboard · Klaim · Detail Klaim · Rumah Sakit · Aturan      │
│  IoT · Evidence Center · Daftar Periksa · Audit · Pengaturan  │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│              API Routes (TypeScript + Zod validation)         │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                 KlaimSenseRepository (interface)              │
│        MockKlaimSenseRepository  │  PrismaKlaimSenseRepository│
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  Rule Engine (deterministik) · Scoring · Analytics            │
│  EvidenceAgentService (multi-agent) · RAG lokal · IoT/Edge AI │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│   Data sintetis (seed tetap) — in-memory atau PostgreSQL      │
└──────────────────────────────────────────────────────────────┘
```

**Prinsip penting:** Rule Engine bersifat **deterministik**. Data yang sama + aturan yang sama =
hasil yang sama. **AI tidak digunakan untuk menentukan skor.**

---

## 3. Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, komponen bergaya shadcn/ui (Radix UI) |
| Ikon | Lucide React |
| Grafik | Recharts |
| Backend | Next.js API Routes / Server Components |
| Validasi | Zod |
| Database | PostgreSQL + Prisma ORM (**opsional**) |
| Testing | Vitest |

### Desain

Design system diadaptasi dari bahasa desain **Whitepace SaaS landing page** (navy `#043873`,
blue `#4F9CF9`, light blue `#C4DEFD`, aksen kuning `#FFE492`), kemudian disesuaikan untuk
konsol verifikasi enterprise healthcare / government / cybersecurity monitoring.

> Catatan: file Figma Community `whitepace-saas-landing-page` tidak dapat diakses melalui Figma API
> (mengembalikan `404 Not Found`), sehingga palet dan pola visual Whitepace direplikasi dari
> spesifikasi publiknya, lalu disesuaikan agar serius dan profesional (bukan gaya gaming/futuristik).

---

## 4. Cara Install

Prasyarat: **Node.js 18.18+** (diuji pada Node 24) dan npm.

```bash
npm install
```

---

## 5. Cara Menjalankan

```bash
npm run dev
```

Buka **http://localhost:3000** — aplikasi otomatis mengarah ke `/dashboard`.

Cukup dua perintah ini untuk menjalankan seluruh demo. **PostgreSQL tidak wajib.**

Perintah lain:

```bash
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run test        # Unit + integration test (Vitest)
npm run build       # Production build
npm run verify      # typecheck + lint + test + build
```

---

## 6. Mode Mock (Default)

Bila `DATABASE_URL` **tidak** tersedia, KlaimSense otomatis menggunakan
**mock repository in-memory** yang dibangkitkan dari data sintetis dengan **seed tetap**
(`20261005`) sehingga demo selalu dapat direproduksi.

- **30 rumah sakit** sintetis
- **600+ klaim** sintetis (normal, phantom billing, repeat billing, inflated billing,
  pelanggaran kapasitas, pelanggaran masa penggantian, pola peer abnormal)
- Telemetri **8 mesin cuci darah** per rumah sakit selama 5 periode

Seluruh UI **tidak berubah** antara mode mock dan mode PostgreSQL karena keduanya
mengimplementasikan antarmuka `KlaimSenseRepository` yang sama.

---

## 7. PostgreSQL (Opsional)

```bash
# 1. Siapkan .env
copy .env.example .env      # Windows
# lalu isi DATABASE_URL

# 2. Generate Prisma Client & buat skema
npx prisma generate
npx prisma db push

# 3. Isi data sintetis
npm run db:seed
```

Setelah itu aplikasi otomatis berjalan pada mode PostgreSQL.

Model Prisma: `Hospital`, `HospitalCapacity`, `Claim`, `Rule`, `ClaimRuleResult`,
`SensorEvent`, `Evidence`, `VerificationCase`, `Decision`, `AuditLog`, `PolicyDocument`.

---

## 8. Struktur Project

```
src/
├─ app/
│  ├─ (console)/                 # Shell aplikasi (sidebar + header + banner demo)
│  │  ├─ dashboard/              # Overview + KPI + 5 chart + Demo Runner
│  │  ├─ claims/                 # Daftar klaim + filter
│  │  │  └─ [id]/                # Detail klaim + bukti + keputusan petugas
│  │  ├─ hospitals/              # Daftar & detail rumah sakit (+ peer comparison)
│  │  ├─ rules/                  # Aturan deteksi + knowledge base
│  │  ├─ iot/                    # Monitoring mesin + simulasi Edge AI
│  │  ├─ evidence/               # Evidence Center (printable report)
│  │  ├─ verification/           # DAFTAR PERIKSA PETUGAS (halaman utama)
│  │  ├─ audit/                  # Audit log
│  │  └─ settings/               # Konfigurasi + keterbatasan prototype
│  ├─ api/                       # API Routes
│  └─ globals.css                # Design token (Whitepace-adapted)
├─ components/
│  ├─ ui/                        # Primitif shadcn/ui
│  ├─ layout/ charts/ shared/    # Shell, grafik, komponen bersama
│  ├─ claims/ verification/ iot/ evidence/ audit/ demo/
├─ lib/
│  ├─ rules/                     # Rule engine deterministik
│  ├─ agents/                    # EvidenceAgentService (multi-agent)
│  ├─ rag/                       # Knowledge base lokal
│  ├─ iot/                       # Simulasi IoT & Edge AI
│  ├─ repositories/              # Mock + Prisma repository
│  ├─ data/                      # Generator data sintetis (seeded)
│  ├─ demo/                      # Skenario demo 7 langkah
│  └─ analytics.ts queries.ts reference-data.ts
├─ types/                        # Tipe domain
tests/                           # Unit + integration test
prisma/                          # schema.prisma + seed.ts
```

---

## 9. API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api/dashboard` | KPI + data chart |
| GET | `/api/claims` | Daftar klaim (filter: `hospitalId`, `serviceType`, `status`, `priority`, `dateFrom`, `dateTo`, `search`, `minScore`) |
| GET | `/api/claims/[id]` | Detail klaim + rule result + skor + case + evidence |
| GET | `/api/hospitals` | Daftar rumah sakit + agregat |
| GET | `/api/hospitals/[id]` | Detail rumah sakit (kapasitas, tren, peer, IoT) |
| GET | `/api/rules` | Semua rule + dokumen kebijakan |
| GET | `/api/verification` | Daftar kasus verifikasi |
| POST | `/api/verification/[id]/decision` | Catat keputusan petugas (human-in-the-loop) |
| GET | `/api/iot` | Telemetri mesin + ringkasan Edge AI |
| POST | `/api/iot/simulate` | Jalankan simulasi kejadian IoT |
| GET | `/api/evidence/[claimId]` | Paket bukti lengkap |
| POST | `/api/demo/run` | Jalankan skenario demo 7 langkah |
| GET | `/api/audit` | Audit log |

Semua input divalidasi dengan Zod; error ditangani dengan status HTTP yang sesuai
(400/404/409/422/500).

---

## 10. Rule Engine

Rule Engine bersifat **deterministik** dan setiap rule menghasilkan struktur:

```ts
{
  ruleId, kategori, triggered, severity,
  penjelasan, evidence, nilaiAktual, nilaiBatas, sumber
}
```

| Rule | Nama | Kategori | Severity | Bobot |
| --- | --- | --- | --- | --- |
| `CAP-001` | Kapasitas Fisioterapi | KAPASITAS | HIGH | +40 |
| `CAP-002` | Kapasitas Cuci Darah | KAPASITAS | HIGH | +40 |
| `DUP-001` | Klaim Duplikat | DUPLIKASI | HIGH | +30 |
| `DUP-002` | Klaim Sudah Dibayar | DUPLIKASI | HIGH | +30 |
| `PRICE-001` | Harga di Atas Acuan | KEWAJARAN_HARGA | MEDIUM | +20 |
| `REPLACE-001` | Masa Penggantian Alat | MASA_PENGGANTIAN | MEDIUM | +20 |
| `PEER-001` | Perbandingan Rumah Sakit Sejenis | PEER_COMPARISON | LOW | +10 |
| `IO-001` | Ketidaksesuaian dengan Data Sensor | IOT | HIGH | +30 |

**Rumus kapasitas**

```
CAP-001: selisih = klaim_fisioterapi_harian − (fisioterapis × 8)
CAP-002: selisih = klaim_hemodialisis_harian − (mesin × 3 shift)
```

### Skor Prioritas (transparan, tidak disembunyikan)

```
PRIORITAS: 90 / 100
RINCIAN:
CAP-001 = +40
PRICE-001 = +20
IO-001 = +30
```

| Rentang | Kategori |
| --- | --- |
| 0–29 | LOW |
| 30–59 | MEDIUM |
| 60–79 | HIGH |
| 80–100 | CRITICAL |

---

## 11. Demo Scenario

Halaman **Overview** memiliki tombol besar **"Jalankan Demo"** yang menjalankan 7 langkah:

1. **Klaim masuk** — CLM-2026-00123 & CLM-2026-00124 dari RS Sehat Sentosa
2. **Rule Engine berjalan** — skor awal **90/100 (CRITICAL)**
3. **Anomali terdeteksi** — CAP-001: **75 vs 32 = 43 sesi/hari di atas kapasitas**
4. **IoT diperiksa** — **HD-03 OFFLINE, HD-05 STANDBY, HD-07 OFFLINE**
5. **Evidence dibuat** — paket bukti dengan 9 bagian & 7 agen
6. **Petugas melakukan verifikasi**
7. **Keputusan dicatat** — audit log berubah

### Skenario utama RS Sehat Sentosa

**Fisioterapi**

```
4 fisioterapis × 8 sesi = 32 sesi/hari (kapasitas)
Klaim = 75 sesi/hari
Selisih = 43 sesi/hari di atas kapasitas
→ "Klaim melebihi kapasitas fisioterapis sebesar 43 sesi/hari."
```

**Cuci Darah**

```
8 mesin × 3 shift = 24 sesi/hari (kapasitas)
Klaim = 40 sesi/hari
Selisih = 16 sesi di atas kapasitas
```

**IoT**

```
Mesin 1: THERAPY    Mesin 5: STANDBY
Mesin 2: THERAPY    Mesin 6: THERAPY
Mesin 3: OFFLINE    Mesin 7: OFFLINE
Mesin 4: THERAPY    Mesin 8: THERAPY
```

→ Ditampilkan sebagai **"Potensi ketidaksesuaian antara klaim dan data sensor."**
Bukan sebagai "ini pasti fraud".

**Langkah demo manual (untuk presentasi)**

1. Buka `/dashboard`, klik **Jalankan Demo** → amati 7 langkah.
2. Klik **Buka Kasus** → halaman detail `CLM-2026-00123` (skor 90/100, CAP-001 +43 sesi).
3. Buka `/iot` → lihat HD-03/HD-05/HD-07, coba **Simulasikan Kejadian**.
4. Buka `/evidence` → **Export Evidence Report** (print/PDF).
5. Kembali ke `/claims/CLM-2026-00123` → klik **MINTA KLARIFIKASI** → konfirmasi.
6. Buka `/audit` → lihat entri keputusan baru tercatat.

---

## 12. Keterbatasan Prototype

Keterbatasan ini juga ditampilkan pada halaman **Pengaturan**:

- Prototype menggunakan **data sintetis**, bukan data pasien atau rumah sakit nyata.
- **IoT masih berupa simulasi** telemetri, bukan koneksi perangkat sungguhan.
- **Edge AI masih berupa simulasi** klasifikasi, bukan model terlatih tervalidasi.
- **Multi-Agent AI merupakan simulasi arsitektur** (deterministik/mock), bukan LLM produksi.
- **RAG menggunakan knowledge base lokal prototype**, bukan korpus peraturan resmi lengkap.
- **Belum terintegrasi** dengan sistem internal BPJS Kesehatan.
- **Belum menggunakan data pasien nyata** dalam bentuk apa pun.
- **Keputusan akhir tetap berada pada petugas** verifikasi manusia.
- Skor prioritas bersifat **indikatif** untuk triase, bukan penilaian fraud.

### Yang sengaja TIDAK dilakukan

- ❌ Tidak membuat sistem yang otomatis menolak klaim.
- ❌ Tidak membuat AI menentukan fraud.
- ❌ Tidak menggunakan data pasien nyata.
- ❌ Tidak membuat API BPJS palsu seolah-olah nyata.
- ❌ Tidak mengklaim sistem sudah terintegrasi BPJS.
- ❌ Tidak mengarang isi peraturan (dokumen yang belum tersedia ditandai
  *"Referensi resmi belum tersedia dalam prototype."*).
- ❌ Tidak mengarang validasi klinis.
- ❌ Tidak menyebut prototype sebagai production system.

### Tentang angka 97,8%

`97,8%` adalah **nilai simulasi prototype** untuk Edge AI, bukan hasil validasi klinis
dan bukan klaim akurasi model produksi. Keterangan ini ditampilkan langsung pada UI.

---

## 13. Roadmap

- [ ] Integrasi resmi dengan sistem verifikasi BPJS Kesehatan (dengan tata kelola data).
- [ ] Koneksi IoT nyata (MQTT/OPC-UA) dengan tanda tangan digital per perangkat.
- [ ] Edge AI terlatih & tervalidasi dengan dataset klinis yang tervalidasi etik.
- [ ] Multi-agent berbasis LLM dengan guardrail & sitasi wajib (RAG korpus resmi lengkap).
- [ ] Korpus peraturan resmi lengkap (Permenkes, tarif INA-CBG, dsb.) dengan pencarian semantik.
- [ ] Autentikasi & RBAC (petugas, supervisor, auditor) + SSO instansi.
- [ ] Antrean kerja & kolaborasi antar petugas, SLA, serta notifikasi.
- [ ] Analitik lanjutan: deteksi pola lintas waktu, graf kolusi, dan deteksi anomali adaptif.
- [ ] Audit trail immutable (append-only) dan ekspor laporan resmi bertanda tangan.
- [ ] Uji beban & kesiapan produksi (observability, tracing, SLO).

---

## 14. Deploy ke Wasmer Edge (wasmer.app)

Wasmer Edge **mendeteksi Next.js secara otomatis** melalui `next.config.*` dan script
`build`/`dev` — **tidak memerlukan Dockerfile**. Wasmer yang menangani instalasi dependency,
build, packaging, dan rollout.

### Opsi A — Deploy dari Git (disarankan)

1. Push repository ini ke GitHub (branch `main`).
2. Buka [wasmer.io](https://wasmer.io) → **Create App** → **Deploy from Git repository**.
3. Pilih repo `KlaimSense-Prototype`, lalu set **production branch** = `main`.
4. Deploy. Setiap push ke `main` akan men-deploy ulang.

### Opsi B — Deploy dari lokal

```bash
# install CLI Wasmer (lihat https://docs.wasmer.io/install)
wasmer login
wasmer deploy
```

`wasmer deploy` akan memandu pembuatan app dan deployment.

### Konfigurasi opsional (`app.yaml`)

Wasmer **tidak mewajibkan** `app.yaml` untuk Next.js. Bila ingin menambahkan, buat file
`app.yaml` di root repo dan isi `owner` dengan namespace akun Wasmer Anda
(lihat dari `wasmer whoami` atau URL app). Jangan menebak nilai `owner` — nilai yang salah
akan menggagalkan deployment.

```yaml
kind: wasmer.io/App.v0
owner: <namespace-wasmer-anda>   # WAJIB diisi sesuai akun Anda
name: klaimsense-prototype
description: KlaimSense — Prototype verifikasi klaim BPJS Kesehatan (data sintetis)
package: .
scaling:
  mode: single_concurrency
```

Catatan penting:

- **Jangan** aktifkan `capabilities.cdn_cache`. Halaman KlaimSense bersifat dinamis dan
  bergantung pada state per sesi; caching HTML berisiko menampilkan data basi.
- `scaling.mode: single_concurrency` membuat satu instance menangani satu request pada satu
  waktu. Ini paling aman untuk demo karena state keputusan disimpan in-memory per instance,
  sehingga riwayat keputusan lebih konsisten selama presentasi.
- `capabilities.database` tidak diperlukan — aplikasi berjalan penuh pada mode mock.

### Persistensi state pada deployment serverless (penting)

Keputusan petugas, simulasi IoT, dan entri audit **tambahan** disimpan di memori proses
(`globalThis`). Pada platform serverless/edge:

- State bertahan selama instance hidup dan konsisten dalam satu instance.
- State **hilang** saat instance di-restart atau di-deploy ulang.
- Bila ada lebih dari satu instance, keputusan baru tidak otomatis terlihat di instance lain.

Kondisi awal demo (klaim `CLM-2026-00123`, skor 90/100, CAP-001 43 sesi, IoT HD-03/05/07)
selalu di-*seed* ulang secara deterministik, sehingga presentasi tetap berjalan benar meski
instance baru dibuat. Untuk persistensi sungguhan, aktifkan mode PostgreSQL (bagian 7) dan
hubungkan ke database terkelola.

### Checklist sebelum presentasi

```bash
npm ci          # resolusi dependency bersih
npm run build   # build produksi
npm start       # uji server produksi di http://localhost:3000
```

---

## Lisensi & Etika

Prototype ini dibuat untuk keperluan kompetisi **Healthkathon 2026**. Seluruh data bersifat
**sintetis** dan tidak merepresentasikan individu, fasilitas kesehatan, atau entitas nyata.
Sistem dirancang untuk **membantu**, bukan menggantikan, penilaian profesional petugas verifikasi.
