import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { attachWorkflowIds, buildSeed } from "@/lib/demo/seed";
import type { Database } from "@/lib/data/types";

const directory = path.join(process.cwd(), ".data");
const filePath = path.join(directory, "demo-db.json");

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Database> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Database;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
    const db = buildSeed(new Date());
    attachWorkflowIds(db);
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

export function withDemoDatabase<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, JSON.stringify(db), "utf8");
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function demoUploadPath(name: string) {
  return path.join(directory, "uploads", name);
}
