pragma solidity ^0.8.0;

import {OptimizedCurve} from "../OptimizedCurve.sol";
import "hardhat/console.sol";

contract OptimizedCurveWrapper {
    uint256 C;

    function validateSignature(bytes32 message, uint[2] memory rs, address multiplier) public /* view */ returns (bool) {
      if (!OptimizedCurve.validateSignature(message, rs, multiplier)) {
        revert();
      }
      C = 1;
      return true;
    }
}

