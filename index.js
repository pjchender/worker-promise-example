const { Worker, isMainThread, workerData } = require('worker_threads');
const job = require('./job');

main();

function getSeconds() {
  return new Date().getSeconds();
}

function main() {
  console.log('[Main Thread] ------ start ------', getSeconds());

  console.log(
    '[Main Thread - sync] ------ start computation ------',
    getSeconds()
  );
  const i = job(10000001);
  console.log(
    `[Main Thread - sync] ------ after computation ------ (${i})`,
    getSeconds()
  );

  console.log('[Main Thread - sync] ------ start worker ------', getSeconds());
  worker();
  console.log('[Main Thread - sync] ------ end worker ------', getSeconds());

  asyncFunc(10000002).then((data) =>
    console.log(`[Main Thread - asyncFunc.then 1] (${data})`, getSeconds())
  );

  console.log('[Main Thread - sync] ------ middle ------', getSeconds());

  asyncFunc(10000003).then((data) =>
    console.log(`[Main Thread - asyncFunc.then 2] (${data})`, getSeconds())
  );

  setTimeout(
    () =>
      console.log(
        '[macrotask] ---------------- Main Thread End ----------------'
      ),
    0
  );

  console.log('[Main Thread] ------ end ------', getSeconds());
}

function worker() {
  const worker = new Worker('./worker.js', { workerData: 'Hello, world!' });
  worker.on('message', (data) =>
    console.log(`[Main Thread] onMessage(${data})`, getSeconds())
  );
  worker.on('error', (err) => console.log('onError', err));
  worker.on('exit', (code) => {
    if (code !== 0)
      console.log(new Error(`Worker stopped with exit code ${code}`));
  });
}

async function asyncFunc(loop) {
  const i = await new Promise((resolve) => {
    console.log(`[Main Thread - asyncFunc in Promise] (${loop})`, getSeconds());
    resolve(loop);
  });

  console.log(`[Main Thread - asyncFunc after await] (${loop})`, getSeconds());
  const data = job(i);

  return data;
}
