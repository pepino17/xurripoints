// Genera las imágenes fuente de icono y splash (carpeta assets/) a partir de app/icon.svg y app/coin.svg.
// Luego: npx capacitor-assets generate --android  (crea los mipmap/drawable de Android).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const icon = readFileSync('app/icon.svg');
const coin = readFileSync('app/coin.svg', 'utf8');
const coinBody = coin.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const bg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFD3E0"/><stop offset=".55" stop-color="#FFE3D3"/><stop offset="1" stop-color="#E9E0FF"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/></svg>`;
// Primer plano adaptativo: la moneda dentro de la zona segura (66% central).
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(272 262) scale(7.5)">${coinBody}</g>
  <path d="M760 250l10 24 24 10-24 10-10 24-10-24-24-10 24-10z" fill="#fff" opacity=".9"/></svg>`;
const splash = (dark) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${dark ? '#3B2335' : '#FFF3EC'}"/>
  <g transform="translate(1126 1110) scale(7.5)">${coinBody}</g></svg>`;

await sharp(icon, { density: 400 }).resize(1024, 1024).png().toFile('assets/icon-only.png');
await sharp(Buffer.from(bg)).resize(1024, 1024).png().toFile('assets/icon-background.png');
await sharp(Buffer.from(fg), { density: 300 }).resize(1024, 1024).png().toFile('assets/icon-foreground.png');
await sharp(Buffer.from(splash(false)), { density: 150 }).resize(2732, 2732).png().toFile('assets/splash.png');
await sharp(Buffer.from(splash(true)), { density: 150 }).resize(2732, 2732).png().toFile('assets/splash-dark.png');
console.log('assets/ listo');
