import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "../src/data/readingFillBlank.json");

function parsePassage(raw, answers) {
  const blankRe = /([a-zA-Z]*)_+\s*\[(\d+)\]/g;
  let answerIndex = 0;
  let match;
  while ((match = blankRe.exec(raw)) !== null) {
    const prefix = match[1];
    const bracketLen = Number(match[2]);
    const answer = answers[answerIndex];
    if (!answer) throw new Error(`Missing answer #${answerIndex + 1}`);
    const requiredLen = answer.length - prefix.length;
    if (requiredLen !== bracketLen) {
      throw new Error(
        `Blank #${answerIndex + 1}: prefix "${prefix}" + [${bracketLen}] != "${answer}" (${requiredLen} letters)`
      );
    }
    answerIndex += 1;
  }
  if (answerIndex !== answers.length) {
    throw new Error(`Answer count ${answers.length} != blank count ${answerIndex}`);
  }
}

const insertArticles = [
  {
    id: 115,
    title: "Supply and Demand",
    raw: "Supply and demand are fundamental concepts in economics because they determine the price and availability of goods or services. When th____ [3] is mo____ [2] demand f__ [2] a pro____ [4], suppliers m____ [2] make i____ [1] more expe____ [5] to incr____ [4] profits. Conve_____ [5], an exc____ [3] supply can lead to price reductions. Market equilibrium occurs when supply matches demand, resulting in stable prices. The real world, however, is rarely as simple as this. Various factors influence these dynamics, including consumer preferences, production costs, and external events.",
    answers: ["there", "more", "for", "product", "may", "it", "expensive", "increase", "Conversely", "excess"],
  },
  {
    id: 116,
    title: "Color Perception",
    raw: "Color perception has fascinated scientists and artists alike for centuries. The study of pigments, subst____ [5] that gi____ [2] color t____ [1] materials, rev____ [4] complex intera____ [6] with li____ [3]. Pigments abs____ [3] certain wavel____ [6] and ref____ [4] others, wh____ [3] is why objects appear to have color. Synthetic pigments have expanded the color palette available to artists and industries. The development of pigments requires knowledge of chemistry and physics, as their properties influence durability and appearance. Understanding how pigments behave is crucial in various fields, from art restoration to manufacturing.",
    answers: ["substances", "give", "to", "reveals", "interactions", "light", "absorb", "wavelengths", "reflect", "which"],
  },
  {
    id: 117,
    title: "Academia",
    raw: "In the world of academia, art history is more than just studying paintings — it is about decoding the emotional language of visual storytelling. For example, chiaroscuro is a tech____ [5] that origi____ [5] during t____ [2] Renaissance. Exemp______ [6] by str____ [3] contrast bet____ [4] light a____ [2] shadow, the st____ [3] evokes dr____ [3] through sele____ [5] illumination. Artists like Caravaggio mastered this interplay, using it to pull viewers into the heart of his scenes, guiding their eyes and stirring their emotions with every flicker of light.",
    answers: ["technique", "originated", "the", "Exemplified", "strong", "between", "and", "style", "drama", "selective"],
  },
  {
    id: 118,
    title: "Sodium-ion Batteries",
    raw: "Sodium-ion batteries are gaining attention as a potential alternative to lithium-ion batteries. Sodium is more accessible than lithium because it can be extracted from seawater, while lithium typically requires mining methods that can ha__ [2] the envir______ [6]. Sodium-ion techn____ [5] is consi_____ [5] more susta______ [6] in t____ [2] long te__ [2]. However, sev____ [4] challenges li___ [3] its wides____ [5] use. Sodium-ion batteries often store less energy than lithium-ion batteries, reducing their efficiency for certain applications. Researchers continue to study sodium-ion batteries in order to improve their performance and determine their role in future energy systems.",
    answers: ["harm", "environment", "technology", "considered", "sustainable", "the", "term", "several", "limit", "widespread"],
  },
  {
    id: 119,
    title: "The Rise of Industrialization",
    raw: "The rise of industrialization in the eighteenth and nineteenth centuries brought about a dramatic shift in how goods were made, leading to the widespread development of factories. These centralized workp____ [5] replaced tradi____ [6] handcrafting a____ [2] cottage indus____ [5] with mechanized produ____ [5] systems pow____ [4] by st____ [3], water, o____ [1] electricity, allo____ [4] for gre____ [4] efficiency in the manufacturing of goods. Factories not only transformed economies and labor systems but also reshaped urban landscapes, contributing to population growth, environmental changes, and new social dynamics.",
    answers: ["workplaces", "traditional", "and", "industries", "production", "powered", "steam", "or", "allowing", "greater"],
  },
];

for (const article of insertArticles) {
  try {
    parsePassage(article.raw, article.answers);
  } catch (err) {
    console.error(`Article ${article.id} (${article.title}): ${err.message}`);
    process.exit(1);
  }
}

const existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const insertAt = existing.findIndex((a) => a.id === 115);
if (insertAt === -1) {
  console.error("Could not find article id 115");
  process.exit(1);
}

const before = existing.slice(0, insertAt);
const after = existing.slice(insertAt).map((article) => ({
  ...article,
  id: article.id + insertArticles.length,
}));

const merged = [...before, ...insertArticles, ...after];

for (let i = 0; i < merged.length; i += 1) {
  if (merged[i].id !== i + 1) {
    console.error(`ID sequence broken at index ${i}: expected ${i + 1}, got ${merged[i].id}`);
    process.exit(1);
  }
}

fs.writeFileSync(dataPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

const newBlankCount = insertArticles.reduce((sum, a) => sum + a.answers.length, 0);
const totalBlanks = merged.reduce((sum, a) => sum + a.answers.length, 0);
console.log(
  `Inserted ${insertArticles.length} articles (${newBlankCount} blanks) after id 114. Total: ${merged.length} articles, ${totalBlanks} blanks.`
);
