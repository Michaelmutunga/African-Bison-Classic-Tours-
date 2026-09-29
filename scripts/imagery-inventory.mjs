import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const dir = join(process.cwd(), "incoming");
const files = readdirSync(dir).filter((f) => f !== ".gitkeep");

for (const file of files) {
  const full = join(dir, file);
  const bytes = statSync(full).size;
  try {
    const meta = await sharp(full).metadata();
    console.log(
      `${(bytes / 1024).toFixed(0).padStart(5)}KB ${String(meta.width).padStart(5)}x${String(meta.height).padStart(5)} ${meta.format ?? "?"} exif=${meta.exif ? "yes" : "no"} :: ${file}`,
    );
  } catch (error) {
    console.log(`ERROR :: ${file} :: ${String(error)}`);
  }
}
