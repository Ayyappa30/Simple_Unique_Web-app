"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { deleteProduct, saveProduct, setOrderStatus } from "@/features/shop/shop-slice";
import { formatPrice, type Product } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopDispatch, useShopSelector } from "@/store/provider";

const emptyProduct = { name: "", category: "necklaces" as Product["category"], price: "", mrp: "", stock: "", material: "18K Gold Plated", description: "", image: "photo-1599643478518-a784e5dc4c8f" };

export default function AdminPage() {
  const dispatch = useShopDispatch();
  const { products, orders } = useShopSelector((state) => state);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = products.find((product) => product.id === editingId);
    const product: Product = {
      id: editingId ?? crypto.randomUUID(), slug, name: form.name.trim(), category: form.category,
      price: Number(form.price), mrp: Number(form.mrp), stock: Number(form.stock), material: form.material,
      description: form.description.trim(), image: form.image, tag: existing?.tag ?? "New",
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    dispatch(saveProduct(product));
    setEditingId(null);
    setForm(emptyProduct);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }
  function edit(product: Product) {
    setEditingId(product.id);
    setForm({ name: product.name, category: product.category, price: String(product.price), mrp: String(product.mrp), stock: String(product.stock), material: product.material, description: product.description, image: product.image });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <><SiteHeader/><main className="section admin-page"><div className="section-head"><div><span className="eyebrow">Store operations</span><h1 className="serif">Admin dashboard</h1></div><Link href="/shop" className="eyebrow">View storefront ↗</Link></div><div className="admin-notice">Demo workspace: product and order changes are saved in this browser only. Add admin authentication and connect PostgreSQL before using this dashboard for live operations.</div>
    <section className="admin-metrics"><div><span>Listed products</span><strong>{products.length}</strong></div><div><span>Units in stock</span><strong>{products.reduce((sum, product) => sum + product.stock, 0)}</strong></div><div><span>Orders</span><strong>{orders.length}</strong></div><div><span>Order value</span><strong>{formatPrice(orders.reduce((sum, order) => sum + order.total, 0))}</strong></div></section>
    <section className="admin-section"><div className="admin-section-heading"><h2 className="serif">{editingId ? "Update product" : "Add a product"}</h2>{editingId && <button className="text-button" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>Cancel edit</button>}</div><form className="admin-form" onSubmit={submit}><label>Product name<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product["category"] })}><option value="necklaces">Necklaces</option><option value="piercings">Body piercings</option><option value="bracelets">Bracelets</option><option value="earrings">Earrings</option><option value="sets">Sets</option></select></label><label>Price (₹)<input type="number" min="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/></label><label>MRP (₹)<input type="number" min="1" required value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })}/></label><label>Stock quantity<input type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}/></label><label>Material<select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}><option>18K Gold Plated</option><option>Stainless Steel Anti-Tarnish</option></select></label><label className="span-two">Image photo ID<input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}/></label><label className="span-two">Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><button className="button dark" type="submit">{editingId ? "Save changes" : "Add product"}</button>{saved && <span className="success-message" role="status">Product saved.</span>}</form></section>
    <section className="admin-section"><h2 className="serif">Inventory</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.material}</small></td><td>{product.category}</td><td>{formatPrice(product.price)}</td><td>{product.stock}</td><td><button className="text-button" onClick={() => edit(product)}>Edit</button><button className="text-button danger" onClick={() => { if (window.confirm(`Remove ${product.name} from the local catalog?`)) dispatch(deleteProduct(product.id)); }}>Remove</button></td></tr>)}</tbody></table></div></section>
    <section className="admin-section"><h2 className="serif">Orders</h2>{orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/orders/${order.id}`}>{order.id}</Link><small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small></td><td>{order.customerName}<small>{order.phone}</small></td><td>{formatPrice(order.total)}</td><td><select aria-label={`Status for ${order.id}`} value={order.status} onChange={(event) => dispatch(setOrderStatus({ id: order.id, status: event.target.value as typeof order.status }))}><option>Pending</option><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></td></tr>)}</tbody></table></div> : <p>No orders yet. Guest checkout orders will appear here on this device.</p>}</section>
  </main></>;
}
