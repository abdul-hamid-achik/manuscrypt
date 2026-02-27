import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", ".nuxt", ".output", "tests"],
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "app"),
      "~~": resolve(__dirname),
      "#imports": resolve(__dirname, ".nuxt/imports.d.ts"),
    },
  },
})
