pragma solidity 0.4.24;

import "./DecoEscrow.sol";


contract DecoEscrowMock is DecoEscrow {
    function setEscrowBalanceValueToAlmostMaximum() public {
        escrowBalance = (~uint(0)).sub(1000000);
    }
}
