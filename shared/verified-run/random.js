"use strict";

const DEFAULT_RUN_RANDOM_STREAMS = Object.freeze([
  "waves",
  "pacing",
  "enemy_behavior",
  "boss_behavior",
  "hazards",
  "loot"
]);

function rotateLeft32(value, shift) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function createXoshiro128StarStar(seedWords) {
  if (!Array.isArray(seedWords) || seedWords.length !== 4) {
    throw new TypeError("xoshiro128** requires four unsigned seed words.");
  }
  const state = seedWords.map((word) => {
    const value = Number(word);
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
      throw new TypeError("xoshiro128** seed words must be unsigned 32-bit integers.");
    }
    return value >>> 0;
  });
  if (state.every((word) => word === 0)) {
    throw new TypeError("xoshiro128** cannot use an all-zero state.");
  }

  return Object.freeze({
    nextUint32() {
      const result = Math.imul(rotateLeft32(Math.imul(state[1], 5) >>> 0, 7), 9) >>> 0;
      const shifted = (state[1] << 9) >>> 0;
      state[2] = (state[2] ^ state[0]) >>> 0;
      state[3] = (state[3] ^ state[1]) >>> 0;
      state[1] = (state[1] ^ state[2]) >>> 0;
      state[0] = (state[0] ^ state[3]) >>> 0;
      state[2] = (state[2] ^ shifted) >>> 0;
      state[3] = rotateLeft32(state[3], 11);
      return result;
    },
    nextFloat() {
      return this.nextUint32() / 0x100000000;
    },
    snapshot() {
      return state.slice();
    }
  });
}

function webCrypto() {
  if (globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;
  return require("node:crypto").webcrypto;
}

function validateRootSeed(rootSeedHex) {
  const seed = String(rootSeedHex || "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(seed)) {
    throw new TypeError("Run root seed must be 128-bit hexadecimal.");
  }
  return seed;
}

function validateRevision(simRevision) {
  const revision = String(simRevision || "");
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(revision)) {
    throw new TypeError("Simulation revision is invalid.");
  }
  return revision;
}

function validateStreamNames(streamNames) {
  if (!Array.isArray(streamNames) || streamNames.length === 0) {
    throw new TypeError("At least one run random stream is required.");
  }
  const names = streamNames.map((name) => String(name || ""));
  if (names.some((name) => !/^[a-z][a-z0-9_]{0,39}$/.test(name)) || new Set(names).size !== names.length) {
    throw new TypeError("Run random stream names must be unique lowercase identifiers.");
  }
  return names;
}

async function seedWordsForStream(rootSeedHex, simRevision, streamName) {
  const canonical = `SSR_STREAM_V1\0${rootSeedHex}\0${simRevision}\0${streamName}`;
  const digest = await webCrypto().subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const view = new DataView(digest);
  const words = Array.from({ length: 4 }, (_, index) => view.getUint32(index * 4, true));
  if (words.every((word) => word === 0)) words[3] = 0x9e3779b9;
  return words;
}

async function createRunRandomStreams(rootSeedHex, simRevision, streamNames = DEFAULT_RUN_RANDOM_STREAMS) {
  const seed = validateRootSeed(rootSeedHex);
  const revision = validateRevision(simRevision);
  const names = validateStreamNames(streamNames);
  const entries = await Promise.all(names.map(async (name) => [
    name,
    createXoshiro128StarStar(await seedWordsForStream(seed, revision, name))
  ]));
  const streams = new Map(entries);

  function stream(name) {
    const selected = streams.get(String(name || ""));
    if (!selected) throw new RangeError(`Unknown run random stream: ${name}`);
    return selected;
  }

  return Object.freeze({
    rootSeedHex: seed,
    simRevision: revision,
    names: Object.freeze(names.slice()),
    nextUint32(name) {
      return stream(name).nextUint32();
    },
    nextFloat(name) {
      return stream(name).nextFloat();
    },
    range(name, minimum, maximum) {
      const min = Number(minimum);
      const max = Number(maximum);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
        throw new TypeError("Random range requires finite ordered bounds.");
      }
      return min + stream(name).nextFloat() * (max - min);
    },
    snapshot() {
      return Object.fromEntries(names.map((name) => [name, stream(name).snapshot()]));
    }
  });
}

module.exports = {
  DEFAULT_RUN_RANDOM_STREAMS,
  createRunRandomStreams,
  createXoshiro128StarStar
};
