import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ subscriptionId: string }>;
}

export default async function SettingsSubscriptionRedirect({ params }: Props) {
  const { subscriptionId } = await params;
  redirect(`/portal/${subscriptionId}`);
}
