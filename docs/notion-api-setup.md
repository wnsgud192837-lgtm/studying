# Notion API Setup

This project can read a Notion vocabulary database and safely preview updates before writing anything.

## 1. Create a Notion connection

1. Open https://www.notion.so/profile/integrations.
2. Create an internal connection.
3. Copy the installation access token.
4. Open the Notion database page.
5. Click `...` in the top-right menu, choose `Add connections`, and add your connection.

Notion requires explicit database sharing. If the script returns `404`, the database is usually not shared with the connection yet.

## 2. Configure local secrets

Create `.env.local` from `.env.example`:

```env
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=381881bd102c80f9adb6cd76cc412371
NOTION_KOREAN_PROP=Korean
NOTION_JAPANESE_PROP=Japanese
NOTION_READING_PROP=Reading
NOTION_KANJI_PROP=한자
NOTION_LEVEL_PROP=Level
```

Do not commit `.env.local`. It is already ignored by git.

## 3. Check the connection

```bash
npm run notion:schema
npm run notion:pull
```

On this Windows PowerShell setup, use `npm.cmd run ...` if `npm` is blocked by an execution policy.

`notion:schema` prints the Notion column names and types. Update the property names in `.env.local` if needed.

## 4. Preview linking local Japanese words

```bash
npm run notion:sync -- --dry-run
```

The sync command matches each Notion row's Korean column against `app/database/words.json`.
When a match is found, it can fill the Japanese, Reading, Kanji, and Level columns.

To write changes to Notion after checking the preview:

```bash
npm run notion:sync
```
