// Markdown to HTML for the subset the contract templates use: ATX headings,
// bold, italic, code, links, lists, pipe tables, block quotes and rules. Ported
// from summitsoftwaresolutionsllc/scripts/build-contract.mjs (SUMMIT-196). It
// is not a general markdown implementation: the input format is ours and fixed.

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);

function inline(s: string): string {
  let out = escapeHtml(s);
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(code);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return out.replace(/\u0000CODE(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes("-");
const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  const para: string[] = [];
  const flush = () => {
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    para.length = 0;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flush();
      html.push("<hr>");
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1]!.length;
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      i++;
      continue;
    }
    if (isTableRow(line) && isTableDivider(lines[i + 1] ?? "")) {
      flush();
      const head = splitRow(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) body.push(splitRow(lines[i++]!));
      html.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
          .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) quoted.push(lines[i++]!.replace(/^\s*>\s?/, ""));
      const paras = quoted
        .join("\n")
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p) => `<p>${inline(p.replace(/\n/g, " ").trim())}</p>`)
        .join("");
      html.push(`<blockquote>${paras}</blockquote>`);
      continue;
    }
    const list = line.match(LIST);
    if (list) {
      flush();
      const ordered = /\d/.test(list[2]!);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(LIST);
        if (!m) {
          if (items.length && /^\s+\S/.test(lines[i]!)) {
            items[items.length - 1] += ` ${lines[i]!.trim()}`;
            i++;
            continue;
          }
          break;
        }
        if (/\d/.test(m[2]!) !== ordered) break;
        items.push(m[3]!);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush();
  return html.join("\n");
}
