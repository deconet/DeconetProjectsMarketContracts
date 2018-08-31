pragma solidity 0.4.24;

import "./DecoEscrow.sol";


contract DecoEscrowMock is DecoEscrow {
    function setEscrowBalanceValueToAlmostMaximum() public {
        escrowBalance = (~uint(0)).sub(1000000);
    }

    function setEthWithdrawalAllowance(uint _amount) public {
        if (msg.sender == owner) return;
        withdrawalAllowanceForAddress[msg.sender] = _amount;
        escrowBalance = escrowBalance.sub(_amount);
    }
}
