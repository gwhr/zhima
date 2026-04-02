import { success } from "@/lib/api-response";
import { listBillingPlans } from "@/lib/billing/plans";

export async function GET() {
  const publishedPlans = await listBillingPlans({ publishedOnly: true });
  return success(publishedPlans);
}
