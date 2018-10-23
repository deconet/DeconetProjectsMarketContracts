pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "./DecoRelay.sol";
import "./DecoEscrow.sol";
import "./DecoProjects.sol";


contract DecoMilestones is DecoBaseProjectsMarketplace {

    address public constant ETH_TOKEN_ADDRESS = address(0x0);

    // struct to describe Milestone
    struct Milestone {
        uint8 milestoneNumber;

        // original duration of a milestone.
        uint32 duration;

        // track all adjustments caused by state changes Active <-> Delivered <-> Rejected
        // `adjustedDuration` time gets increased by the time that is spent by client
        // to provide a feedback when agreed milestone time is not exceeded yet.
        // Initial value is the same as duration.
        uint32 adjustedDuration;

        uint depositAmount;
        address tokenAddress;

        uint startTime;
        uint deliveryTime;
        bool isAccepted;

        // indicates that a milestone progress was paused.
        bool isOnHold;
    }

    // enumeration to describe possible milestone states. 
    enum MilestoneState { Active, Delivered, Accepted, Rejected, Terminated }

    enum DurationAdjustmentType { Rejected, Unpaused }

    // map agreement id hash to milestones list.
    mapping (bytes32 => Milestone[]) public projectMilestones;

    // `DecoRelay` contract address.
    address public relayContractAddress;

    // Logged when milestone state changes.
    event LogMilestoneStateUpdated (
        bytes32 indexed agreementHash,
        address indexed updatedBy,
        uint timestamp,
        uint8 milestoneNumber,
        MilestoneState indexed state
    );

    event LogMilestoneDurationAdjusted (
        bytes32 indexed agreementHash,
        address indexed sender,
        uint32 amountAdded,
        DurationAdjustmentType indexed adjustmentType
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
        address _tokenAddress,
        uint32 _duration
    )
        external
    {
        uint8 completedMilestonesCount = uint8(projectMilestones[_agreementHash].length);
        if (completedMilestonesCount > 0) {
            Milestone memory lastMilestone = projectMilestones[_agreementHash][completedMilestonesCount - 1];
            require(lastMilestone.isAccepted, "All milestones must be accepted prior starting a new one.");
        }
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(
            projectsContract.getProjectClient(_agreementHash) == msg.sender,
            "Only project's client starts a miestone"
        );
        require(
            projectsContract.getProjectMilestonesCount(_agreementHash) > completedMilestonesCount,
            "Milestones count should not exceed the number configured in the project."
        );
        require(
            projectsContract.getProjectEndDate(_agreementHash) == 0,
            "Project should be active."
        );
        blockFundsInEscrow(
            projectsContract.getProjectEscrowAddress(_agreementHash),
            _depositAmount,
            _tokenAddress
        );
        uint nowTimestamp = now;
        projectMilestones[_agreementHash].push(
            Milestone(
                completedMilestonesCount + 1,
                _duration,
                _duration,
                _depositAmount,
                _tokenAddress,
                nowTimestamp,
                0,
                false,
                false
            )
        );
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            completedMilestonesCount + 1,
            MilestoneState.Active
        );
    }

    /**
     * @dev Maker delivers the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function deliverLastMilestone(bytes32 _agreementHash) external {
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectMaker(_agreementHash) == msg.sender, "Sender must be a maker.");
        uint nowTimestamp = now;
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startTime > 0 && milestone.deliveryTime == 0 && milestone.isAccepted == false,
            "Milestone must be active, not delivered and not accepted."
        );
        require(!milestone.isOnHold, "Milestone must not be paused.");
        milestone.deliveryTime = nowTimestamp;
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            milestonesCount,
            MilestoneState.Delivered
        );
    }

    /**
     * @dev Project owner accepts the current delivered milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function acceptLastMilestone(bytes32 _agreementHash) external {
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectClient(_agreementHash) == msg.sender, "Sender must be a client.");
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startTime > 0 &&
            milestone.isAccepted == false &&
            milestone.deliveryTime > 0 &&
            milestone.isOnHold == false,
            "Milestone should be active and delivered, but not rejected, or already accepted, or put on hold."
        );
        milestone.isAccepted = true;
        if (projectsContract.getProjectMilestonesCount(_agreementHash) == milestonesCount) {
            projectsContract.completeProject(_agreementHash);
        }
        distributeFundsInEscrow(
            projectsContract.getProjectEscrowAddress(_agreementHash),
            projectsContract.getProjectMaker(_agreementHash),
            milestone.depositAmount,
            milestone.tokenAddress
        );
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            now,
            milestonesCount,
            MilestoneState.Accepted
        );
    }

    /**
     * @dev Project owner rejects the current active milestone.
     * @param _agreementHash Project`s unique hash.
     */
    function rejectLastDeliverable(bytes32 _agreementHash) external {
        DecoProjects projectsContract = DecoProjects(
            DecoRelay(relayContractAddress).projectsContractAddress()
        );
        require(projectsContract.checkIfProjectExists(_agreementHash), "Project must exist.");
        require(projectsContract.getProjectEndDate(_agreementHash) == 0, "Project should be active.");
        require(projectsContract.getProjectClient(_agreementHash) == msg.sender, "Sender must be a client.");
        uint8 milestonesCount = uint8(projectMilestones[_agreementHash].length);
        Milestone storage milestone = projectMilestones[_agreementHash][milestonesCount - 1];
        require(
            milestone.startTime > 0 &&
            milestone.isAccepted == false &&
            milestone.deliveryTime > 0 &&
            milestone.isOnHold == false,
            "Milestone should be active and delivered, but not rejected, or already accepted, or put on hold."
        );
        uint nowTimestamp = now;
        if (milestone.startTime.add(milestone.adjustedDuration) > milestone.deliveryTime) {
            milestone.adjustedDuration = milestone.adjustedDuration +
                uint32(nowTimestamp.sub(milestone.deliveryTime));
        }
        milestone.deliveryTime = 0;
        emit LogMilestoneStateUpdated(
            _agreementHash,
            msg.sender,
            nowTimestamp,
            milestonesCount,
            MilestoneState.Rejected
        );
    }

    /**
     * @dev Either project owner or maker can terminate the project in certain cases 
     *      and the current active milestone must be marked as terminated for records-keeping.
     * @param _agreementHash Project`s unique hash.
     */
    function terminateLastMilestone(bytes32 _agreementHash) external {
    }

    /**
     * @dev Set the new address of the `DecoRelay` contract.
     * @param _newAddress An address of the new contract.
     */
    function setRelayContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0x0));
        relayContractAddress = _newAddress;
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
            address tokenAddress,
            uint startTime,
            uint deliveryTime,
            bool isAccepted,
            bool isOnHold
        )
    {
        Milestone[] storage milestones = projectMilestones[_agreementHash];
        if (_position >= milestones.length) {
            return (0, 0, 0, 0, address(0x0), 0, 0, false, false);
        }
        Milestone milestone = milestones[_position];
        return (
            milestone.milestoneNumber,
            milestone.duration,
            milestone.adjustedDuration,
            milestone.depositAmount,
            milestone.tokenAddress,
            milestone.startTime,
            milestone.deliveryTime,
            milestone.isAccepted,
            milestone.isOnHold
        );
    }

    function blockFundsInEscrow(
        address _projectEscrowContractAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(_projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.blockFunds(_amount);
        } else {
            escrow.blockTokenFunds(_tokenAddress, _amount);
        }
    }

    function distributeFundsInEscrow(
        address _projectEscrowContractAddress,
        address _distributionTargetAddress,
        uint _amount,
        address _tokenAddress
    )
        internal
    {
        DecoEscrow escrow = DecoEscrow(_projectEscrowContractAddress);
        if (_tokenAddress == ETH_TOKEN_ADDRESS) {
            escrow.distributeFunds(_distributionTargetAddress, _amount);
        } else {
            escrow.distributeTokenFunds(_distributionTargetAddress, _tokenAddress, _amount);
        }
    }
}
