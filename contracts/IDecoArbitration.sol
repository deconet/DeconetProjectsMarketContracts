pragma solidity 0.5.3;


/// @title Interface that an arbitration contract is expected to conform.
interface IDecoArbitration {

    /**
     * @dev Should be logged upon dispute start.
     */
    event LogStartedDispute(
        address indexed sender,
        bytes32 indexed idHash,
        uint timestamp,
        int respondentShareProposal
    );

    /**
     * @dev Should be logged upon proposal rejection.
     */
    event LogRejectedProposal(
        address indexed sender,
        bytes32 indexed idHash,
        uint timestamp,
        uint8 rejectedProposal
    );

    /**
     * @dev Should be logged upon dispute settlement.
     */
    event LogSettledDispute(
        address indexed sender,
        bytes32 indexed idHash,
        uint timestamp,
        uint8 respondentShare,
        uint8 initiatorShare
    );

    /**
     * @dev Should be logged when contract owner updates fees.
     */
    event LogFeesUpdated(
        uint timestamp,
        uint fixedFee,
        uint8 shareFee
    );

    /**
     * @dev Should be logged when time limit to accept/reject proposal for respondent is updated.
     */
    event LogProposalTimeLimitUpdated(
        uint timestamp,
        uint proposalActionTimeLimit
    );

    /**
     * @dev Should be logged when the withdrawal address for the contract owner changed.
     */
    event LogWithdrawalAddressChanged(
        uint timestamp,
        address newWithdrawalAddress
    );

    /**
     * @notice Start dispute for the given project.
     * @dev This call should log event and save dispute information and notify `IDecoArbitrationTarget` object
     *      about started dispute. Dipsute can be started only if target instance call of
     *      `canStartDispute` method confirms that state is valid. Also, txn sender and respondent addresses
     *      eligibility must be confirmed by arbitation target `checkEligibility` method call.
     * @param _idHash A `bytes32` hash of a project id.
     * @param _respondent An `address` of the second paty involved in the dispute.
     * @param _respondentShareProposal An `int` value indicating percentage of disputed funds
     *  proposed to the respondent. Valid values range is 0-100, different values are considered as 'No Proposal'.
     *  When provided percentage is 100 then this dispute is processed automatically,
     *  and all funds are distributed in favor of the respondent.
     */
    function startDispute(bytes32 _idHash, address _respondent, int _respondentShareProposal) external;

    /**
     * @notice Accept active dispute proposal, sender should be the respondent.
     * @dev Respondent of a dispute can accept existing proposal and if proposal exists then `settleDispute`
     *      method should be called with proposal value. Time limit for respondent to accept/reject proposal
     *      must not be exceeded.
     * @param _idHash A `bytes32` hash of a project id.
     */
    function acceptProposal(bytes32 _idHash) external;

    /**
     * @notice Reject active dispute proposal and escalate dispute.
     * @dev Txn sender should be dispute's respondent. Dispute automatically gets escalated to this contract
     *      owner aka arbiter. Proposal must exist, otherwise this method should do nothing. When respondent
     *      rejects proposal then it should get removed and corresponding event should be logged.
     *      There should be a time limit for a respondent to reject a given proposal, and if it is overdue
     *      then arbiter should take on a dispute to settle it.
     * @param _idHash A `bytes32` hash of a project id.
     */
    function rejectProposal(bytes32 _idHash) external;

    /**
     * @notice Settle active dispute.
     * @dev Sender should be the current contract or its owner(arbiter). Action is possible only when there is no active
     *      proposal or time to accept the proposal is over. Sum of shares should be 100%. Should notify target
     *      instance about a dispute settlement via `disputeSettledTerminate` method call. Also corresponding
     *      event must be emitted.
     * @param _idHash A `bytes32` hash of a project id.
     * @param _respondentShare An `uint` percents of respondent share.
     * @param _initiatorShare An `uint` percents of initiator share.
     */
    function settleDispute(bytes32 _idHash, uint _respondentShare, uint _initiatorShare) external;

    /**
     * @return Retuns this arbitration contract withdrawal `address`.
     */
    function getWithdrawalAddress() external view returns(address payable);

    /**
     * @return The arbitration contract fixed `uint` fee and `uint8` share of all disputed funds fee.
     */
    function getFixedAndShareFees() external view returns(uint, uint8);

    /**
     * @return An `uint` time limit for accepting/rejecting a proposal by respondent.
     */
    function getTimeLimitForReplyOnProposal() external view returns(uint);

}
