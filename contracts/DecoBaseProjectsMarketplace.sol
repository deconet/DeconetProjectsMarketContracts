pragma solidity 0.4.24;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract DecoBaseProjectsMarketplace is Ownable {

    /**
     * @dev Payble fallback for reverting transactions of any incoming ETH.
     */
    function () public payable {
        require(msg.value == 0);
    }
}
