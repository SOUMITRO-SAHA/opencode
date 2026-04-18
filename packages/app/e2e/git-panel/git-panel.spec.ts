import { test, expect } from "../fixtures"
import { gitPanelSelector, gitPanelToggleSelector } from "../selectors"
import fs from "node:fs/promises"
import path from "node:path"

async function openGitPanel(page: Parameters<typeof test>[0]["page"]) {
  const btn = page.locator(gitPanelToggleSelector).first()
  await expect(btn).toBeVisible()
  if ((await btn.getAttribute("aria-expanded")) !== "true") await btn.click()
  await expect(btn).toHaveAttribute("aria-expanded", "true")
}

async function closeGitPanel(page: Parameters<typeof test>[0]["page"]) {
  const btn = page.locator(gitPanelToggleSelector).first()
  if ((await btn.getAttribute("aria-expanded")) === "true") await btn.click()
  await expect(btn).toHaveAttribute("aria-expanded", "false")
}

test("git panel toggle button shows when project has git vcs", async ({ page, project }) => {
  await project.open()
  const btn = page.locator(gitPanelToggleSelector).first()
  await expect(btn).toBeVisible()
})

test("git panel opens and closes on toggle button click", async ({ page, project }) => {
  await project.open()
  const btn = page.locator(gitPanelToggleSelector).first()
  const panel = page.locator(gitPanelSelector).first()

  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute("aria-expanded", "false")

  await btn.click()
  await expect(btn).toHaveAttribute("aria-expanded", "true")
  await expect(panel).toBeVisible()

  await btn.click()
  await expect(btn).toHaveAttribute("aria-expanded", "false")
  await expect(panel).not.toBeVisible()
})

test("git panel shows branch name", async ({ page, project }) => {
  await project.open()
  await openGitPanel(page)

  const panel = page.locator(gitPanelSelector).first()
  await expect(panel).toBeVisible()

  const branchIcon = panel.locator('[data-component="icon"]').filter({ hasNotText: /close/ }).first()
  await expect(branchIcon).toBeVisible()
})

test("git panel shows no changes message when clean", async ({ page, project }) => {
  await project.open()
  await openGitPanel(page)

  const panel = page.locator(gitPanelSelector).first()
  await expect(panel).toBeVisible()

  await expect(panel.getByText(/no changes/i).first()).toBeVisible()
})

test.fixme("git panel shows file changes after file modification", async ({ page, project }) => {
  test.setTimeout(120_000)

  await project.open({
    setup: async (dir) => {
      await fs.appendFile(path.join(dir, "README.md"), "\n\nAdded line for testing\n")
    },
  })

  await openGitPanel(page)

  const panel = page.locator(gitPanelSelector).first()
  await expect(panel).toBeVisible()

  await expect(panel.getByText(/change/)).toBeVisible({ timeout: 10_000 })
  await expect(panel.getByText("README.md")).toBeVisible()
})

test("git panel close button closes the panel", async ({ page, project }) => {
  await project.open()
  await openGitPanel(page)

  const panel = page.locator(gitPanelSelector).first()
  await expect(panel).toBeVisible()

  const closeBtn = panel.getByRole("button", { name: /close/i }).first()
  await expect(closeBtn).toBeVisible()
  await closeBtn.click()

  await expect(panel).not.toBeVisible()
})
