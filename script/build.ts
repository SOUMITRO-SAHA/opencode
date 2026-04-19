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
  const platform = process.platform === "win32" ? "windows" : process.platform
  const arch = process.arch
  const targetName = `${app}-${platform}-${arch}`

  const distPath = path.join(process.cwd(), "packages", "opencode", "dist", targetName, "bin", app)
  const installPath = path.join(getInstallDir(), app)

  return { distPath, installPath, targetName }
}

async function main() {
  console.log("Building opencode...")
  await $`bun run --cwd packages/opencode build --single`

  console.log("Detecting binary path...")
  const { distPath, installPath, targetName } = await getBinaryPath()

  const binaryExists = await fs
    .access(installPath)
    .then(() => true)
    .catch(() => false)

  console.log(`Found binary: ${targetName}`)
  console.log(`Installing to: ${installPath}`)

  const binDir = path.dirname(installPath)
  await fs.mkdir(binDir, { recursive: true })
  await fs.copyFile(distPath, installPath)

  if (process.platform !== "win32") {
    await fs.chmod(installPath, 0o755)
  }

  if (binaryExists) {
    console.log(`\nOpenCode binary updated: ${installPath}`)
  } else {
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
}

main().catch((err) => {
  console.error("Build failed:", err)
  process.exit(1)
})
