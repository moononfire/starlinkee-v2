import { createAdminClient } from "../supabase/admin";

export interface PageView {
  id: number;
  location_id: number | null;
  page_path: string;
  page_type: string;
  referrer: string | null;
  user_agent: string | null;
  session_id: string;
  created_at: string;
}

export async function recordPageView(data: {
  location_id: number | null;
  page_path: string;
  page_type: string;
  referrer?: string | null;
  user_agent?: string | null;
  session_id?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("page_views").insert({
    location_id: data.location_id,
    page_path: data.page_path,
    page_type: data.page_type,
    referrer: data.referrer ?? null,
    user_agent: data.user_agent ?? null,
    ...(data.session_id ? { session_id: data.session_id } : {}),
  });
}

export interface PageViewStats {
  total_views: number;
  unique_sessions: number;
  by_page_type: Record<string, number>;
  by_location: { location_id: number; location_name: string; views: number }[];
  recent_views: PageView[];
}

export async function getPageViewStats(days: number = 30): Promise<PageViewStats> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [allViews, recentViews] = await Promise.all([
    supabase
      .from("page_views")
      .select("id, page_type, session_id, location_id")
      .gte("created_at", sinceIso),
    supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const views = allViews.data ?? [];
  const uniqueSessions = new Set(views.map((v: any) => v.session_id)).size;

  const byPageType: Record<string, number> = {};
  for (const v of views) {
    byPageType[v.page_type] = (byPageType[v.page_type] ?? 0) + 1;
  }

  const locationCounts: Record<number, number> = {};
  for (const v of views) {
    if (v.location_id) {
      locationCounts[v.location_id] = (locationCounts[v.location_id] ?? 0) + 1;
    }
  }

  const locationIds = Object.keys(locationCounts).map(Number);
  let locationNames: Record<number, string> = {};
  if (locationIds.length > 0) {
    const { data } = await supabase
      .from("customer_locations")
      .select("location_id, location_name")
      .in("location_id", locationIds);
    for (const loc of data ?? []) {
      locationNames[loc.location_id] = loc.location_name;
    }
  }

  const byLocation = Object.entries(locationCounts)
    .map(([id, count]) => ({
      location_id: Number(id),
      location_name: locationNames[Number(id)] ?? `Location #${id}`,
      views: count,
    }))
    .sort((a, b) => b.views - a.views);

  return {
    total_views: views.length,
    unique_sessions: uniqueSessions,
    by_page_type: byPageType,
    by_location: byLocation,
    recent_views: (recentViews.data ?? []) as PageView[],
  };
}
