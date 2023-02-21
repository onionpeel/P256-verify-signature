const { ec: EC } = require('elliptic');
const { loadFixture, } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

const { generateTable } = require('../src/generate_table');
const { bundleTable } = require('../src/bundle_table');

const curve = new EC('p256');
const hex = v => `0x${v.toString(16)}`;

describe("OptimizedCurve", function () {
  async function deploy() {
    const key = curve.keyFromPrivate(
      'be760ee3c44735144cf0861866b3fa188028211b73753f4db6bc0ff964bfa183'
    );
    const pubKey = key.getPublic()

    const gen = generateTable(curve.g, pubKey, 4);
    const { factory: BytecodeTable } = await bundleTable(gen.table);

    const [deployer] = await ethers.getSigners();
    const table = await BytecodeTable.connect(deployer).deploy();

    const P256_mul = await ethers.getContractFactory('P256_mul');
    const multiplier = await P256_mul.deploy(table.address);

    const OptimizedCurve = await ethers.getContractFactory('OptimizedCurve');
    const contract = await OptimizedCurve.deploy(multiplier.address);

    return { key, contract };
  }

  describe("Deployment", function () {
    it("perform", async function () {
        const { contract, key } = await loadFixture(deploy);

      const msg = Buffer.from('hello world');
      const hash = ethers.utils.keccak256(msg);

      const sig = key.sign(hash.slice(2));
      const pubKey = key.getPublic()

      const rs = [hex(sig.r), hex(sig.s)];
      const q = [hex(pubKey.getX()), hex(pubKey.getY())];

      const result = await contract.validateSignature(hash, rs, q)

      console.log('onchain', result);

      const pub = pubKey.encode('hex');
      const kkey = curve.keyFromPublic(pub, 'hex');
      const local = kkey.verify(hash.slice(2), { r: rs[0].slice(2), s: rs[1].slice(2) });
      console.log('local', local);
    });
  });
});

describe('BytecodeTable', function () {
  async function deploy() {
    const key = curve.keyFromPrivate(
      'be760ee3c44735144cf0861866b3fa188028211b73753f4db6bc0ff964bfa183'
    );
    const pubKey = key.getPublic()

    const w = 4;
    const gen = generateTable(curve.g, pubKey, w);
    const { offset: pointsOffset, factory: BytecodeTable } = await bundleTable(gen.table);

    return { key, p: curve.g, q: pubKey, w, gen, pointsOffset, BytecodeTable };
  }

  it('should contain elliptic point curve at the correct index', async () => {
    const { gen, pointsOffset, BytecodeTable } = await loadFixture(deploy);
    const [deployer] = await ethers.getSigners();

    const contract = await BytecodeTable.connect(deployer).deploy();

    const code = await ethers.provider.getCode(contract.address);
    const buffer = Buffer.from(code.slice(2), 'hex');
    
    console.log(pointsOffset);
    const n = 5;
    const p1x = buffer.subarray(pointsOffset + n * 64, pointsOffset + n * 64 + 32);
    const p1y = buffer.subarray(pointsOffset + n * 64 + 32, pointsOffset + (n + 1) * 64);

    const point = gen.table[n];

    expect(p1x.toString('hex')).to.equal(point.getX().toString('hex'));
    expect(p1y.toString('hex')).to.equal(point.getY().toString('hex'));
  });
})

describe("P256_mul", function () {
  async function deploy() {
    const key = curve.keyFromPrivate(
      'be760ee3c44735144cf0861866b3fa188028211b73753f4db6bc0ff964bfa183'
    );
    const pubKey = key.getPublic()

    const gen = generateTable(curve.g, pubKey, 4);
    const { factory: BytecodeTable } = await bundleTable(gen.table);

    const [deployer] = await ethers.getSigners();
    const table = await BytecodeTable.connect(deployer).deploy();

    const P256_mul = await ethers.getContractFactory('P256_mul');
    const contract = await P256_mul.deploy(table.address);

    return { key, p: curve.g, q: pubKey, gen, table, contract };
  }

  it('should compute correctly', async function () {
    const { p, q, contract } = await loadFixture(deploy);

    const a = BigInt("0x1654571b36d1b8964f9e7079e4adb4a9e4ae9e631bc6dcfeeec92a7d8f2e2207")
    const b = BigInt("0x0f4308c128ebdccd30f37cb17058ec6077afa8259924d5b6faec6c1b87db3914")

    const expected = p.mul(a.toString(16)).add(q.mul(b.toString(16)))

    const result = await contract.multiply(hex(a), hex(b));

    expect(expected.getX().toString(10)).to.be.equal(result[0].toString());
    expect(expected.getY().toString(10)).to.be.equal(result[1].toString());
  });
});
