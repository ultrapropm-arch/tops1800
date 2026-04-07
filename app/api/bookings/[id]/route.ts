import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    const body = await req.json();

    const {
      status,
      installer_name,
      installer_pay_status,
      incomplete_reason,
      incomplete_note,
      return_fee,
      mileage_fee,
      accepted_at,
      reassigned_installer_name,
      redo_requested,
      admin_fee_note,
      incomplete_at,
      completed_at,
      is_archived,
    } = body ?? {};

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (installer_name !== undefined) updateData.installer_name = installer_name || null;
    if (installer_pay_status !== undefined) {
      updateData.installer_pay_status = installer_pay_status || null;
    }
    if (accepted_at !== undefined) {
      updateData.accepted_at = accepted_at || null;
    }

    if (incomplete_reason !== undefined) {
      updateData.incomplete_reason = incomplete_reason || null;
    }

    if (incomplete_note !== undefined) {
      updateData.incomplete_note = incomplete_note || null;
    }

    if (return_fee !== undefined) {
      const parsed = Number(return_fee);
      updateData.return_fee = Number.isFinite(parsed) ? parsed : 0;
    }

    if (mileage_fee !== undefined) {
      const parsed = Number(mileage_fee);
      updateData.mileage_fee = Number.isFinite(parsed) ? parsed : 0;
    }

    if (reassigned_installer_name !== undefined) {
      updateData.reassigned_installer_name = reassigned_installer_name || null;
    }

    if (redo_requested !== undefined) {
      updateData.redo_requested = Boolean(redo_requested);
    }

    if (admin_fee_note !== undefined) {
      updateData.admin_fee_note = admin_fee_note || null;
    }

    if (incomplete_at !== undefined) {
      updateData.incomplete_at = incomplete_at || null;
    }

    if (completed_at !== undefined) {
      updateData.completed_at = completed_at || null;
    }

    if (is_archived !== undefined) {
      updateData.is_archived = Boolean(is_archived);
    }

    if (status === "accepted" && !accepted_at) {
      updateData.accepted_at = new Date().toISOString();
      updateData.completed_at = null;
      updateData.incomplete_at = null;
    }

    if (status === "completed" && !completed_at) {
      updateData.completed_at = new Date().toISOString();
      updateData.incomplete_at = null;
    }

    if (status === "incomplete") {
      if (!incomplete_at) {
        updateData.incomplete_at = new Date().toISOString();
      }

      const reason = String(incomplete_reason || "").toLowerCase().trim();

      if (reason === "installer") {
        updateData.installer_pay_status = "hold";
        if (return_fee === undefined) updateData.return_fee = 0;
      } else if (reason === "customer" || reason === "shop") {
        if (return_fee === undefined) updateData.return_fee = 200;
        if (installer_pay_status === undefined) {
          updateData.installer_pay_status = "pending";
        }
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("PATCH /api/bookings/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      booking: data,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/bookings/[id] server error:", error);

    const message =
      error instanceof Error ? error.message : "Server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}