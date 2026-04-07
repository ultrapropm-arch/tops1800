import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

const ADMIN_EMAIL = "ultrapropm@gmail.com";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createAdminClient(url, serviceRoleKey);
}

async function requireAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized",
    };
  }

  const email = String(user.email || "").toLowerCase().trim();

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return {
      ok: false as const,
      status: 403,
      error: "Admin access only",
    };
  }

  return {
    ok: true as const,
    user,
  };
}

function normalizeStatus(value: unknown) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "pending") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "";
}

function normalizeAction(value: unknown) {
  const action = String(value || "")
    .trim()
    .toLowerCase();

  if (action === "approve") return "approve";
  if (action === "reject") return "reject";
  if (action === "pending") return "pending";
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdminUser();

    if (!adminCheck.ok) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    const status = normalizeStatus(searchParams.get("status"));
    const search = String(searchParams.get("search") || "").trim();

    let query = adminSupabase
      .from("installer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        [
          `installer_name.ilike.%${search}%`,
          `full_name.ilike.%${search}%`,
          `name.ilike.%${search}%`,
          `business_name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/admin/installers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      installers: data || [],
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/installers server error:", error);

    const message =
      error instanceof Error ? error.message : "Server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await requireAdminUser();

    if (!adminCheck.ok) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await req.json();
    const installerId = String(body?.installerId || "").trim();
    const action = normalizeAction(body?.action);

    if (!installerId) {
      return NextResponse.json(
        { error: "installerId is required" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "Valid action is required: approve, reject, pending" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (action === "approve") {
      updateData.status = "approved";
      updateData.is_active = true;
    }

    if (action === "reject") {
      updateData.status = "rejected";
      updateData.is_active = false;
    }

    if (action === "pending") {
      updateData.status = "pending";
      updateData.is_active = false;
    }

    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase
      .from("installer_profiles")
      .update(updateData)
      .eq("id", installerId)
      .select("*")
      .single();

    if (error) {
      console.error("PATCH /api/admin/installers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      installer: data,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/installers server error:", error);

    const message =
      error instanceof Error ? error.message : "Server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}