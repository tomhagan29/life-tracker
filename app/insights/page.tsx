import { getInsightsData } from "@/app/actions/insights";
import { WealthInsights } from "@/app/components/insights/wealth-insights";
import { PageHeader } from "@/app/components/shared/page-header";
import { Sidebar } from "@/app/components/shared/sidebar";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const insights = await getInsightsData();

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <div className="app-shell">
        <Sidebar />

        <div className="app-content">
          <PageHeader title="Insights" />
          <WealthInsights insights={insights} />
        </div>
      </div>
    </main>
  );
}
