import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: "Helvetica",
    width: 288,
    height: 432,
  },
  brand: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  box: {
    borderWidth: 2,
    borderColor: "#000",
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#666",
    marginBottom: 4,
  },
  value: { fontSize: 12, marginBottom: 10 },
  tracking: { fontSize: 14, fontFamily: "Courier", marginTop: 8 },
  barcode: {
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f5f5f5",
    textAlign: "center",
    fontFamily: "Courier",
    fontSize: 10,
  },
});

export type LabelOrderData = {
  number: string;
  email: string;
  trackingNumber: string | null;
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string | null;
    country: string;
    phone: string;
  } | null;
  items: { id: string; name: string; quantity: number }[];
};

export function LabelDocument({ order }: { order: LabelOrderData }) {
  const addr = order.shippingAddress;
  return (
    <Document>
      <Page size={[288, 432]} style={styles.page}>
        <Text style={styles.brand}>LORVEX</Text>

        <View style={styles.box}>
          <Text style={styles.label}>Ship to</Text>
          {addr ? (
            <>
              <Text style={styles.value}>
                {addr.firstName} {addr.lastName}
              </Text>
              <Text style={styles.value}>{addr.line1}</Text>
              {addr.line2 ? <Text style={styles.value}>{addr.line2}</Text> : null}
              <Text style={styles.value}>
                {addr.city}
                {addr.postalCode ? ` ${addr.postalCode}` : ""}
              </Text>
              <Text style={styles.value}>{addr.country}</Text>
              <Text style={styles.value}>{addr.phone}</Text>
            </>
          ) : (
            <Text style={styles.value}>{order.email}</Text>
          )}
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Order</Text>
          <Text style={styles.tracking}>{order.number}</Text>
          {order.trackingNumber && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Tracking #</Text>
              <Text style={styles.tracking}>{order.trackingNumber}</Text>
            </>
          )}
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Contents</Text>
          {order.items.map((item) => (
            <Text key={item.id} style={{ fontSize: 9, marginBottom: 2 }}>
              {item.quantity}× {item.name}
            </Text>
          ))}
        </View>

        <View style={styles.barcode}>
          <Text>{order.number.replace(/-/g, "")}</Text>
        </View>
      </Page>
    </Document>
  );
}
