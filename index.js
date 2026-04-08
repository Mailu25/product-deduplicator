import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

//Sample data
const products = [
  { name: "samsung s23", price: 2999, store: "KSP" },
  { name: "סמסונג גלקסי 23", price: 3200, store: "Bug" },
  { name: "SAMSUNG Galaxy S23", price: 3100, store: "iDigital" },
  { name: "iPhone 14 pro", price: 4500, store: "iDigital" },
  { name: "אייפון 14 פרו", price: 4800, store: "KSP" },
  { name: "Apple iPhone 14 Pro Max", price: 5200, store: "Bug" },
  { name: "apple iphone 14 pro", price: 4600, store: "Ivory" },
];

//Sends all product names to Claude and returns the same list with an added
//canonical field containing a normalized English name for each product.
async function normalizeNames(products) {
  //Build a numbered list of names to include in the prompt
  const nameList = products.map((p, i) => `${i + 1}. ${p.name}`).join("\n");

  //The prompt to Claude
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a product name normalization expert for a price comparison website.

Normalize each product name below to a canonical English form using these rules:
1. Translate brand/product names to English (e.g., סמסונג → Samsung, אייפון → iPhone)
2. Expand abbreviations to full model names (e.g., S23 → Galaxy S23)
3. Remove irrelevant words (e.g., "חדש!", "כולל משלוח")
4. Use consistent format: [Brand] [Series] [Model] [Variant]
5. If two names clearly refer to the same product, give them the EXACT same canonical name

Product list:
${nameList}

Return ONLY a JSON array (no markdown, no extra text) in this format:
[{"index": 1, "canonical": "..."}, {"index": 2, "canonical": "..."}, ...]`,
      },
    ],
  });

  const raw = response.content[0].text.trim();

  //If parsing fails, use the original names as-is
  let normalized;
  try {
    normalized = JSON.parse(raw);
  } catch (e) {
    console.error(
      "Claude returned invalid JSON. Falling back to original names.",
    );
    return products.map((p) => ({ ...p, canonical: p.name }));
  }

  //Merge the canonical names back into the original product objects.
  //If a product has no match in the response, keep its original name as fallback.
  return products.map((p, i) => ({
    ...p,
    canonical: normalized.find((n) => n.index === i + 1)?.canonical ?? p.name,
  }));
}

//Groups duplicate products and keeps the lowest price for each.
function deduplicateProducts(products) {
  //Build a map of canonical name -> list of matching products
  const groups = {};
  for (const p of products) {
    if (!groups[p.canonical]) {
      groups[p.canonical] = [];
    }
    groups[p.canonical].push(p);
  }

  return Object.entries(groups).map(([canonical, group]) => {
    //Pick the product with the lowest price in this group
    const best = group.reduce((min, p) => (p.price < min.price ? p : min));
    return {
      name: canonical,
      price: best.price,
      store: best.store,
      num_offers: group.length,
      all_prices: group.map((p) => ({ store: p.store, price: p.price })),
    };
  });
}

//Main
async function main() {
  console.log("Products list:");
  products.forEach((p) =>
    console.log(`  ${p.name.padEnd(28)} ${p.price}  (${p.store})`),
  );

  let normalized;
  try {
    normalized = await normalizeNames(products);
  } catch (e) {
    console.error("Failed to connect to Claude API:", e.message);
    process.exit(1);
  }

  console.log("\nAfter normalization:");
  normalized.forEach((p) => console.log(`  "${p.name}" -> "${p.canonical}"`));

  const result = deduplicateProducts(normalized);

  console.log("\nFinal results: unique products with lowest price");
  result.forEach((p) => {
    console.log(`\n${p.name}`);
    console.log(`   Lowest price: ${p.price} (${p.store})`);
    console.log(
      `   ${p.num_offers} offers: ${p.all_prices.map((x) => `${x.store}=${x.price}`).join(", ")}`,
    );
  });
}

main();
