import { notFound } from "next/navigation";
import { getCustomerById } from "@/lib/db/customers";
import CustomerEditForm from "./CustomerEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerEditPage({ params }: Props) {
  const { id } = await params;
  const customerId = parseInt(id);
  if (isNaN(customerId)) notFound();

  const customer = await getCustomerById(customerId);
  if (!customer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Edycja: {customer.customer_name}
      </h1>
      <CustomerEditForm customer={customer} />
    </div>
  );
}
