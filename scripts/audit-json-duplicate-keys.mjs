/**
 * Detect shadowed keys in JSON translation files. JSON.parse silently retains
 * the last occurrence, hiding mistranslations when two keys have the same name.
 * Unlike a regex this scanner tracks each object's own scope and supports
 * nested objects, arrays and escaped quotation marks.
 */
export function findDuplicateJsonKeys(source) {
  const text = String(source);
  const errors = [];
  let offset = 0;
  const space = () => { while (/\s/.test(text[offset] || "") && offset < text.length) offset += 1; };
  const lineAt = (position) => text.slice(0, position).split("\n").length;

  function readString() {
    const start = offset;
    if (text[offset] !== '"') throw new SyntaxError(`Expected JSON string at ${offset}`);
    offset += 1;
    let escaped = false;
    while (offset < text.length) {
      const char = text[offset++];
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === '"') return JSON.parse(text.slice(start, offset));
    }
    throw new SyntaxError(`Unterminated string at ${start}`);
  }

  function readValue(parentPath = "") {
    space();
    const open = text[offset];
    if (open === '"') { readString(); return; }
    if (open === "{") {
      offset += 1;
      space();
      const keys = new Set();
      if (text[offset] === "}") { offset += 1; return; }
      while (offset < text.length) {
        space();
        const at = offset;
        const key = readString();
        const path = parentPath ? `${parentPath}.${key}` : key;
        if (keys.has(key)) errors.push({ key: path, line: lineAt(at) });
        keys.add(key);
        space();
        if (text[offset++] !== ":") throw new SyntaxError(`Expected colon at ${offset - 1}`);
        readValue(path);
        space();
        const delimiter = text[offset++];
        if (delimiter === "}") return;
        if (delimiter !== ",") throw new SyntaxError(`Expected comma or } at ${offset - 1}`);
      }
      throw new SyntaxError("Unterminated JSON object");
    }
    if (open === "[") {
      offset += 1;
      space();
      if (text[offset] === "]") { offset += 1; return; }
      let index = 0;
      while (offset < text.length) {
        readValue(`${parentPath}[${index++}]`);
        space();
        const delimiter = text[offset++];
        if (delimiter === "]") return;
        if (delimiter !== ",") throw new SyntaxError(`Expected comma or ] at ${offset - 1}`);
      }
      throw new SyntaxError("Unterminated JSON array");
    }
    const start = offset;
    while (offset < text.length && !/[\s,}\]]/.test(text[offset])) offset += 1;
    if (start === offset) throw new SyntaxError(`Expected value at ${offset}`);
    JSON.parse(text.slice(start, offset));
  }

  readValue();
  space();
  if (offset !== text.length) throw new SyntaxError(`Unexpected JSON data at ${offset}`);
  return errors;
}
