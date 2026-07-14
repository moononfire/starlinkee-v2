import { notFound, redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { listThreadsBySubscriptionId } from "@/lib/db/review-messages";
import { getSmsQuota } from "@/lib/sms-quota";
import { getLanguage } from "@/lib/language";
import MessagesInbox from "./MessagesInbox";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ review?: string }>;
}

export default async function MessagesPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { review } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) redirect("/portal/login");

  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const lang = await getLanguage();
  const [threads, smsQuota] = await Promise.all([
    listThreadsBySubscriptionId(subscriptionId),
    getSmsQuota(customer.customer_id),
  ]);

  return (
    <MessagesInbox
      subscriptionId={subscriptionId}
      initialThreads={threads}
      initialReviewId={review ? Number(review) : undefined}
      smsQuota={smsQuota}
      lang={lang}
    />
  );
}
