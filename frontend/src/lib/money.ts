export function formatMoney(amount: string | number | null | undefined): string {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " ₽"
}
