import pLimit from "p-limit";
import lodash from "lodash";
const { chunk } = lodash;

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
  let algos = {
    all: runAllAtOnce,
    limit: runLimited,
    chunk: runChunks,
    serial: runSerial
  }
  let algo = algos[process.argv[i++]] ?? runChunks;
  let jobCount = parseInt(process.argv[i++] ?? DEFAULT_JOB_COUNT);
  let concurrency = parseInt(process.argv[i++] ?? DEFAULT_CONCURRENCY);
  let runtimeMin = parseInt(process.argv[i++] ?? DEFAULT_RUNTIME_MIN);
  let runtimeMax = parseInt(process.argv[i++] ?? DEFAULT_RUNTIME_MAX);
  let reliability = parseFloat(process.argv[i++] ?? DEFAULT_RELIABILITY);
  let args = { algo, concurrency, jobCount, runtimeMin, runtimeMax, reliability };
  console.log(`args.length ${process.argv.length}`);
  if (process.argv.length < i) {
    console.log("USAGE: index.js [all|limit|chunk|serial] jobcount concurrency mintime maxtime reliability");
  }
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

async function runLimited(args) {
  const { concurrency, jobCount, reliability, runtimeMin, runtimeMax } = args;
  // console.log(`t = ${t}`);
  const limit = pLimit(concurrency);
  // console.log("limit is ", limit);
  let promises = [];
  for (let i = 0; i < jobCount; i++) {
    let p = () => {
      return createPromise(i, runtimeMin, runtimeMax, reliability);
    };
    promises.push(limit(p).then(console.log, console.warn));
  }
  await Promise.all(promises).then(() => {
    console.log("all done");
  });
}

async function runChunks(args) {
  const { concurrency, jobCount, reliability, runtimeMin, runtimeMax } = args;
  let pfAll = [];
  //create all the promise-factories
  for (let i = 0; i < jobCount; i++) {
    pfAll.push(() => createPromise(i, runtimeMin, runtimeMax, reliability).then(console.log, console.warn));
  }
  let pfChunks = chunk(pfAll, concurrency);
  // console.log(pfChunks);
  for(let i = 0; i < pfChunks.length; i++) {
    await Promise.all(pfChunks[i].map(pf => pf()));
    console.log(`done with chunk ${i}`);
  }
}

async function runAllAtOnce(args) {
  const { jobCount, reliability, runtimeMin, runtimeMax } = args;
  let jobs = [];
  for (let i = 0; i < jobCount; i++) {
    jobs.push(createPromise(i, runtimeMin, runtimeMax, reliability));
  }
  let ret = await Promise.all(jobs);
  console.log(ret);
}

async function runSerial(args) {
  const { jobCount, reliability, runtimeMin, runtimeMax } = args;
  for (let i = 0; i < jobCount; i++) {
    let ret = await createPromise(i, runtimeMin, runtimeMax, reliability);
    console.log(ret);
  }
}

async function runAlgo(args) {
  let ret = await args.algo(args);
  return ret;
}

let args = getArgs();
console.time('Total');
await runAlgo(args);
console.timeEnd('Total');
