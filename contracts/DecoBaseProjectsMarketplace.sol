pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DecoBaseProjectsMarketplace is Ownable {
    using SafeMath for uint256;

    /**
     * @dev Payble fallback for reverting transactions of any incoming ETH.
     */
    function () public payable {
        require(msg.value == 0);
    }

    /**
     * @return A `bool` indicating if sender is the owner of the current contract.
     */
    function isOwner() public view returns(bool) {
        return msg.sender == owner;
    }
}
