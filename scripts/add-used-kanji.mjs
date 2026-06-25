import fs from "fs";
import path from "path";

const databaseDir = path.join(process.cwd(), "app", "database");
const wordsPath = path.join(databaseDir, "words.json");
const wordLevelsDir = path.join(databaseDir, "words-by-level");
const indexPath = path.join(databaseDir, "index.json");
const notionCsvPath = path.join(process.cwd(), "docs", "notion-japanese-vocab-template.csv");

const kanjiPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu;

function extractUsedKanji(value) {
  return Array.from(new Set(String(value || "").match(kanjiPattern) || [])).join(" ");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function updateWords(words) {
  return words.map((word) => {
    const usedKanji = extractUsedKanji(word.japanese);
    const searchText = Array.from(
      new Set([word.japanese, word.reading, word.meaningKo, usedKanji, word.level, ...(word.levels || [])].filter(Boolean))
    ).join(" ");

    return {
      ...word,
      usedKanji,
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

function updateNotionCsv() {
  if (!fs.existsSync(notionCsvPath)) return;

  const lines = fs.readFileSync(notionCsvPath, "utf8").trimEnd().split(/\r?\n/);
  if (!lines.length) return;

  const header = parseCsvLine(lines[0]);
  const wordIndex = header.indexOf("단어");
  const usedKanjiIndex = header.indexOf("이용된 한자");
  const nextHeader = usedKanjiIndex === -1 ? [...header, "이용된 한자"] : header;

  const nextLines = [
    nextHeader.map(csvCell).join(","),
    ...lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const usedKanji = wordIndex === -1 ? "" : extractUsedKanji(cells[wordIndex]);

      if (usedKanjiIndex === -1) {
        return [...cells, usedKanji].map(csvCell).join(",");
      }

      cells[usedKanjiIndex] = usedKanji;
      return cells.map(csvCell).join(",");
    })
  ];

  fs.writeFileSync(notionCsvPath, `${nextLines.join("\n")}\n`, "utf8");
}

const words = updateWords(readJson(wordsPath));
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
  index.words = {
    ...(index.words || {}),
    withUsedKanji: words.filter((word) => word.usedKanji).length
  };
  index.generatedAt = new Date().toISOString();
  writeJson(indexPath, index);
}

updateNotionCsv();

console.log(
  JSON.stringify(
    {
      words: words.length,
      withUsedKanji: words.filter((word) => word.usedKanji).length,
      notionCsv: fs.existsSync(notionCsvPath)
    },
    null,
    2
  )
);
