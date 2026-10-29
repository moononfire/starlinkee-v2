import { assignPlateToSubscription } from "../db/plates";
import { issueActivationCode } from "./activation";

/**
 * Admin assignment of a free plate to a pending subscription. The customer is sent an activation code only
 * when the plate really ended up on this subscription; a taken or missing plate yields false and no email.
 */
export async function assignPlateAndIssueCode(plateId: number, subscriptionId: number): Promise<boolean> {
  const assigned = await assignPlateToSubscription(plateId, subscriptionId);
  if (!assigned) return false;
  await issueActivationCode(subscriptionId);
  return true;
}
