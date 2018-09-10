pragma solidity 0.4.24;

import "./DecoMilestones.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract DecoEscrow is Ownable {
    using SafeMath for uint256;

    // Indicates if the current clone has been initialized.
    bool internal isInitialized;

    // Authorized party for executing funds distribution operations.
    address public authorizedAddress;

    // State variable to track available ETH Escrow owner balance.
    // Anything that is not blocked or distributed in favor of any party can be withdrawn by the owner.
    uint public balance;

    // Mapping of available for withdrawal funds by the address.
    // Accounted amounts are excluded from the `balance`.
    mapping (address => uint) public withdrawalAllowanceForAddress;

    // Maps information about the amount of deposited ERC20 token to the token address.
    mapping(address => uint) public tokensBalance;

    /**
     * Mapping of ERC20 tokens amounts to token addresses that are available for withdrawal for a given address.
     * Accounted here amounts are excluded from the `tokensBalance`.
     */
    mapping(address => mapping(address => uint)) public tokensWithdrawalAllowanceForAddress;

    // ETH amount blocked in Escrow.
    // `balance` excludes this amount.
    uint public blockedBalance;

    // Mapping of the amount of ERC20 tokens to the the token address that are blocked in Escrow.
    // A token value in `tokensBalance` excludes stored here amount.
    mapping(address => uint) public blockedTokensBalance;

    // Logged when an operation with funds occurred.
    event FundsOperation (
        address indexed sender,
        address indexed target,
        address tokenAddress,
        uint amount,
        PaymentType paymentType,
        OperationType indexed operationType
    );

    // Logged when the given address authorization to distribute Escrow funds changed.
    event FundsDistributionAuthorization (
        address targetAddress,
        bool isAuthorized
    );

    // Accepted types of payments.
    enum PaymentType { Ether, Erc20 }

    // Possible operations with funds.
    enum OperationType { Receive, Send, Block, Unblock, Distribute }

    // Restrict function call to be originated from an address that was authorized to distribute funds.
    modifier onlyAuthorized() {
        require(authorizedAddress == msg.sender);
        _;
    }

    /**
     * @dev Default `payable` fallback to accept incoming ETH from any address.
     */
    function () public payable {
        deposit();
    }

    /**
     * @dev Initialize the Escrow clone with default values.
     * @param _newOwner An address of a new escrow owner.
     * @param _authorizedAddress An address that will be stored as authorized.
     */
    function initialize(address _newOwner, address _authorizedAddress) external {
        require(!isInitialized);
        isInitialized = true;
        authorizedAddress = _authorizedAddress;
        emit FundsDistributionAuthorization(_authorizedAddress, true);
        _transferOwnership(_newOwner);
    }

    /**
     * @dev Start transfering the given amount of the ERC20 tokens available by provided address.
     * @param _tokenAddress ERC20 token contract address.
     * @param _amount Amount to transfer from sender`s address.
     */
    function depositErc20(address _tokenAddress, uint _amount) external {
        require(_tokenAddress != address(0x0));
        ERC20 token = ERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _amount));
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].add(_amount);
        emit FundsOperation (
            msg.sender,
            address(this),
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Receive
        );
    }

    /**
     * @dev Withdraw the given amount of ETH to sender`s address if allowance or contract balance is sufficient.
     * @param _amount Amount to withdraw.
     */
    function withdraw(uint _amount) external {
        require(_amount <= address(this).balance);
        if (msg.sender == owner) {
            balance = balance.sub(_amount);
        } else {
            uint withdrawalAllowance = withdrawalAllowanceForAddress[msg.sender];
            withdrawalAllowanceForAddress[msg.sender] = withdrawalAllowance.sub(_amount);
        }
        msg.sender.transfer(_amount);
        emit FundsOperation (
            address(this),
            msg.sender,
            address(0x0),
            _amount,
            PaymentType.Ether,
            OperationType.Send
        );
    }

    /**
     * @dev Withdraw the given amount of ERC20 token to sender`s address if allowance or contract balance is sufficient.
     * @param _tokenAddress ERC20 token address.
     * @param _amount Amount to withdraw.
     */
    function withdrawErc20(address _tokenAddress, uint _amount) external {
        ERC20 token = ERC20(_tokenAddress);
        require(_amount <= token.balanceOf(this));
        if (msg.sender == owner) {
            tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].sub(_amount);
        } else {
            uint tokenWithdrawalAllowance = getTokenWithdrawalAllowance(msg.sender, _tokenAddress);
            tokensWithdrawalAllowanceForAddress[msg.sender][_tokenAddress] =
                tokenWithdrawalAllowance.sub(_amount);
        }
        token.transfer(msg.sender, _amount);
        emit FundsOperation (
            address(this),
            msg.sender,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Send
        );
    }

    /**
     * @dev Block funds for future use by authorized party stored in `authorizedAddress`.
     * @param _amount An uint of Wei to be blocked.
     */
    function blockFunds(uint _amount) external onlyAuthorized {
        require(_amount <= balance);
        balance = balance.sub(_amount);
        blockedBalance = blockedBalance.add(_amount);
        emit FundsOperation (
            address(this),
            msg.sender,
            address(0x0),
            _amount,
            PaymentType.Ether,
            OperationType.Block
        );
    }

    /**
     * @dev Blocks ERC20 tokens funds for future use by authorized party listed in `authorizedAddress`.
     * @param _tokenAddress An address of ERC20 token.
     * @param _amount An uint of tokens to be blocked.
     */
    function blockTokenFunds(address _tokenAddress, uint _amount) external onlyAuthorized {
        uint accountedTokensBalance = tokensBalance[_tokenAddress];
        require(_amount <= accountedTokensBalance);
        tokensBalance[_tokenAddress] = accountedTokensBalance.sub(_amount);
        blockedTokensBalance[_tokenAddress] = blockedTokensBalance[_tokenAddress].add(_amount);
        emit FundsOperation (
            address(this),
            msg.sender,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Block
        );
    }

    /**
     * @dev Distribute funds between contract`s balance and allowance for some address.
     *  Deposit may be returned back to the contract address, i.e. to the escrow owner.
     *  Or deposit may flow to the allowance for an address as a result of an evidence
     *  given by an authorized party about fullfilled obligations.
     * @param _destination Destination address for funds distribution.
     * @param _amount Amount to distribute in favor of a destination address.
     */
    function distributeFunds(
        address _destination,
        uint _amount
    )
        external
        onlyAuthorized
    {
        if (_destination == owner) {
            unblockFunds(_amount);
            return;
        }
        require(_amount <= blockedBalance);
        blockedBalance = blockedBalance.sub(_amount);
        withdrawalAllowanceForAddress[_destination] = withdrawalAllowanceForAddress[_destination].add(_amount);
        emit FundsOperation(
            msg.sender,
            _destination,
            address(0x0),
            _amount,
            PaymentType.Ether,
            OperationType.Distribute
        );
    }

    /**
     * @dev Distribute ERC20 token funds between contract`s balance and allowanc for some address.
     *      Deposit may be returned back to the contract address, i.e. to the escrow owner.
     *      Or deposit may flow to the allowance for an address as a result of an evidence
     *      given by authorized party about fullfilled obligations.
     * @param _destination Destination address for funds distribution.
     * @param _tokenAddress ERC20 Token address.
     * @param _amount Amount to distribute in favor of a destination address.
     */
    function distributeTokenFunds(
        address _destination,
        address _tokenAddress,
        uint _amount
    )
        external
        onlyAuthorized
    {
        if(_destination == owner) {
            unblockTokenFunds(_tokenAddress, _amount);
            return;
        }
        blockedTokensBalance[_tokenAddress] = blockedTokensBalance[_tokenAddress].sub(_amount);
        uint allowanceForSender = tokensWithdrawalAllowanceForAddress[_destination][_tokenAddress];
        tokensWithdrawalAllowanceForAddress[_destination][_tokenAddress] = allowanceForSender.add(_amount);
        emit FundsOperation(
            msg.sender,
            _destination,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Distribute
        );
    }

    /**
     * @dev Returns allowance for withdrawing the given token for sender address.
     * @param _tokenAddress An address of ERC20 token.
     * @return An uint value of allowance.
     */
    function getTokenWithdrawalAllowance(address _account, address _tokenAddress) public view returns(uint) {
        return tokensWithdrawalAllowanceForAddress[_account][_tokenAddress];
    }

    /**
     * @dev Accept and account incoming deposit in contract state.
     */
    function deposit() public payable {
        require(msg.value > 0);
        balance = balance.add(msg.value);
        emit FundsOperation (
            msg.sender,
            address(this),
            address(0x0),
            msg.value,
            PaymentType.Ether,
            OperationType.Receive
        );
    }

    /**
     * @dev Unblock blocked funds and make them available to the contract owner.
     * @param _amount An uint of Wei to be unblocked.
     */
    function unblockFunds(uint _amount) public onlyAuthorized {
        require(_amount <= blockedBalance);
        blockedBalance = blockedBalance.sub(_amount);
        balance = balance.add(_amount);
        emit FundsOperation (
            msg.sender,
            address(this),
            address(0x0),
            _amount,
            PaymentType.Ether,
            OperationType.Unblock
        );
    }

    /**
     * @dev Unblock blocked token funds and make them available to the contract owner.
     * @param _amount An uint of Wei to be unblocked.
     */
    function unblockTokenFunds(address _tokenAddress, uint _amount) public onlyAuthorized {
        uint accountedBlockedTokensAmount = blockedTokensBalance[_tokenAddress];
        require(_amount <= accountedBlockedTokensAmount);
        blockedTokensBalance[_tokenAddress] = accountedBlockedTokensAmount.sub(_amount);
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].add(_amount);
        emit FundsOperation (
            msg.sender,
            address(this),
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Unblock
        );
    }

}
