import fs from 'node:fs';
import path from 'node:path';

const [basicPath, advancedPath, outputPath] = process.argv.slice(2);

if (!basicPath || !advancedPath || !outputPath) {
  console.error('Usage: node tools/build-player-stats.mjs <per-game.csv> <advanced.csv> <output.js>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function readTable(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const headerStart = raw.search(/^Rk,Player,/m);
  if (headerStart < 0) throw new Error(`CSV header not found in ${filePath}`);
  const [headers, ...rows] = parseCsv(raw.slice(headerStart));
  return rows
    .filter(row => row.some(value => value !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter(row => row.Player && row['Player-additional'] && row['Player-additional'] !== '-9999');
}

function groupByPlayerId(rows) {
  const groups = new Map();
  rows.forEach(row => {
    const id = row['Player-additional'];
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  });
  return groups;
}

function selectSeasonRow(rows) {
  return rows.find(row => /^\dTM$/.test(row.Team)) || rows[0];
}

function numberOrNull(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimalPercent(value) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : `${(parsed * 100).toFixed(1)}%`;
}

function wholePercent(value) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : `${parsed.toFixed(1)}%`;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function relaxedName(value) {
  return normalizeName(value).replace(/\s+(jr|ii|iii)$/, '');
}

function compactObject(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

const basicRows = readTable(basicPath);
const advancedRows = readTable(advancedPath);
const basicGroups = groupByPlayerId(basicRows);
const advancedGroups = groupByPlayerId(advancedRows);
const records = {};

for (const [srId, rows] of basicGroups) {
  const basicRow = selectSeasonRow(rows);
  const advancedGroup = advancedGroups.get(srId);
  if (!advancedGroup) throw new Error(`Advanced row missing for ${basicRow.Player} (${srId})`);
  const advancedRow = selectSeasonRow(advancedGroup);
  const key = normalizeName(basicRow.Player);
  const sourceTeams = [...new Set(rows.map(row => row.Team).filter(team => !/^\dTM$/.test(team)))];

  records[key] = {
    srId,
    name: basicRow.Player,
    sourceTeam: basicRow.Team,
    sourceTeams,
    position: basicRow.Pos || advancedRow.Pos || null,
    basic: compactObject([
      ['G', numberOrNull(basicRow.G)], ['GS', numberOrNull(basicRow.GS)], ['MP', numberOrNull(basicRow.MP)],
      ['FG', numberOrNull(basicRow.FG)], ['FGA', numberOrNull(basicRow.FGA)], ['FG%', decimalPercent(basicRow['FG%'])],
      ['3P', numberOrNull(basicRow['3P'])], ['3PA', numberOrNull(basicRow['3PA'])], ['3P%', decimalPercent(basicRow['3P%'])],
      ['2P', numberOrNull(basicRow['2P'])], ['2PA', numberOrNull(basicRow['2PA'])], ['2P%', decimalPercent(basicRow['2P%'])],
      ['eFG%', decimalPercent(basicRow['eFG%'])], ['FT', numberOrNull(basicRow.FT)], ['FTA', numberOrNull(basicRow.FTA)],
      ['FT%', decimalPercent(basicRow['FT%'])], ['ORB', numberOrNull(basicRow.ORB)], ['DRB', numberOrNull(basicRow.DRB)],
      ['TRB', numberOrNull(basicRow.TRB)], ['AST', numberOrNull(basicRow.AST)], ['STL', numberOrNull(basicRow.STL)],
      ['BLK', numberOrNull(basicRow.BLK)], ['TOV', numberOrNull(basicRow.TOV)], ['PF', numberOrNull(basicRow.PF)],
      ['PTS', numberOrNull(basicRow.PTS)]
    ]),
    advanced: compactObject([
      ['PER', numberOrNull(advancedRow.PER)], ['TS%', decimalPercent(advancedRow['TS%'])],
      ['3PAr', numberOrNull(advancedRow['3PAr'])], ['FTr', numberOrNull(advancedRow.FTr)],
      ['ORB%', wholePercent(advancedRow['ORB%'])], ['DRB%', wholePercent(advancedRow['DRB%'])],
      ['TRB%', wholePercent(advancedRow['TRB%'])], ['AST%', wholePercent(advancedRow['AST%'])],
      ['STL%', wholePercent(advancedRow['STL%'])], ['BLK%', wholePercent(advancedRow['BLK%'])],
      ['TOV%', wholePercent(advancedRow['TOV%'])], ['USG%', wholePercent(advancedRow['USG%'])],
      ['OWS', numberOrNull(advancedRow.OWS)], ['DWS', numberOrNull(advancedRow.DWS)], ['WS', numberOrNull(advancedRow.WS)],
      ['WS/48', numberOrNull(advancedRow['WS/48'])], ['OBPM', numberOrNull(advancedRow.OBPM)],
      ['DBPM', numberOrNull(advancedRow.DBPM)], ['BPM', numberOrNull(advancedRow.BPM)], ['VORP', numberOrNull(advancedRow.VORP)]
    ]),
    awards: basicRow.Awards || advancedRow.Awards || ''
  };
}

const relaxedGroups = new Map();
Object.keys(records).forEach(key => {
  const relaxed = relaxedName(key);
  if (!relaxedGroups.has(relaxed)) relaxedGroups.set(relaxed, []);
  relaxedGroups.get(relaxed).push(key);
});
const aliases = Object.fromEntries(
  [...relaxedGroups.entries()]
    .filter(([, keys]) => keys.length === 1 && keys[0] !== relaxedName(keys[0]))
    .map(([relaxed, keys]) => [relaxed, keys[0]])
);

const sortedRecords = Object.fromEntries(Object.entries(records).sort(([a], [b]) => a.localeCompare(b)));
const sortedAliases = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)));
const output = `/* Generated from Sports Reference 2025-26 NBA per-game and advanced tables.\n` +
  ` * Source: https://www.basketball-reference.com/\n` +
  ` * Rebuild with tools/build-player-stats.mjs; do not hand-edit this file.\n */\n` +
  `(function (global) {\n  'use strict';\n  global.PLAYER_STATS_2025_26 = Object.freeze({\n` +
  `    season: '2025-26',\n` +
  `    source: Object.freeze({ name: 'Sports Reference', url: 'https://www.basketball-reference.com/' }),\n` +
  `    records: Object.freeze(${JSON.stringify(sortedRecords, null, 2).replace(/^/gm, '    ')}),\n` +
  `    aliases: Object.freeze(${JSON.stringify(sortedAliases, null, 2).replace(/^/gm, '    ')})\n` +
  `  });\n})(typeof window !== 'undefined' ? window : globalThis);\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Wrote ${Object.keys(records).length} player records to ${outputPath}`);
