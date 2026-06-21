import { getLocationsList } from "@/lib/db/page-views";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default async function AnalyticsPage() {
  const locations = await getLocationsList();
  return <AnalyticsDashboard locations={locations} />;
}
