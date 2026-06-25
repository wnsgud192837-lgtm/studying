import fs from "fs";
import path from "path";

const databaseDir = path.join(process.cwd(), "app", "database");
const wordsPath = path.join(databaseDir, "words.json");
const kanjiPath = path.join(databaseDir, "kanji.json");
const wordLevelsDir = path.join(databaseDir, "words-by-level");
const indexPath = path.join(databaseDir, "index.json");
const notionCsvPath = path.join(process.cwd(), "docs", "notion-japanese-vocab-template.csv");

const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadJouyouSet() {
  return new Set(readJson(kanjiPath).map((item) => item.character).filter(Boolean));
}

function extractWordKanji(value, jouyouSet) {
  return Array.from(new Set(String(value || "").match(cjkPattern) || []))
    .filter((character) => jouyouSet.has(character))
    .join(" ");
}

function updateWords(words, jouyouSet) {
  return words.map((word) => {
    const { usedKanji, ...wordWithoutOldField } = word;
    const kanji = extractWordKanji(word.japanese, jouyouSet);
    const searchText = Array.from(
      new Set([word.japanese, word.reading, word.meaningKo, kanji, word.level, ...(word.levels || [])].filter(Boolean))
    ).join(" ");

    return {
      ...wordWithoutOldField,
      kanji,
      searchText
    };
  });
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function csvCell(value) {
  const text = String(value || "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function updateNotionCsv(jouyouSet) {
  if (!fs.existsSync(notionCsvPath)) return;

  const lines = fs.readFileSync(notionCsvPath, "utf8").trimEnd().split(/\r?\n/);
  if (!lines.length) return;

  const rawHeader = parseCsvLine(lines[0]);
  const normalizedHeader = rawHeader.map((name) => (["이용된 한자", "한자 난이도"].includes(name) ? "한자" : name));
  const seenColumns = new Set();
  const keepIndices = [];
  const header = [];

  normalizedHeader.forEach((name, index) => {
    if (seenColumns.has(name)) return;
    seenColumns.add(name);
    keepIndices.push(index);
    header.push(name);
  });

  if (!seenColumns.has("한자")) {
    header.push("한자");
    keepIndices.push(-1);
  }

  const wordIndex = header.indexOf("단어");
  const kanjiIndex = header.indexOf("한자");

  const nextLines = [
    header.map(csvCell).join(","),
    ...lines.slice(1).map((line) => {
      const rawCells = parseCsvLine(line);
      const cells = keepIndices.map((index) => (index === -1 ? "" : rawCells[index] || ""));
      const kanji = wordIndex === -1 ? "" : extractWordKanji(cells[wordIndex], jouyouSet);

      cells[kanjiIndex] = kanji;
      return cells.map(csvCell).join(",");
    })
  ];

  fs.writeFileSync(notionCsvPath, `${nextLines.join("\n")}\n`, "utf8");
}

const jouyouSet = loadJouyouSet();
const words = updateWords(readJson(wordsPath), jouyouSet);
writeJson(wordsPath, words);

const groups = words.reduce((nextGroups, word) => {
  const level = word.level || "Other";
  nextGroups[level] ||= [];
  nextGroups[level].push(word);
  return nextGroups;
}, {});

for (const [level, levelWords] of Object.entries(groups)) {
  writeJson(path.join(wordLevelsDir, `${level}.json`), levelWords);
}

if (fs.existsSync(indexPath)) {
  const index = readJson(indexPath);
  const { withUsedKanji, ...wordStats } = index.words || {};
  index.words = {
    ...wordStats,
    withKanji: words.filter((word) => word.kanji).length
  };
  index.generatedAt = new Date().toISOString();
  writeJson(indexPath, index);
}

updateNotionCsv(jouyouSet);

console.log(
  JSON.stringify(
    {
      words: words.length,
      withKanji: words.filter((word) => word.kanji).length,
      jouyouKanji: jouyouSet.size,
      notionCsv: fs.existsSync(notionCsvPath)
    },
    null,
    2
  )
);
