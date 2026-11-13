import { Suspense } from "react";
import { ShopPage } from "@/features/catalog/shop-page";

export default function Page(props: PageProps<"/shop">) {
  return <Suspense fallback={<ShopLoading/>}><ShopContent searchParams={props.searchParams}/></Suspense>;
}

async function ShopContent({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const { category, q } = await searchParams;
  // The key makes the page start over when the link changes (a new search, or another category from the menu).
  return <ShopPage key={`${category ?? ""}|${q ?? ""}`} initialCategory={category} initialSearch={q}/>
}

function ShopLoading() {
  return <main className="section" aria-busy="true"><span className="eyebrow">Made for the everyday</span><h1 className="serif">Shop all pieces</h1><p className="account-intro">Loading the collection…</p></main>;
}
