const TAX_RATE = 0.0875;
const FREE_SHIPPING_THRESHOLD = 250;
const STANDARD_SHIPPING = 19.95;

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateOrderTotals(subtotal) {
  const safeSubtotal = roundMoney(subtotal);
  const tax = roundMoney(safeSubtotal * TAX_RATE);
  const shipping = safeSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const total = roundMoney(safeSubtotal + tax + shipping);

  return { subtotal: safeSubtotal, tax, shipping, total };
}

module.exports = {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING,
  roundMoney,
  calculateOrderTotals,
};
