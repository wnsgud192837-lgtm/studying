import fs from "fs";
import path from "path";

const notionVersion = "2026-03-11";
const databasePath = path.join(process.cwd(), "app", "database", "words.json");

loadEnv(".env");
loadEnv(".env.local");

const command = process.argv[2] || "help";
const flags = new Set(process.argv.slice(3));

const config = {
  token: process.env.NOTION_TOKEN,
  databaseId: normalizeId(process.env.NOTION_DATABASE_ID),
  dataSourceId: normalizeId(process.env.NOTION_DATA_SOURCE_ID),
  koreanProp: process.env.NOTION_KOREAN_PROP || "Korean",
  japaneseProp: process.env.NOTION_JAPANESE_PROP || "Japanese",
  readingProp: process.env.NOTION_READING_PROP || "Reading",
  kanjiProp: process.env.NOTION_KANJI_PROP || "한자",
  levelProp: process.env.NOTION_LEVEL_PROP || "Level"
};

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function normalizeId(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/-/g, "");
  return cleaned || "";
}

function requireConfig() {
  if (!config.token) {
    throw new Error("Missing NOTION_TOKEN. Add it to .env.local.");
  }
  if (!config.dataSourceId && !config.databaseId) {
    throw new Error("Missing NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID. Add one to .env.local.");
  }
}

async function notionFetch(endpoint, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionVersion,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const detail = body.message || `${response.status} ${response.statusText}`;
    throw new Error(`Notion API error for ${endpoint}: ${detail}`);
  }

  return body;
}

async function getDataSourceId() {
  if (config.dataSourceId) return config.dataSourceId;

  const database = await notionFetch(`/databases/${config.databaseId}`, { method: "GET" });
  const dataSources = database.data_sources || [];
  if (!dataSources.length) {
    throw new Error("No data_sources found for this database. Try setting NOTION_DATA_SOURCE_ID directly.");
  }

  return normalizeId(dataSources[0].id);
}

async function getDataSource() {
  const dataSourceId = await getDataSourceId();
  return notionFetch(`/data_sources/${dataSourceId}`, { method: "GET" });
}

async function queryAllPages() {
  const dataSourceId = await getDataSourceId();
  const pages = [];
  let startCursor;

  do {
    const body = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const page = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    pages.push(...page.results);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor);

  return pages;
}

function richTextValue(items = []) {
  return items.map((item) => item.plain_text || "").join("").trim();
}

function propertyToText(prop) {
  if (!prop) return "";

  switch (prop.type) {
    case "title":
      return richTextValue(prop.title);
    case "rich_text":
      return richTextValue(prop.rich_text);
    case "select":
      return prop.select?.name || "";
    case "multi_select":
      return (prop.multi_select || []).map((item) => item.name).join(", ");
    case "status":
      return prop.status?.name || "";
    case "number":
      return prop.number === null || prop.number === undefined ? "" : String(prop.number);
    case "checkbox":
      return prop.checkbox ? "true" : "false";
    case "url":
      return prop.url || "";
    case "email":
      return prop.email || "";
    case "phone_number":
      return prop.phone_number || "";
    case "formula":
      return formulaToText(prop.formula);
    default:
      return "";
  }
}

function formulaToText(formula) {
  if (!formula) return "";
  if (formula.type === "string") return formula.string || "";
  if (formula.type === "number") return formula.number === null ? "" : String(formula.number);
  if (formula.type === "boolean") return formula.boolean ? "true" : "false";
  if (formula.type === "date") return formula.date?.start || "";
  return "";
}

function textProperty(value) {
  return {
    rich_text: value
      ? [
          {
            text: {
              content: value
            }
          }
        ]
      : []
  };
}

function selectProperty(value) {
  return value ? { select: { name: value } } : { select: null };
}

