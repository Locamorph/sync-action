# Teaaams Sync GitHub Action

Sync translations with [Teaaams](https://teaaams.com) in your CI/CD workflows.

## Features

- **Pull** - Download translations from Teaaams
- **Push** - Upload translations to Teaaams
- **Pull Request** - Download translations and create a PR
- **Preview** - Dry-run push and comment results on PR

## Quick Start

```yaml
- name: Sync translations
  uses: teaaams/sync-action@v1
  with:
    action: pull
    api_key: ${{ secrets.TEAAAMS_API_KEY }}
```

## Configuration

This action reads all settings from `teaaams.yaml` in your repository root. **No configuration is passed via action inputs** - only the API key and action type.

### Quick Setup

Initialize your project configuration using the CLI:

```bash
npx @teaaams/cli init --api-key YOUR_API_KEY
```

This will interactively create a `teaaams.yaml` file in your project root.

### Configuration File: `teaaams.yaml`

```yaml
# Required: Your Teaaams project UUID
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

See [@teaaams/cli documentation](https://www.npmjs.com/package/@teaaams/cli) for full configuration options.

## Actions

### Pull Translations

Download translations from Teaaams to your repository.

```yaml
- name: Pull translations
  uses: teaaams/sync-action@v1
  with:
    action: pull
    api_key: ${{ secrets.TEAAAMS_API_KEY }}
```

### Push Translations

Upload translations from your repository to Teaaams.

```yaml
- name: Push translations
  uses: teaaams/sync-action@v1
  with:
    action: push
    api_key: ${{ secrets.TEAAAMS_API_KEY }}
```

### Pull Request

Download translations and automatically create a pull request.

```yaml
name: Sync Translations
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Sync translations
        uses: teaaams/sync-action@v1
        with:
          action: pull-request
          api_key: ${{ secrets.TEAAAMS_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: customize PR (all fields below have defaults or are optional)
          pr_title: "chore: update translations"       # default: "chore: update translations"
          pr_branch: "teaaams/translations-update"     # default: "teaaams/translations-update"
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

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Preview translation changes
        uses: teaaams/sync-action@v1
        with:
          action: preview
          api_key: ${{ secrets.TEAAAMS_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

This will add a comment to the PR like:

```
## Translation Preview

This is a preview of what translations would be uploaded if this PR is merged.

┌─────────────┬───────┬─────────┬─────────┐
│             │ Added │ Updated │ Removed │
├─────────────┼───────┼─────────┼─────────┤
│ English(en) │     0 │       0 │       0 │
│ Turkish(tr) │     2 │       0 │       0 │
├─────────────┼───────┼─────────┼─────────┤
│ Total       │     2 │       0 │       0 │
└─────────────┴───────┴─────────┴─────────┘

Translations added:
  + [tr] Menu.Projects
  + [tr] Menu.Collaborators
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `action` | Yes | - | Action to perform: `pull`, `push`, `pull-request`, or `preview` |
| `api_key` | Yes | - | Teaaams API key |
| `github_token` | For PR/preview | - | GitHub token for PR creation or commenting |
| `pr_title` | No | `chore: update translations` | PR title |
| `pr_branch` | No | `teaaams/translations-update` | PR branch name |
| `pr_body` | No | - | PR body/description |
| `pr_labels` | No | - | Comma-separated labels (e.g., `translations,automated`) |
| `pr_reviewers` | No | - | Comma-separated reviewer usernames |
| `pr_assignees` | No | - | Comma-separated assignee usernames |

## Outputs

| Output | Description |
|--------|-------------|
| `has_changes` | Boolean - whether any translation files changed |
| `pr_url` | URL of created PR (only for `pull-request` action) |
| `pr_number` | PR number (only for `pull-request` action) |
| `preview_output` | Dry-run output (only for `preview` action) |

## License

MIT
