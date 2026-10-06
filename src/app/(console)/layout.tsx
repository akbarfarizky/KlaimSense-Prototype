import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getRepository } from "@/lib/repositories";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const repository = getRepository();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header repositoryMode={repository.mode} />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        <footer className="border-t border-line bg-surface px-4 py-3 text-[11px] text-ink-muted md:px-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <span>
              KlaimSense — Prototype Healthkathon 2026 • Kategori: Efisiensi Risiko pada Fasilitas
              Kesehatan
            </span>
            <span className="font-medium text-ink-soft">
              Keputusan akhir tetap berada pada petugas verifikasi manusia.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
