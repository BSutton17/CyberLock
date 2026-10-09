// Worker thread: plays the fights it is sent and posts the results back.
import { parentPort } from 'node:worker_threads';
import { runFight } from './simulate.js';

parentPort.on('message', ({ id, task }) => {
    try {
        const result = runFight(task);
        parentPort.postMessage({ id, result: { outcome: result.outcome, score: result.score, hpLeft: result.hpLeft, enemyDamage: result.enemyDamage, rounds: result.rounds, usage: result.usage } });
    } catch (error) {
        parentPort.postMessage({ id, error: error.stack || String(error) });
    }
});
