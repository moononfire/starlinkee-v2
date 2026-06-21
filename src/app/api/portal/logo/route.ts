import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { getLocationById, updateLocation } from "@/lib/db/locations";
import { uploadLogo, deleteLogo } from "@/lib/storage";

async function getAuthenticatedCustomer() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const customer = await getCustomerByEmail(user.email);
  return customer;
}

export async function POST(request: NextRequest) {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const locationId = Number(form.get("location_id"));
  const logoFile = form.get("logo") as File | null;

  if (!locationId || !logoFile || logoFile.size === 0) {
    return NextResponse.json({ error: "Missing location_id or logo file" }, { status: 400 });
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const ownsLocation = subscriptions.some(
    (s) => s.location?.location_id === locationId
  );
  if (!ownsLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const location = await getLocationById(locationId);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  try {
    const { path, publicUrl } = await uploadLogo(logoFile);

    if (location.logo_path) {
      try {
        await deleteLogo(location.logo_path);
      } catch {
        // old file cleanup is best-effort
      }
    }

    await updateLocation(locationId, { logo_path: path, logo_link: publicUrl });

    return NextResponse.json({ logo_link: publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Logo upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { location_id: locationId } = await request.json();
  if (!locationId) {
    return NextResponse.json({ error: "Missing location_id" }, { status: 400 });
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const ownsLocation = subscriptions.some(
    (s) => s.location?.location_id === locationId
  );
  if (!ownsLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const location = await getLocationById(locationId);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (location.logo_path) {
    try {
      await deleteLogo(location.logo_path);
    } catch {
      // best-effort
    }
  }

  await updateLocation(locationId, { logo_path: null, logo_link: null });

  return NextResponse.json({ success: true });
}
