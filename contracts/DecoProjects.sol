pragma solidity 0.4.24;


import "./DecoBaseProjectsMarketplace.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ECRecovery.sol";
import "./DecoMilestones.sol";


contract DecoProjects is DecoBaseProjectsMarketplace {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    // structure to store project details
    struct Project {
        string agreementId;
        address client;
        address maker;
        address arbiter;
        uint startDate;
        uint endDate;
        uint8 paymentWindow;
        uint8 feedbackWindow;
        uint8 milestonesCount;

        uint8 customerSatisfaction;
        uint8 makerSatisfaction;

        bool agreementsEncrypted;
    }

    // enumeration to describe possible project states for easier state changes reporting
    enum ProjectState { Active, Completed, Terminated }

    enum ScoreType { CustomerSatisfaction, MakerSatisfaction }

    // Logged when project state changes.
    event ProjectStateUpdate (
        bytes32 indexed agreementHash,
        address updatedBy,
        uint timestamp,
        ProjectState state
    );

    // Logged when either party rate the other party after the project completion.
    event ProjectRated (
        bytes32 indexed agreementHash,
        address ratedBy,
        uint8 rating,
        uint timestamp
    );

    // Logged when a new supplemental agreement is added.
    event NewSupplementalAgreement(
        bytes32 indexed agreementHash,
        string supplementalAgreementHash,
        uint timestamp
    );

    // maps agreement unique hash to the project details
    mapping (bytes32 => Project) public projects;

    // maps the main agreement to the array of all made by the team documented changes.
    mapping (bytes32 => string[]) public projectChangesAgreements;

    // maps all maker's projects hashes to maker's address
    mapping (address => bytes32[]) public makerProjects;

    // maps all client's projects hashes to client's address 
    mapping (address => bytes32[]) public clientProjects;

    address public milestonesContractAddress;

    // Modifier to restrict method to be called either by project owner or maker
    modifier eitherClientOrMaker(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.client == msg.sender || project.maker == msg.sender,
            "Only project owner or maker can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project owner
    modifier onlyClient(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.client == msg.sender,
            "Only project owner can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project maker
    modifier onlyMaker(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.maker == msg.sender,
            "Only project maker can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by milestones contract and be originated
    // from the client address.
    modifier onlyMilestonesContractAndClientAsOrigin(bytes32 _agreementHash) {
        require(
            msg.sender == milestonesContractAddress,
            "Only milestones contract can perform this operation."
        );
        Project memory project = projects[_agreementHash];
        address transactionOrigin = tx.origin;
        require(transactionOrigin == project.client);
        _;
    }

    /**
     * @dev Creates a new milestones based project with pre-selected maker. All parameters are required.
     * @param _agreementId Unique id of a project`s agreement.
     * @param _client Address of a project owner.
     * @param _arbiter A referee to settle all escalated disputes between parties.
     * @param _maker Address of a maker signed up for a project.
     * @param _makersSignature Digital signature of a maker to proof the makers signed the agreement.
     * @param _milestonesCount Count of planned milestones for the project.
     * @param _paymentWindow Count of days project`s owner has to deposit funds for the next milestone.
     *        If this time exceeded then maker can terminate project.
     * @param _feedbackWindow Time in days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate project and get paid for awaited
     *                        milestone.
     * @param _agreementEncrypted A boolean flag indicating whether or not the agreement is encrypted.
     */
    function startProject(
        string _agreementId,
        address _client,
        address _arbiter,
        address _maker,
        bytes _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow,
        bool _agreementEncrypted
    )
        public
    {
        require(msg.sender == _client, "Only the client can kick of the project.");
        require(_client != _maker, "Client can`t be a maker on her own project.");
        require(
            _arbiter != _maker && _arbiter != _client,
            "Arbiter must not be a client nor a maker."
        );

        bytes32 hash = keccak256(_agreementId);
        address signatureAddress = hash.toEthSignedMessageHash().recover(_makersSignature);
        require(
            signatureAddress == _maker,
            "Maker should sign the hash of immutable agreement doc."
        );

        require(_milestonesCount >= 1 && _milestonesCount <= 24);

        Project storage project = projects[hash];
        require(project.client == address(0x0));

        makerProjects[_maker].push(hash);
        clientProjects[_client].push(hash);

        projects[hash] = Project(
            _agreementId,
            msg.sender,
            _maker,
            _arbiter,
            now,
            0, // end date is unknown yet
            _paymentWindow,
            _feedbackWindow,
            _milestonesCount,
            0, // CSAT is 0 to indicate that it isn't set by maker yet
            0, // MSAT is 0 to indicate that it isn't set by client yet
            _agreementEncrypted
        );
        emit ProjectStateUpdate(hash, msg.sender, now, ProjectState.Active);
    }

    /**
     * @dev Terminate the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function terminateProject(
        bytes32 _agreementHash
    )
        public
        eitherClientOrMaker(_agreementHash)
    {
        Project storage project = projects[_agreementHash];
        require(project.client != address(0x0), "Only allowed for existing projects.");
        require(project.endDate == 0);
        DecoMilestones milestonesContract = DecoMilestones(milestonesContractAddress);
        if (project.client == msg.sender) {
            require(milestonesContract.canClientTerminate(_agreementHash));
        } else {
            require(milestonesContract.canMakerTerminate(_agreementHash));
        }
        milestonesContract.terminateLastMilestone(_agreementHash);

        project.endDate = now;
        emit ProjectStateUpdate(_agreementHash, msg.sender, now, ProjectState.Terminated);
    }

    /**
     * @dev Complete the project.
     * @param _agreementHash Unique id of a project`s agreement.
     */
    function completeProject(
        bytes32 _agreementHash
    )
        public
        onlyMilestonesContractAndClientAsOrigin(_agreementHash)
    {
        Project storage project = projects[_agreementHash];
        require(project.client != address(0x0), "Only allowed for existing projects.");
        require(project.endDate == 0);
        projects[_agreementHash].endDate = now;
        DecoMilestones milestonesContract = DecoMilestones(milestonesContractAddress);
        bool isLastMilestoneAccepted;
        uint8 milestoneNumber;
        (isLastMilestoneAccepted, milestoneNumber) = milestonesContract.isLastMilestoneAccepted(
            _agreementHash
        );
        require(milestoneNumber == projects[_agreementHash].milestonesCount);
        require(isLastMilestoneAccepted);
        emit ProjectStateUpdate(_agreementHash, msg.sender, now, ProjectState.Completed);
    }

    /**
     * @dev Rate the second party on the project.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _rating Either client's or maker's satisfaction value. 
              Min value is 1, max is 10.
     */
    function rateProjectSecondParty(
        bytes32 _agreementHash,
        uint8 _rating
    )
        public
        eitherClientOrMaker(_agreementHash)
    {
        require(_rating >= 1 && _rating <= 10);
        Project storage project = projects[_agreementHash];
        require(project.client != address(0x0), "Only allowed for existing projects.");
        require(project.endDate != 0);
        if (msg.sender == project.client) {
            require(project.customerSatisfaction == 0);
            project.customerSatisfaction = _rating;
        } else {
            require(project.makerSatisfaction == 0);
            project.makerSatisfaction = _rating;
        }
        emit ProjectRated(_agreementHash, msg.sender, _rating, now);
    }

    /**
     * @dev Save supplement agreement to the existing one. All parameters are required.
     * @param _agreementHash Unique id of a project`s agreement.
     * @param _supplementalAgreementHash Unique id of a supplement agreement.
     * @param _makersSignature Digital signature of a maker to proof the makers signed the agreement.
     * @param _milestonesCount Count of planned milestones for the project.
     * @param _paymentWindow Count of days project`s owner has to deposit funds for the next milestone.
     *        If this time exceeded then maker can terminate project.
     * @param _feedbackWindow Time in days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate project and get paid for awaited
     *                        milestone.
     */
    function saveSupplementalAgreement(
        bytes32 _agreementHash,
        string _supplementalAgreementHash,
        bytes _makersSignature,
        uint8 _milestonesCount,
        uint8 _paymentWindow,
        uint8 _feedbackWindow
    )
        public
        onlyClient(_agreementHash)
    {
        bytes32 hash = keccak256(_supplementalAgreementHash);
        address signatureAddress = hash.toEthSignedMessageHash().recover(_makersSignature);
        Project storage project = projects[_agreementHash];
        require(
            signatureAddress == project.maker,
            "Maker should sign the hash of immutable agreement doc."
        );
        require(project.client != address(0x0), "Only allowed for existing projects.");
        DecoMilestones milestonesContract = DecoMilestones(milestonesContractAddress);
        bool isLastMilestoneAccepted;
        uint8 milestoneNumber;
        (isLastMilestoneAccepted, milestoneNumber) = milestonesContract.isLastMilestoneAccepted(
            _agreementHash
        );
        require(milestoneNumber < projects[_agreementHash].milestonesCount);
        require(isLastMilestoneAccepted);
        projectChangesAgreements[_agreementHash].push(_supplementalAgreementHash);
        project.milestonesCount = _milestonesCount;
        project.paymentWindow = _paymentWindow;
        project.feedbackWindow = _feedbackWindow;
        emit NewSupplementalAgreement(_agreementHash, _supplementalAgreementHash, now);
    }

    /**
     * @dev Updates the address of the Milestones contract.
     * @param _newAddress An address of the new instance of Milestones contract.
     */
    function setMilestonesContractAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0x0));
        require(_newAddress != milestonesContractAddress);
        milestonesContractAddress = _newAddress;
    }

    /**
     * @dev Calculates sum and number of CSAT scores of ended & rated projects for the given maker`s address.
     * @param _maker Maker`s address to look up.
     * @return An uint sum of all scores and an uint number of projects counted in sum.
     */
    function makersAverageRating(address _maker) public view returns(uint, uint) {
        return calculateScore(_maker, ScoreType.CustomerSatisfaction);
    }

    /**
     * @dev Calculates sum and number of MSAT scores of ended & rated projects for the given client`s address.
     * @param _client Client`s address to look up.
     * @return An uint sum of all scores and an uint number of projects counted in sum.
     */
    function clientsAverageRating(address _client) public view returns(uint, uint) {
        return calculateScore(_client, ScoreType.MakerSatisfaction);
    }

    /**
     * @dev Returns hashes of all client`s projects
     * @param _client An address to look up.
     * @return An array of bytes32 hashes.
     */
    function getClientProjects(address _client) public view returns(bytes32[]) {
        return clientProjects[_client];
    }

    /**
     * @dev Returns hashes of all maker`s projects
     * @param _maker An address to look up.
     * @return An array of bytes32 hashes.
     */
    function getMakerProjects(address _maker) public view returns(bytes32[]) {
        return makerProjects[_maker];
    }

    /**
     * @dev Calculates average score of a given address as a maker or a client.
     * @param _address Address of a target person.
     * @param _scoreType Indicates what score type should be calculated.
     *        `CustomerSatisfaction` type means that CSAT score for this address
     *        as a maker should be calculated.
     *        `MakerSatisfaction` type means that MSAT score for this address
     *        as a client should be calculated.
     * @return An uint sum of all scores and an uint number of projects counted in sum.
     */
    function calculateScore(
        address _address,
        ScoreType _scoreType
    )
        internal
        view
        returns(uint, uint)
    {
        bytes32[] memory allProjectsHashes = getProjectsByScoreType(_address, _scoreType);
        uint rating = 0;
        uint endedProjectsCount = 0;
        for (uint index = 0; index < allProjectsHashes.length; index++) {
            bytes32 agreementHash = allProjectsHashes[index];
            if (projects[agreementHash].endDate == 0) {
                continue;
            }
            uint8 score = getProjectScoreByType(agreementHash, _scoreType);
            if (score == 0) {
                continue;
            }
            endedProjectsCount++;
            rating = rating.add(score);
        }
        return (rating, endedProjectsCount);
    }

    /**
     * @dev Returns all projects for the given address depending on desired score type.
     * @param _address An address to look up.
     * @param _scoreType A score type to identify projects source.
     * @return bytes32[] An array of projects hashes either from `clientProjects` or `makerProjects`.
     */
    function getProjectsByScoreType(address _address, ScoreType _scoreType) internal view returns(bytes32[]) {
        if (_scoreType == ScoreType.CustomerSatisfaction) {
            return makerProjects[_address];
        } else if (_scoreType == ScoreType.MakerSatisfaction) {
            return clientProjects[_address];
        } else {
            return new bytes32[](0);
        }
    }

    /**
     * @dev Returns project score by the given type.
     * @param _agreementHash A hash of the project.
     * @param _scoreType A score type to identify what score is requested.
     * @return An uint8 score of the given project and of the given type.
     */
    function getProjectScoreByType(bytes32 _agreementHash, ScoreType _scoreType) internal view returns(uint8) {
        if (_scoreType == ScoreType.CustomerSatisfaction) {
            return projects[_agreementHash].customerSatisfaction;
        } else if (_scoreType == ScoreType.MakerSatisfaction) {
            return projects[_agreementHash].makerSatisfaction;
        } else {
            return 0;
        }
    }
}
