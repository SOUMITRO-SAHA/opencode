---
description: "merge dev into soumitra branch with conflict resolution"
subtask: true
---

Merge the latest dev branch into soumitra (managed branch with advanced features).

**CRITICAL**: soumitra contains exclusive features NOT in dev. Preserve ALL soumitra changes. Conflicts are GUARANTEED - resolve carefully.

## PREREQUISITES

1. Verify working directory is clean
2. Ensure soumitra branch exists locally
3. Fetch latest from origin

## PROCESS

### 1. CHECK CURRENT STATE

!`git status`

!`git branch -a | grep -E "soumitra|dev"`

### 2. FETCH LATEST

!`git fetch origin`

### 3. UPDATE LOCAL DEV

!`git checkout dev && git pull origin dev --ff-only`

### 4. SWITCH TO SOUMITRA

!`git checkout soumitra`

!`git log --oneline -5`

### 5. STASH ANY UNCOMMITTED CHANGES

!`git stash push -u -m "Pre-merge stash $(date +%Y%m%d%H%M%S)"`

### 6. PERFORM MERGE

!`git merge dev --no-ff`

## CONFLICT RESOLUTION

If conflicts occur (expected), resolve ONE BY ONE:

### Step A: Identify Conflicts

!`git status --porcelain | grep "^UU\|^AA\|^DD"`

### Step B: For EACH Conflict

1. **READ THE FILE** to understand both versions
2. **ANALYZE THE CONFLICT**:
   - dev version: incoming changes from upstream
   - soumitra version: our exclusive features/changes
3. **RESOLUTION PRINCIPLES**:
   - **Preserve soumitra features**: If code is soumitra-exclusive, keep it
   - **Accept dev improvements**: If dev has bug fixes/refactors without affecting soumitra features, accept
   - **Integrate both**: If both have meaningful changes, merge intelligently
   - **Project consistency**: Follow existing code patterns in this repo

### Step C: Resolve Each File

!`git diff --name-only --diff-filter=U`

For each conflicted file:
1. Open and review the conflict markers
2. Edit to resolve (remove markers, keep correct code)
3. Stage: `git add <file>`

### Step D: Continue After All Conflicts Resolved

!`git merge --continue`

## IF MERGE NEEDS ABORT

!`git merge --abort`

## POST-MERGE VERIFICATION

### 1. Restore Stash

!`git stash pop`

### 2. Verify Build

!`bun install && bun run build`

### 3. Verify Tests (if applicable)

Run tests to ensure nothing is broken.

### 4. Check Status

!`git status`

!`git log --oneline --graph -10`

!`git rev-list --left-right --count soumitra...dev`

## CONFLICT RESOLUTION GUIDE

### For TypeScript Files

- Preserve type definitions from soumitra
- Keep soumitra's exported functions
- Integrate dev's internal improvements if beneficial

### For Config Files

- Prefer soumitra settings (they're project-specific)
- Accept dev additions if they don't conflict

### For Package Files (package.json)

- Keep soumitra's dependencies
- Add new deps from dev if needed
- Preserve soumitra's scripts

### For Documentation

- Keep soumitra's project-specific docs
- Integrate dev's general improvements

## FINAL CHECKLIST

- [ ] All conflicts resolved
- [ ] Build succeeds
- [ ] Tests pass
- [ ] soumitra exclusive features intact
- [ ] No unintended deletions
