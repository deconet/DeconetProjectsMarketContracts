pragma solidity 0.5.3;

import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


/// @title Base projects marketplace contract that contains shared logic.
contract DecoBaseProjectsMarketplace is Ownable {
    using SafeMath for uint256;

    /**
     * @dev Payble fallback for reverting transactions of any incoming ETH.
     */
    function () external payable {
        require(msg.value == 0, "Blocking any incoming ETH.");
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
