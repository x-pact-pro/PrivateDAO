'use strict';

function assertWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0) {
    throw new RangeError('width must be a non-negative safe integer');
  }
}

function toBigIntLE(buf) {
  const input = Uint8Array.from(buf);
  if (input.length === 0) return 0n;
  let value = 0n;
  for (let index = input.length - 1; index >= 0; index -= 1) {
    value = (value << 8n) | BigInt(input[index]);
  }
  return value;
}

function toBigIntBE(buf) {
  const input = Uint8Array.from(buf);
  let value = 0n;
  for (const byte of input) value = (value << 8n) | BigInt(byte);
  return value;
}

function toBufferBE(num, width) {
  assertWidth(width);
  let value = BigInt(num);
  if (value < 0n) throw new RangeError('num must be non-negative');
  const output = new Uint8Array(width);
  for (let index = width - 1; index >= 0; index -= 1) {
    output[index] = Number(value & 255n);
    value >>= 8n;
  }
  return output;
}

function toBufferLE(num, width) {
  return Uint8Array.from(toBufferBE(num, width)).reverse();
}

module.exports = {toBigIntLE, toBigIntBE, toBufferLE, toBufferBE};
