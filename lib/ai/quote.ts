export function generateQuote(data: any) {
  const sqft = Number(data.sqft || 0);
  const mileage = Number(data.mileageKm || 0);

  const base = sqft * 10;
  const travel = mileage * 1.4;
  const subtotal = base + travel;
  const hst = subtotal * 0.13;

  return {
    base,
    travel,
    total: subtotal + hst,
  };
}