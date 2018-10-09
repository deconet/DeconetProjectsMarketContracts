pragma solidity 0.4.24;


interface IDecoArbitration {

    /**
     * @dev Should be logged upon dispute start.
     */
    event LogStartedDispute(
        address sender,
        bytes32 idHash,
        uint timestamp,
        int respondentShareProposal
    );

    /**
     * @dev Should be logged upon proposal rejection.
     */
    event LogRejectedProposal(
        address sender,
        bytes32 idHash,
        uint timestamp,
        uint8 rejectedProposal
    );

    /** 
     * @dev Should be logged upon dispute settlement.
     */
    event LogSettledDispute(
        address sender,
        bytes32 idHash,
        uint timestamp,
        uint8 respondentShare,
        uint8 initiatorShare
    );

    /**
     * @dev Should be logged when contract owner updates fees.
     */
    event LogFeesUpdated(
        uint fixedFee,
        uint8 shareFee
    );

    /**
     * @dev Start dispute for the given project.
     * @param _idHash A `bytes32` hash of a project id.
     * @param _respondent An `address` of the second paty involved in the dispute.
     * @param _respondentShareProposal An `int` value indicating percentage of disputed funds 
     *  proposed to the respondent. Valid values range is 0-100, different values are considered as 'No Proposal'.
     *  When provided percentage is 100 then this dispute is processed automatically,
     *  and all funds are distributed in favor of the respondent.
     */
    function startDispute(bytes32 _idHash, address _respondent, int _respondentShareProposal) external;

    /**
     * @dev Accept active dispute proposal, sender should be the respondent.
     * @param _idHash A `bytes32` hash of a project id.
     */
    function acceptProposal(bytes32 _idHash) external;

    /**
     * @dev Reject active dispute proposal, sender should be the respondent. 
     *  Dispute automatically gets escalated to the project owner arbiter.
     * @param _idHash A `bytes32` hash of a project id.
     */
    function rejectProposal(bytes32 _idHash) external;

    /**
     * @dev Settle active dispute, sender should be the current contract or its owner. 
     *  Action is possible only when there is no active proposal or time to accept the proposal is over.
     *  Sum of shares should be 100%.
     *  Should notify target contract about the dispute is settled.
     * @param _idHash A `bytes32` hash of a project id.
     * @param _respondentShare An `uint` percents of respondent share.
     * @param _initiatorShare An `uint` percents of initiator share.
     */
    function settleDispute(bytes32 _idHash, uint _respondentShare, uint _initiatorShare) external;

    /** 
     * @return Retuns this arbitration contract withdrawal `address`.
     */
    function getWithdrawalAddress() external view returns(address);

    /** 
     * @return The arbitration contract fixed `uint` fee and `uint8` share of all disputed funds fee. 
     */
    function getFixedAndShareFees() external view returns(uint, uint8);

    /**
     * @return An `uint` time limit for replying on proposal.
     */
    function getTimeLimitForReplyOnProposal() external view returns(uint);

}
