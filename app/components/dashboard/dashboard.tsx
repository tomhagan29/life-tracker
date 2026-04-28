import { getDashboardData } from "@/app/actions/dashboard";
import { DashboardContent } from "./dashboard-content";
import { PageHeader } from "../shared/page-header";
import { Sidebar } from "../shared/sidebar";

export async function Dashboard() {
  const dashboard = await getDashboardData();

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Finance and habits command center" />
          <DashboardContent dashboard={dashboard} />
        </div>
      </div>
    </main>
  );
}
