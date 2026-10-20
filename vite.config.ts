import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

// Born-on date and time, and the current version's date, baked at build from git rather than
// fetched at runtime, because the CSP below forbids the page any network connection. Born is the
// root commit; updated is HEAD. %cI keeps the committer's UTC offset. (After gaba_excites.)
function git(cmd: string, fallback: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n").pop() || fallback;
  } catch {
    return fallback;
  }
}
const BORN = git("git log --max-parents=0 --format=%cI", "unborn");
const UPDATED = git("git log -1 --format=%cI", BORN);

// In a shallow clone the root commit is not in the graph and --max-parents=0 returns HEAD, so the
// Born stamp would silently read as the build time (shipped once in colonel_kernel). Refuse to build.
function assertFullHistory(): Plugin {
  return {
    name: "assert-full-history-on-build",
    apply: "build",
    buildStart() {
      if (git("git rev-parse --is-shallow-repository", "false") === "true") {
        throw new Error(`Shallow clone: the Born stamp would be wrong (got ${BORN}). Run \`git fetch --unshallow\`.`);
      }
    },
  };
}

// The production CSP, injected into the built index.html only, so the dev server's HMR socket
// still works. connect-src 'none' is the guarantee that nothing the page computes leaves the machine.
const PROD_CSP =
  "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'";

function injectCsp(): Plugin {
  return {
    name: "inject-csp-on-build",
    apply: "build",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: PROD_CSP }, injectTo: "head-prepend" }];
    },
  };
}

export default defineConfig({
  plugins: [react(), assertFullHistory(), injectCsp()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_BORN__: JSON.stringify(BORN),
    __BUILD_UPDATED__: JSON.stringify(UPDATED),
  },
});
