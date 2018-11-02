pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DecoBaseProjectsMarketplace is Ownable {
    using SafeMath for uint256;

    // `DecoRelay` contract address.
    address public relayContractAddress;

    /**
     * @dev Payble fallback for reverting transactions of any incoming ETH.
     */
    function () public payable {
        require(msg.value == 0, "Blocking any incoming ETH.");
    }

    /**
     * @return A `bool` indicating if sender is the owner of the current contract.
     */
    function isOwner() public view returns(bool) {
        return msg.sender == owner;
    }

    /**
     * @dev Set the new address of the `DecoRelay` contract.
     * @param _newAddress An address of the new contract.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Relay address must be not 0x0.");
        relayContractAddress = _newAddress;
    }
}
