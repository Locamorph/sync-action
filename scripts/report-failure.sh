#!/usr/bin/env bash
#
# Surface a failed locamorph CLI run as a GitHub error annotation and job
# summary, so the actual CLI error is visible without expanding the raw log.
#
# Usage: report-failure.sh <command> <exit-code> <log-file>

set -uo pipefail

COMMAND="$1"
EXIT_CODE="$2"
LOG="$3"

if [ ! -f "$LOG" ]; then
  echo "::error title=${COMMAND} failed::Exit code ${EXIT_CODE} (no output captured)"
  exit 0
fi

# Prefer the CLI's own error lines, fall back to the tail of the log.
ERRORS=$(grep -E '✖|✗|Error:|error:|ERROR' "$LOG" | head -10)
if [ -z "$ERRORS" ]; then
  ERRORS=$(tail -10 "$LOG")
fi

# A missing permission is by far the most common failure, so name the exact
# permission and point at the README table instead of a generic message.
HINT=""
if grep -qE "Permission '[^']+' is required" "$LOG"; then
  MISSING=$(grep -oE "Permission '[^']+' is required" "$LOG" \
    | grep -oE "'[^']+'" | tr -d "'" | sort -u | paste -sd ', ' -)
  HINT="Your API key is missing: ${MISSING}"
fi

# --- Annotation (shown at the top of the run, above the logs) ---------------

MESSAGE="$ERRORS"
if [ -n "$HINT" ]; then
  MESSAGE="${MESSAGE}

${HINT}
See the 'Required API key permissions' section of the Locamorph Sync Action README."
fi

# GitHub annotations are single-line: percent-encode the multiline message.
ESCAPED="${MESSAGE//'%'/%25}"
ESCAPED="${ESCAPED//$'\r'/%0D}"
ESCAPED="${ESCAPED//$'\n'/%0A}"

echo "::error title=${COMMAND} failed (exit ${EXIT_CODE})::${ESCAPED}"

# --- Job summary (readable, keeps formatting) -------------------------------

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## Locamorph sync failed"
    echo
    echo "\`${COMMAND}\` exited with code \`${EXIT_CODE}\`."
    echo
    echo '```'
    echo "$ERRORS"
    echo '```'
    if [ -n "$HINT" ]; then
      echo
      echo "### Missing API key permissions"
      echo
      echo "${HINT}"
      echo
      echo "| Action | Required permissions |"
      echo "|--------|----------------------|"
      echo "| \`pull\`, \`pull-request\` | \`projects:read\`, \`languages:read\`, \`translations:read\` |"
      echo "| \`push\`, \`preview\` | \`projects:read\`, \`languages:read\`, \`translations:write\` |"
      echo
      echo "> \`preview\` requires \`translations:write\` because \`--dryrun\` still"
      echo "> calls the bulk translation update endpoint. A read-only key cannot"
      echo "> run \`preview\`."
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi
