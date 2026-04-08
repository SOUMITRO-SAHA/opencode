---
description: "sync soumitra branch with latest dev"
subtask: true
---

Sync the soumitra branch with the latest dev branch from origin.

Process:

1. Check if soumitra branch exists
2. Fetch latest dev from origin
3. Update local dev to match origin/dev
4. Stash any uncommitted changes on soumitra
5. Rebase soumitra onto latest dev
6. Resolve any conflicts that arise
7. Restore stashed changes
8. Verify the sync was successful

## CHECK BRANCHES

!`git branch -a | grep -E "soumitra|dev"`

## FETCH LATEST DEV

!`git fetch origin dev`

## UPDATE LOCAL DEV

!`git checkout dev && git pull origin dev --ff-only`

## CHECK SOUMITRA STATUS

!`git log --oneline soumitra -3`

## STASH AND REBASE

!`git checkout soumitra && git stash push -u -m "Pre-sync changes" && git rebase dev`

## IF REBASE FAILED, FIX CONFLICTS:

Check conflicts:
!`git status`

If there are conflicts, resolve them and:

- `git add <resolved-files>`
- `git rebase --continue`

## IF REBASE SUCCEEDED, RESTORE STASH:

!`git stash pop`

## FINAL STATUS

!`git log --oneline -5`

!`git rev-list --left-right --count soumitra...dev`

!`git status --short`
