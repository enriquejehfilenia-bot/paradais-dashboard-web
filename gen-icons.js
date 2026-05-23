const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  
  // Fondo negro
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);
  
  // Escalar todo según el tamaño
  const scale = size / 512;
  
  // B geométrica en dorado
  ctx.fillStyle = "#EAB308";
  
  const x = 100 * scale;
  const w = 60 * scale;
  const h1 = 130 * scale; // altura mitad superior
  const h2 = 150 * scale; // altura mitad inferior
  const y1 = 70 * scale;
  const y2 = 212 * scale;
  const bw = 180 * scale; // ancho curva superior
  const bw2 = 200 * scale; // ancho curva inferior
  
  // Barra vertical
  ctx.fillRect(x, y1, w, h1 + h2 + 10 * scale);
  
  // Panza superior
  ctx.beginPath();
  ctx.moveTo(x + w, y1);
  ctx.lineTo(x + bw, y1);
  ctx.quadraticCurveTo(x + bw + 80 * scale, y1 + h1 / 2, x + bw, y1 + h1);
  ctx.lineTo(x + w, y1 + h1);
  ctx.closePath();
  ctx.fill();
  
  // Panza inferior
  ctx.beginPath();
  ctx.moveTo(x + w, y2);
  ctx.lineTo(x + bw2, y2);
  ctx.quadraticCurveTo(x + bw2 + 90 * scale, y2 + h2 / 2, x + bw2, y2 + h2);
  ctx.lineTo(x + w, y2 + h2);
  ctx.closePath();
  ctx.fill();
  
  return canvas.toBuffer("image/png");
}

try {
  const buf192 = createIcon(192);
  const buf512 = createIcon(512);
  fs.writeFileSync(path.join(__dirname, "public", "icon-192.png"), buf192);
  fs.writeFileSync(path.join(__dirname, "public", "icon-512.png"), buf512);
  console.log("Icons generated OK");
} catch(e) {
  console.log("canvas not available:", e.message);
}
