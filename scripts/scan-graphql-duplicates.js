/*
  GraphQL audit script: scans repo for GraphQL usage, duplicated queries,
  duplicated helpers (gqlEscape, graphqlRequest, gql, graphqlSimple),
  and files importing multiple GraphQL clients. Outputs Markdown and writes
  GRAPHQL_AUDIT_REPORT.md at repo root.
*/

const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'tests'];
const OUT_PATH = path.resolve('GRAPHQL_AUDIT_REPORT.md');

const patterns = {
  gqlRefs: /(\bgql\s*\(|graphqlRequest|graphqlSimple|@apollo\/client|graphql-request|GraphQL)/,
  importGraphqlService: /from\s+['"](\.\.\/)?\.\/services\/graphqlService['"];?|require\(['"][^'"]*services\/graphqlService['"]\)/,
  importGraphqlSimple: /from\s+['"][.\/A-Za-z_-]*graphql-simple['"];?|require\(['"][^'"]*graphql-simple['"]\)/,
  importGraphqlHelper: /from\s+['"][.\/A-Za-z_-]*graphql-helper['"];?|require\(['"][^'"]*graphql-helper['"]\)/,
  importApollo: /from\s+['"]@apollo\/client['"]/,
};

const utilNames = ['gqlEscape', 'graphqlRequest', 'graphqlSimple', 'gql'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    let s;
    try { s = fs.statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/i.test(e)) out.push(p);
  }
  return out;
}

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function normSpace(s) { return s.replace(/\s+/g, ' ').trim(); }

function extractTemplateQueries(src) {
  const out = [];
  const regex = /`[\s\S]*?`/g;
  const blocks = src.match(regex) || [];
  for (const b of blocks) {
    const inner = b.slice(1, -1);
    if (/\b(query|mutation)\b/.test(inner)) out.push(inner);
  }
  return out;
}

function normalizeQuery(q) {
  return q
    .replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, 'VAR') // variables → marcador
    .replace(/\([^)]*VAR[^)]*\)\s*\{/g, ' {') // def. variables → fuera
    .replace(/#.*$/gm, '') // comentarios de línea
    .replace(/\s+/g, ' ') // espacios
    .trim();
}

function extractUtilSnippet(src, name) {
  // Try function decl: function name(...) { ... }
  let m = src.match(new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\n\\}`, 'm'));
  if (m && m[0]) return normSpace(m[0]);
  // Try const name = (...) => { ... } or = function(...) { ... }
  m = src.match(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*[^=]*?\\{[\\s\\S]*?\\}`, 'm'));
  if (m && m[0]) return normSpace(m[0]);
  // Try export const name = ...
  m = src.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*[^=]*?\\{[\\s\\S]*?\\}`, 'm'));
  if (m && m[0]) return normSpace(m[0]);
  return null;
}

function main() {
  const files = ROOTS.flatMap(r => walk(path.resolve(r)));
  const gqlFiles = [];
  const dupQueries = new Map(); // normalized -> Set(files)
  const utilsByName = Object.fromEntries(utilNames.map(n => [n, new Map()])); // name -> normBody -> Set(files)
  const multiClientFiles = [];

  for (const f of files) {
    const src = read(f);
    const hasGql = patterns.gqlRefs.test(src);
    const usesService = patterns.importGraphqlService.test(src);
    const usesSimple = patterns.importGraphqlSimple.test(src);
    const usesHelper = patterns.importGraphqlHelper.test(src);
    const usesApollo = patterns.importApollo.test(src);

    if (hasGql || usesService || usesSimple || usesHelper || usesApollo) {
      gqlFiles.push({ file: f, usesService, usesSimple, usesHelper, usesApollo });
    }

    // Collect queries
    const queries = extractTemplateQueries(src);
    for (const q of queries) {
      const nq = normalizeQuery(q);
      const set = dupQueries.get(nq) || new Set();
      set.add(f);
      dupQueries.set(nq, set);
    }

    // Collect util duplicates
    for (const name of utilNames) {
      const snippet = extractUtilSnippet(src, name);
      if (snippet) {
        const map = utilsByName[name];
        const set = map.get(snippet) || new Set();
        set.add(f);
        map.set(snippet, set);
      }
    }

    // Multi-client importers
    const clientCount = [usesService, usesSimple, usesHelper, usesApollo].filter(Boolean).length;
    if (clientCount > 1) {
      multiClientFiles.push({ file: f, usesService, usesSimple, usesHelper, usesApollo });
    }
  }

  // Build Markdown report
  const lines = [];
  lines.push('# Reporte de Auditoría GraphQL');
  lines.push('');
  lines.push('## Resumen');
  lines.push(`- Archivos escaneados: ${files.length}`);
  lines.push(`- Archivos con referencias GraphQL: ${gqlFiles.length}`);
  const dupQueryGroups = Array.from(dupQueries.entries()).filter(([, set]) => set.size > 1);
  lines.push(`- Grupos de queries duplicadas: ${dupQueryGroups.length}`);
  const utilDupCount = Object.entries(utilsByName).reduce((acc, [name, map]) => acc + Array.from(map.values()).filter(s => s.size > 1).length, 0);
  lines.push(`- Duplicados de utilidades (por cuerpo): ${utilDupCount}`);
  lines.push(`- Archivos con múltiples clientes GraphQL: ${multiClientFiles.length}`);
  lines.push('');

  lines.push('## Archivos con GraphQL (top 30)');
  const topGql = gqlFiles
    .map(rec => ({ rec, weight: (rec.usesService?2:0) + (rec.usesSimple?2:0) + (rec.usesHelper?1:0) + (rec.usesApollo?1:0) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30)
    .map(({ rec, weight }) => `- ${rec.file} (peso:${weight})`);
  lines.push(...(topGql.length ? topGql : ['- (sin resultados)']));
  lines.push('');

  lines.push('## Queries Duplicadas (agrupadas)');
  if (dupQueryGroups.length) {
    for (const [nq, set] of dupQueryGroups) {
      const filesArr = Array.from(set);
      lines.push(`- x${filesArr.length}: ${filesArr.join(' | ')}`);
    }
  } else {
    lines.push('- No se detectaron queries duplicadas por normalización.');
  }
  lines.push('');

  lines.push('## Utilidades Duplicadas (por nombre → cuerpo igual)');
  for (const [name, map] of Object.entries(utilsByName)) {
    const groups = Array.from(map.values()).filter(s => s.size > 1);
    if (!groups.length) continue;
    lines.push(`### ${name}`);
    groups.forEach((set, idx) => {
      lines.push(`- Grupo ${idx + 1} x${set.size}: ${Array.from(set).join(' | ')}`);
    });
  }
  if (!Object.values(utilsByName).some(map => Array.from(map.values()).some(s => s.size > 1))) {
    lines.push('- No se hallaron utilidades duplicadas por cuerpo.');
  }
  lines.push('');

  lines.push('## Archivos con Múltiples Clientes GraphQL');
  if (multiClientFiles.length) {
    for (const r of multiClientFiles) {
      const tags = [r.usesService && 'graphqlService', r.usesSimple && 'graphql-simple', r.usesHelper && 'graphql-helper', r.usesApollo && 'apollo'].filter(Boolean).join(', ');
      lines.push(`- ${r.file} → ${tags}`);
    }
  } else {
    lines.push('- No se detectaron importaciones múltiples en el mismo archivo.');
  }
  lines.push('');

  const md = lines.join('\n');
  try { fs.writeFileSync(OUT_PATH, md); } catch {}
  process.stdout.write(md + '\n');
}

main();

