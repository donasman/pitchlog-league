import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind 클래스 충돌 없이 합산
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
