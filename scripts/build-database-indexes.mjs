import fs from "fs";
import path from "path";

const databaseDir = path.join(process.cwd(), "app", "database");
const wordLevels = ["N5", "N4", "N3", "N2", "N1", "Other"];

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(databaseDir, fileName), "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function groupByLevel(items) {
  return items.reduce((groups, item) => {
    const level = item.level || "Other";
    groups[level] ||= [];
    groups[level].push(item);
    return groups;
  }, {});
}

const words = readJson("words.json");
const kanji = readJson("kanji.json");
const wordsByLevel = groupByLevel(words);
const kanjiByLevel = groupByLevel(kanji);

for (const level of wordLevels) {
  writeJson(path.join(databaseDir, "words-by-level", `${level}.json`), wordsByLevel[level] || []);
}

for (const level of Object.keys(kanjiByLevel).sort()) {
  writeJson(path.join(databaseDir, "kanji-by-level", `${level}.json`), kanjiByLevel[level]);
}

const index = {
  generatedAt: new Date().toISOString(),
  words: {
    total: words.length,
    byLevel: Object.fromEntries(wordLevels.map((level) => [level, (wordsByLevel[level] || []).length]))
  },
  kanji: {
    total: kanji.length,
    byLevel: Object.fromEntries(Object.keys(kanjiByLevel).sort().map((level) => [level, kanjiByLevel[level].length]))
  }
};

writeJson(path.join(databaseDir, "index.json"), index);
console.log(JSON.stringify(index, null, 2));
