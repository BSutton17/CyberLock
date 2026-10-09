// Balance report: simulates thousands of fights with bot parties and writes the results.
//
//   node scripts/balance.js [sizes|abilities|all] [--samples N] [--ability-samples N]
//                           [--out ../docs/BALANCE.md] [--json results.json] [--greedy]
//   node scripts/balance.js calibrate [--samples N] [--rounds N] [--fights 2,5] [--sizes 1,2] [--write]
//
// "sizes" measures how often parties of 1-6 win each story fight; "abilities" compares every
// ability with the others of the same role and level. "calibrate" tunes ENEMY_POWER in
// shared/combat/encounters.js so every party size has the same odds (--write saves it there).
// See docs/BALANCE.md for how to read the results.
import fs from 'node:fs';
import path from 'node:path';
import { runTasks } from '../balance/pool.js';
import {
    partySizeTasks, summarizePartySizes, abilityTasks, summarizeAbilities,
    calibrationCells, calibrationTasks, updateCalibration, calibratedTable
} from '../balance/experiments.js';
import { renderReport } from '../balance/report.js';
import { ENEMY_POWER } from '../../shared/combat/encounters.js';

const args = process.argv.slice(2);
const mode = args.find(arg => !arg.startsWith('--') && !/^\d+$/.test(arg)) || 'all';
const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : fallback;
};
const samples = Number(option('samples', 60));
const abilitySamples = Number(option('ability-samples', 150));
const out = option('out', null);
const jsonOut = option('json', null);
const policy = args.includes('--greedy') ? 'greedy' : 'lookahead';

const progress = (label) => {
    let last = 0;
    return (done, total) => {
        const pct = Math.floor((done / total) * 100);
        if (pct >= last + 10 || done === total) {
            last = pct;
            process.stdout.write(`${label}: ${pct}% (${done}/${total})\n`);
        }
    };
};

const started = Date.now();
const data = { policy, samples, abilitySamples, createdAt: new Date().toISOString() };

if (mode === 'calibrate') {
    // --fights 2,5 --sizes 1,2 re-tunes only those cells; the rest of the table is kept.
    const listOption = (name) => option(name, null)?.split(',').map(Number).filter(Number.isFinite);
    const onlyFights = listOption('fights');
    const cells = calibrationCells({ sizes: listOption('sizes') || undefined })
        .filter(cell => !onlyFights || onlyFights.includes(cell.encounterIndex + 1));
    const rounds = Number(option('rounds', 6));
    for (let round = 1; round <= rounds; round++) {
        const tasks = calibrationTasks(cells, { samples, policy });
        const results = await runTasks(tasks, { onProgress: progress(`calibration round ${round}/${rounds}`) });
        updateCalibration(cells, tasks, results);
    }
    const table = calibratedTable(cells, onlyFights || listOption('sizes') ? ENEMY_POWER : null);
    const block = [
        'export const ENEMY_POWER = [',
        ...table.map((row, index) => `    [${row.join(', ')}]${index < table.length - 1 ? ',' : ''} // fight ${index + 1}`),
        '];'
    ].join('\n');
    console.log(block);
    if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify({ table, cells }, null, 2));
    if (args.includes('--write')) {
        const file = new URL('../../shared/combat/encounters.js', import.meta.url);
        const source = fs.readFileSync(file, 'utf8');
        const start = source.indexOf('export const ENEMY_POWER = [');
        const end = source.indexOf('\n];', start) + '\n];'.length;
        if (start < 0 || end < start) throw new Error('ENEMY_POWER not found in encounters.js');
        const updated = source.slice(0, start) + block + source.slice(end);
        fs.writeFileSync(file, updated);
        console.log('wrote ENEMY_POWER to shared/combat/encounters.js');
    }
    console.log(`done in ${Math.round((Date.now() - started) / 1000)}s`);
    process.exit(0);
}

if (mode === 'sizes' || mode === 'all') {
    const tasks = partySizeTasks({ samples, policy });
    const results = await runTasks(tasks, { onProgress: progress('party sizes') });
    data.partySizes = summarizePartySizes(tasks, results);
}

if (mode === 'abilities' || mode === 'all') {
    const tasks = abilityTasks({ samples: abilitySamples, policy });
    const results = await runTasks(tasks, { onProgress: progress('abilities') });
    data.abilities = summarizeAbilities(tasks, results);
}

data.seconds = Math.round((Date.now() - started) / 1000);
const report = renderReport(data);
if (out) {
    fs.writeFileSync(path.resolve(out), report);
    console.log(`wrote ${out}`);
} else {
    console.log(report);
}
if (jsonOut) fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(data, null, 2));
console.log(`done in ${data.seconds}s`);
