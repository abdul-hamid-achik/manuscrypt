export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: "2025-01-01",

  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/test-utils/module"],

  components: [
    { path: "~/components", pathPrefix: false },
  ],

  css: ["~/assets/css/main.css"],

  app: {
    head: {
      title: "Manuscrypt",
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/favicon.svg" },
      ],
      meta: [
        { name: "description", content: "AI-powered book writing platform for literary fiction" },
      ],
    },
  },

  nitro: {
    preset: "bun",
  },

  icon: {
    serverBundle: "local",
  },

  runtimeConfig: {
    anthropicApiKey: "",
    anthropicFastModel: "claude-haiku-4-5-20251001",
    anthropicSmartModel: "claude-sonnet-4-6",
  },

  devtools: { enabled: process.env.NODE_ENV !== 'production' },
})
