// Keep visible interface copy in src/i18n/locales/{uk,en}/*.json.
// Protocol codes, decorative glyphs and standardized identifiers are not copy.
const VISIBLE_ATTRIBUTES = new Set([
  "alt", "title", "placeholder", "aria-label", "aria-description",
  "label", "subtitle", "description", "helperText", "emptyLabel",
]);

const NON_TRANSLATABLE = /^(?:UTC|GMT|PNG|TXT|CSV|JSON|D1|API|HTTP|HTTPS|URL|UID|ID|T\d{1,2}|—|–|…|\.|\d+[.,]?\d*)$/u;

export function isRawInterfaceText(value) {
  const normalized = String(value ?? "").replace(/\s+/gu, " ").trim();
  return Boolean(normalized) && !NON_TRANSLATABLE.test(normalized) && /[\p{L}]{2,}/u.test(normalized);
}

function literalFragments(node) {
  if (!node) return [];
  switch (node.type) {
    case "Literal":
      return typeof node.value === "string" ? [node.value] : [];
    case "TemplateLiteral":
      return node.quasis.map((quasi) => quasi.value.cooked || quasi.value.raw);
    case "ConditionalExpression":
      return [...literalFragments(node.consequent), ...literalFragments(node.alternate)];
    case "LogicalExpression":
      return literalFragments(node.right);
    case "SequenceExpression":
      return node.expressions.flatMap(literalFragments);
    default:
      return [];
  }
}

function describe(value) {
  return JSON.stringify(String(value).replace(/\s+/gu, " ").trim().slice(0, 100));
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Use JSON locale keys instead of hardcoded text rendered by JSX" },
    schema: [],
    messages: {
      raw: "Visible UI text {{value}} must be in Ukrainian/English JSON translations.",
    },
  },
  create(context) {
    function report(node, value) {
      if (isRawInterfaceText(value)) {
        context.report({ node, messageId: "raw", data: { value: describe(value) } });
      }
    }
    return {
      JSXText(node) {
        report(node, node.value);
      },
      JSXAttribute(node) {
        if (!VISIBLE_ATTRIBUTES.has(node.name?.name) || !node.value) return;
        if (node.value.type === "Literal") report(node, node.value.value);
        else if (node.value.type === "JSXExpressionContainer") {
          for (const fragment of literalFragments(node.value.expression)) report(node, fragment);
        }
      },
      JSXExpressionContainer(node) {
        // Attribute expressions have already been checked in JSXAttribute.
        if (node.parent?.type === "JSXAttribute") return;
        for (const fragment of literalFragments(node.expression)) report(node, fragment);
      },
    };
  },
};

export default rule;
