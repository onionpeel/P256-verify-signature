const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const ContractArtifact = require('../artifacts/contracts/BytecodeTable.sol/BytecodeTable.json');

const deployedBytecode = ContractArtifact.deployedBytecode.slice(2);

const toHex = (c) => `0x${c}`;
const encodePoints = (points) => {
  return ethers.utils.defaultAbiCoder.encode(
    points.map(() => ['uint256', 'uint256']).flat(),
    points.map((p) => {
      if (p.isInfinity()) {
        return [ethers.constants.HashZero, ethers.constants.HashZero]
      }
      return [toHex(p.getX().toString(16)), toHex(p.getY().toString(16))]
    }).flat()
  );
}

async function bundleTable(precomputes) {
  const dbLen = Buffer.from(deployedBytecode, "hex").length;
  // replace contract constructor by our crafted one
  const ctor =
    "608060405234801561001057600080fd5b5061abcd806100206000396000f300";

  const encodedPoints = encodePoints(precomputes).slice(2);

  const finalDeployedBytecode = deployedBytecode + encodedPoints;
  const finalLen = Buffer.from(finalDeployedBytecode, "hex").length;
  const bytecode = ctor.replace("abcd", finalLen.toString(16).padStart(4, "0")) + finalDeployedBytecode;

  const emptyInterface = new ethers.utils.Interface([])
  return { offset: dbLen, factory: new ethers.ContractFactory(emptyInterface, bytecode) };
}

module.exports = {
  bundleTable
};
