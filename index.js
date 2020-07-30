const { Worker, isMainThread, workerData } = require('worker_threads');

main();

function getSeconds() {
  return new Date().getSeconds();
}

function main() {
  console.log('[Main Thread] ------ start ------', getSeconds());

  console.log('[Main Thread - sync] ------ start worker ------', getSeconds());
  worker(5000000);
  worker(5000000);
  worker(5000000);
  console.log('[Main Thread - sync] ------ end worker ------', getSeconds());

  console.log('[Main Thread - sync] ------ middle ------', getSeconds());

  setTimeout(
    () =>
      console.log(
        '[macrotask] ---------------- Main Thread End ----------------'
      ),
    0
  );

  console.log('[Main Thread] ------ end ------', getSeconds());
}

function worker(loop) {
  const worker = new Worker('./worker.js', { workerData: loop });
  worker.on('message', (data) =>
    console.log(`[Main Thread] onMessage(${data})`, getSeconds())
  );
  worker.on('error', (err) => console.log('onError', err));
  worker.on('exit', (code) => {
    if (code !== 0)
      console.log(new Error(`Worker stopped with exit code ${code}`));
  });
}
