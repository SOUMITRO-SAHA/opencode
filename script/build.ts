#!/usr/bin/env bun

import { $ } from "bun"
import fs from "fs/promises"
import path from "path"
import os from "os"

const app = "opencode"

function getInstallDir() {
  const platform = process.platform
  const home = os.homedir()

  if (platform === "darwin" || platform === "linux") {
    return path.join(home, ".config", app, "bin")
  }

  if (platform === "win32") {
    return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), app, "bin")
  }

  return path.join(home, ".config", app, "bin")
}

async function getBinaryPath() {
  const distDir = path.join(import.meta.dirname, "..", "packages", "opencode", "dist")
  const entries = await fs.readdir(distDir).catch(() => [])
  const platform = process.platform
  const arch = process.arch

  const targetName = entries.find((name) => {
    if (!name.startsWith("opencode-")) return false
    const parts = name.split("-")
    const osPart = parts[1]
    const archPart = parts[2]
    if (osPart === "darwin" && platform !== "darwin") return false
    if (osPart === "linux" && platform !== "linux") return false
    if (osPart === "windows" && platform !== "win32") return false
    if (archPart === "arm64" && arch !== "arm64") return false
    if (archPart === "x64" && arch !== "x64") return false
    if (name.includes("baseline")) return false
    if (name.includes("musl")) return false
    return true
  })

  if (!targetName) {
    throw new Error(`No matching binary found for platform=${platform} arch=${arch}. Available: ${entries.join(", ")}`)
  }

  const binaryName = platform === "win32" ? "opencode.exe" : "opencode"
  return {
    distPath: path.join(distDir, targetName, "bin", binaryName),
    installPath: path.join(getInstallDir(), binaryName),
    targetName,
  }
}

async function main() {
  console.log("Building opencode...")
  await $`bun run --cwd packages/opencode build --single`

  console.log("Detecting binary path...")
  const { distPath, installPath, targetName } = await getBinaryPath()

  console.log(`Found binary: ${targetName}`)
  console.log(`Installing to: ${installPath}`)

  const binDir = path.dirname(installPath)
  await fs.mkdir(binDir, { recursive: true })
  await fs.copyFile(distPath, installPath)

  if (process.platform !== "win32") {
    await fs.chmod(installPath, 0o755)
  }

  console.log(`\nOpenCode binary installed to: ${installPath}`)

  if (process.platform !== "win32") {
    console.log(`\nAdd this to your ~/.bashrc or ~/.zshrc:`)
    console.log(`  export OPENCODE_BIN_PATH="$HOME/.config/opencode/bin/opencode"`)
    console.log(`  alias oc="$OPENCODE_BIN_PATH"`)
    console.log(`\nThen run: source ~/.bashrc  (or source ~/.zshrc)`)
  } else {
    console.log(`\nAdd this directory to your PATH on Windows:`)
    console.log(`  ${binDir}`)
  }
}

main().catch((err) => {
  console.error("Build failed:", err)
  process.exit(1)
})
