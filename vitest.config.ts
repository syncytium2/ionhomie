// Tests only: the physics core. The prototype keeps its own node:test suite under prototype/.
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
