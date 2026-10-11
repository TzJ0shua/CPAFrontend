export const cpfDigits = (value: string) => value.replace(/\D/g, '')
export function formatCpf(value: string) {
  const digits = cpfDigits(value).slice(0, 11)
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, digits.length > 9 ? '$1-$2' : '$1$2')
}
export function validCpf(value: string) {
  const digits = cpfDigits(value)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  for (const length of [9, 10]) {
    const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const check = (sum * 10) % 11
    if (Number(digits[length]) !== (check === 10 ? 0 : check)) return false
  }
  return true
}
