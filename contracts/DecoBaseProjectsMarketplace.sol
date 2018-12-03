pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


/// @title Base projects marketplace contract that contains shared logic.
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
     * @dev Set the new address of the `DecoRelay` contract.
     * @param _newAddress An address of the new contract.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Relay address must not be 0x0.");
        relayContractAddress = _newAddress;
    }

    /**
     * @dev Allows to trasnfer any ERC20 tokens from the contract balance to owner's address.
     * @param _tokenAddress An `address` of an ERC20 token.
     * @param _tokens An `uint` tokens amount.
     * @return A `bool` operation result state.
     */
    function transferAnyERC20Token(
        address _tokenAddress,
        uint _tokens
    )
        public
        onlyOwner
        returns (bool success)
    {
        IERC20 token = IERC20(_tokenAddress);
        return token.transfer(owner(), _tokens);
    }
}
