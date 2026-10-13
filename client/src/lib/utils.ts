import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Product } from './types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const EMOJI: [RegExp, string][] = [
  [/pl[aá]tano/i, '🍌'], [/lim[oó]n/i, '🍋'], [/aguacate/i, '🥑'], [/manzana/i, '🍎'],
  [/naranja/i, '🍊'], [/sand[ií]a/i, '🍉'], [/papaya/i, '🥭'], [/fresa/i, '🍓'],
  [/jitomate|tomate/i, '🍅'], [/cebolla/i, '🧅'], [/papa/i, '🥔'], [/chile/i, '🌶️'],
  [/zanahoria/i, '🥕'], [/cilantro/i, '🌿'], [/gansito/i, '🍰'], [/coca/i, '🥤'],
  [/sabritas/i, '🍟'], [/huevo/i, '🥚'], [/aceite/i, '🫒'], [/frijol/i, '🫘'],
  [/leche/i, '🥛'], [/queso/i, '🧀'], [/crema/i, '🥣'], [/hielo/i, '🧊'],
]
const CAT_EMOJI: Record<string, string> = { FRUTAS: '🍑', VERDURAS: '🥬', ABARROTES: '🛒', LACTEOS: '🥛', OTROS: '📦' }

export function productEmoji(p: Pick<Product, 'name' | 'category'>) {
  return EMOJI.find(([re]) => re.test(p.name))?.[1] ?? CAT_EMOJI[p.category] ?? '📦'
}

/** Normaliza texto para búsquedas sin acentos */
export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
