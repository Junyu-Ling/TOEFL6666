import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "../src/data/readingFillBlank.json");

const articles = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const byId = new Map(articles.map((article) => [article.id, article]));

for (let id = 1; id <= articles.length; id += 1) {
  if (!byId.has(id)) {
    console.error(`Missing article id ${id}`);
    process.exit(1);
  }
}

const groupA = Array.from({ length: 77 }, (_, i) => byId.get(i + 1));
const groupB = Array.from({ length: 32 }, (_, i) => byId.get(115 + i));
const groupC = Array.from({ length: 37 }, (_, i) => byId.get(78 + i));

const reordered = [...groupA, ...groupB, ...groupC].map((article, index) => ({
  ...article,
  id: index + 1,
}));

if (reordered.length !== 146) {
  console.error(`Expected 146 articles, got ${reordered.length}`);
  process.exit(1);
}

fs.writeFileSync(dataPath, `${JSON.stringify(reordered, null, 2)}\n`, "utf8");

console.log("Reordered reading fill blank articles:");
console.log("  1-77   unchanged content (first block)");
console.log("  78-109 former 115-146 (Supply and Demand … Prehistoric Cave Art)");
console.log("  110-146 former 78-114 (Coral Reef Ecosystem … Color and Pigment)");
console.log(`Total: ${reordered.length} articles`);

console.log("\nSample boundaries:");
console.log(`  #77  ${reordered[76].title}`);
console.log(`  #78  ${reordered[77].title}`);
console.log(`  #109 ${reordered[108].title}`);
console.log(`  #110 ${reordered[109].title}`);
console.log(`  #146 ${reordered[145].title}`);
