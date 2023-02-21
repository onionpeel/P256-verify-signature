const { ethers } = require('ethers');

require("@nomicfoundation/hardhat-toolbox");
require('hardhat-gas-reporter');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    l2: {
      url: 'https://replica0.goerli.optimism.alembic.tech/',
      accounts: [process.env.PRIVATE_KEY || ethers.constants.HashZero],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};
