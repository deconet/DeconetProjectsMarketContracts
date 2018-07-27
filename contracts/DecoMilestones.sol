pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";


contract DecoMilestones {

    struct Milestone {
        uint8 milestoneNumber;
        uint32 duration;

        // track all adjustments caused by state changes Active <-> Delivered <-> Rejected
        // actualDuration time gets adjusted by the time that is spent by client 
        // to provide a feedback when agreed milestone time is not exceeded yet. 
        // Initial value is the same as duration.
        uint32 actualDuration; 

        uint32 depositAmount;
        uint startTime;
        uint deliveryTime;
        bool isAccepted;
    }

    // Enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    // Map project/agreement hash to milestones list.
    mapping (bytes32 => Milestone[]) internal projectMilestones;

    // Projects contract address to load some project data.
    address public projectContractAddress;

    // Logged when milestone state changes.
    event MilestoneStateUpdate (
        bytes32 indexed agreementHash,
        address updatedBy,
        uint8 milestoneNumber,
        uint timestamp,
        MilestoneState state
    );

    /**
     * @dev Starts a new milestone for the project and deposit ETH in smart contract`s escrow.
     * @param _agreementHash Project`s unique hash.
     * @param _depositAmount Amount of ETH to deposit for a new milestone.
     * @param _duration Milestone duration in seconds.
     */
    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount,
        uint32 _duration
    )
        public
        payable;

    /**
     * @dev Maker delivers the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function deliverLastMilestone(bytes32 _agreementHash) public;

    /**
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) public;

    /**
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastDeliverable(bytes32 _agreementHash) public;
 
    /**
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     * @param _agreementHash Project`s unique hash.
     */
    function terminateLastMilestone(bytes32 _agreementHash) public;

    /**
     * @dev Returns the last project milestone completion status and number.
     * @param _agreementHash Project's unique hash.
     * @return isAccepted A boolean flag for acceptance state, and milestoneNumber for the last milestone.
     */
    function isLastMilestoneAccepted(
        bytes32 _agreementHash
    )
        public
        returns(bool isAccepted, uint8 milestoneNumber);

    /**
     * @dev Returns true/false depending on if the project can be terminated by client.
     * @param _agreementHash Project`s unique hash.
     */
    function canClientTerminate(bytes32 _agreementHash) public returns(bool);

    /**
     * @dev Returns true/false depending on if the project can be terminated by maker.
     * @param _agreementHash Project`s unique hash.
     */
    function canMakerTerminate(bytes32 _agreementHash) public returns(bool);

    /**
     * @dev Set the new address of deployed project contract.
     * @param _newAddress An address of the new contract.
     */
    function setProjectContractAddress(address _newAddress) public;
}
