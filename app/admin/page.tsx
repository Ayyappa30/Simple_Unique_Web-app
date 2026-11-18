"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/features/catalog/products";
import { paymentLabel, statusLabel, type ApiOrder, type OrderStatus } from "@/features/orders/order-types";
import { SiteHeader } from "@/features/storefront/site-header";

type AdminProduct = {
  id: string;
  name: string;
  description: string;
  category: Product["category"];
  priceInPaise: number;
  mrpInPaise: number;
  stock: number;
  material: string;
  imageUrl: string | null;
  isActive: boolean;
};

const emptyProduct = {
  name: "",
  category: "necklaces" as Product["category"],
  price: "",
  mrp: "",
  stock: "",
  material: "18K Gold Plated",
  description: "",
  image: "photo-1599643478518-a784e5dc4c8f",
  isActive: true,
};

export default function AdminPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderError, setOrderError] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/v1/admin/upload", {
        method: "POST",
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setUploadError(result.error ?? "Upload failed.");
      else setForm((current) => ({ ...current, image: result.data.url }));
    } catch {
      setUploadError("Could not reach the server. Try again.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }
  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/products", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setLoadError(result.error ?? "Could not load products.");
      else {
        setProducts(result.data);
        setLoadError("");
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/admin/products", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (ok) setProducts(body.data);
        else setLoadError(body.error ?? "Could not load products.");
      })
      .catch(() => active && setLoadError("Could not reach the server."))
      .finally(() => active && setLoading(false));
    fetch("/api/v1/admin/orders", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (ok) setOrders(body.data);
        else setOrderError(body.error ?? "Could not load orders.");
      })
      .catch(() => active && setOrderError("Could not reach the server."))
      .finally(() => active && setOrdersLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function saveTracking(order: ApiOrder, trackingNumber: string, carrier: string): Promise<boolean> {
    setOrderError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber, carrier }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setOrderError(result.error ?? "Could not save tracking details.");
        return false;
      }
      setOrders((current) => current.map((item) => (item.id === order.id ? result.data : item)));
      return true;
    } catch {
      setOrderError("Could not reach the server. Try again.");
      return false;
    }
  }

  // Shipping actions (Shiprocket). Each returns the updated order, which replaces the row.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shippingNote, setShippingNote] = useState("");
  const [setup, setSetup] = useState<ShippingSetup | null>(null);

  async function shippingAction(order: ApiOrder, path: string, body?: unknown) {
    setOrderError("");
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/v1/admin/orders/${order.id}${path}`, {
        method: path ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setOrderError(`${order.orderNumber}: ${result.error ?? "That didn't work. Please try again."}`);
      else setOrders((current) => current.map((item) => (item.id === order.id ? result.data : item)));
    } catch {
      setOrderError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }
  const bookCourier = (order: ApiOrder) => shippingAction(order, "/ship");
  const refreshShipment = (order: ApiOrder) => shippingAction(order, "/refresh");
  const markCash = (order: ApiOrder, received: boolean) => shippingAction(order, "", { codRemitted: received });

  async function refreshAll() {
    setOrderError("");
    setShippingNote("");
    setBusyId("all");
    try {
      const response = await fetch("/api/v1/admin/shipping/refresh", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setOrderError(result.error ?? "Could not refresh the shipments."); return; }
      const { checked, changed, failures } = result.data as { checked: number; changed: number; failures: string[] };
      setShippingNote(`Checked ${checked} parcel${checked === 1 ? "" : "s"}; ${changed} changed.${failures.length ? ` ${failures.length} could not be checked: ${failures[0]}` : ""}`);
      const list = await fetch("/api/v1/admin/orders", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (list?.data) setOrders(list.data);
    } catch {
      setOrderError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function checkSetup() {
    setSetup(null);
    const result = await fetch("/api/v1/admin/shipping/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    setSetup(result?.data ?? { configured: false, connected: false, pickupFound: false, pickupLocation: "", pickupLocations: [], webhookToken: false, problem: "Could not reach the server." });
  }

  async function changeStatus(order: ApiOrder, status: OrderStatus) {
    if (status === "CANCELLED") {
      const refundNote =
        order.paymentMethod === "razorpay" && order.paymentStatus === "PAID"
          ? " This order was paid online: refund the payment from your Razorpay dashboard too."
          : "";
      if (!window.confirm(`Cancel order ${order.orderNumber}? Its items go back into stock.${refundNote}`)) return;
    }
    setOrderError("");
    try {
      const response = await fetch(`/api/v1/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setOrderError(result.error ?? "Could not update the order.");
        return;
      }
      setOrders((current) => current.map((item) => (item.id === order.id ? result.data : item)));
      // Cancelling returns stock, so refresh the inventory table too.
      if (status === "CANCELLED") await loadProducts();
    } catch {
      setOrderError("Could not reach the server. Try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch(
        editingId ? `/api/v1/admin/products/${editingId}` : "/api/v1/admin/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            priceInPaise: Math.round(Number(form.price) * 100),
            mrpInPaise: Math.round(Number(form.mrp) * 100),
            stock: Number(form.stock),
            material: form.material,
            description: form.description,
            image: form.image,
            isActive: form.isActive,
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result.error ?? "Could not save the product.");
        return;
      }
      setEditingId(null);
      setForm(emptyProduct);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
      await loadProducts();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: AdminProduct) {
    if (!window.confirm(`Remove ${product.name} from the store? Past orders keep their record.`)) return;
    setLoadError("");
    try {
      const response = await fetch(`/api/v1/admin/products/${product.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setLoadError(result.error ?? "Could not remove the product.");
      else {
        if (editingId === product.id) {
          setEditingId(null);
          setForm(emptyProduct);
        }
        await loadProducts();
      }
    } catch {
      setLoadError("Could not reach the server. Try again.");
    }
  }

  function edit(product: AdminProduct) {
    setEditingId(product.id);
    setFormError("");
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.priceInPaise / 100),
      mrp: String(product.mrpInPaise / 100),
      stock: String(product.stock),
      material: product.material,
      description: product.description,
      image: product.imageUrl ?? "",
      isActive: product.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <>
      <SiteHeader />
      <main className="section admin-page">
        <div className="section-head">
          <div>
            <span className="eyebrow">Store operations</span>
            <h1 className="serif">Admin dashboard</h1>
          </div>
          <Link href="/shop" className="eyebrow">
            View storefront ↗
          </Link>
        </div>
        <div className="admin-notice">
          Products and orders are saved to the database.
        </div>
        <section className="admin-metrics">
          <div>
            <span>Listed products</span>
            <strong>{loading ? "…" : products.length}</strong>
          </div>
          <div>
            <span>Units in stock</span>
            <strong>
              {products.reduce((sum, product) => sum + product.stock, 0)}
            </strong>
          </div>
          <div>
            <span>Orders</span>
            <strong>{ordersLoading ? "…" : orders.length}</strong>
          </div>
          <div>
            <span>Order value</span>
            <strong>
              {formatPrice(
                orders
                  .filter((order) => order.status !== "CANCELLED")
                  .reduce((sum, order) => sum + order.totalInPaise, 0) / 100,
              )}
            </strong>
          </div>
        </section>
        <section className="admin-section">
          <div className="admin-section-heading">
            <h2 className="serif">
              {editingId ? "Update product" : "Add a product"}
            </h2>
            {editingId && (
              <button
                className="text-button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyProduct);
                  setFormError("");
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
          <form className="admin-form" onSubmit={submit}>
            <label>
              Product name
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as Product["category"],
                  })
                }
              >
                <option value="necklaces">Necklaces</option>
                <option value="piercings">Body piercings</option>
                <option value="bracelets">Bracelets</option>
                <option value="earrings">Earrings</option>
                <option value="sets">Sets</option>
              </select>
            </label>
            <label>
              Price (₹)
              <input
                type="number"
                min="1"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              MRP (₹)
              <input
                type="number"
                min="1"
                required
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
              />
            </label>
            <label>
              Stock quantity
              <input
                type="number"
                min="0"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </label>
            <label>
              Material
              <select
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
              >
                <option>18K Gold Plated</option>
                <option>Stainless Steel Anti-Tarnish</option>
              </select>
            </label>
            <label className="span-two">
              Product image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
                disabled={uploading}
              />
              <small>
                {uploading ? "Uploading…" : "JPG, PNG or WebP, up to 5 MB."}
              </small>
              {uploadError && (
                <small className="error-message" role="alert">
                  {uploadError}
                </small>
              )}
            </label>
            <label className="span-two">
              Image URL or Unsplash photo ID
              <input
                required
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
            </label>
            <label className="span-two">
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label className="span-two">
              <span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />{" "}
                Visible in the store
              </span>
            </label>
            <button className="button dark" type="submit" disabled={saving || uploading}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add product"}
            </button>
            {formError && (
              <span className="error-message" role="alert">
                {formError}
              </span>
            )}
            {saved && (
              <span className="success-message" role="status">
                Product saved.
              </span>
            )}
          </form>
        </section>
        <section className="admin-section">
          <h2 className="serif">Inventory</h2>
          {loadError && (
            <p className="error-message" role="alert">
              {loadError}
            </p>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <small>
                        {product.material}
                        {product.isActive ? "" : " · Hidden"}
                      </small>
                    </td>
                    <td>{product.category}</td>
                    <td>{formatPrice(product.priceInPaise / 100)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => edit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() => remove(product)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-section">
          <h2 className="serif">Orders</h2>
          <div className="shipping-toolbar">
            <button className="text-button" type="button" disabled={busyId === "all"} onClick={refreshAll}>{busyId === "all" ? "Checking…" : "Refresh all shipments"}</button>
            <button className="text-button" type="button" onClick={checkSetup}>Check shipping setup</button>
          </div>
          {shippingNote && <p role="status"><small>{shippingNote}</small></p>}
          {setup && <ShippingSetupPanel setup={setup} onClose={() => setSetup(null)} />}
          {orderError && (
            <p className="error-message" role="alert">
              {orderError}
            </p>
          )}
          {orders.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Shipping</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const closed = order.status === "CANCELLED" || order.status === "DELIVERED" || order.status === "RETURNED";
                    return (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/orders/${order.orderNumber}`}>{order.orderNumber}</Link>
                          <small>{new Date(order.createdAt).toLocaleString("en-IN")}</small>
                        </td>
                        <td>
                          {order.customer.name}
                          <small>
                            {order.customer.phone} · {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}
                          </small>
                        </td>
                        <td>
                          {order.items.map((item) => (
                            <small key={item.productId}>
                              {item.name} × {item.quantity}
                            </small>
                          ))}
                        </td>
                        <td>
                          {formatPrice(order.totalInPaise / 100)}
                          <small>{paymentLabel(order)}</small>
                          <CashNote order={order} busy={busyId === order.id} onMark={markCash} />
                        </td>
                        <td>
                          <select
                            aria-label={`Status for ${order.orderNumber}`}
                            value={order.status}
                            disabled={closed}
                            onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                          >
                            {(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNING", "RETURNED"] as const).map((status) => (
                              <option key={status} value={status}>
                                {statusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <ShippingCell order={order} busy={busyId === order.id} onBook={bookCourier} onRefresh={refreshShipment}>
                            <TrackingForm
                              key={`${order.id}:${order.trackingNumber ?? ""}:${order.carrier ?? ""}`}
                              order={order}
                              onSave={saveTracking}
                            />
                          </ShippingCell>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            !ordersLoading && !orderError && <p>No orders yet. Customer orders will appear here.</p>
          )}
          <p>
            <small>
              Customers are emailed when an order is placed, shipped, delivered, cancelled, or when a parcel can&apos;t be
              delivered and comes back. With Shiprocket set up, “Book courier” does the booking and the status updates
              by itself as the parcel moves.
            </small>
          </p>
        </section>
      </main>
    </>
  );
}

function TrackingForm({
  order,
  onSave,
}: {
  order: ApiOrder;
  onSave: (order: ApiOrder, trackingNumber: string, carrier: string) => Promise<boolean>;
}) {
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [saving, setSaving] = useState(false);
  const unchanged = carrier.trim() === (order.carrier ?? "") && trackingNumber.trim() === (order.trackingNumber ?? "");
  const locked = order.status === "CANCELLED";
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        await onSave(order, trackingNumber.trim(), carrier.trim());
        setSaving(false);
      }}
    >
      <input
        aria-label={`Carrier for ${order.orderNumber}`}
        placeholder="Carrier"
        maxLength={80}
        value={carrier}
        disabled={locked}
        onChange={(event) => setCarrier(event.target.value)}
      />
      <input
        aria-label={`Tracking number for ${order.orderNumber}`}
        placeholder="Tracking no."
        maxLength={80}
        value={trackingNumber}
        disabled={locked}
        onChange={(event) => setTrackingNumber(event.target.value)}
      />
      <button className="text-button" type="submit" disabled={locked || unchanged || saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

type ShippingSetup = { configured: boolean; connected: boolean; pickupFound: boolean; pickupLocation: string; pickupLocations: string[]; webhookToken: boolean; problem: string | null };

function ShippingSetupPanel({ setup, onClose }: { setup: ShippingSetup; onClose: () => void }) {
  const row = (ok: boolean, label: string) => <li>{ok ? "✓" : "✗"} {label}</li>;
  return (
    <div className="shipping-setup" role="status">
      <ul>
        {row(setup.configured, "Shiprocket login and pickup location are set in .env")}
        {row(setup.connected, "Connected to Shiprocket")}
        {row(setup.pickupFound, `Pickup location “${setup.pickupLocation || "—"}” exists in Shiprocket`)}
        {row(setup.webhookToken, "Tracking webhook secret is set (needed for automatic status updates)")}
      </ul>
      {setup.problem && <p className="error-message">{setup.problem}</p>}
      {setup.pickupLocations.length > 0 && <p><small>Pickup locations in your Shiprocket account: {setup.pickupLocations.join(", ")}</small></p>}
      <button className="text-button" type="button" onClick={onClose}>Close</button>
    </div>
  );
}

/** Courier booking and live status for one order. Falls back to typing a tracking number by hand. */
function ShippingCell({ order, busy, onBook, onRefresh, children }: { order: ApiOrder; busy: boolean; onBook: (order: ApiOrder) => void; onRefresh: (order: ApiOrder) => void; children: ReactNode }) {
  const booked = order.shipment.admin?.booked ?? false;
  const waitingForPayment = order.paymentMethod === "razorpay" && order.paymentStatus !== "PAID";
  const canBook = (order.status === "PENDING" || order.status === "PROCESSING") && !waitingForPayment;
  const error = order.shipment.admin?.error;
  return (
    <div className="shipping-cell">
      {booked && (
        <>
          <strong>{order.carrier ?? "Courier"}</strong>
          {order.trackingNumber && <small>AWB {order.trackingNumber}</small>}
          <small>{order.shipment.status ? `Status: ${order.shipment.status.toLowerCase()}` : "Booked"}</small>
          <span className="shipping-links">
            {order.shipment.admin?.labelUrl && <a href={order.shipment.admin.labelUrl} target="_blank" rel="noopener noreferrer">Label</a>}
            {order.shipment.trackUrl && <a href={order.shipment.trackUrl} target="_blank" rel="noopener noreferrer">Track</a>}
            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && order.status !== "RETURNED" && (
              <button className="text-button" type="button" disabled={busy} onClick={() => onRefresh(order)}>{busy ? "Checking…" : "Refresh"}</button>
            )}
          </span>
        </>
      )}
      {error && <small className="form-error">{error}</small>}
      {canBook && (
        <button className="text-button" type="button" disabled={busy} onClick={() => onBook(order)}>
          {busy ? "Booking…" : booked || error ? "Retry booking" : "Book courier"}
        </button>
      )}
      {!booked && (
        <details className="manual-tracking">
          <summary>Enter tracking by hand</summary>
          {children}
        </details>
      )}
    </div>
  );
}

/** Cash-on-delivery money trail and the "refund due" reminder for parcels that came back after an online payment. */
function CashNote({ order, busy, onMark }: { order: ApiOrder; busy: boolean; onMark: (order: ApiOrder, received: boolean) => void }) {
  const admin = order.shipment.admin;
  if (order.paymentMethod === "cod" && admin?.codCollectedAt) {
    return admin.codRemittedAt ? (
      <small>
        Cash received in bank {new Date(admin.codRemittedAt).toLocaleDateString("en-IN")}{" "}
        <button className="text-button" type="button" disabled={busy} onClick={() => onMark(order, false)}>Undo</button>
      </small>
    ) : (
      <small>
        Cash collected by courier{" "}
        <button className="text-button" type="button" disabled={busy} onClick={() => onMark(order, true)}>Mark received in bank</button>
      </small>
    );
  }
  if (order.status === "RETURNED" && order.paymentMethod !== "cod" && order.paymentStatus === "PAID") {
    return <small className="form-error">Came back undelivered. Refund due in Razorpay.</small>;
  }
  return null;
}
