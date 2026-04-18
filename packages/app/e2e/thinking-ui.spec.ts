import { test, expect } from "./fixtures"

test("thinking UI displays reasoning parts from assistant", async ({ page, project, assistant }) => {
  await project.open()

  await assistant.reason("I am thinking about this problem...", { text: "Here is my response" })

  await project.prompt("test thinking")

  const reasoningTrigger = page.locator('[data-component="reasoning-part-trigger"]')
  await expect(reasoningTrigger).toBeVisible({ timeout: 30_000 })

  const reasoningContent = page.locator('[data-component="reasoning-part"]')
  await expect(reasoningContent).toBeVisible()
  await expect(reasoningContent).toContainText("I am thinking about this problem")
})

test("thinking UI can be collapsed and expanded", async ({ page, project, assistant }) => {
  await project.open()

  await assistant.reason("Some thinking content", { text: "Response" })

  await project.prompt("test collapse")

  const trigger = page.locator('[data-component="reasoning-part-trigger"]')
  await expect(trigger).toBeVisible({ timeout: 30_000 })

  const content = page.locator('[data-component="reasoning-part"]')
  await expect(content).toBeVisible()

  await trigger.click()
  await expect(content).not.toBeVisible()

  await trigger.click()
  await expect(content).toBeVisible()
})

test("thinking UI displays brain icon and label", async ({ page, project, assistant }) => {
  await project.open()

  await assistant.reason("Thinking...", { text: "Done" })

  await project.prompt("test icon")

  const trigger = page.locator('[data-component="reasoning-part-trigger"]')
  await expect(trigger).toBeVisible({ timeout: 30_000 })

  const brainIcon = trigger.locator('[data-slot="reasoning-part-title"] [data-slot="reasoning-part-label"]')
  await expect(brainIcon).toBeVisible()
})

test("thinking UI works with streaming reasoning", async ({ page, project, assistant }) => {
  await project.open()

  await assistant.reason("Step 1: Analyze problem\nStep 2: Consider options\nStep 3: Make decision", {
    text: "Final answer",
  })

  await project.prompt("test streaming")

  const reasoningPart = page.locator('[data-component="reasoning-part"]')
  await expect(reasoningPart).toBeVisible({ timeout: 30_000 })
  await expect(reasoningPart).toContainText("Step 1")
  await expect(reasoningPart).toContainText("Step 2")
  await expect(reasoningPart).toContainText("Step 3")
})

test("thinking UI displays reasoning with markdown formatting", async ({ page, project, assistant }) => {
  await project.open()

  await assistant.reason("Let me think about this:\n- Point 1\n- Point 2\n- Point 3", { text: "Conclusion" })

  await project.prompt("test markdown")

  const reasoningPart = page.locator('[data-component="reasoning-part"]')
  await expect(reasoningPart).toBeVisible({ timeout: 30_000 })
  await expect(reasoningPart).toContainText("Point 1")
  await expect(reasoningPart).toContainText("Point 2")
  await expect(reasoningPart).toContainText("Point 3")
})
