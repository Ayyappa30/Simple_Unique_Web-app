import { Suspense } from "react";
import { ProductDetails } from "@/features/catalog/product-details";

export default function Page(props: PageProps<"/products/[slug]">) {
  return <Suspense fallback={<ProductLoading/>}><ProductContent params={props.params}/></Suspense>;
}

async function ProductContent({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  return <ProductDetails slug={slug}/>;
}

function ProductLoading() {
  return <main className="section" aria-busy="true"><span className="eyebrow">Simple & Unique</span><h1 className="serif">Loading this piece…</h1></main>;
}
