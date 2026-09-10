// scripts/build.mjs
// Legge tutti i file .md in /stories nel formato in cui vengono scritte
// (titolo H1, riga "Categoria — Storia N" in H3, riga di ambientazione in
// corsivo, corpo, "---", nota storica finale), e scrive /stories.json
// ordinato per numero.
//
// Uso: node scripts/build.mjs

import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORIES_DIR = path.join(ROOT, "stories");
const OUTPUT_FILE = path.join(ROOT, "stories.json");

const ROMANI = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanoANumero(roman) {
  const s = roman.toUpperCase();
  let tot = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMANI[s[i]];
    const next = ROMANI[s[i + 1]];
    if (!cur) return null;
    tot += next && cur < next ? -cur : cur;
  }
  return tot;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Estrae dalla stringa markdown grezza:
 *  # Titolo
 *  ### Categoria — Storia N
 *
 *  *Luogo, data*
 *
 *  corpo...
 *
 *  ---
 *
 *  *Nota storica.* testo...
 */
function parseStoria(raw, nomeFile) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const saltaVuote = () => {
    while (i < lines.length && lines[i].trim() === "") i++;
  };

  saltaVuote();
  if (!lines[i] || !lines[i].startsWith("# ")) {
    throw new Error(`manca il titolo ("# ...") all'inizio del file`);
  }
  const titolo = lines[i].slice(2).trim();
  i++;

  saltaVuote();
  let categoria = "";
  let numero = null;
  if (lines[i] && lines[i].startsWith("### ")) {
    const sub = lines[i].slice(4).trim();
    const m = sub.match(/^(.*?)\s*[—-]\s*Storia\s+([IVXLCDM]+)\s*$/i);
    if (m) {
      categoria = m[1].trim();
      numero = romanoANumero(m[2]);
    } else {
      categoria = sub;
    }
    i++;
  }
  if (numero === null) {
    throw new Error(`manca "Categoria — Storia N" (numero romano) nel sottotitolo`);
  }

  saltaVuote();
  let ambientazione = "";
  if (lines[i] && /^\*[^*].*[^*]\*$/.test(lines[i].trim())) {
    ambientazione = lines[i].trim().slice(1, -1).trim();
    i++;
  }

  const resto = lines.slice(i).join("\n");
  const hrMatch = resto.match(/\n?^-{3,}\s*$\n?/m);

  let corpoMd = resto;
  let notaMd = "";
  if (hrMatch) {
    corpoMd = resto.slice(0, hrMatch.index);
    notaMd = resto.slice(hrMatch.index + hrMatch[0].length);
  }
  notaMd = notaMd.trim().replace(/^\*Nota storica\.\*\s*/i, "");

  return {
    numero,
    titolo,
    categoria,
    ambientazione,
    slug: slugify(titolo) || slugify(nomeFile),
    html: marked.parse(corpoMd.trim()),
    notaHtml: notaMd ? marked.parse(notaMd) : "",
  };
}

async function main() {
  const files = (await readdir(STORIES_DIR)).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_")
  );

  const stories = [];

  for (const file of files) {
    const raw = await readFile(path.join(STORIES_DIR, file), "utf8");
    try {
      stories.push(parseStoria(raw, file));
    } catch (err) {
      console.warn(`⚠️  Salto ${file}: ${err.message}`);
    }
  }

  stories.sort((a, b) => a.numero - b.numero);

  const numeri = stories.map((s) => s.numero);
  const duplicati = numeri.filter((n, idx) => numeri.indexOf(n) !== idx);
  if (duplicati.length) {
    console.warn(`⚠️  Numeri "Storia N" duplicati: ${[...new Set(duplicati)].join(", ")}`);
  }

  const output = {
    generato: new Date().toISOString(),
    totale: stories.length,
    storie: stories,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`✅ Scritte ${stories.length} storie in stories.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
