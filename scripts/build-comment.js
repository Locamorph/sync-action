#!/usr/bin/env node
/**
 * Build the PR preview comment from `locamorph upload --dryrun --json`.
 *
 * Usage: build-comment.js <stdout-log> <output-file>
 *
 * Writes the markdown comment body to <output-file> and prints a short
 * human-readable summary to stdout for the workflow log.
 */

const fs = require('fs');

const MARKER = '<!-- locamorph-preview -->';
const MAX_KEYS_PER_LANGUAGE = 50;
const AUTO_EXPAND_BELOW_KEYS = 6;

const [, , logPath, outPath] = process.argv;

/**
 * The CLI can emit non-JSON lines on stdout before the payload (for example
 * "Skipping empty file: ..."), so take everything from the first line that
 * starts a JSON object through the end of the output.
 */
function extractJson(raw) {
  const start = raw.indexOf('\n{');
  const candidate = raw.trimStart().startsWith('{')
    ? raw.trimStart()
    : start === -1
      ? null
      : raw.slice(start + 1);

  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

const ACTION_SYMBOL = { added: '+', updated: '~', removed: '-' };

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildBody(data) {
  const total = data.total || { added: 0, updated: 0, removed: 0 };
  const changed = total.added + total.updated + total.removed;
  const languages = (data.languages || [])
    .map((code) => data[code])
    .filter(Boolean);

  // State signal: errors take precedence, then changes, then all-clear.
  const errors = data.errors || [];
  const state = errors.length > 0 ? '⚠️' : changed > 0 ? '📝' : '✅';
  const title = data.dryrun ? 'Translation Preview' : 'Translations Uploaded';

  const lines = [MARKER, '', `### ${state} ${title}`, ''];

  if (changed === 0) {
    lines.push('No translation changes detected in this PR.', '');
    if (total.skipped) {
      lines.push(`${pluralize(total.skipped, 'key')} skipped.`, '');
    }
    lines.push(footer(data));
    return lines.join('\n');
  }

  // Headline: the at-a-glance answer.
  const parts = [];
  if (total.added) parts.push(`**${total.added} added**`);
  if (total.updated) parts.push(`**${total.updated} updated**`);
  if (total.removed) parts.push(`**${total.removed} removed**`);
  const withChanges = languages.filter(
    (l) => l.added + l.updated + l.removed > 0
  );
  lines.push(
    `${parts.join(' · ')} across ${pluralize(withChanges.length, 'language')}` +
      (data.project ? ` in \`${data.project}\`` : ''),
    ''
  );

  // Per-language table. Only languages that actually changed, so a project
  // with 20 languages does not render 20 rows of zeros.
  lines.push('| Language | Added | Updated | Removed |');
  lines.push('|:---|---:|---:|---:|');
  for (const lang of withChanges) {
    lines.push(
      `| ${lang.name} (\`${lang.code}\`) | ${lang.added} | ${lang.updated} | ${lang.removed} |`
    );
  }
  if (withChanges.length > 1) {
    lines.push(
      `| **Total** | **${total.added}** | **${total.updated}** | **${total.removed}** |`
    );
  }
  lines.push('');

  // Key-level detail, collapsed so large changesets stay readable.
  const detail = [];
  let listedKeys = 0;
  for (const lang of withChanges) {
    const changes = lang.changes || [];
    if (changes.length === 0) continue;
    listedKeys += changes.length;
    detail.push(`**${lang.name} (\`${lang.code}\`)**`, '', '```diff');
    for (const change of changes.slice(0, MAX_KEYS_PER_LANGUAGE)) {
      detail.push(`${ACTION_SYMBOL[change.action] || ' '} ${change.key}`);
    }
    if (changes.length > MAX_KEYS_PER_LANGUAGE) {
      detail.push(
        `  ... and ${changes.length - MAX_KEYS_PER_LANGUAGE} more`
      );
    }
    detail.push('```', '');
  }

  if (detail.length > 0) {
    // Small changesets are readable inline, so expand them by default.
    lines.push(
      listedKeys < AUTO_EXPAND_BELOW_KEYS ? '<details open>' : '<details>',
      `<summary>Show ${pluralize(listedKeys, 'changed key')}</summary>`,
      '',
      ...detail,
      '</details>',
      ''
    );
  }

  if (total.skipped) {
    lines.push(`${pluralize(total.skipped, 'key')} skipped.`, '');
  }

  if (errors.length > 0) {
    lines.push(`> **${pluralize(errors.length, 'error')} during analysis**`, '>');
    for (const error of errors.slice(0, 10)) {
      lines.push(`> - ${error}`);
    }
    if (errors.length > 10) {
      lines.push(`> - ... and ${errors.length - 10} more`);
    }
    lines.push('');
  }

  lines.push(footer(data));
  return lines.join('\n');
}

function footer(data) {
  const note = data.dryrun
    ? 'Preview only. Nothing was uploaded.'
    : 'Changes were uploaded.';

  // Record which commit this (sticky, edited-in-place) comment reflects.
  const stamp = [];
  const sha = process.env.LOCAMORPH_COMMIT_SHA;
  if (sha) {
    const short = sha.slice(0, 7);
    const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const repo = process.env.GITHUB_REPOSITORY;
    stamp.push(
      repo ? `<a href="${server}/${repo}/commit/${sha}">${short}</a>` : short
    );
  }
  stamp.push(new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC');

  return (
    `<sub>${note} Generated by ` +
    `<a href="https://github.com/Locamorph/sync-action">Locamorph Sync Action</a> ` +
    `for ${stamp.join(' · ')}.</sub>`
  );
}

// --- main -------------------------------------------------------------------

const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
const data = extractJson(raw);

if (!data) {
  console.error(
    'Could not parse JSON output from the Locamorph CLI. Raw output:\n' + raw
  );
  process.exit(1);
}

const total = data.total || { added: 0, updated: 0, removed: 0 };
const changed = total.added + total.updated + total.removed;
const body = buildBody(data);

fs.writeFileSync(outPath, body);

// Summary for the workflow log, since --json replaces the CLI's own table.
console.log(
  `Preview: ${total.added} added, ${total.updated} updated, ${total.removed} removed` +
    (total.skipped ? `, ${total.skipped} skipped` : '') +
    (total.errors ? `, ${total.errors} errors` : '')
);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `has_preview_changes=${changed > 0 ? 'true' : 'false'}\n`
  );
}

// Also publish to the run's summary page, so actions with no PR to comment on
// still get a readable report. The marker is only meaningful in comments.
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    body.replace(MARKER + '\n', '') + '\n'
  );
}
