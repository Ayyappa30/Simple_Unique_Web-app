import { Suspense } from "react";
import { ShopPage } from "@/features/catalog/shop-page";

export default function Page(props: PageProps<"/shop">) {
  return <Suspense fallback={<ShopLoading/>}><ShopContent searchParams={props.searchParams}/></Suspense>;
}

async function ShopContent({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const { category } = await searchParams;
  return <ShopPage initialCategory={category}/>
}

function ShopLoading() {
  return <main className="section" aria-busy="true"><span className="eyebrow">Made for the everyday</span><h1 className="serif">Shop all pieces</h1><p className="account-intro">Loading the collection…</p></main>;
}
