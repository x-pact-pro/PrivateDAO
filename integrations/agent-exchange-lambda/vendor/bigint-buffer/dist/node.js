'use strict';

function assertWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0) {
    throw new RangeError('width must be a non-negative safe integer');
  }
}

function toBigIntLE(buf) {
  const input = Buffer.from(buf);
  if (input.length === 0) return 0n;
  const reversed = Buffer.from(input).reverse();
  return BigInt(`0x${reversed.toString('hex')}`);
}

function toBigIntBE(buf) {
  const input = Buffer.from(buf);
  if (input.length === 0) return 0n;
  return BigInt(`0x${input.toString('hex')}`);
}

function toBufferBE(num, width) {
  assertWidth(width);
  const value = BigInt(num);
  if (value < 0n) throw new RangeError('num must be non-negative');
  const hex = value.toString(16).padStart(width * 2, '0').slice(0, width * 2);
  return Buffer.from(hex, 'hex');
}

function toBufferLE(num, width) {
  return Buffer.from(toBufferBE(num, width)).reverse();
}

module.exports = {toBigIntLE, toBigIntBE, toBufferLE, toBufferBE};
