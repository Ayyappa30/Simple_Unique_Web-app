import { Suspense } from "react";
import { CheckoutPage } from "@/features/checkout/checkout-page";

export default function Page(props: PageProps<"/checkout">) {
  return <Suspense fallback={<CheckoutLoading/>}><CheckoutContent searchParams={props.searchParams}/></Suspense>;
}

async function CheckoutContent({ searchParams }: Pick<PageProps<"/checkout">, "searchParams">) {
  const { coupon } = await searchParams;
  return <CheckoutPage coupon={typeof coupon === "string" ? coupon : ""}/>;
}

function CheckoutLoading() {
  return <main className="section confirmation" aria-busy="true"><span className="eyebrow">Almost yours</span><h1 className="serif">Preparing checkout</h1><p>Your delivery details are loading.</p></main>;
}
