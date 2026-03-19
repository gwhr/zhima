import { success } from "@/lib/api-response";
import { plans } from "@/lib/billing/plans";

export async function GET() {
  return success(
    Object.entries(plans).map(([key, plan]) => ({
      id: key,
      ...plan,
    }))
  );
}
