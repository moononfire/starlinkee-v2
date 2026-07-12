import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { listThreadsBySubscriptionId } from "@/lib/db/review-messages";
import { getLanguage } from "@/lib/language";
import MessagesInbox from "./MessagesInbox";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function MessagesPage({ params }: Props) {
  const { subscriptionId: rawId } = await params;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const lang = await getLanguage();
  const threads = await listThreadsBySubscriptionId(subscriptionId);

  return <MessagesInbox subscriptionId={subscriptionId} initialThreads={threads} lang={lang} />;
}
