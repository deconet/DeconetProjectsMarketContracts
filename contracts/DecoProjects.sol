pragma solidity 0.4.24;


import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ECRecovery.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "./DecoMilestones.sol";


contract DecoProjects is DecoBaseProjectsMarketplace {
    using SafeMath for uint256;
    using ECRecovery for bytes32;

    // struct for project details
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

    // enumeration to describe possible project states for easier state changes reporting.
    enum ProjectState { Active, Completed, Terminated }

    // enumeration to describe possible satisfaction score types.
    enum ScoreType { CustomerSatisfaction, MakerSatisfaction }

    // Logged when a project state changes.
    event ProjectStateUpdate (
        bytes32 indexed agreementHash,
        address updatedBy,
        uint timestamp,
        ProjectState state
    );

    // Logged when either party sets satisfaction score after the completion of a project.
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

    // maps the agreement`s unique hash to the project details.
    mapping (bytes32 => Project) public projects;

    // maps the project`s agreement hash to the array of all made by the team documented changes.
    mapping (bytes32 => string[]) public projectChangesDocumentsIds;

    // maps hashes of all maker's projects to the maker's address.
    mapping (address => bytes32[]) public makerProjects;

    // maps hashes of all client's projects to the client's address.
    mapping (address => bytes32[]) public clientProjects;

    // stores the address of the `DecoMilestones` contract.
    address public milestonesContractAddress;

    // Modifier to restrict method to be called either by project`s owner or maker
    modifier eitherClientOrMaker(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.client == msg.sender || project.maker == msg.sender,
            "Only project owner or maker can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project`s owner
    modifier onlyProjectOwner(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.client == msg.sender,
            "Only project owner can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by project`s maker
    modifier onlyMaker(bytes32 _agreementHash) {
        Project memory project = projects[_agreementHash];
        require(
            project.maker == msg.sender,
            "Only project maker can perform this operation."
        );
        _;
    }

    // Modifier to restrict method to be called by the milestones contract and be originated from the client`s address.
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
     * @dev Creates a new milestone-based project with pre-selected maker and owner. All parameters are required.
     * @param _agreementId A `string` unique id of the agreement document for that project.
     * @param _client An `address` of the project owner.
     * @param _arbiter An `address` of the referee to settle all escalated disputes between parties.
     * @param _maker An `address` of the project`s maker.
     * @param _makersSignature A `bytes` digital signature of the maker to proof the agreement acceptance.
     * @param _milestonesCount An `uint8` count of planned milestones for the project.
     * @param _paymentWindow An `uint8` count of days project`s owner has to deposit funds for the next milestone.
     *        If this time is exceeded then the maker can terminate the project.
     * @param _feedbackWindow An `uint8` time in days project`s owner has to provide feedback for the last milestone.
     *                        If that time is exceeded then maker can terminate the project and get paid for awaited
     *                        milestone.
     * @param _agreementEncrypted A `bool` flag indicating whether or not the agreement is encrypted.
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
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
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
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
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
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @param _rating An `uint8` satisfaction score of either client or maker.
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
     * @dev Save supplement agreement id linked to the existing project agreement. All parameters are required.
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @param _supplementalAgreementHash A `string` unique id of a supplemental agreement doc.
     * @param _makersSignature A `bytes` digital signature of the maker to proof the acceptance of
     *                         the new supplemental agreement.
     * @param _milestonesCount An `uint8` number of planned milestones for the project.
     * @param _paymentWindow An `uint8` number of days project`s owner has to deposit funds for the next milestone.
     *        If this time is exceeded then maker can terminate the project.
     * @param _feedbackWindow An `uint8` number of days project`s owner has to provide feedback for the last milestone.
     *                        If the time is exceeded then maker can terminate the project and get paid for
     *                        the awaited milestone.
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
        onlyProjectOwner(_agreementHash)
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
        projectChangesDocumentsIds[_agreementHash].push(_supplementalAgreementHash);
        project.milestonesCount = _milestonesCount;
        project.paymentWindow = _paymentWindow;
        project.feedbackWindow = _feedbackWindow;
        emit NewSupplementalAgreement(_agreementHash, _supplementalAgreementHash, now);
    }

    /**
     * @dev Updates the address of the DecoMilestones contract.
     * @param _newAddress An `address` of the new contract instance.
     */
    function setMilestonesContractAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0x0));
        require(_newAddress != milestonesContractAddress);
        milestonesContractAddress = _newAddress;
    }

    /**
     * @dev Calculates sum and number of CSAT scores of ended & rated projects for the given maker`s address.
     * @param _maker An `address` of the maker to look up.
     * @return An `uint` sum of all scores and an `uint` number of projects counted in sum.
     */
    function makersAverageRating(address _maker) public view returns(uint, uint) {
        return calculateScore(_maker, ScoreType.CustomerSatisfaction);
    }

    /**
     * @dev Calculates sum and number of MSAT scores of ended & rated projects for the given client`s address.
     * @param _client An `address` of the client to look up.
     * @return An `uint` sum of all scores and an `uint` number of projects counted in sum.
     */
    function clientsAverageRating(address _client) public view returns(uint, uint) {
        return calculateScore(_client, ScoreType.MakerSatisfaction);
    }

    /**
     * @dev Returns hashes of all client`s projects
     * @param _client An `address` to look up.
     * @return `bytes32[]` of projects hashes.
     */
    function getClientProjects(address _client) public view returns(bytes32[]) {
        return clientProjects[_client];
    }

    /**
      @dev Returns hashes of all maker`s projects
     * @param _maker An `address` to look up.
     * @return `bytes32[]` of projects hashes.
     */
    function getMakerProjects(address _maker) public view returns(bytes32[]) {
        return makerProjects[_maker];
    }

    /**
     * @dev Checks if a project with the given hash exists.
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @return A `bool` stating for the project`s existence.
    */
    function checkIfProjectExists(bytes32 _agreementHash) public view returns(bool) {
        return projects[_agreementHash].client != address(0x0);
    }

    /**
     * @dev Returns preconfigured count of milestones for a project with the given hash.
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @return An `uint8` count of milestones set upon the project creation.
    */
    function getProjectMilestonesCount(bytes32 _agreementHash) public view returns(uint8) {
        return projects[_agreementHash].milestonesCount;
    }

    /**
     * @dev Returns count of already added agreements for a project with the given hash.
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @return An `uint` count of project`s supplemental agreements.
    */
    function getSupplementalAgreementsCount(bytes32 _agreementHash) public view returns(uint) {
        return projectChangesDocumentsIds[_agreementHash].length;
    }

    /**
     * @dev Returns id of a supplemental agreement for a project with the given hash and at the given  position.
     * @param _agreementHash A `bytes32` hash of the project`s agreement id.
     * @param _position An `uint` offset in supplemental agreements array.
     * @return A `string` id of the agreement.
    */
    function getSupplementalAgreementId(bytes32 _agreementHash, uint _position) public view returns(string) {
        string[] storage additionalAgreements = projectChangesDocumentsIds[_agreementHash];
        if (additionalAgreements.length > 0) {
            return additionalAgreements[_position];
        } else {
            return "";
        }
    }

    /**
     * @dev Calculates the sum of scores and the number of ended and rated projects for the given client`s or
     *      maker`s address.
     * @param _address An `address` to look up.
     * @param _scoreType A `ScoreType` indicating what score should be calculated.
     *        `CustomerSatisfaction` type means that CSAT score for the given address as a maker should be calculated.
     *        `MakerSatisfaction` type means that MSAT score for the given address as a client should be calculated.
     * @return An `uint` sum of all scores and an `uint` number of projects counted in sum.
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
     * @dev Returns all projects for the given address depending on the provided score type.
     * @param _address An `address` to look up.
     * @param _scoreType A `ScoreType` to identify projects source.
     * @return `bytes32[]` of projects hashes either from `clientProjects` or `makerProjects` storage arrays.
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
     * @param _agreementHash A `bytes32` hash of a project`s agreement id.
     * @param _scoreType A `ScoreType` to identify what score is requested.
     * @return An `uint8` score of the given project and of the given type.
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
