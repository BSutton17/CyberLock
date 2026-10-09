// Runs fight tasks across worker threads (one per spare CPU core).
import { Worker } from 'node:worker_threads';
import os from 'node:os';

export async function runTasks(tasks, { workers = Math.max(1, os.cpus().length - 2), onProgress = () => {} } = {}) {
    const results = new Array(tasks.length);
    let next = 0;
    let done = 0;
    const pool = Array.from({ length: Math.min(workers, tasks.length) }, () => new Worker(new URL('./worker.js', import.meta.url)));

    await Promise.all(pool.map(worker => new Promise((resolve, reject) => {
        const feed = () => {
            if (next >= tasks.length) {
                resolve();
                return;
            }
            const id = next++;
            worker.postMessage({ id, task: tasks[id] });
        };
        worker.on('message', ({ id, result, error }) => {
            if (error) {
                reject(new Error(`task ${id} failed: ${error}`));
                return;
            }
            results[id] = result;
            done += 1;
            onProgress(done, tasks.length);
            feed();
        });
        worker.on('error', reject);
        feed();
    })));

    await Promise.all(pool.map(worker => worker.terminate()));
    return results;
}
