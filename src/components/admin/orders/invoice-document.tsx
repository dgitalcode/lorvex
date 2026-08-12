import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1917",
  },
  brand: {
    fontSize: 26,
    letterSpacing: 6,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#8a7a5c",
    marginBottom: 18,
  },
  subtitle: { color: "#666", fontSize: 10, marginBottom: 3 },
  section: { marginTop: 18, marginBottom: 6 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#8a7a5c",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8e2d8",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1917",
    paddingBottom: 5,
    marginBottom: 4,
    fontWeight: "bold",
  },
  colProduct: { width: "45%" },
  colSku: { width: "20%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "25%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1917",
    fontSize: 12,
    fontWeight: "bold",
  },
  badge: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.8,
    borderColor: "#c4b59a",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#6b5d45",
  },
  footer: {
    marginTop: 36,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#e8e2d8",
    fontSize: 9,
    color: "#888",
    lineHeight: 1.5,
  },
});

export type InvoiceOrderData = {
  number: string;
  createdAt: Date;
  email: string;
  phone?: string | null;
  currency: string;
  status: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  shippingTotal: { toString(): string };
  grandTotal: { toString(): string };
  paymentMethod: string;
  paymentStatus: string;
  shippingMethodName?: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2: string | null;
    city: string;
    country: string;
  } | null;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice?: { toString(): string };
    totalPrice: { toString(): string };
  }[];
  supportEmail?: string;
  supportPhone?: string;
};

function money(value: { toString(): string }, currency: string) {
  return `${Number(value).toFixed(2)} ${currency}`;
}

function paymentLabel(method: string, status: string) {
  const isCod = method === "COD";
  if (isCod) {
    return `Cash on delivery (COD) · Payment status: ${status} (not prepaid)`;
  }
  return `Payment method: ${method} · Payment status: ${status}`;
}

function orderStatusLabel(status: string, paymentStatus: string, method: string) {
  if (method === "COD" && paymentStatus === "PENDING") {
    return `Order status: ${status} · Awaiting payment on delivery`;
  }
  return `Order status: ${status}`;
}

export function InvoiceDocument({
  order,
  title = "Invoice",
}: {
  order: InvoiceOrderData;
  title?: string;
}) {
  const addr = order.shippingAddress;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>LORVEX</Text>
        <Text style={styles.eyebrow}>{title}</Text>
        <Text style={styles.subtitle}>Order {order.number}</Text>
        <Text style={styles.subtitle}>
          Date: {order.createdAt.toLocaleDateString("fr-MA")}
        </Text>
        <Text style={styles.subtitle}>Currency: {order.currency}</Text>
        <Text style={styles.badge}>
          {orderStatusLabel(order.status, order.paymentStatus, order.paymentMethod)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text>{order.email}</Text>
          {order.phone ? <Text>{order.phone}</Text> : null}
          {addr && (
            <>
              <Text>
                {addr.firstName} {addr.lastName}
              </Text>
              <Text>{addr.line1}</Text>
              {addr.line2 ? <Text>{addr.line2}</Text> : null}
              <Text>
                {addr.city}, {addr.country}
              </Text>
            </>
          )}
          {order.shippingMethodName ? (
            <Text>Shipping: {order.shippingMethodName}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colProduct}>Product</Text>
            <Text style={styles.colSku}>SKU</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Total</Text>
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.colProduct}>{item.name}</Text>
              <Text style={styles.colSku}>{item.sku}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>
                {money(item.totalPrice, order.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Subtotal</Text>
            <Text>{money(order.subtotal, order.currency)}</Text>
          </View>
          {Number(order.discountTotal) > 0 && (
            <View style={styles.row}>
              <Text>Discount</Text>
              <Text>−{money(order.discountTotal, order.currency)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text>Shipping</Text>
            <Text>{money(order.shippingTotal, order.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total</Text>
            <Text>{money(order.grandTotal, order.currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {paymentLabel(order.paymentMethod, order.paymentStatus)}
          {"\n"}
          Maison LORVEX · Casablanca, Morocco
          {order.supportEmail ? `\n${order.supportEmail}` : ""}
          {order.supportPhone ? ` · ${order.supportPhone}` : ""}
          {"\n"}
          This document is an order receipt / bon de commande. It is not a
          fiscal tax invoice unless issued separately by LORVEX.
        </Text>
      </Page>
    </Document>
  );
}
