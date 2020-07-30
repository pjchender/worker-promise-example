const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require('worker_threads');

const job = require('./job');

function getSeconds() {
  return new Date().getSeconds();
}

main();

function main() {
  console.log('[worker-thread] - start', getSeconds());

  asyncFn().then(() => {
    console.log('[worker-thread] - asyncFn().then', getSeconds());
  });

  console.log('[worker-thread] - end', getSeconds());
}

async function asyncFn() {
  console.log(`[worker-thread] - in async start`, getSeconds());

  const i = await promiseFn();

  console.log(`[worker-thread] after await (${i})`, getSeconds());
  parentPort.postMessage(i);
  return i;
}

function promiseFn() {
  return new Promise((resolve) => {
    console.log(`[worker-thread] - in promise`, getSeconds());
    const i = job(5000004);

    resolve(i);
  }).then((taskNumber) => {
    console.log(`[worker-thread] - in promise.then()`, getSeconds());
    return taskNumber;
  });
}
