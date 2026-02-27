import { scenes } from "../../database/schema"
import { defineListByParentHandler } from "../../utils/crud"

export default defineListByParentHandler(scenes, scenes.chapterId, "chapterId", scenes.sortOrder)
