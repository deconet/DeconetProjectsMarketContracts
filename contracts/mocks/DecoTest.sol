pragma solidity 0.5.3;

import "../DecoProjects.sol";
import "../DecoEscrow.sol";


contract DecoTest {
    function testGetInfoAndValidateForDispute(
        bytes32 _agreementHash,
        address _respondent,
        address _initiator,
        address _arbiter,
        uint _fixedFee,
        uint8 _shareFee,
        DecoEscrow _escrow,
        address payable targetContract
    )
        public
    {
        DecoProjects decoProjects = DecoProjects(targetContract);
        (uint fixedFee, uint8 shareFee, DecoEscrow escrow) = decoProjects.getInfoForDisputeAndValidate(
                _agreementHash,
                _respondent,
                _initiator,
                _arbiter
        );
        require(_fixedFee == fixedFee);
        require(_shareFee == shareFee);
        require(_escrow == escrow);
    }
}
