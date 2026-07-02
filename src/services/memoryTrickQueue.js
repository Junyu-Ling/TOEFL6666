const inFlight = new Map();
const waitQueue = [];
let activeCount = 0;
const MAX_CONCURRENT = 2;

function pumpQueue() {
  while (activeCount < MAX_CONCURRENT && waitQueue.length > 0) {
    const next = waitQueue.shift();
    activeCount += 1;
    next
      .run()
      .then(next.resolve, next.reject)
      .finally(() => {
        activeCount -= 1;
        pumpQueue();
      });
  }
}

export function enqueueMemoryTrickRequest(key, run) {
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = new Promise((resolve, reject) => {
    waitQueue.push({ run, resolve, reject });
    pumpQueue();
  });

  inFlight.set(key, promise);
  promise.finally(() => {
    inFlight.delete(key);
  });

  return promise;
}

export function memoryTrickKey(wordData) {
  return String(wordData?.word || "")
    .toLowerCase()
    .trim();
}
