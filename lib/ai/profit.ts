export function analyzeProfit(data: any) {
  const total = Number(data.customerTotal || 0);
  const pay = Number(data.installerPay || 0);

  const profit = total - pay;
  const margin = total ? (profit / total) * 100 : 0;

  return {
    profit,
    margin: Number(margin.toFixed(2)),
  };
}