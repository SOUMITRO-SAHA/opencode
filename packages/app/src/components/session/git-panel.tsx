import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { Button } from "@opencode-ai/ui/button"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { For, Show, createMemo, createEffect, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { useLayout } from "@/context/layout"
import { useLanguage } from "@/context/language"
import { useSync } from "@/context/sync"
import { useServerSDK } from "@/context/server-sdk"
import { useLocal } from "@/context/local"
import { useSettings } from "@/context/settings"
import type { VcsFileDiff } from "@opencode-ai/sdk/v2"
import { getFilename } from "@opencode-ai/core/util/path"

type CommitMode = "tracked" | "all"

const kindLabel = (kind: "add" | "del" | "mix") => {
  if (kind === "add") return "A"
  if (kind === "del") return "D"
  return "M"
}

const kindColor = (kind: "add" | "del" | "mix") => {
  if (kind === "add") return "var(--icon-diff-add-base)"
  if (kind === "del") return "var(--icon-diff-delete-base)"
  return "var(--icon-diff-modified-base)"
}

export function GitPanel() {
  const layout = useLayout()
  const language = useLanguage()
  const sync = useSync()
  const globalSdk = useServerSDK()
  const local = useLocal()
  const settings = useSettings()

  const [store, setStore] = createStore({
    diffs: [] as VcsFileDiff[],
    loading: true,
    commitMessage: "",
    generating: false,
    commitMode: "tracked" as CommitMode,
    committing: false,
    generationMessageID: undefined as string | undefined,
  })

  const branch = createMemo(() => sync().data.vcs?.branch)

  const loadDiffs = async () => {
    if (sync().project?.vcs !== "git") {
      setStore("loading", false)
      return
    }

    setStore("loading", true)
    try {
      const result = await globalSdk().client.vcs.diff({ mode: "git" })
      setStore("diffs", result.data ?? [])
    } catch (error) {
      console.debug("[git-panel] failed to load diffs", error)
      setStore("diffs", [])
    } finally {
      setStore("loading", false)
    }
  }

  createEffect(() => {
    if (layout.gitPanel.opened()) {
      loadDiffs()
    }
  })

  createEffect(() => {
    const messageID = store.generationMessageID
    if (!messageID) return

    const unsubscribe = globalSdk().event.listen((e: any) => {
      const event = e.details
      if (event?.type !== "message.part.updated") return

      const part = event.properties.part
      if (part.messageID !== messageID) return
      if (part.type !== "text") return

      setStore("commitMessage", part.text)
      setStore("generating", false)
      setStore("generationMessageID", undefined)
    })

    onCleanup(unsubscribe)
  })

  const fileCount = createMemo(() => store.diffs.length)
  const hasChanges = createMemo(() => fileCount() > 0)

  const additions = createMemo(() => {
    return store.diffs.reduce((sum, d) => sum + (d.additions ?? 0), 0)
  })

  const deletions = createMemo(() => {
    return store.diffs.reduce((sum, d) => sum + (d.deletions ?? 0), 0)
  })

  const closePanel = () => {
    layout.gitPanel.close()
  }

  const getModel = () => {
    const saved = settings.git.commitModel()
    if (saved) return saved
    const current = local.model.current()
    if (current) return { providerID: current.provider.id, modelID: current.id }
    return undefined
  }

  const generateCommitMessage = async () => {
    if (store.generating || !hasChanges()) return

    const model = getModel()
    if (!model) return

    setStore("generating", true)

    try {
      const diffSummary = store.diffs
        .map((d) => {
          const status = d.status === "added" ? "A" : d.status === "deleted" ? "D" : "M"
          return `${status} ${d.file}`
        })
        .join("\n")

      const prompt = `Generate a concise git commit message for the following changes. Follow conventional commit format (type: description). Only output the commit message, nothing else.

Changes:
${diffSummary}

Stats: +${additions()} -${deletions()} in ${fileCount()} files`

      const sessions = sync().data.session
      const sessionID = sessions.length > 0 ? sessions[0].id : undefined
      if (!sessionID) {
        console.debug("[git-panel] no session available for generation")
        setStore("generating", false)
        return
      }

      const messageID = `msg-${Date.now()}`
      setStore("generationMessageID", messageID)

      await globalSdk().client.session.promptAsync({
        sessionID,
        messageID,
        model,
        parts: [{ type: "text", text: prompt }],
      })

      setStore("generating", false)
    } catch (error) {
      console.debug("[git-panel] failed to generate commit message", error)
      setStore("generating", false)
      setStore("generationMessageID", undefined)
    }
  }

  const commit = async () => {
    if (store.committing || !store.commitMessage.trim() || !hasChanges()) return

    setStore("committing", true)

    try {
      const message = store.commitMessage.replace(/"/g, '\\"')
      const command = `git add . && git commit -m "${message}"`

      const sessions = sync().data.session
      const sessionID = sessions.length > 0 ? sessions[0].id : undefined
      if (!sessionID) {
        setStore("committing", false)
        return
      }

      await globalSdk().client.session.shell({
        sessionID,
        command,
      })

      setStore("commitMessage", "")
      await loadDiffs()
    } catch (error) {
      console.debug("[git-panel] failed to commit", error)
    } finally {
      setStore("committing", false)
    }
  }

  return (
    <aside
      data-component="git-panel"
      id="git-panel"
      class="relative h-full flex shrink-0 overflow-hidden bg-surface-panel border-l border-border-weaker-base"
      style={{ width: `${layout.gitPanel.width()}px` }}
    >
      <div class="flex flex-col h-full min-w-0 flex-1">
        <div class="flex items-center justify-between px-3 h-10 shrink-0 border-b border-border-weaker-base">
          <Show when={store.loading}>
            <div class="flex items-center gap-2 text-12-regular text-text-weak">
              <Spinner class="size-3.5" />
              <span>{language.t("common.loading")}</span>
            </div>
          </Show>
          <Show when={!store.loading}>
            <div class="text-12-regular text-text-strong">
              {hasChanges()
                ? language.t("git.panel.changes", { count: fileCount() })
                : language.t("git.panel.noChanges")}
            </div>
          </Show>
          <div class="flex items-center gap-1">
            <Tooltip value={language.t("common.close")}>
              <IconButton
                icon="close-small"
                variant="ghost"
                size="small"
                onClick={closePanel}
                aria-label={language.t("common.close")}
              />
            </Tooltip>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <Show when={!store.loading && hasChanges()}>
            <div class="py-1">
              <For each={store.diffs}>
                {(diff) => {
                  const kind = diff.status === "added" ? "add" : diff.status === "deleted" ? "del" : "mix"
                  const filename = getFilename(diff.file)
                  return (
                    <div class="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-raised-base cursor-default">
                      <div class="text-11-bold w-4 text-center shrink-0" style={{ color: kindColor(kind) }}>
                        {kindLabel(kind)}
                      </div>
                      <div class="flex-1 min-w-0 text-12-regular text-text-base truncate">{filename}</div>
                      <Show when={(diff.additions ?? 0) > 0 || (diff.deletions ?? 0) > 0}>
                        <div class="flex items-center gap-0.5 text-11-regular shrink-0">
                          <Show when={(diff.additions ?? 0) > 0}>
                            <span style={{ color: "var(--icon-diff-add-base)" }}>+{diff.additions}</span>
                          </Show>
                          <Show when={(diff.deletions ?? 0) > 0}>
                            <span style={{ color: "var(--icon-diff-delete-base)" }}>-{diff.deletions}</span>
                          </Show>
                        </div>
                      </Show>
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>
          <Show when={!store.loading && !hasChanges()}>
            <div class="flex items-center justify-center h-full text-12-regular text-text-weak">
              {language.t("git.panel.noChanges")}
            </div>
          </Show>
        </div>

        <Show when={hasChanges()}>
          <div class="shrink-0 border-t border-border-weaker-base p-3">
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <textarea
                  class="flex-1 min-h-[60px] max-h-[120px] px-2 py-1.5 text-12-regular bg-surface-base border border-border-weaker-base rounded resize-none focus:outline-none focus:border-border-base"
                  placeholder={language.t("git.panel.commitPlaceholder")}
                  value={store.commitMessage}
                  onInput={(e) => setStore("commitMessage", e.currentTarget.value)}
                />
                <Tooltip value={language.t("git.panel.generate")}>
                  <IconButton
                    icon="edit"
                    variant="ghost"
                    size="small"
                    onClick={generateCommitMessage}
                    disabled={store.generating}
                    aria-label={language.t("git.panel.generate")}
                    class="self-start"
                  />
                </Tooltip>
              </div>

              <div class="flex items-center gap-2">
                <select
                  class="flex-1 px-2 py-1 text-12-regular bg-surface-base border border-border-weaker-base rounded focus:outline-none focus:border-border-base"
                  value={store.commitMode}
                  onChange={(e) => setStore("commitMode", e.currentTarget.value as CommitMode)}
                >
                  <option value="tracked">{language.t("git.panel.commitTracked")}</option>
                  <option value="all">{language.t("git.panel.commitAll")}</option>
                </select>

                <Button
                  variant="primary"
                  size="small"
                  onClick={commit}
                  disabled={store.committing || !store.commitMessage.trim()}
                  class="flex-1"
                >
                  {store.committing ? language.t("common.saving") : language.t("git.panel.commit")}
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <div class="shrink-0 border-t border-border-weaker-base">
          <div class="flex items-center justify-between px-3 h-8">
            <div class="flex items-center gap-2 text-11-regular text-text-weak">
              <Show when={branch()}>
                <div class="flex items-center gap-1">
                  <Icon name="branch" size="small" />
                  <span>{branch()}</span>
                </div>
              </Show>
            </div>
            <Show when={hasChanges()}>
              <div class="text-11-regular text-text-weak">
                {language.t("git.panel.changesSummary", {
                  files: fileCount(),
                  additions: additions(),
                  deletions: deletions(),
                })}
              </div>
            </Show>
          </div>
        </div>
      </div>

      <div onPointerDown={() => {}}>
        <ResizeHandle
          direction="horizontal"
          edge="start"
          size={layout.gitPanel.width()}
          min={280}
          max={480}
          onResize={(width) => {
            layout.gitPanel.resize(width)
          }}
        />
      </div>
    </aside>
  )
}
