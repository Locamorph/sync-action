# Locamorph Sync GitHub Action

Sync translations with [Locamorph](https://locamorph.com) in your CI/CD workflows.

## Features

- **Pull** - Download translations from Locamorph
- **Push** - Upload translations to Locamorph
- **Pull Request** - Download translations and create a PR
- **Preview** - Dry-run push and comment results on PR

## Quick Start

```yaml
- name: Sync translations
  uses: Locamorph/sync-action@v1
  with:
    action: pull
    api_key: ${{ secrets.LOCAMORPH_API_KEY }}
```

## Configuration

This action reads all settings from `locamorph.yaml` in your repository root. **No configuration is passed via action inputs** - only the API key and action type.

### Quick Setup

Initialize your project configuration using the CLI:

```bash
npx @locamorph/cli init --api-key YOUR_API_KEY
```

This will interactively create a `locamorph.yaml` file in your project root.

### Configuration File: `locamorph.yaml`

```yaml
# Required: Your Locamorph project UUID
project_id: "c1627915-1d88-4dbc-97a0-8c23a3c84763"

# File settings
translations_dir: "./locales"       # Base directory for translation files
format: json                        # File format: json, yaml
file_structure: "{LANG_ISO}.{FORMAT}"   # File naming pattern (see patterns below)

# Optional: Limit to specific languages (omit for all project languages)
languages:
  - en
  - de
  - fr

# File patterns (glob syntax, relative to translations_dir)
include:
  - "**/*.json"
exclude:
  - "**/backup/**"
  - "**/node_modules/**"

# Key filtering patterns (config-only, cannot be overridden via CLI)
includeKeys:
  - "common.*"
  - "app.*"
excludeKeys:
  - "internal.*"
  - "test.*"

# Upload behavior
upload:
  on_conflict: skip           # skip = add new only, overwrite = update existing
  delete_removed: false       # Delete keys not present in local files
  delete_removed_files: false # Delete files not present locally
  auto_verify: false          # Auto-verify uploaded translations

# Download behavior
download:
  empty_translations: skip    # skip = exclude untranslated, include = keep empty
  cleanup: false              # Delete existing files before download
```

### File Structure Patterns

| Pattern | Example Output |
|---------|----------------|
| `{LANG_ISO}.{FORMAT}` | `en.json`, `de.yaml` (based on format) |
| `{LANG_ISO}/{FILE}` | `en/common.json`, `de/common.json` |

### Minimal Configuration

For simple projects, you only need:

```yaml
project_id: "your-project-uuid"
```

Default values will be used for everything else:
- `translations_dir`: `./locales`
- `format`: `json`
- `file_structure`: `{LANG_ISO}.{FORMAT}`

See [@locamorph/cli documentation](https://www.npmjs.com/package/@locamorph/cli) for full configuration options.

## Actions

### Pull Translations

Download translations from Locamorph to your repository.

```yaml
- name: Pull translations
  uses: Locamorph/sync-action@v1
  with:
    action: pull
    api_key: ${{ secrets.LOCAMORPH_API_KEY }}
```

### Push Translations

Upload translations from your repository to Locamorph.

```yaml
- name: Push translations
  uses: Locamorph/sync-action@v1
  with:
    action: push
    api_key: ${{ secrets.LOCAMORPH_API_KEY }}
```

### Pull Request

Download translations and automatically create a pull request.

> **Required Permissions**
>
> Add these permissions to your workflow for the `GITHUB_TOKEN` to push branches and create PRs:
> ```yaml
> permissions:
>   contents: write
>   pull-requests: write
> ```
>
> You may also need to enable write permissions in your settings:
>
> **Repository level:** Settings → Actions → General → Workflow permissions → Select "Read and write permissions"
>
> **Organization level:** Organization Settings → Actions → General → Workflow permissions → Select "Read and write permissions"
>
> If you can't enable these settings (restricted by org policy), use a **Personal Access Token (PAT)** instead:
> 1. Create a PAT with `repo` scope: **GitHub** → **Settings** → **Developer settings** → **Personal access tokens**
> 2. Add it as a repository secret (e.g., `PAT_TOKEN`)
> 3. Use `github_token: ${{ secrets.PAT_TOKEN }}` in your workflow

```yaml
name: Sync Translations
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Sync translations
        uses: Locamorph/sync-action@v1
        with:
          action: pull-request
          api_key: ${{ secrets.LOCAMORPH_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: customize PR (all fields below have defaults or are optional)
          pr_title: "chore: update translations"       # default: "chore: update translations"
          pr_branch: "locamorph/translations-update"     # default: "locamorph/translations-update"
          pr_base: "main"                              # default: repo default branch
          pr_labels: "translations,automated,i18n"     # optional
          pr_reviewers: "reviewer1,reviewer2"          # optional
          pr_assignees: "assignee1"                    # optional
```

### Preview

Run a dry-run push and comment the results on the PR. This shows what translations would be uploaded if the PR is merged.

```yaml
name: Translation Preview
on:
  pull_request:
    paths:
      - 'locales/**'
      - 'src/**/i18n/**'

permissions:
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Preview translation changes
        uses: Locamorph/sync-action@v1
        with:
          action: preview
          api_key: ${{ secrets.LOCAMORPH_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

> `pull-requests: write` is required to read and update the preview comment.

This will add a comment to the PR like:

> ### 📝 Translation Preview
>
> **2 added** · **1 updated** across 1 language in `Website`
>
> | Language | Added | Updated | Removed |
> |:---|---:|---:|---:|
> | Turkish (`tr`) | 2 | 1 | 0 |
>
> <details>
> <summary>Show 3 changed keys</summary>
>
> ```diff
> + Menu.Projects
> + Menu.Collaborators
> ~ Common.Save
> ```
>
> </details>
>
> <sub>Preview only. Nothing was uploaded. Generated by Locamorph Sync Action for `a1b2c3d` · 2026-07-20 20:13 UTC.</sub>

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `action` | Yes | - | Action to perform: `pull`, `push`, `pull-request`, or `preview` |
| `api_key` | Yes | - | Locamorph API key |
| `github_token` | For PR/preview | - | GitHub token for PR creation or commenting |
| `pr_title` | No | `chore: update translations` | PR title |
| `pr_branch` | No | `locamorph/translations-update` | PR branch name |
| `pr_base` | No | repo default | Base branch for PR (e.g., `main`, `develop`) |
| `pr_body` | No | - | PR body/description |
| `pr_labels` | No | - | Comma-separated labels (e.g., `translations,automated`) |
| `pr_reviewers` | No | - | Comma-separated reviewer usernames |
| `pr_assignees` | No | - | Comma-separated assignee usernames |
| `comment_on_no_changes` | No | `true` | Comment on the PR even when the preview finds no changes (`preview` only) |

## Required API key permissions

| Action | Required permissions |
|--------|----------------------|
| `pull` | `projects:read`, `languages:read`, `translations:read` |
| `pull-request` | `projects:read`, `languages:read`, `translations:read` |
| `push` | `projects:read`, `languages:read`, `translations:write` |
| `preview` | `projects:read`, `languages:read`, `translations:write` |

> **`preview` needs write permission.** It runs `locamorph upload --dryrun`,
> which still sends the request to the bulk translation update endpoint with a
> `dryrun` flag. The server computes the diff and discards it without persisting
> anything, but the request is authorized against the same `translations:write`
> permission as a real upload. A read-only key cannot run `preview`.

## Outputs

| Output | Description |
|--------|-------------|
| `has_changes` | Boolean - whether any translation files changed |
| `pr_url` | URL of created PR (only for `pull-request` action) |
| `pr_number` | PR number (only for `pull-request` action) |
| `preview_output` | Markdown body of the preview comment (only for `preview` action) |

## License

MIT
