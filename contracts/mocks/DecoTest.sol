pragma solidity ^0.4.25;

import "../DecoProjects.sol";


contract DecoTest {
    function testGetInfoAndValidateForDispute(
        bytes32 _agreementHash,
        address _respondent, 
        address _initiator,
        address _arbiter,
        uint _fixedFee,
        uint8 _shareFee,
        address _escrowAddress,
        address targetContract
    )
        public
    {
        DecoProjects decoProjects = DecoProjects(targetContract);
        (uint fixedFee, uint8 shareFee, address escrow) = decoProjects.getInfoForDisputeAndValidate(
                _agreementHash,
                _respondent,
                _initiator,
                _arbiter
        );
        require(_fixedFee == fixedFee);
        require(_shareFee == shareFee);
        require(_escrowAddress == escrow);
    }
}
