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

    /**
     * @dev Accept proposal by respondent.
     *      Dispute must exist and proposal must be active.
     * @param _idHash A `bytes32` hash of id.
     */
    function acceptProposal(bytes32 _idHash) external {
        Dispute memory dispute = disputes[_idHash];
        require(msg.sender == dispute.respondent, "Proposal can be accepted only by a respondent.");
        this.settleDispute(
            _idHash,
            disputes[_idHash].respondentShare,
            disputes[_idHash].initiatorShare
        );
    }

    /**
     * @dev Reject proposal by respondent.
     *      Dispute must exist and proposal must be active.
     * @param _idHash A `bytes32` hash of id.
     */
    function rejectProposal(bytes32 _idHash) external {
        Dispute storage dispute = disputes[_idHash];
        require(msg.sender == dispute.respondent, "Proposal can be rejected only by a respondent.");
        uint nowTime = now;
        require(
            dispute.startedTime.add(timeLimitForReplyOnProposal) > nowTime,
            "Respondent should reject within a limited timeframe after the dispute with proposal started."
        );
        uint8 respondentShare = dispute.respondentShare;
        dispute.respondentShare = 0;
        dispute.initiatorShare = 0;
        emit LogRejectedProposal(msg.sender, _idHash, nowTime, respondentShare);
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
            canBeSettledByArbiter(_idHash) ||
            canBeSettledWithAcceptedProposal(_idHash, _respondentShare, _initiatorShare),
            "Should be called by this contract(aka accepted proposal) on time, or arbiter outside time limits."
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

    /**
     * @dev Update withdrawal address.
     */
    function setWithdrawalAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Should be not 0 address.");
        withdrawalAddress = _newAddress;
        emit LogWithdrawalAddressChanged(now, _newAddress);
    }

    /**
     * @dev Update relay contract address.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0), "Should be not 0 address.");
        relayContractAddress = _newAddress;
    }

    /**
     * @dev Update time limit for respondent to accept or reject proposal.
     */
    function setTimeLimitForReplyOnProposal(uint _newLimit) external onlyOwner {
        timeLimitForReplyOnProposal = _newLimit;
        emit LogProposalTimeLimitUpdated(now, timeLimitForReplyOnProposal);
    }

    /**
     * @dev Update fees.
     * @param _fixedFee An `uint` fixed fee in Wei.
     * @param _shareFee An `uint8` share fee.
     */
    function setFees(uint _fixedFee, uint8 _shareFee) external onlyOwner {
        fixedFee = _fixedFee;
        require(
            _shareFee <= 100, 
            "Share fee should be in 0-100% range."
        );
        shareFee = _shareFee;
        emit LogFeesUpdated(now, _fixedFee, _shareFee);
    }

    /**
     * @return Preconfigured time limit for respondent to accept/reject proposal.
     */
    function getTimeLimitForReplyOnProposal() external view returns(uint) {
        return timeLimitForReplyOnProposal;
    }

    /**
     * @return Withdrawal address of the current arbitration contract.
     */
    function getWithdrawalAddress() external view returns(address) {
        return withdrawalAddress;
    }

    /**
     * @return Preconfigured arbitration fees for the current contract.
     */
    function getFixedAndShareFees() external view returns(uint, uint8) {
        return (fixedFee, shareFee);
    }

    /**
     * @return Dispute respondent's share.
     */
    function getDisputeProposalShare(bytes32 _idHash) public view returns(uint8) {
        return disputes[_idHash].respondentShare;
    }

    /**
     * @return Dispute initiator's share.
     */
    function getDisputeInitiatorShare(bytes32 _idHash) public view returns(uint8) {
        return disputes[_idHash].initiatorShare;
    }

    /**
     * @return Dispute's initiator.
     */
    function getDisputeInitiator(bytes32 _idHash) public view returns(address) {
        return disputes[_idHash].initiator;
    }

    /**
     * @return Dispute's respondent.
     */
    function getDisputeRespondent(bytes32 _idHash) public view returns(address) {
        return disputes[_idHash].respondent;
    }

    /**
     * @return `True` if dispute is started.
     */
    function getDisputeStartedStatus(bytes32 _idHash) public view returns(bool) {
        return disputes[_idHash].startedTime != 0;
    }

    /**
     * @return Dispute's start time.
     */
    function getDisputeStartTime(bytes32 _idHash) public view returns(uint) {
        return disputes[_idHash].startedTime;
    }

    /**
     * @return `True` if dispute is settled.
     */
    function getDisputeSettledStatus(bytes32 _idHash) public view returns(bool) {
        return disputes[_idHash].settledTime != 0;
    }

    /**
     * @return Dispute's settlement time.
     */
    function getDisputeSettlementTime(bytes32 _idHash) public view returns(uint) {
        return disputes[_idHash].settledTime;
    }

    /**
     * @dev Utility internal function.
     * @return Arbitration target address.
     */
    function getTargetContractAddress() internal view returns(address) {
        return DecoRelay(relayContractAddress).milestonesContractAddress();
    }

    /**
     * @dev Internal method to check if proposal is active 
     *      and can be settled by respondent, aka from the contract address.
     * @param _idHash A `bytes32` hash of id.
     * @param _respondentShare An `uint` share proposal for a respondent.
     * @param _initiatorShare An `uint` share for an initiator.
     * @return A `bool` status, `true` if respondent initialized this transaction 
     *         and shares are valid.
     */
    function canBeSettledWithAcceptedProposal(
        bytes32 _idHash,
        uint _respondentShare,
        uint _initiatorShare
    )
        internal
        view
        returns(bool)
    {
        Dispute memory dispute = disputes[_idHash];
        // Sender should be contract address for accepted proposal.
        return msg.sender == address(this) &&
            // Proposal can be accepted in a limited timeframe after initiated.
            dispute.startedTime.add(timeLimitForReplyOnProposal) >= now &&
            // Dispute stored shares must exact same as those passed in function parameters.
            dispute.respondentShare == _respondentShare && dispute.initiatorShare == _initiatorShare;
    }

    /**
     * @dev Internal method to check if proposal doesn't exist 
     *      or it is no longer active, and can be settled by arbiter.
     * @param _idHash A `bytes32` hash of id.
     * @return A `bool` status, `true` if arbiter initialized this transaction 
     *         and can settle dispute.
     */
    function canBeSettledByArbiter(bytes32 _idHash) internal view returns(bool) {
        Dispute memory dispute = disputes[_idHash];
        uint8 sum = dispute.respondentShare + dispute.initiatorShare;
        // Transaction should be initiated by arbiter aka this contract owner.
        return isOwner() &&
            // Sum of stored shares should be either 0 - no proposal
            (sum == 0 ||
            // Or it should be 100 but the time when the proposal can be accepted has passed.
            (sum == 100 && dispute.startedTime.add(timeLimitForReplyOnProposal) < now));
    }
}
