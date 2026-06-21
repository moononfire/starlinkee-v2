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

export interface AnalyticsFilters {
  days: number;
  location_id?: number;
  page_type?: string;
}

export interface AnalyticsData {
  total_views: number;
  unique_sessions: number;
  by_page_type: { type: string; views: number; sessions: number }[];
  by_location: {
    location_id: number;
    location_name: string;
    views: number;
    sessions: number;
    has_linktree_access: boolean;
    has_promo_enabled: boolean;
    has_loyalty_enabled: boolean;
  }[];
  daily_views: { date: string; views: number; sessions: number }[];
  hourly_distribution: { hour: number; views: number }[];
  weekday_distribution: { day: number; views: number }[];
  funnel: {
    plate_scan: number;
    linktree: number;
    review: number;
    promo: number;
    promo_claim: number;
    loyalty: number;
  };
  session_flows: { flow: string; count: number }[];
  adoption: {
    location_name: string;
    linktree_enabled: boolean;
    linktree_views: number;
    promo_enabled: boolean;
    promo_views: number;
    loyalty_enabled: boolean;
    loyalty_views: number;
  }[];
  recent_views: PageView[];
}

export async function getAnalyticsData(
  filters: AnalyticsFilters
): Promise<AnalyticsData> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - filters.days);
  const sinceIso = since.toISOString();

  let query = supabase
    .from("page_views")
    .select("*")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (filters.location_id) {
    query = query.eq("location_id", filters.location_id);
  }
  if (filters.page_type) {
    query = query.eq("page_type", filters.page_type);
  }

  const [viewsResult, recentResult, locationsResult] = await Promise.all([
    query,
    supabase
      .from("page_views")
      .select("*")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("customer_locations")
      .select(
        "location_id, location_name, has_linktree_access, has_promo_enabled, has_loyalty_enabled"
      ),
  ]);

  const views: PageView[] = (viewsResult.data ?? []) as PageView[];
  const allLocations = locationsResult.data ?? [];
  const locationMap = new Map(
    allLocations.map((l: any) => [l.location_id, l])
  );

  const uniqueSessions = new Set(views.map((v) => v.session_id)).size;

  // By page type with session counts
  const typeStats = new Map<string, { views: number; sessions: Set<string> }>();
  for (const v of views) {
    const entry = typeStats.get(v.page_type) ?? {
      views: 0,
      sessions: new Set(),
    };
    entry.views++;
    entry.sessions.add(v.session_id);
    typeStats.set(v.page_type, entry);
  }
  const byPageType = Array.from(typeStats.entries())
    .map(([type, s]) => ({ type, views: s.views, sessions: s.sessions.size }))
    .sort((a, b) => b.views - a.views);

  // By location
  const locStats = new Map<
    number,
    { views: number; sessions: Set<string> }
  >();
  for (const v of views) {
    if (!v.location_id) continue;
    const entry = locStats.get(v.location_id) ?? {
      views: 0,
      sessions: new Set(),
    };
    entry.views++;
    entry.sessions.add(v.session_id);
    locStats.set(v.location_id, entry);
  }
  const byLocation = Array.from(locStats.entries())
    .map(([id, s]) => {
      const loc = locationMap.get(id);
      return {
        location_id: id,
        location_name: loc?.location_name ?? `#${id}`,
        views: s.views,
        sessions: s.sessions.size,
        has_linktree_access: loc?.has_linktree_access ?? false,
        has_promo_enabled: loc?.has_promo_enabled ?? false,
        has_loyalty_enabled: loc?.has_loyalty_enabled ?? false,
      };
    })
    .sort((a, b) => b.views - a.views);

  // Daily views
  const dailyMap = new Map<string, { views: number; sessions: Set<string> }>();
  for (const v of views) {
    const date = v.created_at.slice(0, 10);
    const entry = dailyMap.get(date) ?? { views: 0, sessions: new Set() };
    entry.views++;
    entry.sessions.add(v.session_id);
    dailyMap.set(date, entry);
  }
  const dailyViews = Array.from(dailyMap.entries())
    .map(([date, s]) => ({ date, views: s.views, sessions: s.sessions.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hourly distribution
  const hourlyMap = new Map<number, number>();
  for (const v of views) {
    const hour = new Date(v.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
  }
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    views: hourlyMap.get(i) ?? 0,
  }));

  // Weekday distribution (0=Sun, 6=Sat)
  const weekdayMap = new Map<number, number>();
  for (const v of views) {
    const day = new Date(v.created_at).getDay();
    weekdayMap.set(day, (weekdayMap.get(day) ?? 0) + 1);
  }
  const weekdayDistribution = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    views: weekdayMap.get(i) ?? 0,
  }));

  // Funnel
  const funnelTypes = [
    "plate_scan",
    "linktree",
    "review",
    "promo",
    "promo_claim",
    "loyalty",
  ] as const;
  const funnel = {} as AnalyticsData["funnel"];
  for (const t of funnelTypes) {
    funnel[t] = views.filter((v) => v.page_type === t).length;
  }

  // Session flows — group views by session, build path strings
  const sessionViews = new Map<string, string[]>();
  for (const v of views) {
    const list = sessionViews.get(v.session_id) ?? [];
    list.push(v.page_type);
    sessionViews.set(v.session_id, list);
  }
  const flowCounts = new Map<string, number>();
  for (const [, pages] of sessionViews) {
    const flow = pages.join(" → ");
    flowCounts.set(flow, (flowCounts.get(flow) ?? 0) + 1);
  }
  const sessionFlows = Array.from(flowCounts.entries())
    .map(([flow, count]) => ({ flow, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Adoption: enabled vs actually used per location
  const locationViewsByType = new Map<number, Map<string, number>>();
  for (const v of views) {
    if (!v.location_id) continue;
    const typeMap =
      locationViewsByType.get(v.location_id) ?? new Map<string, number>();
    typeMap.set(v.page_type, (typeMap.get(v.page_type) ?? 0) + 1);
    locationViewsByType.set(v.location_id, typeMap);
  }
  const adoption = allLocations.map((loc: any) => {
    const typeMap = locationViewsByType.get(loc.location_id);
    return {
      location_name: loc.location_name,
      linktree_enabled: loc.has_linktree_access,
      linktree_views: typeMap?.get("linktree") ?? 0,
      promo_enabled: loc.has_promo_enabled,
      promo_views:
        (typeMap?.get("promo") ?? 0) + (typeMap?.get("promo_claim") ?? 0),
      loyalty_enabled: loc.has_loyalty_enabled,
      loyalty_views: typeMap?.get("loyalty") ?? 0,
    };
  });

  return {
    total_views: views.length,
    unique_sessions: uniqueSessions,
    by_page_type: byPageType,
    by_location: byLocation,
    daily_views: dailyViews,
    hourly_distribution: hourlyDistribution,
    weekday_distribution: weekdayDistribution,
    funnel,
    session_flows: sessionFlows,
    adoption,
    recent_views: (recentResult.data ?? []) as PageView[],
  };
}

export async function getLocationsList(): Promise<
  { location_id: number; location_name: string }[]
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_locations")
    .select("location_id, location_name")
    .order("location_name");
  return data ?? [];
}
