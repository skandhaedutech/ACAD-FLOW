import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DailyFollowupModal } from "@/components/leads/DailyFollowupModal";
import { AssignedLeadsPopup } from "@/components/layout/AssignedLeadsPopup";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex w-screen h-screen bg-[#1c1d21] overflow-hidden relative print:w-full print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f9fa] border-l border-slate-200 print:h-auto print:overflow-visible print:bg-white print:border-none">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 pt-2 print:p-0 print:overflow-visible print:h-auto print:bg-white">
          {children}
        </main>
      </div>
      <DailyFollowupModal />
      <AssignedLeadsPopup />
    </div>
  );
}
