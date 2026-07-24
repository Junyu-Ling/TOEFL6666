import { readFileSync, writeFileSync } from "fs";
import { built } from "./build-articles-1-25.mjs";

const all = JSON.parse(readFileSync("src/data/readingFillBlank.json", "utf8"));
const merged = [...built, ...all.filter((x) => x.id > 25)];
writeFileSync("src/data/readingFillBlank.json", `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Merged ${merged.length} articles`);
