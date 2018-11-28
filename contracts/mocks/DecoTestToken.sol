pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract DecoTestToken is ERC20 {
    string public name = "DecoTestToken";
    string public symbol = "DTT";
    uint8 public decimals = 18;

    constructor() public {
        _mint(msg.sender, 1000000 * 10**uint(decimals));
    }
}
