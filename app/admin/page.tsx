import "./_home/home.css";
import { requireAnyPermission } from "../../lib/admin/access";
import { getHomeData } from "../../lib/admin/home";
import HomeClient from "./_home/HomeClient";

export default async function AdminHome() {
  await requireAnyPermission(["dashboard"]);
  const data = await getHomeData();
  return <HomeClient data={data} />;
}
