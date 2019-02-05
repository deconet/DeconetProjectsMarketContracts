pragma solidity 0.5.3;


/// @title Interface that an arbitration target contract is expected to conform.
/// @notice `DecoMilestones` contract implements `IDecoArbitrationTarget` interface.
contract IDecoArbitrationTarget {

    /**
     * @dev Prepare arbitration target for a started dispute.
     * @param _idHash A `bytes32` hash of id.
     */
    function disputeStartedFreeze(bytes32 _idHash) public;

    /**
     * @dev React to an active dispute settlement with given parameters.
     * @param _idHash A `bytes32` hash of id.
     * @param _respondent An `address` of a respondent.
     * @param _respondentShare An `uint8` share for the respondent.
     * @param _initiator An `address` of a dispute initiator.
     * @param _initiatorShare An `uint8` share for the initiator.
     * @param _isInternal A `bool` indicating if dispute was settled by participants without an arbiter.
     * @param _arbiterWithdrawalAddress An `address` for sending out arbiter compensation.
     */
    function disputeSettledTerminate(
        bytes32 _idHash,
        address _respondent,
        uint8 _respondentShare,
        address _initiator,
        uint8 _initiatorShare,
        bool _isInternal,
        address payable _arbiterWithdrawalAddress
    )
        public;

    /**
     * @dev Check eligibility of a given address to perform operations.
     * @param _idHash A `bytes32` hash of id.
     * @param _addressToCheck An `address` to check.
     * @return A `bool` check status.
     */
    function checkEligibility(bytes32 _idHash, address _addressToCheck) public view returns(bool);

    /**
     * @dev Check if target is ready for a dispute.
     * @param _idHash A `bytes32` hash of id.
     * @return A `bool` check status.
     */
    function canStartDispute(bytes32 _idHash) public view returns(bool);
}
