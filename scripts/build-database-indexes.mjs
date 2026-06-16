import fs from "fs";
import path from "path";

const databaseDir = path.join(process.cwd(), "app", "database");
const wordLevels = ["N5", "N4", "N3", "N2", "N1", "Other"];
const levelRank = Object.fromEntries(wordLevels.map((level, index) => [level, index]));

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

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function wordKey(word) {
  return [clean(word.japanese), clean(word.reading)].join("|");
}

function easiestLevel(levels) {
  return levels.slice().sort((a, b) => (levelRank[a] ?? 999) - (levelRank[b] ?? 999))[0] || "Other";
}

function mergeMeanings(values) {
  const parts = values
    .flatMap((value) => clean(value).split(/\s*[/;]\s*/))
    .map(clean)
    .filter(Boolean);
  return unique(parts).join(" / ");
}

function dedupeWords(words) {
  const grouped = new Map();

  for (const word of words) {
    const key = wordKey(word);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(word);
  }

  return Array.from(grouped.values()).map((items) => {
    const base = items[0];
    const levels = unique(items.map((item) => item.level || "Other"));
    const sources = unique(items.map((item) => item.source));
    const sourceDates = unique(items.map((item) => item.sourceDate));
    const examples = unique(items.map((item) => item.exampleJapanese)).map((exampleJapanese) => {
      const match = items.find((item) => item.exampleJapanese === exampleJapanese);
      return {
        exampleJapanese,
        exampleMeaningKo: match?.exampleMeaningKo || "",
        source: match?.source || ""
      };
    });
    const meaningEn = mergeMeanings(items.map((item) => item.meaningEn || item.meaningKo));

    return {
      ...base,
      id: `word-${clean(base.japanese)}-${clean(base.reading) || "no-reading"}`.replace(/[^\p{L}\p{N}-]+/gu, "-"),
      meaningKo: meaningEn,
      meaningEn,
      level: easiestLevel(levels),
      levels,
      source: sources.join(", "),
      sources,
      sourceDate: sourceDates[0] || base.sourceDate,
      sourceDates,
      exampleJapanese: examples[0]?.exampleJapanese || "",
      exampleMeaningKo: examples[0]?.exampleMeaningKo || "",
      examples,
      duplicateCount: items.length,
      searchText: clean([
        base.japanese,
        base.reading,
        meaningEn,
        levels.join(" "),
        sources.join(" "),
        examples.map((example) => example.exampleJapanese).join(" ")
      ].join(" "))
    };
  });
}

const rawWords = readJson("words.json");
const words = dedupeWords(rawWords);
const kanji = readJson("kanji.json");
const wordsByLevel = groupByLevel(words);
const kanjiByLevel = groupByLevel(kanji);

writeJson(path.join(databaseDir, "words.json"), words);

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
    rawTotal: rawWords.length,
    duplicateItemsRemoved: rawWords.length - words.length,
    byLevel: Object.fromEntries(wordLevels.map((level) => [level, (wordsByLevel[level] || []).length]))
  },
  kanji: {
    total: kanji.length,
    byLevel: Object.fromEntries(Object.keys(kanjiByLevel).sort().map((level) => [level, kanjiByLevel[level].length]))
  }
};

writeJson(path.join(databaseDir, "index.json"), index);
console.log(JSON.stringify(index, null, 2));
