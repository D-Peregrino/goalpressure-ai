import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { applyAllSchemas } from "@/lib/system/applyAllSchemas";
import { logSchemaApplyError } from "@/lib/system/schemaApplyLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/apply-schemas — aplica schemas SQL (admin).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json(
      { success: false, ok: false, error: "Acesso negado.", applied: [], skipped: [], failed: [], errors: [] },
      { status: 403 }
    );
  }

  try {
    const result = await applyAllSchemas();
    const fatal =
      !result.databaseUrlConfigured || result.connectError !== null || result.schemaDir === null;

    if (fatal) {
      logSchemaApplyError(new Error(result.errors.join("; ") || "schema_apply_fatal"), {
        scope: "admin_route",
      });
    }

    return NextResponse.json(
      {
        success: result.success,
        ok: result.ok,
        applied: result.applied,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
        databaseUrlConfigured: result.databaseUrlConfigured,
        schemaDir: result.schemaDir,
        connectError: result.connectError,
      },
      { status: fatal ? 500 : 200 }
    );
  } catch (e) {
    logSchemaApplyError(e, { scope: "admin_route_unhandled" });
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        applied: [],
        skipped: [],
        failed: [],
        errors: [message],
      },
      { status: 500 }
    );
  }
}
