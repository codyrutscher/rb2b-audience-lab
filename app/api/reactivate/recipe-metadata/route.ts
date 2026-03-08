import { NextResponse } from "next/server";
import { getAccountIdFromRequest } from "@/lib/reactivate/auth";
import {
  RECOVERY_TYPES,
  RECIPE_METADATA,
  type RecoveryType,
} from "@/lib/reactivate/recipes";

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipes = RECOVERY_TYPES.map((id) => ({
    recovery_type: id,
    description: RECIPE_METADATA[id as RecoveryType].description,
    sections: [...RECIPE_METADATA[id as RecoveryType].sections],
  }));

  return NextResponse.json({ recipes });
}
