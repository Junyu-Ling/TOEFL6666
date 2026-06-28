import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../public/api/wordlists");

for (const file of [
  "level3-list1.json",
  "level3-list2.json",
  "level3-list3.json",
  "level3-list4.json",
  "level3-list5.json",
]) {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  data.words = data.words.map(({ word, definitions }) => ({ word, definitions }));
  data.meta.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`${file}: ${data.words.length} words cleaned`);
}
