import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const docsDir = path.join(process.cwd(), "docs");
const outDir = path.join(process.cwd(), "app", "database");
const outFile = path.join(outDir, "words.json");
const timePattern = /\b(?:\d{2}:\d{2}|1:\d{2}:\d{2})\b/g;
const hasTimePattern = /\b(?:\d{2}:\d{2}|1:\d{2}:\d{2})\b/;

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanText(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .trim();
}

function hasJapanese(value) {
  return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value);
}

function normalizePdfText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/-- \d+ of \d+ --/g, "")
    .replace(/([ぁ-んァ-ンー])\n([ぁ-んァ-ンー])/g, "$1$2")
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, "$1$2");
}

function parseTranscript(text, wordListStart) {
  const transcript = normalizePdfText(text.slice(0, wordListStart));
  const entries = new Map();
  const pattern = /(?:^|\n)(\d+)\s+((?:\d{2}:\d{2})|(?:1:\d{2}:\d{2}))\s+([\s\S]*?)(?=\n\d+\s+(?:\d{2}:\d{2}|1:\d{2}:\d{2})|\nN5 Words|\s*$)/g;

  for (const match of transcript.matchAll(pattern)) {
    const time = match[2];
    const sentence = cleanText(match[3]);
    if (sentence && !entries.has(time)) {
      entries.set(time, sentence);
    }
  }

  return entries;
}

function isEntryStart(line) {
  if (!line || /^(N[1-5]|Other) Words/.test(line)) return false;
  if (/^(Understand|Word Meaning|Words that|Simple daily)/.test(line)) return false;
  if (/^https?:\/\//.test(line)) return false;

  const [head, ...rest] = line.split(/\s+/);
  if (!head) return false;
  if (hasTimePattern.test(head)) return false;

  if (hasJapanese(head) || /^\d+\([ぁ-んァ-ンー]+\)$/.test(head)) {
    return rest.length > 0 || /[(（][^()（）]+[)）]$/u.test(head);
  }

  return false;
}

function splitHead(head) {
  const match = head.match(/^(.+?)[(（]([^()（）]+)[)）]$/u);
  if (!match) {
    return { japanese: head, reading: "" };
  }

  return {
    japanese: match[1],
    reading: match[2]
  };
}

function finalizeEntry(entry, transcriptByTime, source, sourceDate, level) {
  if (!entry) return null;
  const body = cleanText(entry.parts.join(" "));
  const times = Array.from(new Set(body.match(timePattern) || []));
  const meaningEn = cleanText(body.replace(timePattern, " ").replace(/\s*,\s*/g, ", "));
  const firstTime = times[0];
  const exampleJapanese = firstTime ? transcriptByTime.get(firstTime) || "" : "";

  if (!entry.japanese || !meaningEn) return null;

  return {
    id: `pdf-${sourceDate}-${slug(entry.japanese)}-${slug(entry.reading || "no-reading")}`,
    japanese: entry.japanese,
    reading: entry.reading,
    meaningKo: meaningEn,
    meaningEn,
    exampleJapanese,
    exampleMeaningKo: "",
    level,
    source,
    sourceDate,
    reviewType: "word",
    searchText: cleanText([entry.japanese, entry.reading, meaningEn, source].join(" "))
  };
}

function parseWords(text, fileName) {
  const normalized = normalizePdfText(text);
  const wordListStart = normalized.search(/\nN5 Words \(\d+ words\)/);
  if (wordListStart < 0) {
    return [];
  }

  const transcriptByTime = parseTranscript(normalized, wordListStart);
  const sourceDate = fileName.match(/^\d{8}/)?.[0] || "unknown";
  const source = `PDF ${sourceDate}`;
  const wordListText = normalized
    .slice(wordListStart)
    .replace(/ (?=([\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}0-9][^\s()（）]{0,24}[(（][^()（）]{1,40}[)）]\s+[A-Za-z0-9(]))/gu, "\n");
  const lines = wordListText.split("\n").map((line) => cleanText(line)).filter(Boolean);
  const words = [];
  let level = "Other";
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^(N[1-5]|Other) Words \((\d+) words\)/);
    if (heading) {
      const next = finalizeEntry(current, transcriptByTime, source, sourceDate, level);
      if (next) words.push(next);
      current = null;
      level = heading[1];
      continue;
    }

    if (/^(Understand|Word Meaning|Words that|Simple daily|Learn intermediate|Advanced|Basic)/.test(line)) {
      continue;
    }

    if (isEntryStart(line)) {
      const next = finalizeEntry(current, transcriptByTime, source, sourceDate, level);
      if (next) words.push(next);

      const [head, ...rest] = line.split(/\s+/);
      const { japanese, reading } = splitHead(head);
      current = {
        japanese,
        reading,
        parts: [rest.join(" ")]
      };
      continue;
    }

    if (current) {
      current.parts.push(line);
    }
  }

  const last = finalizeEntry(current, transcriptByTime, source, sourceDate, level);
  if (last) words.push(last);

  const seen = new Set();
  return words.filter((word) => {
    const key = `${word.sourceDate}:${word.level}:${word.japanese}:${word.reading}:${word.meaningEn}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readPdf(fileName) {
  const parser = new PDFParse({ data: fs.readFileSync(path.join(docsDir, fileName)) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

const pdfFiles = fs.readdirSync(docsDir).filter((file) => file.toLowerCase().endsWith(".pdf")).sort();
const allWords = [];
const summary = [];

for (const fileName of pdfFiles) {
  const text = await readPdf(fileName);
  const words = parseWords(text, fileName);
  allWords.push(...words);
  summary.push({ fileName, count: words.length });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(allWords, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ total: allWords.length, summary }, null, 2));
