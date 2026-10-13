# Hardware

## Báscula digital (Torrey / Rhino)

Capa de abstracción en [`client/src/lib/scale.ts`](../client/src/lib/scale.ts).

1. Conecta la báscula por USB-serial o RS-232 (adaptador).
2. En el modal de pesaje o en la cabecera pulsa **Conectar Torrey / Rhino** y elige el puerto.
3. Ajusta el baudrate si hace falta (9600 8N1 por defecto; 2400 / 4800 / 19200 disponibles).

El parser (`parseScaleFrame`) entiende tramas como `  1.350 kg`, `ST,GS,+001.350kg`, `W 01.350`, `0350 g`, `1,350` y `2.0 lb`. La lectura se considera **estable** tras 3 tramas iguales consecutivas y entonces se vuelca al peso bruto del modal.

> Si tu modelo usa otro protocolo, ajusta `parseScaleFrame` y el separador de tramas en `readLoop`.

### Modo emulador

Sin báscula conectada aparece el badge **Modo emulador**: un slider y botones rápidos (0.250, 0.500, 0.750, 1.350, 2.000 kg) simulan colocar producto en el plato, con oscilación y estabilización realistas. Ideal para demos y pruebas.

Web Serial requiere **Chrome o Edge** sobre `localhost` o HTTPS.

## Lector de códigos de barras

Cualquier lector USB en modo teclado ("keyboard wedge"). [`useBarcodeScanner`](../client/src/lib/useBarcodeScanner.ts) detecta ráfagas de teclas con menos de 35 ms entre caracteres terminadas en `Enter`, así que escanear funciona **aunque el foco no esté en el buscador**. Un código reconocido emite un beep; uno desconocido, un tono de error. El PLU numérico también se puede teclear en el buscador.

## Impresora térmica ESC/POS

[`client/src/lib/escpos.ts`](../client/src/lib/escpos.ts) genera los bytes del ticket:

- 58 mm → 32 columnas · 80 mm → 48 columnas.
- Tabla de caracteres CP858 (`ESC t 19`) para acentos, ñ y ¿¡.
- Negritas, doble tamaño para nombre y total, corte parcial (`GS V 66 0`).
- `openDrawerBytes()` genera el pulso para abrir el cajón.

Salidas disponibles en el modal del ticket:

| Botón | Uso |
|-------|-----|
| Imprimir ticket | Diálogo de impresión del navegador (CSS `@media print`) |
| ESC/POS USB | Envía los bytes por Web Serial a impresoras con puerto COM virtual |
| Bytes .escpos | Descarga el archivo crudo para enviarlo con otro método (p. ej. `copy /b ticket.escpos \\\\localhost\\IMPRESORA`) |

## WhatsApp

El botón **Enviar por WhatsApp** abre `wa.me` con un mensaje con emojis y el detalle (peso, precio unitario, subtotal por línea, total, pago y cambio). Si se capturó el teléfono de 10 dígitos al cobrar se antepone `52` (México). En dispositivos compatibles también aparece **Compartir…** (Web Share API).
