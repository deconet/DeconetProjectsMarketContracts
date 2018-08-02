pragma solidity ^0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "./DecoProjects.sol";


contract DecoMilestones {

    // struct to describe Milestone
    struct Milestone {
        uint8 milestoneNumber;
        uint32 duration;

        // track all adjustments caused by state changes Active <-> Delivered <-> Rejected
        // `adjustedDuration` time gets increased by the time that is spent by client
        // to provide a feedback when agreed milestone time is not exceeded yet.
        // Initial value is the same as duration.
        uint32 adjustedDuration; 

        uint depositAmount;
        uint startTime;
        uint deliveryTime;
        bool isAccepted;
    }

    // enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    // map agreement id hash to milestones list.
    mapping (bytes32 => Milestone[]) public projectMilestones;

    // DecoProjects contract address to load some project data.
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
     * @param _agreementHash A `bytes32` hash of the agreement id.
     * @param _depositAmount An `uint` of wei that are going to be deposited for a new milestone.
     * @param _duration An `uint` seconds of a milestone duration.
     */
    function startMilestone(
        bytes32 _agreementHash,
        uint _depositAmount,
        uint32 _duration
    )
        public
        payable
    {
        require(_depositAmount == msg.value);
        uint8 completedMilestonesCount = uint8(projectMilestones[_agreementHash].length);
        DecoProjects projectsContract = DecoProjects(projectContractAddress);
        require(projectsContract.checkIfProjectExists(_agreementHash));
        uint8 numberOfProjectMilestones = projectsContract.getProjectMilestonesCount(_agreementHash);
        require(completedMilestonesCount < numberOfProjectMilestones);
        projectMilestones[_agreementHash].push(
            Milestone(
                completedMilestonesCount + 1,
                _duration,
                _duration,
                _depositAmount,
                now,
                0,
                false
            )
        );
        emit MilestoneStateUpdate(
            _agreementHash,
            msg.sender,
            completedMilestonesCount,
            now,
            MilestoneState.Active
        );
    }

    /**
     * @dev Maker delivers the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function deliverLastMilestone(bytes32 _agreementHash) public {
    }

    /**
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) public {
    }

    /**
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastDeliverable(bytes32 _agreementHash) public {
    }

    /**
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     * @param _agreementHash Project`s unique hash.
     */
    function terminateLastMilestone(bytes32 _agreementHash) public {
    }

    /**
     * @dev Returns the last project milestone completion status and number.
     * @param _agreementHash Project's unique hash.
     * @return isAccepted A boolean flag for acceptance state, and milestoneNumber for the last milestone.
     */
    function isLastMilestoneAccepted(
        bytes32 _agreementHash
    )
        public
        returns(bool isAccepted, uint8 milestoneNumber)
    {
    }

    /**
     * @dev Returns true/false depending on if the project can be terminated by client.
     * @param _agreementHash Project`s unique hash.
     */
    function canClientTerminate(bytes32 _agreementHash) public returns(bool) {
    }

    /**
     * @dev Returns true/false depending on if the project can be terminated by maker.
     * @param _agreementHash Project`s unique hash.
     */
    function canMakerTerminate(bytes32 _agreementHash) public returns(bool) {
    }

    /**
     * @dev Set the new address of deployed project contract.
     * @param _newAddress An address of the new contract.
     */
    function setProjectContractAddress(address _newAddress) public {
        projectContractAddress = _newAddress;
    }

    /**
     * @dev Get the milestone for the given project and at the given position.
     * @param _agreementHash A `bytes32` hash of the agreement id.
     * @param _position An `uint` offset in milestones array for the project.
     * @return A `Milestone` object.
     */
    function getMilestone(
        bytes32 _agreementHash,
        uint _position
    )
        public
        view
        returns(
            uint8 milestoneNumber,
            uint32 duration,
            uint32 adjustedDuration,
            uint depositAmount,
            uint startTime,
            uint deliveryTime,
            bool isAccepted
        )
    {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        if (_position >= milestones.length) {
            return (0, 0, 0, 0, 0, 0, false);
        }
        return (
            milestones[_position].milestoneNumber,
            milestones[_position].duration,
            milestones[_position].adjustedDuration,
            milestones[_position].depositAmount,
            milestones[_position].startTime,
            milestones[_position].deliveryTime,
            milestones[_position].isAccepted
        );
    }
}
