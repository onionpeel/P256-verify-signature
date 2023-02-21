const { ec: EC } = require('elliptic');

const curve = new EC('p256');

function generateTable(p, q, w = 4) {

  const W = BigInt(w);
  const mask = 2n**W-1n;
  const zero = curve.curve.point(null, null);
  const h = p.add(q);

  const table = new Array(2**(2*w)).fill(0).map((_, i) => {
    let result = zero;

    for (let bit = w - 1; bit >= 0; --bit) {
      result = result.add(result);

      const pbit = ((i >> (w+bit)) & 0x1) == 1;
      const qbit = ((i >> bit) & 0x1) == 1;

      if (pbit && qbit) result = result.add(h);
      else if (pbit) result = result.add(p);
      else if (qbit) result = result.add(q);
    }

    return result;
  });

  function getIndex(a, b, it) {
    const I = BigInt(it)
    const abits = a >> ((256n / W - I - 1n) * W) & mask;
    const bbits = b >> ((256n / W - I - 1n) * W) & mask;

    const index = (abits << W) + bbits;
    if (it === 0) {
      console.log('getIndex', abits, bbits, index);
    }
    return index;
  }

  function multiply(a, b) {
    let result = table[getIndex(a, b, 0)];


    const factor = 2**w;
    for (let i = 1; i < 256 / w; ++i) {
      result = result.mul(factor);

      const index = getIndex(a, b, i);
      const precomputed = table[Number(index)]

      result = result.add(precomputed);
    }

    return result;
  };

  return { table, multiply };
}

module.exports = {
  generateTable
}
