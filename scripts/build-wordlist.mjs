import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const listPath = path.join(__dirname, "../public/api/wordlists/level3-list1.json");
const data = JSON.parse(fs.readFileSync(listPath, "utf8"));

fs.writeFileSync(
  path.join(__dirname, "../public/api/wordlists/manifest.json"),
  JSON.stringify(
    {
      version: 1,
      updatedAt: data.meta.updatedAt,
      defaultListId: "level3-list1",
      lists: [
        {
          id: "level3-list1",
          title: data.meta.title,
          level: data.meta.level,
          list: data.meta.list,
          wordCount: data.words.length,
        },
      ],
    },
    null,
    2
  )
);

console.log(`Manifest synced: ${data.words.length} words`);
