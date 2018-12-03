pragma solidity 0.4.25;

import "../DecoEscrow.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


contract DecoEscrowMock is DecoEscrow {
    function setEscrowBalanceValueToAlmostMaximum() public {
        balance = (~uint(0)).sub(1000000);
    }

    function setEthWithdrawalAllowance(uint _amount) public {
        if (msg.sender == owner()) return;
        withdrawalAllowanceForAddress[msg.sender] = _amount;
        balance = balance.sub(_amount);
    }

    function setTokensBalanceValueToAlmostMaximum(address _tokenAddress) public {
        IERC20 token = IERC20(_tokenAddress);
        tokensBalance[_tokenAddress] = token.totalSupply().sub(1000);
    }

    function setTokensWithdrawalAllowance(address _tokenAddress, uint _amount) public {
        if (msg.sender == owner()) return;
        tokensWithdrawalAllowanceForAddress[msg.sender][_tokenAddress] = _amount;
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].sub(_amount);
    }
}
