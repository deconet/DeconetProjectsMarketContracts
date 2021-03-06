pragma solidity 0.4.25;

import "./DecoMilestones.sol";
import "./DecoRelay.sol";
import "./DecoBaseProjectsMarketplace.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";


/**
 * @title Escrow contract, every project deploys a clone and transfer ownership to the project client, so all
 *        funds not reserved to pay for a milestone can be safely moved in/out.
 */
contract DecoEscrow is DecoBaseProjectsMarketplace {
    using SafeMath for uint256;

    // Indicates if the current clone has been initialized.
    bool internal isInitialized;

    // Stores share fee that should apply on any successful distribution.
    uint8 public shareFee;

    // Authorized party for executing funds distribution operations.
    address public authorizedAddress;

    // State variable to track available ETH Escrow owner balance.
    // Anything that is not blocked or distributed in favor of any party can be withdrawn by the owner.
    uint public balance;

    // Mapping of available for withdrawal funds by the address.
    // Accounted amounts are excluded from the `balance`.
    mapping (address => uint) public withdrawalAllowanceForAddress;

    // Maps information about the amount of deposited and not blocked ERC20 token to the token address.
    mapping(address => uint) public tokensBalance;

    // Map information about the amount of tokens that is deposited into the contract address.
    // This mapping may have less amount stored than actual contract tokens balance, to sync and update values
    // use the function `syncTokenBalance(address _tokenAddress)` below.
    mapping(address => uint) public contractTokensBalance;

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
        require(authorizedAddress == msg.sender, "Only authorized addresses allowed.");
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
    function initialize(
        address _newOwner,
        address _authorizedAddress,
        uint8 _shareFee,
        address _relayContractAddress
    )
        external
    {
        require(!isInitialized, "Only uninitialized contracts allowed.");
        isInitialized = true;
        authorizedAddress = _authorizedAddress;
        emit FundsDistributionAuthorization(_authorizedAddress, true);
        _transferOwnership(_newOwner);
        shareFee = _shareFee;
        relayContractAddress = _relayContractAddress;
    }

    /**
     * @dev Start transfering the given amount of the ERC20 tokens available by provided address.
     * @param _tokenAddress ERC20 token contract address.
     * @param _amount Amount to transfer from sender`s address.
     */
    function depositErc20(address _tokenAddress, uint _amount) external {
        require(_tokenAddress != address(0x0), "Token Address shouldn't be 0x0.");
        IERC20 token = IERC20(_tokenAddress);
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer operation should be successful."
        );
        tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].add(_amount);
        contractTokensBalance[_tokenAddress] = contractTokensBalance[_tokenAddress].add(_amount);
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
        withdrawForAddress(msg.sender, _amount);
    }

    /**
     * @dev Withdraw the given amount of ERC20 token to sender`s address if allowance or contract balance is sufficient.
     * @param _tokenAddress ERC20 token address.
     * @param _amount Amount to withdraw.
     */
    function withdrawErc20(address _tokenAddress, uint _amount) external {
        withdrawErc20ForAddress(msg.sender, _tokenAddress, _amount);
    }

    /**
     * @dev Block funds for future use by authorized party stored in `authorizedAddress`.
     * @param _amount An uint of Wei to be blocked.
     */
    function blockFunds(uint _amount) external onlyAuthorized {
        require(_amount <= balance, "Amount to block should be less or equal than balance.");
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
        require(
            _amount <= accountedTokensBalance,
            "Tokens mount to block should be less or equal than balance."
        );
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
     *  **IMPORTANT** This operation includes fees deduction.
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
        require(
            _amount <= blockedBalance,
            "Amount to distribute should be less or equal than blocked balance."
        );
        uint amount = _amount;
        if (shareFee > 0 && relayContractAddress != address(0x0)) {
            DecoRelay relayContract = DecoRelay(relayContractAddress);
            address feeDestination = relayContract.feesWithdrawalAddress();
            uint fee = amount.mul(shareFee).div(100);
            amount = amount.sub(fee);
            blockedBalance = blockedBalance.sub(fee);
            withdrawalAllowanceForAddress[feeDestination] =
                withdrawalAllowanceForAddress[feeDestination].add(fee);
            emit FundsOperation(
                msg.sender,
                feeDestination,
                address(0x0),
                fee,
                PaymentType.Ether,
                OperationType.Distribute
            );
        }
        if (_destination == owner()) {
            unblockFunds(amount);
            return;
        }
        blockedBalance = blockedBalance.sub(amount);
        withdrawalAllowanceForAddress[_destination] = withdrawalAllowanceForAddress[_destination].add(amount);
        emit FundsOperation(
            msg.sender,
            _destination,
            address(0x0),
            amount,
            PaymentType.Ether,
            OperationType.Distribute
        );
    }

    /**
     * @dev Distribute ERC20 token funds between contract`s balance and allowanc for some address.
     *  Deposit may be returned back to the contract address, i.e. to the escrow owner.
     *  Or deposit may flow to the allowance for an address as a result of an evidence
     *  given by authorized party about fullfilled obligations.
     *  **IMPORTANT** This operation includes fees deduction.
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
        require(
            _amount <= blockedTokensBalance[_tokenAddress],
            "Amount to distribute should be less or equal than blocked balance."
        );
        uint amount = _amount;
        if (shareFee > 0 && relayContractAddress != address(0x0)) {
            DecoRelay relayContract = DecoRelay(relayContractAddress);
            address feeDestination = relayContract.feesWithdrawalAddress();
            uint fee = amount.mul(shareFee).div(100);
            amount = amount.sub(fee);
            blockedTokensBalance[_tokenAddress] = blockedTokensBalance[_tokenAddress].sub(fee);
            uint allowance = tokensWithdrawalAllowanceForAddress[feeDestination][_tokenAddress];
            tokensWithdrawalAllowanceForAddress[feeDestination][_tokenAddress] = allowance.add(fee);
            emit FundsOperation(
                msg.sender,
                feeDestination,
                _tokenAddress,
                fee,
                PaymentType.Erc20,
                OperationType.Distribute
            );
        }
        if (_destination == owner()) {
            unblockTokenFunds(_tokenAddress, amount);
            return;
        }
        blockedTokensBalance[_tokenAddress] = blockedTokensBalance[_tokenAddress].sub(amount);
        uint allowanceForSender = tokensWithdrawalAllowanceForAddress[_destination][_tokenAddress];
        tokensWithdrawalAllowanceForAddress[_destination][_tokenAddress] = allowanceForSender.add(amount);
        emit FundsOperation(
            msg.sender,
            _destination,
            _tokenAddress,
            amount,
            PaymentType.Erc20,
            OperationType.Distribute
        );
    }

    /**
     * @dev Withdraws ETH amount from the contract's balance to the provided address.
     * @param _targetAddress An `address` for transfer ETH to.
     * @param _amount An `uint` amount to be transfered.
     */
    function withdrawForAddress(address _targetAddress, uint _amount) public {
        require(
            _amount <= address(this).balance,
            "Amount to withdraw should be less or equal than balance."
        );
        if (_targetAddress == owner()) {
            balance = balance.sub(_amount);
        } else {
            uint withdrawalAllowance = withdrawalAllowanceForAddress[_targetAddress];
            withdrawalAllowanceForAddress[_targetAddress] = withdrawalAllowance.sub(_amount);
        }
        _targetAddress.transfer(_amount);
        emit FundsOperation (
            address(this),
            _targetAddress,
            address(0x0),
            _amount,
            PaymentType.Ether,
            OperationType.Send
        );
    }

    /**
     * @dev Withdraws ERC20 token amount from the contract's balance to the provided address.
     * @param _targetAddress An `address` for transfer tokens to.
     * @param _tokenAddress An `address` of ERC20 token.
     * @param _amount An `uint` amount of ERC20 tokens to be transfered.
     */
    function withdrawErc20ForAddress(address _targetAddress, address _tokenAddress, uint _amount) public {
        IERC20 token = IERC20(_tokenAddress);
        require(
            _amount <= token.balanceOf(this),
            "Token amount to withdraw should be less or equal than balance."
        );
        if (_targetAddress == owner()) {
            tokensBalance[_tokenAddress] = tokensBalance[_tokenAddress].sub(_amount);
        } else {
            uint tokenWithdrawalAllowance = getTokenWithdrawalAllowance(_targetAddress, _tokenAddress);
            tokensWithdrawalAllowanceForAddress[_targetAddress][_tokenAddress] = tokenWithdrawalAllowance.sub(
                _amount
            );
        }
        contractTokensBalance[_tokenAddress] = contractTokensBalance[_tokenAddress].sub(_amount);
        token.transfer(_targetAddress, _amount);
        emit FundsOperation (
            address(this),
            _targetAddress,
            _tokenAddress,
            _amount,
            PaymentType.Erc20,
            OperationType.Send
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
        require(msg.value > 0, "Deposited amount should be greater than 0.");
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
        require(
            _amount <= blockedBalance,
            "Amount to unblock should be less or equal than balance"
        );
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
        require(
            _amount <= accountedBlockedTokensAmount,
            "Tokens amount to unblock should be less or equal than balance"
        );
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

    /**
     * @dev Sync actual token balance, save to the storage, and reflect changes in `tokensBalance` mapping.
     *      ERC20 tokens may be deployed directly to this contract address from anywhere and to make funds
     *      available for distibution/blocking/withdrawing this method should be called to align stored
     *      contact balance with the actual one.
     * @param _token An `IERC20` token.
     */
    function syncTokenBalance(IERC20 _token) public {
        uint contractTokenBalance = _token.balanceOf(address(this));
        require(
            isSyncNeededForToken(_token),
            "Stored contract token balance should be less or equal than the actual one."
        );
        tokensBalance[_token] =
            contractTokenBalance.sub(contractTokensBalance[_token]).add(tokensBalance[_token]);
        contractTokensBalance[_token] = contractTokenBalance;
    }

    /**
     * @dev Helper to determine if sync of the balance for token is required.
     * @param _token An `IERC20` token.
     * @return `true` if the real token balance is greater than stored one, otherwise – `false`.
     */
    function isSyncNeededForToken(IERC20 _token) public view returns(bool) {
        return _token.balanceOf(address(this)) > contractTokensBalance[_token];
    }

    /**
     * @dev Override base contract logic to block this operation for Escrow contract.
     * @param _tokenAddress An `address` of an ERC20 token.
     * @param _tokens An `uint` tokens amount.
     * @return A `bool` operation result state.
     */
    function transferAnyERC20Token(
        address _tokenAddress,
        uint _tokens
    )
        public
        onlyOwner
        returns (bool success)
    {
        return false;
    }
}
