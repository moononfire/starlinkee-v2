"use client";

import { useEffect } from "react";

interface Props {
  locationId: number | null;
  pagePath: string;
  pageType: string;
}

const SESSION_KEY = "starlinkee_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function PageTracker({ locationId, pagePath, pageType }: Props) {
  useEffect(() => {
    const sessionId = getSessionId();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: locationId,
        page_path: pagePath,
        page_type: pageType,
        session_id: sessionId,
      }),
    }).catch(() => {});
  }, [locationId, pagePath, pageType]);

  return null;
}
