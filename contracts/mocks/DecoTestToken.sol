pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract DecoTestToken is StandardToken {
    string public name = "DecoTestToken";
    string public symbol = "DTT";
    uint8 public decimals = 18;

    constructor() public {
        totalSupply_ = 1000000 * 10**uint(decimals);
        balances[msg.sender] = totalSupply_;
    }
}
