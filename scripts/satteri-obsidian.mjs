// Obsidian syntax that Sätteri does not cover natively, rendered on the Astro
// side rather than in the offline exporter.
//
// Scope: callouts (> [!note]) and ==highlights== only. Wikilinks and embeds are
// resolved ahead of time by scripts/export-corpus.mjs, which turns them into
// plain CommonMark links and inlines before the file ever reaches the blog.
//
// The callout pattern tolerates both `> [!note]` and `> \[!note\]`. The escaped
// form is what obsidian-export emits: it escapes `[` and `!` as CommonMark
// punctuation, which would otherwise make the callout unrecognisable here and
// silently degrade to a plain blockquote.

const CALLOUT = /^\\?\[!([a-z]+)\\?\][ \t]*([^\n]*)\n?([\s\S]*)$/i;
// ==text== only counts when the markers hug the text; "a == b == c" stays as-is.
const HIGHLIGHT = /==([^=\s](?:[^=\n]*[^=\s])?)==/g;

export function createCalloutPlugin() {
  return {
    name: "obsidian-callout",
    blockquote(node, ctx) {
      const paragraph = node.children?.[0];
      const first = paragraph?.children?.[0];
      if (first?.type !== "text" || typeof first.value !== "string") return;
      const match = CALLOUT.exec(first.value);
      if (!match) return;

      const [, type, title, content] = match;
      const kind = type.toLowerCase();
      const rest = content.trim();

      const children = [
        {
          type: "paragraph",
          data: { hProperties: { className: "callout-title" } },
          // Obsidian shows the callout type when no custom title is given.
          children: [
            {
              type: "text",
              value: title || kind.charAt(0).toUpperCase() + kind.slice(1),
            },
          ],
        },
      ];
      if (rest) {
        children.push({
          type: "paragraph",
          children: [{ type: "text", value: rest }],
        });
      }

      ctx.setProperty(node, "data", {
        hProperties: { className: `callout ${kind}` },
      });
      ctx.setProperty(node, "children", children);
    },
  };
}

export function createHighlightPlugin() {
  return {
    name: "obsidian-highlight",
    text(node, ctx) {
      const value = node.value ?? "";
      if (!value.includes("==")) return;
      const parts = [];
      let cursor = 0;
      HIGHLIGHT.lastIndex = 0;
      let match;
      while ((match = HIGHLIGHT.exec(value)) !== null) {
        if (match.index > cursor) {
          parts.push({ type: "text", value: value.slice(cursor, match.index) });
        }
        parts.push({
          type: "mark",
          data: { hName: "mark" },
          children: [{ type: "text", value: match[1] }],
        });
        cursor = match.index + match[0].length;
      }
      if (cursor < value.length) {
        parts.push({ type: "text", value: value.slice(cursor) });
      }
      if (parts.length) ctx.replaceNode(node, parts);
    },
  };
}
