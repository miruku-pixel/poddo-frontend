import { useState } from "react";
import { Order } from "../types/Order";
import { Billing } from "../types/Billing";
import BillingForm from "../components/BillingForm";
import Receipt from "../components/Receipt";

interface BillingPageProps {
  order: Order;
}

export default function BillingPage({ order }: BillingPageProps) {
  const [billingResult, setBillingResult] = useState<Billing | null>(null);

  if (billingResult) {
    return <Receipt order={order} billing={billingResult} />;
  }

  return <BillingForm order={order} onBilled={setBillingResult} />;
}