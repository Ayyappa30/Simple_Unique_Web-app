import { Suspense } from "react";
import { OrderConfirmation } from "@/features/checkout/order-confirmation";

export default function Page(props: PageProps<"/orders/[id]">) {
  return <Suspense fallback={<OrderLoading/>}><OrderContent params={props.params}/></Suspense>;
}

async function OrderContent({ params }: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;
  return <OrderConfirmation id={id}/>;
}

function OrderLoading() {
  return <main className="section confirmation" aria-busy="true"><span className="eyebrow">Order details</span><h1 className="serif">Finding your order…</h1></main>;
}
