import { readFileSync } from "node:fs";
import test from "node:test";
import * as prettier from "prettier";

// Temporary, read-only developer formatting receipt; removed before review/merge.
// Uses precisely the installed, lockfile-pinned project formatter.
test("export canonical Prettier formatted changed files without mutation", async () => {
  const files = [
    "docs/CI_CD.md",
    "docs/DELIVERY.md",
    "docs/DEPLOYMENT.md",
    "tests/contracts/release/production-environment.test.mjs",
    "tests/contracts/release/public-uat-request.test.mjs",
  ];
  for (const path of files) {
    const config = (await prettier.resolveConfig(path)) ?? {};
    const formatted = await prettier.format(readFileSync(path, "utf8"), {
      ...config,
      filepath: path,
    });
    const base64 = Buffer.from(formatted, "utf8").toString("base64");
    for (let i = 0; i < base64.length; i += 600) {
      console.log("FORMAT257 " + path + " " + Math.floor(i / 600) + " " + base64.slice(i, i + 600));
    }
  }
});
