import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: [
    "app/app.config.ts",
    "app/app.vue",
    "server/**/*.ts",
    "app/pages/**/*.vue",
    "app/layouts/**/*.vue",
    "app/components/**/*.vue",
    "app/composables/**/*.ts",
    "app/stores/**/*.ts",
    "app/utils/**/*.ts",
  ],
  project: ["**/*.{ts,vue}"],
  ignoreDependencies: [
    "@iconify-json/lucide",
    "@evilmartians/lefthook",
    "h3",
  ],
  ignoreExportsUsedInFile: true,
  rules: {
    types: "off",
  },
}

export default config
