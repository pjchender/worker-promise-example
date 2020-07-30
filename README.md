# [Note] Event loop, micro-task, macro-task, async JavaScript 筆記

## 重要概念

- 每一個 **thread** 都有自己的 [**event loop**](https://pjchender.blogspot.com/2017/08/javascript-learn-event-loop-stack-queue.html)，就像是每個 web worker 有自己的 thread 一樣，因此它們可以獨立運行。在 Event Queue 中所有的 Tasks 又可以分成 macrotask 或 microtask。
- **macrotask** 或簡稱 **task** 與瀏覽器或電腦底層的運作較有關係，例如 `setTimeout`, `setInterval`, I/O 等等，系統執行完後，會把寫在裡面的 callback 丟回來 main thread 執行
- **microtask** 是開發者需要「以非同步的方式來執行同步」的指令時，例如 `Promise`, `process.nextTick`, `queueMicrotask`, `MutationObserver` 等等，一樣是在 main thread 中執行，主要是改變程式碼執行的時間點
- **對於 Promise 來說，`.then()` 後面的程式會進入 microtask**
- **對於 Async Function 來說，該 function 中，第一個 `await` 後的內容都會進入 microtask**
- **不論是使用 Promise 或 Async Function，進入 microtask 的程式最終還是會在主執行緒被完成，因此還是有機會卡住主執行緒**
- 透過 Worker 可以有效避免主執行去阻塞

### Promise 中的程式會直接執行，不會進入 microtask，then 中的程式才會進 microtask

以下面的程式為例，`promiseFn` 中的程式內容（`[microtask - 1] - in promise`），會在 `start` 和 `end` 之間先被執行，沒有進到 microtask，而是 `.then` 後的程式內容（`[microtask - 1] - in promise.then()`）才會在 main 執行完後被呼叫到，也就是真正進到 microtask

```js
main();

function main() {
  console.log('------ start ------');

  asyncFn(1);
  console.log('------ middle ------');

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

async function asyncFn(taskNumber) {
  console.log(`[microtask - ${taskNumber}] - in async start`);
  const _taskNumber = await promiseFn(taskNumber);
  console.log(`[microtask - ${_taskNumber}] - after await`);

  console.log(`[microtask - ${_taskNumber}] - in async end`);
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  }).then((taskNumber) => {
    console.log(`[microtask - ${taskNumber}] - in promise.then()`);
    return taskNumber;
  });
}

/**
------ start ------
[microtask - 1] - in async start
[microtask - 1] - in promise
------ middle ------
------ end ------
[microtask - 1] - in promise.then()
[microtask - 1] - after await
[microtask - 1] - in async end
[macrotask] - Timeout 0
*/
```

### async function 中 await 後的內容會進入 microtask

如果換成 async function 的寫法的話，其實邏輯還是一樣的。在 `main` function 中的 `asyncFn` 會在 start 後被執行，**進入 asyncFn 後，從 `await` 開始後面的程式內容才會進 microtask**：

```js
main();

function main() {
  console.log('------ start ------');

  asyncFn(1);

  console.log('------ middle ------');

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

async function asyncFn(taskNumber) {
  console.log(`[microtask - ${taskNumber}] - in async start`);

  const _taskNumber = await promiseFn(taskNumber);

  console.log(`[microtask - ${_taskNumber}] - after await`);

  console.log(`[microtask - ${_taskNumber}] - in async end`);
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  });
}

/*
------ start ------
[microtask - 1] - in async start
[microtask - 1] - in promise
------ middle ------
------ end ------
[microtask - 1] - after await
[microtask - 1] - in async end
[macrotask] - Timeout 0
*/
```

如果在 `main` function 中同時有兩個 Promise，邏輯也是一樣的，`.then()` 或 `await` 後的程式內容會進入 microtask：

```js
main();

function main() {
  console.log('------ start ------');

  asyncFn(1);

  console.log('------ middle ------');

  asyncFn(2);

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

async function asyncFn(taskNumber) {
  console.log(`[microtask - ${taskNumber}] - in async start`);
  const _taskNumber = await promiseFn(taskNumber);
  console.log(`[microtask - ${_taskNumber}] - after await`);

  console.log(`[microtask - ${_taskNumber}] - in async end`);
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  }).then((taskNumber) => {
    console.log(`[microtask - ${taskNumber}] - in promise.then()`);
    return taskNumber;
  });
}

/*
------ middle ------
[microtask - 2] - in async start
[microtask - 2] - in promise
------ end ------
[microtask - 1] - in promise.then()
[microtask - 2] - in promise.then()
[microtask - 1] - after await
[microtask - 1] - in async end
[microtask - 2] - after await
[microtask - 2] - in async end
[macrotask] - Timeout 0
*/
```

### Promise.all 呢？

邏輯還是一樣的，只有 `.then()` 後的內容會進入 microtask：

```js
main();

function main() {
  console.log('------ start ------');

  Promise.all([promiseFn(1), promiseFn(2)]).then((results) => {
    console.log(`[microtask - ${results}] - in Promise.all.then`);
  });

  console.log('------ middle ------');

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  }).then((taskNumber) => {
    console.log(`[microtask - ${taskNumber}] - in promise.then()`);
    return taskNumber;
  });
}

/*
------ start ------
[microtask - 1] - in promise
[microtask - 2] - in promise
------ middle ------
------ end ------
[microtask - 1] - in promise.then()
[microtask - 2] - in promise.then()
[microtask - 1,2] - in Promise.all.then
[macrotask] - Timeout 0
*/
```

### async function 中的 Promise.all

邏輯也是一樣的，`.then()` 中的程式內容或是 async function 中第一次使用 `await` 後的程式內容，都會進入 microtask：

```js
main();

function main() {
  console.log('------ start ------');

  asyncFn();

  console.log('------ middle ------');

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

async function asyncFn(taskNumber) {
  console.log(`[microtask - ${taskNumber}] - in async start`);
  const results = await Promise.all([promiseFn(1), promiseFn(2)]);
  console.log(`[microtask - ${results}] - in async end`);
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  }).then((taskNumber) => {
    console.log(`[microtask - ${taskNumber}] - in promise.then()`);
    return taskNumber;
  });
}

/*
------ start ------
[microtask - undefined] - in async start
[microtask - 1] - in promise
[microtask - 2] - in promise
------ middle ------
------ end ------
[microtask - 1] - in promise.then()
[microtask - 2] - in promise.then()
[microtask - 1,2] - in async end
[macrotask] - Timeout 0
*/
```

### async function 中有多個 await

邏輯也是一樣的，async function 中第一次使用 `await` 後的程式內容，都會進入 microtask：

```js
main();

function main() {
  console.log('------ start ------');

  asyncFn();

  console.log('------ middle ------');

  setTimeout(() => console.log('[macrotask] - Timeout', 0));

  console.log('------ end ------');
}

async function asyncFn() {
  console.log(`[microtask ] - in async start`);

  const task1 = await promiseFn(1);

  console.log(
    `[microtask] - in async middle(after task1 await , before task2 await)`
  );

  const task2 = await promiseFn(2);

  console.log(`[microtask - ${task1}, ${task2}] - in async end`);
}

function promiseFn(taskNumber) {
  return new Promise((resolve) => {
    console.log(`[microtask - ${taskNumber}] - in promise`);
    resolve(taskNumber);
  }).then((taskNumber) => {
    console.log(`[microtask - ${taskNumber}] - in promise.then()`);
    return taskNumber;
  });
}

/*
------ start ------
[microtask ] - in async start
[microtask - 1] - in promise
------ middle ------
------ end ------
[microtask - 1] - in promise.then()
[microtask] - in async middle(after task1 await , before task2 await)
[microtask - 2] - in promise
[microtask - 2] - in promise.then()
[microtask - 1, 2] - in async end
[macrotask] - Timeout 0
*/
```

## 把運算複雜的事情交給 Worker 吧，但卡住主執行緒

可以發現，不論是 Promise, setTimeout，寫在裡面的程式基本上還是跑在 main thread 上，當 main thread 執行 CPU-intensive 的指令時，整個主執行緒就會卡住沒辦法處理其他事。

這時候，我們可以透過 worker 來幫我們做一些複雜的事，透過 worker 它會另外開一個 thread，避免卡在主執行緒上，等事情做完後，再通知主執行去說「我做好了」。

可以看一下下面的程式碼：

### job.js

先建一支 `job.js`，在這裡面做 CPU intensive 的事：

```js
// job.js
const job = (loop = 5000000) => {
  let i = 0;
  while (i < loop) {
    JSON.parse('{}');
    i++;
  }
  return i;
};

module.exports = job;
```

### worker

接著建立一支 `worker.js`，這裡面我們會執行剛剛寫好的 job，worker 會在執行緒通知時開始執行，處理完之後可以透過 `parentPort.postMessage()` 來通知主執行緒處理好的內容：

```js
// worker.js

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
```

### main.js

最後來寫 `main.js` 的內容，也就是我們執行 `node main.js` 時的主執行緒：

- 撰寫 `worker` 這個函式，在這裡面會通知 `worker.js` 去做事，並透過監聽 worker 的 message 事件，當 worker 完成工作，可以會以得到訊息

```js
// main.js
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
```

### 結果

在這整個程式中，很重要的是透過 `new Date().getSeconds()` 來看開程式碼被執行的時間點（秒）。

從下圖 console.log 的時間點可以看到，worker 在 32 秒時收到任務，34 秒時完成任務，這時候 worker 其實就已經把 message 發送出去，**但 Main Thread 一直到 39 秒才收到訊息**！為什麼呢？

![Imgur](https://i.imgur.com/6MCdolx.png)

這是因為我同時在 Main Thread 要去執行了剛剛撰寫的 job，這時候 Main Thread 其實是處於被阻塞的情況，剛剛有提到，透過 Promise 可以讓這個 job 不再第一時間卡住主執行緒，但後來 Promise 當中的內容還是會回到 Main Thread 去執行，因為主執行緒卡住了，自然無法立即收聽到 worker 傳來的 message（即使 worker 的訊息已經發出）。

## 把所有複雜的事情都交到 worker 去做，不要卡住主執行緒 - 複雜度不同的 job

接下來，我們把原本 `main.js` 中執行 job 的地方移除，不要在 main thread 去做這個複雜的事情，複雜的事情全部都搬到 worker 去做：

### worker.js

把 worker 的程式稍微改一下，這裡可以透過 `workerData` 這個資料，取得從 Main Thread（也就是 `main.js`）傳進來的資料，我們讓每一個 worker 可以執行不同複雜度的 job：

```js
// worker.js
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
    // 透過 workerData 取得 MainThread 傳進來的資料
    const i = job(workerData);

    resolve(i);
  }).then((taskNumber) => {
    console.log(`[worker-thread] - in promise.then()`, getSeconds());
    return taskNumber;
  });
}
```

### main.js

在 `main.js` 中，不會直接呼叫 `job`，而是把這些複雜的行為都丟到 `Worker` 裡面去執行，這裡分別在 worker 帶入不同參數，以此設定不同複雜度，並透過 `workerData` 這個變數把資料傳到 `worker.js`：

```js
// main.js
const { Worker, isMainThread, workerData } = require('worker_threads');

main();

function getSeconds() {
  return new Date().getSeconds();
}

function main() {
  console.log('[Main Thread] ------ start ------', getSeconds());

  console.log('[Main Thread - sync] ------ start worker ------', getSeconds());
  worker(1000000);
  worker(5000000);
  worker(10000000);
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
```

### 結果

從下圖中可以看到：

- 在 21 秒時，所有 worker 收到通知要做事
- 再來因為每個 worker 執行的 job 複雜度不一，因此完成 job 的時間不同
- 由於 Main Thread 沒有卡住，因此一旦 Job 完成後，Main Thread 在收到通知時可以馬上反應

![Imgur](https://i.imgur.com/Y6Flais.png)

## 把所有複雜的事情都交到 worker 去做，不要卡住主執行緒 - 複雜度相同的 job

同樣的程式碼，如果我們把每個 worker 做的 job 的難度改成一樣的話：

```js
// main.js
function main() {
  // ...
  worker(5000000);
  worker(5000000);
  worker(5000000);
  // ...
}
```

因為 job 的難度一樣，現在這三個 worker 完成 job 的時間幾乎一樣：

- 在 29 秒時，所有 worker 收到通知，要開始執行 job
- 因為 job 的複雜度相同，三個 job 完成的時間點差不多，都在 31 秒時完成 job，並通知 Main Thread
- Main Thread 因為沒有被阻塞，因此在收到 worker 的通知後，可以在 31 秒時立即處理

![Imgur](https://i.imgur.com/tWYRvpd.png)

## 資料來源

- [Difference between microtask and macrotask within an event loop context](https://stackoverflow.com/questions/25915634/difference-between-microtask-and-macrotask-within-an-event-loop-context) @ StackOverflow
- [Worker threads](https://nodejs.org/docs/latest/api/worker_threads.html) @ Node.js
- [[筆記\] 理解 JavaScript 中的事件循環、堆疊、佇列和併發模式（Learn event loop, stack, queue, and concurrency mode of JavaScript in depth）](https://pjchender.blogspot.com/2017/08/javascript-learn-event-loop-stack-queue.html)
