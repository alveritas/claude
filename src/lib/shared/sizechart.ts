/**
 * Size guides are typed (or pasted from a spreadsheet) in the admin as plain text. Lines with
 * columns, separated by tabs or "|", become a table: the first such line is the header. Other
 * lines are kept as notes, e.g. "Measured flat, in cm." or "Model is 6'1" and wears L".
 */
export type SizeGuideBlock = { kind: "table"; head: string[]; rows: string[][] } | { kind: "note"; text: string };

const cellsOf = (line: string, inTable: boolean): string[] | null => {
  const sep = line.includes("\t") ? "\t" : line.includes("|") ? "|" : null;
  if (!sep) return null;
  const cells = line.split(sep).map((c) => c.trim());
  // "| a | b |" style: drop the empty edges.
  while (cells.length && cells[0] === "") cells.shift();
  while (cells.length && cells[cells.length - 1] === "") cells.pop();
  // A table starts with at least two columns; inside one, a short row is still a row.
  if (cells.length < (inTable ? 1 : 2)) return null;
  // Markdown divider rows like "---|---".
  if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return [];
  return cells;
};

export function parseSizeGuide(text: string | null | undefined): SizeGuideBlock[] {
  const blocks: SizeGuideBlock[] = [];
  let table: { head: string[]; rows: string[][] } | null = null;
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trimEnd();
    const cells = cellsOf(line, table !== null);
    if (cells) {
      if (!cells.length) continue; // divider
      if (!table) {
        table = { head: cells, rows: [] };
        blocks.push({ kind: "table", ...table });
      } else {
        const width = table.head.length;
        table.rows.push([...cells, ...Array(Math.max(0, width - cells.length)).fill("")].slice(0, Math.max(width, cells.length)));
      }
      continue;
    }
    table = null;
    if (line.trim()) blocks.push({ kind: "note", text: line.trim() });
  }
  return blocks;
}
