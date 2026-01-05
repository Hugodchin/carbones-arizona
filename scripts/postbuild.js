// Copia el último instalador .exe generado a public/downloads con nombre estable
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getNewest(distDir, ext) {
  if (!fs.existsSync(distDir)) return null;
  const files = fs.readdirSync(distDir)
    .filter(f => f.toLowerCase().endsWith(ext))
    .map(f => ({ f, t: fs.statSync(path.join(distDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? path.join(distDir, files[0].f) : null;
}

(function main() {
  const root = __dirname.replace(/\\scripts$/, '');
  const distDir = path.join(root, 'dist');
  const outDir = path.join(root, 'public', 'downloads');
  ensureDir(outDir);

  const newestExe = getNewest(distDir, '.exe');
  const newestZip = getNewest(distDir, '.zip');

  if (!newestExe && !newestZip) {
    console.error('No se encontró artefacto (.exe/.zip) en dist/. Ejecuta electron-builder primero.');
    process.exit(1);
  }

  if (newestExe) {
    const targetExe = path.join(outDir, 'Carbones-Arizona-Setup.exe');
    fs.copyFileSync(newestExe, targetExe);
    console.log(`Instalador copiado a: ${targetExe}`);
  }

  if (newestZip) {
    const targetZip = path.join(outDir, 'Carbones-Arizona-Portable.zip');
    fs.copyFileSync(newestZip, targetZip);
    console.log(`Portable ZIP copiado a: ${targetZip}`);
  }
})();
