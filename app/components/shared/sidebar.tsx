import { getSidebarSnapshot } from "@/app/actions/dashboard";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  const snapshot = await getSidebarSnapshot();

  return <SidebarClient snapshot={snapshot} />;
}
