export type Currency = "AED" | "INR";

const AED_TO_INR_RATE = 22.8;

export function formatCurrency(
  amount: number,
  currency: Currency = "AED",
  showUnit: boolean = true
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return currency === "AED" ? "AED 0" : "₹ 0";
  }

  if (currency === "INR") {
    // Convert from AED if base amount is in AED, or display direct INR
    const inrAmount = amount > 50000000 ? amount : amount * AED_TO_INR_RATE;
    if (inrAmount >= 10000000) {
      const cr = (inrAmount / 10000000).toFixed(2);
      return `₹ ${cr} Cr`;
    } else if (inrAmount >= 100000) {
      const lakhs = (inrAmount / 100000).toFixed(1);
      return `₹ ${lakhs} Lakh`;
    } else {
      return `₹ ${Math.round(inrAmount).toLocaleString("en-IN")}`;
    }
  }

  // Format AED
  if (amount >= 1000000) {
    const millions = (amount / 1000000).toFixed(2);
    return showUnit ? `AED ${millions}M` : `${millions}M`;
  }
  return showUnit ? `AED ${Math.round(amount).toLocaleString()}` : `${Math.round(amount).toLocaleString()}`;
}

export function formatFullPrice(amount: number, currency: Currency = "AED"): string {
  if (currency === "INR") {
    const inrAmount = amount > 50000000 ? amount : amount * AED_TO_INR_RATE;
    return `₹ ${Math.round(inrAmount).toLocaleString("en-IN")}`;
  }
  return `AED ${Math.round(amount).toLocaleString()}`;
}
