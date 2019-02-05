pragma solidity 0.5.3;

import "../DecoProjects.sol";
import "../DecoEscrow.sol";


contract DecoProjectsMock is DecoProjects {

    event MockCloningTestEvent(address newCloneAddress);

    constructor(uint256 _chainId) DecoProjects(_chainId) public { }

    function testDeployEscrowClone(address _newOwner) public {
        DecoEscrow cloneAddress = deployEscrowClone(_newOwner);
        emit MockCloningTestEvent(address(cloneAddress));
    }

    function testIsMakersSignatureValid(
        address _maker,
        bytes memory _signature,
        string memory _agreementId,
        address _arbiter
    )
        public
        view
        returns(bool)
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
}
