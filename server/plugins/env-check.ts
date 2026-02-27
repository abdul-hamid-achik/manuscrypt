export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  if (!config.anthropicApiKey) {
    console.warn("[env] NUXT_ANTHROPIC_API_KEY is not set — AI features will be unavailable")
  }

  if (!config.anthropicFastModel) {
    console.warn("[env] anthropicFastModel is not configured — using default")
  }

  if (!config.anthropicSmartModel) {
    console.warn("[env] anthropicSmartModel is not configured — using default")
  }
})
