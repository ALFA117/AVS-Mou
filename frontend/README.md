This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## FIX_NOTES (rediseño /diseno, 2026-10-11)

- **La home fallaba al hidratar** (errores #418/#425 de React y re-render completo en el cliente): `formatTokenAmount`/`formatInt` usaban `toLocaleString()` sin locale, así que el servidor pintaba `1,000` y un navegador en otro idioma `1000`. Ahora el formato de números usa `en-US` fijo (`lib/format.ts`, y lo mismo en `DealCharts`). Consola limpia en la home.
- **Contenido invisible sin JS**: `template.tsx` y el hero arrancaban con `opacity: 0` desde el servidor. El template ahora solo desplaza (sin opacidad), el hero entra con una animación CSS que siempre termina visible, y las secciones de abajo se deslizan sin ocultarse.
- **La red no se veía en celular**: el badge `DEVNET` tenía `hidden sm:inline-flex`. Ahora se ve siempre y usa 12 px (antes 11 px).
- **Enlaces del footer de 16 px de alto**: ahora tienen 44 px de área táctil.

## DESIGN_NOTES

- **Fondo 3D: el dado sacó la receta 6 (malla low-poly con Three.js).** Se adaptó como una **bóveda sellada**: un icosaedro de alambre índigo (la bóveda) que respira y gira lento, con un icosaedro verde que gira al revés adentro (tu puja) y una nube de partículas alrededor (las pujas de los demás, que no ves). El puntero mueve la cámara y el scroll desplaza la escena. Se monta una sola vez en `layout.tsx` (`components/AmbientBackground.tsx` + `components/VaultScene.tsx`). Three.js se carga con `next/dynamic` y `ssr: false`, cuando el navegador queda libre, para no frenar el primer render. Es completa en `/` y tranquila (la mitad de partículas, menos opacidad) en el resto. En modo claro y en celular se atenúa y la bóveda se va a la esquina para no competir con el título. DPR ≤ 2, pausa con la pestaña oculta, un solo cuadro quieto con movimiento reducido y `dispose()` al desmontar. Reemplaza al `AnimatedBackground` y al `ConstellationBackground` de la home (eran solo de esa página). La aurora conserva la paleta "gradient mesh" de la marca, sin `filter: blur`.
- **Hero**: debajo del título hay una línea propia de AVS, `🔒 Tu puja: ████████ USDC · sellada hasta el reveal`, con el monto tachado por una barra que brilla cada 3 s. Ilustra la mecánica y no muestra ninguna puja real. Está en EN, ES y PT. El título usa `clamp()` para no partirse raro entre 320 px y escritorio.
- Dependencia nueva: `three@0.170.0`.

### Checklist de 2 minutos en el celular

1. Abre `/`: arriba a la derecha se asoma la bóveda de alambre girando, y el badge DEVNET se ve en la barra.
2. La línea "Tu puja: ███ USDC" tiene un brillo que recorre la barra negra.
3. Sin scroll horizontal; el título cabe en tres renglones.
4. Entra a Deals: el fondo se calma.
5. Cambia el tema: la bóveda baja su intensidad en claro.
6. Abre la consola en escritorio: sin errores de hidratación.
