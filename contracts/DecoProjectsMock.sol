pragma solidity 0.4.24;

import "./DecoProjects.sol";


contract DecoProjectsMock is DecoProjects {

    event MockCloningTestEvent(address newCloneAddress);

    function testDeployEscrowClone(address _newOwner) public {
        address cloneAddress = deployEscrowClone(_newOwner);
        emit MockCloningTestEvent(cloneAddress);
    }

    function testIsMakersSignatureValid(
        address _maker,
        bytes _signature,
        string _agreementId,
        address _arbiter
    )
        public
        pure
        returns(bool) 
    {
        return isMakersSignatureValid(_maker, _signature, _agreementId, _arbiter);
    }
}
