pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract P256_mul {
  uint constant p = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
  uint constant a = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC;

  address immutable table;

  constructor(address table_) {
    table = table_;
  }

  function getIndex(uint256 u, uint256 v, uint256 w, uint256 it) private pure returns (uint256 idx) {
    uint256 nSplits = 256 / w;
    uint256 shift = w * (nSplits - 1 - it);
    uint256 mask = 2**w-1;
    idx = (u >> shift & mask) << w | (v >> shift & mask);
  }

  function getPrecomputedPoint(uint256 u, uint256 v, uint256 it) private view returns (uint256 x, uint256 y) {
    uint256[2] memory xy;
    address table_ = table;
    uint256 idx = getIndex(u, v, 4, it);
    uint256 offset = 63 + (64 * idx);
    assembly {
      extcodecopy(table_, xy, offset, 64)

      x := mload(xy)
      y := mload(add(xy, 32))
    }
  }

  function multiply(uint256 u, uint256 v) public view returns (uint256 aX, uint256 aY) {
    (aX, aY) = getPrecomputedPoint(u, v, 0);
    uint256 aZ = 1;

    for (uint256 nibble = 1; nibble < 64; ++nibble) {
      (aX, aY, aZ) = twiceProj(aX, aY, aZ);
      (aX, aY, aZ) = twiceProj(aX, aY, aZ);
      (aX, aY, aZ) = twiceProj(aX, aY, aZ);
      (aX, aY, aZ) = twiceProj(aX, aY, aZ);

      (uint256 bX, uint256 bY) = getPrecomputedPoint(u, v, nibble);

      (aX, aY, aZ) = addProj(aX, aY, aZ, bX, bY, 1);
    }

    (aX, aY) = toAffinePoint(aX, aY, aZ);
  }

  function toAffinePoint(uint x0, uint y0, uint z0) public pure
  returns (uint x1, uint y1)
  {
    uint z0Inv;
    unchecked{
      z0Inv = inverseMod(z0, p);
      x1 = mulmod(x0, z0Inv, p);
      y1 = mulmod(y0, z0Inv, p);
    }
  }

  function inverseMod(uint u, uint m) internal pure
  returns (uint)
  {
    if (u == 0 || u == m || m == 0)
      return 0;
    if (u > m)
      u = u % m;

    int t1;
    int t2 = 1;
    uint r1 = m;
    uint r2 = u;
    uint q;
    unchecked{
      while (r2 != 0) {
        q = r1 / r2;
        (t1, t2, r1, r2) = (t2, t1 - int(q) * t2, r2, r1 - q * r2);
      }

      if (t1 < 0)
        return (m - uint(-t1));

      return uint(t1);
    }
  }

  function twiceProj(uint x0, uint y0, uint z0) public pure returns (uint x1, uint y1, uint z1)
  {
    uint t;
    uint u;
    uint v;
    uint w;

    if (x0 == 0 && y0 == 0) {
      return (0, 1, 0);
    }

    unchecked{
      u = mulmod(y0, z0, p);
      u = mulmod(u, 2, p);

      v = mulmod(u, x0, p);
      v = mulmod(v, y0, p);
      v = mulmod(v, 2, p);

      x0 = mulmod(x0, x0, p);
      t = mulmod(x0, 3, p);

      z0 = mulmod(z0, z0, p);
      z0 = mulmod(z0, a, p);
      t = addmod(t, z0, p);

      w = mulmod(t, t, p);
      x0 = mulmod(2, v, p);
      w = addmod(w, p-x0, p);

      x0 = addmod(v, p-w, p);
      x0 = mulmod(t, x0, p);
      y0 = mulmod(y0, u, p);
      y0 = mulmod(y0, y0, p);
      y0 = mulmod(2, y0, p);
      y1 = addmod(x0, p-y0, p);

      x1 = mulmod(u, w, p);

      z1 = mulmod(u, u, p);
      z1 = mulmod(z1, u, p);
    }
  }

    function addProj(uint x0, uint y0, uint z0, uint x1, uint y1, uint z1) public pure
        returns (uint x2, uint y2, uint z2)
    {
        uint t0;
        uint t1;
        uint u0;
        uint u1;

        if (x0 == 0 && y0 == 0) {
            return (x1, y1, z1);
        }
        else if (x1 == 0 && y1 == 0) {
            return (x0, y0, z0);
        }
        unchecked{
        t0 = mulmod(y0, z1, p);
        t1 = mulmod(y1, z0, p);

        u0 = mulmod(x0, z1, p);
        u1 = mulmod(x1, z0, p);
        }
        if (u0 == u1) {
            if (t0 == t1) {
                return twiceProj(x0, y0, z0);
            }
            else {
                return (0, 1, 0);
            }
        }
        unchecked{
        (x2, y2, z2) = addProj2(mulmod(z0, z1, p), u0, u1, t1, t0);
        }
    }

    /**
     * @dev Helper function that splits addProj to avoid too many local variables.
     */
    function addProj2(uint v, uint u0, uint u1, uint t1, uint t0) private pure
        returns (uint x2, uint y2, uint z2)
    {
        uint u;
        uint u2;
        uint u3;
        uint w;
        uint t;

        unchecked{
        t = addmod(t0, p-t1, p);
        u = addmod(u0, p-u1, p);
        u2 = mulmod(u, u, p);

        w = mulmod(t, t, p);
        w = mulmod(w, v, p);
        u1 = addmod(u1, u0, p);
        u1 = mulmod(u1, u2, p);
        w = addmod(w, p-u1, p);

        x2 = mulmod(u, w, p);

        u3 = mulmod(u2, u, p);
        u0 = mulmod(u0, u2, p);
        u0 = addmod(u0, p-w, p);
        t = mulmod(t, u0, p);
        t0 = mulmod(t0, u3, p);

        y2 = addmod(t, p-t0, p);

        z2 = mulmod(u3, v, p);
        }
    }
}