function canWriteProperty(schemaProperty) {
  return schemaProperty && ["rich_text", "select"].includes(schemaProperty.type);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[(){}\[\],.;:!?'"`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadLocalWords() {
  const words = JSON.parse(fs.readFileSync(databasePath, "utf8"));
  const entries = [];

  for (const word of words) {
    const meanings = String(word.meaningKo || "")
      .split(/\s*,\s*|\s*\/\s*/)
      .map(normalizeText)
      .filter(Boolean);

    for (const meaning of meanings) {
      entries.push([meaning, word]);
    }
  }

  return entries;
}

function findLocalWord(korean, localEntries) {
  const target = normalizeText(korean);
  if (!target) return null;

  let match = localEntries.find(([meaning]) => meaning === target)?.[1];
  if (match) return match;

  match = localEntries.find(([meaning]) => meaning.includes(target) || target.includes(meaning))?.[1];
  return match || null;
}

async function runSchema() {
  requireConfig();
  const dataSource = await getDataSource();
  console.log(`Data source: ${dataSource.id}`);
  console.log("");
  console.log("Properties:");
  for (const [name, prop] of Object.entries(dataSource.properties || {})) {
    console.log(`- ${name}: ${prop.type}`);
  }
}

async function runPull() {
  requireConfig();
  const pages = await queryAllPages();
  console.log(`Rows: ${pages.length}`);
  for (const page of pages.slice(0, 10)) {
    const row = {};
    for (const [name, prop] of Object.entries(page.properties || {})) {
      row[name] = propertyToText(prop);
    }
    console.log(JSON.stringify(row, null, 2));
  }
  if (pages.length > 10) console.log(`... ${pages.length - 10} more rows`);
}

async function runSync() {
  requireConfig();

  const dryRun = flags.has("--dry-run");
  const dataSource = await getDataSource();
  const schema = dataSource.properties || {};
  const pages = await queryAllPages();
  const localEntries = loadLocalWords();

  const writable = {
    japanese: canWriteProperty(schema[config.japaneseProp]),
    reading: canWriteProperty(schema[config.readingProp]),
    kanji: canWriteProperty(schema[config.kanjiProp]),
    level: schema[config.levelProp]?.type === "select"
  };

  const updates = [];
  for (const page of pages) {
    const korean = propertyToText(page.properties?.[config.koreanProp]);
    const localWord = findLocalWord(korean, localEntries);
    if (!localWord) continue;

    const patch = {};
    if (writable.japanese && !propertyToText(page.properties?.[config.japaneseProp])) {
      patch[config.japaneseProp] = textProperty(localWord.japanese || "");
    }
    if (writable.reading && !propertyToText(page.properties?.[config.readingProp])) {
      patch[config.readingProp] = textProperty(localWord.reading || "");
    }
    if (writable.kanji && !propertyToText(page.properties?.[config.kanjiProp])) {
      patch[config.kanjiProp] = textProperty(localWord.kanji || "");
    }
    if (writable.level && !propertyToText(page.properties?.[config.levelProp])) {
      patch[config.levelProp] = selectProperty(localWord.level || "Other");
    }

    if (Object.keys(patch).length) {
      updates.push({ page, korean, localWord, patch });
    }
  }

  console.log(`${dryRun ? "Preview" : "Writing"} ${updates.length} update(s).`);

  for (const update of updates.slice(0, dryRun ? 20 : updates.length)) {
    console.log(
      `${update.korean} -> ${update.localWord.japanese} / ${update.localWord.reading} (${update.localWord.level})`
    );

    if (!dryRun) {
      await notionFetch(`/pages/${update.page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: update.patch })
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  if (dryRun && updates.length > 20) console.log(`... ${updates.length - 20} more update(s)`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/notion-vocab.mjs schema
  node scripts/notion-vocab.mjs pull
  node scripts/notion-vocab.mjs sync --dry-run
  node scripts/notion-vocab.mjs sync
`);
}

try {
  if (command === "schema") await runSchema();
  else if (command === "pull") await runPull();
  else if (command === "sync") await runSync();
  else printHelp();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
