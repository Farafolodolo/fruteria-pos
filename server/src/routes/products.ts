import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { HttpError, handler } from '../lib/http'
import { roundQty } from '../lib/money'

export const productsRouter = Router()

const CATEGORIES = ['FRUTAS', 'VERDURAS', 'ABARROTES', 'LACTEOS', 'OTROS'] as const

const productSchema = z.object({
  barcode: z.string().trim().min(1).nullish(),
  plu: z.string().trim().min(1).nullish(),
  name: z.string().trim().min(1),
  category: z.enum(CATEGORIES),
  soldBy: z.enum(['WEIGHT', 'UNIT']),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  stock: z.number().default(0),
  minStock: z.number().nonnegative().default(0),
  imageUrl: z.string().nullish(),
  isActive: z.boolean().default(true),
})

// Abarrotes empaquetados requieren código de barras
const validated = productSchema.refine(
  (p) => !(p.category === 'ABARROTES' && p.soldBy === 'UNIT' && !p.barcode),
  { message: 'Los abarrotes por pieza requieren código de barras', path: ['barcode'] },
)

const normalize = <T extends { stock?: number; barcode?: string | null; plu?: string | null }>(p: T) => ({
  ...p,
  barcode: p.barcode || null,
  plu: p.plu || null,
  ...(p.stock !== undefined ? { stock: roundQty(p.stock) } : {}),
})

// GET /api/products?category=FRUTAS&q=lim&includeInactive=1
productsRouter.get('/', handler(async (req, res) => {
  const { category, q, includeInactive } = req.query as Record<string, string | undefined>
  const products = await prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(category ? { category } : {}),
      ...(q
        ? { OR: [{ name: { contains: q } }, { barcode: { contains: q } }, { plu: { contains: q } }] }
        : {}),
    },
    orderBy: { name: 'asc' },
  })
  res.json(products)
}))

// GET /api/products/lookup?code=4011  -> coincidencia exacta por código de barras o PLU (lector físico)
productsRouter.get('/lookup', handler(async (req, res) => {
  const code = String(req.query.code ?? '').trim()
  if (!code) throw new HttpError(400, 'Falta el parámetro code')
  const product = await prisma.product.findFirst({
    where: { isActive: true, OR: [{ barcode: code }, { plu: code }] },
  })
  if (!product) throw new HttpError(404, `No existe producto con código ${code}`)
  res.json(product)
}))

// GET /api/products/best-sellers?limit=12 -> por número de líneas vendidas
productsRouter.get('/best-sellers', handler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 50)
  const grouped = await prisma.saleItem.groupBy({
    by: ['productId'],
    _count: { _all: true },
    orderBy: { _count: { productId: 'desc' } },
    take: limit,
  })
  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) }, isActive: true },
  })
  const order = new Map(grouped.map((g, i) => [g.productId, i]))
  products.sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  res.json(products)
}))

// GET /api/products/low-stock
productsRouter.get('/low-stock', handler(async (_req, res) => {
  const all = await prisma.product.findMany({ where: { isActive: true } })
  res.json(all.filter((p) => p.stock <= p.minStock))
}))

productsRouter.get('/:id', handler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) throw new HttpError(404, 'Producto no encontrado')
  res.json(product)
}))

productsRouter.post('/', handler(async (req, res) => {
  const data = normalize(validated.parse(req.body))
  res.status(201).json(await prisma.product.create({ data }))
}))

productsRouter.put('/:id', handler(async (req, res) => {
  const data = normalize(productSchema.partial().parse(req.body))
  res.json(await prisma.product.update({ where: { id: req.params.id }, data }))
}))

// POST /api/products/:id/stock { delta } -> ajuste manual de inventario (entrada de mercancía)
productsRouter.post('/:id/stock', handler(async (req, res) => {
  const { delta } = z.object({ delta: z.number() }).parse(req.body)
  const current = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!current) throw new HttpError(404, 'Producto no encontrado')
  res.json(await prisma.product.update({
    where: { id: current.id },
    data: { stock: roundQty(current.stock + delta) },
  }))
}))

// Baja lógica: conserva el historial de ventas
productsRouter.delete('/:id', handler(async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.status(204).end()
}))
