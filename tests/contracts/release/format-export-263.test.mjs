import { readFileSync } from "node:fs";
import test from "node:test";
import * as prettier from "prettier";

// Temporary read-only canonical formatting receipt. Removed before review.
test("export pinned prettier release-note files for exact formatter parity", async () => {
  for (const path of [
    "scripts/release/release-notes.mjs",
    "tests/contracts/release/release-notes.test.mjs",
  ]) {
    const config = (await prettier.resolveConfig(path)) ?? {};
    const formatted = await prettier.format(readFileSync(path, "utf8"), {
      ...config,
      filepath: path,
    });
    const raw = Buffer.from(formatted).toString("base64");
    for (let start = 0; start < raw.length; start += 600) {
      console.log("FORMAT263 " + path + " " + Math.floor(start / 600) + " " + raw.slice(start, start + 600));
    }
  }
});
