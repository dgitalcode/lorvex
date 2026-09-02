import type { Locale } from "@/config/site";

const labels: Record<
  Locale,
  Record<string, string>
> = {
  fr: {
    PENDING: "Reçue — paiement à la livraison",
    PAID: "Payée",
    PROCESSING: "En préparation",
    SHIPPED: "Expédiée",
    DELIVERED: "Livrée",
    CANCELLED: "Annulée",
    REFUNDED: "Remboursée",
    PARTIALLY_REFUNDED: "Partiellement remboursée",
  },
  en: {
    PENDING: "Received — cash on delivery",
    PAID: "Paid",
    PROCESSING: "Preparing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially refunded",
  },
  ar: {
    PENDING: "مستلمة — الدفع عند الاستلام",
    PAID: "مدفوعة",
    PROCESSING: "قيد التحضير",
    SHIPPED: "تم الشحن",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغاة",
    REFUNDED: "مستردة",
    PARTIALLY_REFUNDED: "مستردة جزئياً",
  },
};

export function orderStatusLabel(locale: Locale, status: string): string {
  return labels[locale][status] ?? status;
}
