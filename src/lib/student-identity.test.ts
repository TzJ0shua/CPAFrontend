import { describe, expect, it } from 'vitest'
import { formatCpf, validCpf } from './student-identity'
describe('identificação do aluno', () => {
  it('valida dígitos verificadores e mascara CPF', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
    expect(validCpf('529.982.247-25')).toBe(true)
    expect(validCpf('52998224724')).toBe(false)
    expect(validCpf('11111111111')).toBe(false)
    expect(validCpf('')).toBe(false)
  })
})
