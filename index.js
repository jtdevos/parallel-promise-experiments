import pLimit from "p-limit";
import chunk from "lodash";

const MILLIS_PER_SECOND = 1_000;
const DEFAULT_JOB_COUNT = 100;
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_RUNTIME_MIN = 10.0;
const DEFAULT_RUNTIME_MAX = 10.0;
const DEFAULT_RELIABILITY = 1.0;
let nextId = 0;

function rnd(min = 0.0, max = 1.0) {
  let r = Math.random();
  return (max - min) * r + min;
}

function getArgs() {
  let i = 2;
  let jobCount = parseInt(process.argv[i++] ?? DEFAULT_JOB_COUNT);
  let concurrency = parseInt(process.argv[i++] ?? DEFAULT_CONCURRENCY);
  let runtimeMin = parseInt(process.argv[i++] ?? DEFAULT_RUNTIME_MIN);
  let runtimeMax = parseInt(process.argv[i++] ?? DEFAULT_RUNTIME_MAX);
  let reliability = parseFloat(process.argv[i++] ?? DEFAULT_RELIABILITY);
  let args = { concurrency, jobCount, runtimeMin, runtimeMax, reliability };
  console.log(args);
  return args;
}

function createPromise(
  id = "job",
  minRuntime = 10,
  maxRuntime = 10,
  reliability = 1.0
) {
  const successRate = 1;
  const success = Math.random() < reliability;
  const execTime = rnd(minRuntime, maxRuntime) * MILLIS_PER_SECOND;
  let p = new Promise((resolve, reject) => {
    setTimeout(() => {
      let msg = `${id}: ${success ? "resolve" : "reject"} in ${(
        execTime / 1000
      ).toFixed(2)} seconds`;
      if (success) {
        resolve(msg);
      } else {
        reject(msg);
      }
    }, execTime);
  });
  return p;
}

function createPromiseFactory() {
  nextId++;
  let p = () => {
    createPromise(`${nextId}`);
  };
  return p;
}

//todo
async function runAllAtOnce() {
  let promises = [];
  for (let i = 0; i < 100; i++) {
    let p = createPromise();
    p.then(console.log, console.log);
    promises.push(p);
  }
}

async function runLimited(args) {
  const { concurrency, jobCount } = args;
  // console.log(`t = ${t}`);
  const limit = pLimit(concurrency);
  // console.log("limit is ", limit);
  let promises = [];
  for (let i = 0; i < jobCount; i++) {
    let p = () => {
      return createPromise(i, 5, 10);
    };
    promises.push(limit(p).then(console.log, console.warn));
  }
  await Promise.all(promises).then(() => {
    console.log("all done");
  });
}

async function runChunk(chunkSize = 10) {
  let pfs = [];
  for (let i = 0; i < chunkSize; i++) {
    pfs.push(createPromiseFactory(i));
  }
}

let args = getArgs();
runLimited(args);
