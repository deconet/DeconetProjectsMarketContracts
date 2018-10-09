pragma solidity 0.4.24;

import "./IDecoArbitration.sol";
import "./IDecoArbitrationTarget.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DecoArbitration is IDecoArbitration, DecoBaseProjectsMarketplace {
    using SafeMath for uint256;

    // Struct for dispute.
    struct Dispute {
        address initiator;
        address respondent;
        uint startedTime;
        uint settledTime;
        uint8 respondentShare;
        uint8 initiatorShare;
    }

    // Address of Deconet relay contract.
    address public relayContractAddress;

    // Contract owner withdrawal address that might be different from contract owner address.
    address public withdrawalAddress;

    // Fixed fee that is deducted from target in favor of arbiter when she settles an external dispute.
    uint public fixedFee;

    // Share of funds fee that is deducted from target in favor of arbiter when she settles an external dispute.
    uint8 public shareFee;

    // Duration in seconds that a respondent has either to accept or reject a proposal.
    uint public timeLimitForReplyOnProposal;

    // Maps unique id to the Dispute instance.
    mapping (bytes32 => Dispute) public disputes;

    /**
     * @dev Start dispute for the given project.
     * @param _idHash A `bytes32` hash of a project id.
     * @param _respondent An `address` of the second paty involved in the dispute.
     * @param _respondentShareProposal An `int` value indicating percentage of disputed funds 
     *  proposed to the respondent. Valid values range is 0-100, different values are considered as 'No Proposal'.
     *  When provided percentage is 100 then this dispute is processed automatically,
     *  and all funds are distributed in favor of the respondent.
     */
    function startDispute(bytes32 _idHash, address _respondent, int _respondentShareProposal) external {
        require(disputes[_idHash].startedTime == 0, "Dispute shouldn't be started yet.");
        IDecoArbitrationTarget target = IDecoArbitrationTarget(getTargetContractAddress());
        require(target.canStartDispute(_idHash), "Target should confirm its state to be ready for dispute.");
        require(target.checkEligibility(_idHash, msg.sender), "Check if sender is eligible to perform actions.");
        require(target.checkEligibility(_idHash, _respondent), "Check if respondent is eligible to perform actions.");
        uint8 uRespondentShareProposal;
        uint8 uInitiatorShareProposal;
        if (_respondentShareProposal < 0 || _respondentShareProposal > 100) {
            uRespondentShareProposal = 0;
            uInitiatorShareProposal = 0;
        } else {
            uRespondentShareProposal = uint8(_respondentShareProposal);
            uInitiatorShareProposal = 100 - uRespondentShareProposal;
        }
        uint nowTimestamp = now;
        disputes[_idHash] = Dispute(
            msg.sender,
            _respondent,
            nowTimestamp,
            0,
            uRespondentShareProposal,
            uInitiatorShareProposal
        );

        emit LogStartedDispute(msg.sender, _idHash, nowTimestamp, _respondentShareProposal);

        if (uRespondentShareProposal == 100) {
            this.settleDispute(_idHash, uRespondentShareProposal, uInitiatorShareProposal);
        } else {
            target.disputeStartedFreeze(_idHash);
        }
    }

    function acceptProposal(bytes32 idHash) external {
        this.settleDispute(
            idHash,
            uint8(disputes[idHash].respondentShare),
            uint8(disputes[idHash].initiatorShare)
        );
    }

    function rejectProposal(bytes32 idHash) external {
        emit LogRejectedProposal(msg.sender, idHash, now, disputes[idHash].respondentShare);
    }

    /**
     * @dev Settle dispute without active proposal or with the best deal for respondent.
     *      Settlement can be initiated from the contract methods or from the contract owner address.
     *      A dispute should be started but not ended yet.
     * @param _idHash A `bytes32` hash of id.
     * @param _respondentShare An `uint8` share for a dispute respondent.
     * @param _initiatorShare An `uint8` share for a dispute initiator.
     */
    function settleDispute(bytes32 _idHash, uint _respondentShare, uint _initiatorShare) external {
        require(
            msg.sender == address(this) || isOwner(),
            "Settle dispute must be perfomed by this contract or arbiter(contract owner)."
        );
        Dispute storage dispute = disputes[_idHash];
        require(dispute.startedTime != 0, "Dispute must exist.");
        require(dispute.settledTime == 0, "Dispute must be active.");
        uint nowTime = now;
        require(
            dispute.respondentShare == 100 ||
            (dispute.respondentShare + dispute.initiatorShare) == 0 ||
            dispute.startedTime.add(this.getTimeLimitForReplyOnProposal()) < nowTime,
            "There shouldn't be an active proposal or should be the best possible proposal."
        );
        require(_respondentShare.add(_initiatorShare) == 100, "Sum must be 100%");
        dispute.respondentShare = uint8(_respondentShare);
        dispute.initiatorShare = uint8(_initiatorShare);
        dispute.settledTime = nowTime;
        IDecoArbitrationTarget target = IDecoArbitrationTarget(getTargetContractAddress());
        target.disputeSettledTerminate(
            _idHash,
            dispute.respondent,
            dispute.respondentShare,
            dispute.initiator,
            dispute.initiatorShare,
            msg.sender == address(this), // Indicating if internal or external
            this.getWithdrawalAddress()
        );
        emit LogSettledDispute(msg.sender, _idHash, nowTime, dispute.respondentShare, dispute.initiatorShare);
    }

    function setWithdrawalAddress(address _newAddress) external onlyOwner {
        withdrawalAddress = _newAddress;
    }

    function setRelayContractAddress(address _newAddress) external {
        relayContractAddress = _newAddress;
    }

    function setTimeLimitForReplyOnProposal(uint _newLimit) external {
        timeLimitForReplyOnProposal = _newLimit;
    }

    function getWithdrawalAddress() external view returns(address) {
        return withdrawalAddress;
    }

    function getFixedAndShareFees() external view returns(uint, uint8) {
        return (0, 0);
    }

    function getTimeLimitForReplyOnProposal() external view returns(uint) {
        return timeLimitForReplyOnProposal;
    }

    function getDisputeProposal(bytes32 idHash) public view returns(uint8) {
        return disputes[idHash].respondentShare;
    }

    function getDisputeInitiator(bytes32 idHash) public view returns(address) {
        return disputes[idHash].initiator;
    }

    function getDisputeStartedStatus(bytes32 idHash) public view returns(bool) {
        return disputes[idHash].startedTime != 0;
    }

    function getDisputeStartTime(bytes32 idHash) public view returns(uint) {
        return disputes[idHash].startedTime;
    }

    function getDisputeSettledStatus(bytes32 idHash) public view returns(bool) {
        return disputes[idHash].settledTime != 0;
    }

    function getDisputeSettlementTime(bytes32 idHash) public view returns(uint) {
        return disputes[idHash].settledTime;
    }

    function getTargetContractAddress() internal returns(address) {
        return DecoRelay(relayContractAddress).milestonesContractAddress();
    }
}
