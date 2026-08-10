import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 24 },
  title: { fontSize: 22, marginBottom: 4 },
  subtitle: { color: "#666", fontSize: 10 },
  section: { marginTop: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
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
    borderTopColor: "#333",
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: { marginTop: 40, fontSize: 9, color: "#888" },
});

export type InvoiceOrderData = {
  number: string;
  createdAt: Date;
  email: string;
  currency: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  shippingTotal: { toString(): string };
  grandTotal: { toString(): string };
  paymentMethod: string;
  paymentStatus: string;
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
    totalPrice: { toString(): string };
  }[];
};

export function InvoiceDocument({ order }: { order: InvoiceOrderData }) {
  const addr = order.shippingAddress;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LORVEX</Text>
          <Text style={styles.subtitle}>Invoice · {order.number}</Text>
          <Text style={styles.subtitle}>
            Date: {order.createdAt.toLocaleDateString("fr-MA")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill to</Text>
          <Text>{order.email}</Text>
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
                {Number(item.totalPrice).toFixed(2)} {order.currency}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Subtotal</Text>
            <Text>
              {Number(order.subtotal).toFixed(2)} {order.currency}
            </Text>
          </View>
          {Number(order.discountTotal) > 0 && (
            <View style={styles.row}>
              <Text>Discount</Text>
              <Text>
                −{Number(order.discountTotal).toFixed(2)} {order.currency}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text>Shipping</Text>
            <Text>
              {Number(order.shippingTotal).toFixed(2)} {order.currency}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Total</Text>
            <Text>
              {Number(order.grandTotal).toFixed(2)} {order.currency}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Payment: {order.paymentMethod} · Status: {order.paymentStatus}
        </Text>
      </Page>
    </Document>
  );
}
