import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()

type P = Prisma.ProductCreateInput

const products: P[] = [
  // FRUTAS
  { name: 'Plátano Tabasco', plu: '4011', category: 'FRUTAS', soldBy: 'WEIGHT', price: 22, cost: 14, stock: 38.5, minStock: 8 },
  { name: 'Limón con semilla', plu: '4048', category: 'FRUTAS', soldBy: 'WEIGHT', price: 38, cost: 24, stock: 15.25, minStock: 5 },
  { name: 'Aguacate Hass', plu: '4225', category: 'FRUTAS', soldBy: 'WEIGHT', price: 89, cost: 64, stock: 18.75, minStock: 5 },
  { name: 'Manzana Gala', plu: '4133', category: 'FRUTAS', soldBy: 'WEIGHT', price: 52, cost: 36, stock: 22, minStock: 6 },
  { name: 'Naranja Valencia', plu: '3107', category: 'FRUTAS', soldBy: 'WEIGHT', price: 16, cost: 9, stock: 40, minStock: 10 },
  { name: 'Sandía', plu: '4032', category: 'FRUTAS', soldBy: 'WEIGHT', price: 14, cost: 8, stock: 60, minStock: 15 },
  { name: 'Papaya Maradol', plu: '4395', category: 'FRUTAS', soldBy: 'WEIGHT', price: 24, cost: 15, stock: 25.4, minStock: 6 },
  { name: 'Fresa', plu: '4040', category: 'FRUTAS', soldBy: 'WEIGHT', price: 70, cost: 48, stock: 7.2, minStock: 4 },
  // VERDURAS
  { name: 'Jitomate Saladet', plu: '4087', category: 'VERDURAS', soldBy: 'WEIGHT', price: 28, cost: 17, stock: 24.5, minStock: 8 },
  { name: 'Cebolla Blanca', plu: '4663', category: 'VERDURAS', soldBy: 'WEIGHT', price: 24, cost: 14, stock: 30, minStock: 8 },
  { name: 'Papa Blanca', plu: '4727', category: 'VERDURAS', soldBy: 'WEIGHT', price: 26, cost: 16, stock: 45, minStock: 10 },
  { name: 'Chile Serrano', plu: '4688', category: 'VERDURAS', soldBy: 'WEIGHT', price: 45, cost: 28, stock: 5.8, minStock: 2 },
  { name: 'Zanahoria', plu: '4094', category: 'VERDURAS', soldBy: 'WEIGHT', price: 18, cost: 10, stock: 19, minStock: 6 },
  { name: 'Cilantro (manojo)', plu: '4889', category: 'VERDURAS', soldBy: 'UNIT', price: 8, cost: 4, stock: 40, minStock: 10 },
  // ABARROTES
  { name: 'Gansito Marinela', barcode: '7501000111206', category: 'ABARROTES', soldBy: 'UNIT', price: 19, cost: 14, stock: 36, minStock: 12 },
  { name: 'Coca-Cola 600ml', barcode: '7501055363057', category: 'ABARROTES', soldBy: 'UNIT', price: 20, cost: 15.5, stock: 48, minStock: 24 },
  { name: 'Sabritas Sal 45g', barcode: '7501011115015', category: 'ABARROTES', soldBy: 'UNIT', price: 19, cost: 14, stock: 30, minStock: 10 },
  { name: 'Huevo blanco (pieza)', barcode: '7501040090012', plu: '9001', category: 'ABARROTES', soldBy: 'UNIT', price: 3.5, cost: 2.6, stock: 180, minStock: 60 },
  { name: 'Huevo blanco (kg)', plu: '9002', category: 'ABARROTES', soldBy: 'WEIGHT', price: 58, cost: 46, stock: 20, minStock: 6 },
  { name: 'Aceite 1-2-3 900ml', barcode: '7501003114100', category: 'ABARROTES', soldBy: 'UNIT', price: 42, cost: 34, stock: 14, minStock: 6 },
  { name: 'Frijol Negro (kg)', plu: '9010', category: 'ABARROTES', soldBy: 'WEIGHT', price: 38, cost: 27, stock: 25, minStock: 8 },
  // LÁCTEOS
  { name: 'Leche Lala Entera 1L', barcode: '7501020540659', category: 'LACTEOS', soldBy: 'UNIT', price: 28, cost: 23, stock: 24, minStock: 12 },
  { name: 'Queso Panela (kg)', plu: '9101', category: 'LACTEOS', soldBy: 'WEIGHT', price: 160, cost: 120, stock: 6.5, minStock: 2 },
  { name: 'Crema Lala 450ml', barcode: '7501020512305', category: 'LACTEOS', soldBy: 'UNIT', price: 36, cost: 29, stock: 10, minStock: 4 },
  // OTROS
  { name: 'Bolsa de hielo 2kg', barcode: '7500000000011', category: 'OTROS', soldBy: 'UNIT', price: 25, cost: 14, stock: 12, minStock: 4 },
]

async function main() {
  console.log('🌱 Sembrando base de datos...')
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.wasteRecord.deleteMany()
  await prisma.cashMovement.deleteMany()
  await prisma.product.deleteMany()

  for (const p of products) await prisma.product.create({ data: p })

  await prisma.cashMovement.create({
    data: { type: 'INFLOW', amount: 500, category: 'FONDO_INICIAL', note: 'Fondo inicial de caja' },
  })

  // Ventas históricas para poblar "Más Vendidos"
  const byPlu = async (plu: string) => prisma.product.findFirstOrThrow({ where: { plu } })
  const byBarcode = async (barcode: string) => prisma.product.findFirstOrThrow({ where: { barcode } })
  const platano = await byPlu('4011')
  const jitomate = await byPlu('4087')
  const aguacate = await byPlu('4225')
  const limon = await byPlu('4048')
  const coca = await byBarcode('7501055363057')
  const sabritas = await byBarcode('7501011115015')

  const demo = [
    { items: [[platano, 1.5], [jitomate, 2.0], [coca, 2]], paid: 200 },
    { items: [[aguacate, 0.75], [limon, 1.0]], paid: 200 },
    { items: [[jitomate, 1.25], [sabritas, 3], [limon, 0.5]], paid: 100 },
    { items: [[platano, 2.0], [coca, 1]], paid: 100 },
  ] as const

  let folio = 1
  for (const s of demo) {
    const lines = s.items.map(([prod, qty]) => {
      const sub = Math.round(Math.round(qty * 1000) * Math.round(prod.price * 100) / 1000) / 100
      return { prod, qty, sub }
    })
    const total = Math.round(lines.reduce((a, l) => a + l.sub * 100, 0)) / 100
    await prisma.sale.create({
      data: {
        folio: folio++,
        subtotal: total,
        total,
        discount: 0,
        paymentMethod: 'CASH',
        amountPaid: s.paid,
        changeGiven: Math.round((s.paid - total) * 100) / 100,
        items: {
          create: lines.map((l) => ({
            productId: l.prod.id,
            productName: l.prod.name,
            quantity: l.qty,
            unitPrice: l.prod.price,
            subtotal: l.sub,
          })),
        },
      },
    })
  }

  console.log(`✅ ${products.length} productos, ${demo.length} ventas demo y fondo inicial creados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
