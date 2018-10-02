pragma solidity 0.4.24;

import "./IDecoArbitration.sol";
import "./IDecoArbitrationTarget.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DecoArbitration is IDecoArbitration, DecoBaseProjectsMarketplace {
    using SafeMath for uint256;

    address public relayContractAddress;

    mapping (bytes32 => bool) public disputeStarted;

    mapping (bytes32 => uint8[]) public disputeProposal;

    mapping (bytes32 => address) public disputeInitiator;

    function startDispute(bytes32 idHash, uint8[] sharesProposal) external {
        require(!disputeStarted[idHash]);
        if (sharesProposal.length == 2) {
            uint8 sum = 0;
            for (uint i = 0; i < sharesProposal.length; i++) {
                sum += sharesProposal[i];
            }
            require(sum == 0 || sum == 100);
        } else if (sharesProposal.length != 0) {
            revert("Prposal array length can be either 2 or 0.");
        }
        IDecoArbitrationTarget target = IDecoArbitrationTarget(getTargetContractAddress());
        require(target.canStartDispute(idHash));
        require(target.checkEligibility(idHash, msg.sender));

        disputeStarted[idHash] = true;
        disputeProposal[idHash] = sharesProposal;
        disputeInitiator[idHash] = msg.sender;

        emit LogStartDispute(msg.sender, idHash, sharesProposal);
    }

    function acceptProposal(bytes32 idHash) external {
        this.settleDispute(idHash, disputeProposal[idHash]);
    }

    function rejectProposal(bytes32 idHash) external {
        emit LogRejectProposal(msg.sender, idHash);
    }

    function settleDispute(bytes32 idHash, uint8[] shares) external {
        emit LogEndDispute(msg.sender, idHash, shares);
    }

    function setRelayContractAddress(address _newAddress) external {
        relayContractAddress = _newAddress;
    }

    function getDisputeProposal(bytes32 idHash) public view returns(uint8[]) {
        return disputeProposal[idHash];
    }

    function getTargetContractAddress() internal returns(address) {
        return DecoRelay(relayContractAddress).milestonesContractAddress();
    }
}
