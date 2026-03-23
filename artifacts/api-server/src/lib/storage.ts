import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage");

export function getStorageDir(): string {
  return STORAGE_DIR;
}

export async function ensureStorageDir(subPath: string = ""): Promise<string> {
  const dir = subPath ? path.join(STORAGE_DIR, subPath) : STORAGE_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  relativePath: string,
  buffer: Buffer,
): Promise<void> {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  return fs.readFile(fullPath);
}

export async function deleteFile(relativePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_DIR, relativePath);
  if (existsSync(fullPath)) {
    await fs.unlink(fullPath);
  }
}

export function getPublicUrl(relativePath: string): string {
  const siteUrl = process.env.SITE_URL ?? "";
  return `${siteUrl}/api/files/${relativePath}`;
}
