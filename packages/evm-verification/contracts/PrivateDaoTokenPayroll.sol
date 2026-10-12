// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface PrivateDaoTokenPayrollIERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Token-settled payroll boundary for payment-native EVM networks.
/// Employee data remains off-chain; only the batch commitment and settlement
/// receipt are recorded on-chain.
contract PrivateDaoTokenPayroll {
    enum PayrollStatus { None, Pending, Approved, Settled, Cancelled }

    struct Batch {
        bytes32 batchCommitment;
        address recipient;
        uint256 netAmount;
        PayrollStatus status;
        uint64 createdAt;
        uint64 approvedAt;
        uint64 settledAt;
    }

    address public immutable owner;
    address public immutable token;
    address public maker;
    address public checker;
    mapping(bytes32 => Batch) public batches;
    uint256 private locked;

    event PayrollCreated(bytes32 indexed batchId, bytes32 indexed batchCommitment, address indexed recipient, uint256 netAmount);
    event PayrollApproved(bytes32 indexed batchId, address indexed checker);
    event PayrollSettled(bytes32 indexed batchId, address indexed recipient, uint256 netAmount);
    event PayrollCancelled(bytes32 indexed batchId);

    error NotOwner();
    error NotMaker();
    error NotChecker();
    error InvalidRole();
    error InvalidPayroll();
    error InvalidStatus();
    error InsufficientTreasury();
    error TransferFailed();
    error Reentrancy();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyMaker() { if (msg.sender != maker) revert NotMaker(); _; }
    modifier onlyChecker() { if (msg.sender != checker) revert NotChecker(); _; }
    modifier nonReentrant() { if (locked == 1) revert Reentrancy(); locked = 1; _; locked = 0; }

    constructor(address checkerAddress, address tokenAddress) {
        if (checkerAddress == address(0) || checkerAddress == msg.sender || tokenAddress == address(0)) revert InvalidRole();
        owner = msg.sender;
        token = tokenAddress;
        maker = msg.sender;
        checker = checkerAddress;
    }

    function createPayroll(bytes32 batchId, bytes32 batchCommitment, address recipient, uint256 netAmount) external onlyMaker {
        if (batchId == bytes32(0) || batchCommitment == bytes32(0) || recipient == address(0) || netAmount == 0) revert InvalidPayroll();
        if (batches[batchId].status != PayrollStatus.None) revert InvalidStatus();
        batches[batchId] = Batch(batchCommitment, recipient, netAmount, PayrollStatus.Pending, uint64(block.timestamp), 0, 0);
        emit PayrollCreated(batchId, batchCommitment, recipient, netAmount);
    }

    function approvePayroll(bytes32 batchId) external onlyChecker {
        Batch storage batch = batches[batchId];
        if (batch.status != PayrollStatus.Pending) revert InvalidStatus();
        batch.status = PayrollStatus.Approved;
        batch.approvedAt = uint64(block.timestamp);
        emit PayrollApproved(batchId, msg.sender);
    }

    function cancelPayroll(bytes32 batchId) external onlyMaker {
        Batch storage batch = batches[batchId];
        if (batch.status != PayrollStatus.Pending) revert InvalidStatus();
        batch.status = PayrollStatus.Cancelled;
        emit PayrollCancelled(batchId);
    }

    function settlePayroll(bytes32 batchId) external onlyOwner nonReentrant {
        Batch storage batch = batches[batchId];
        if (batch.status != PayrollStatus.Approved) revert InvalidStatus();
        if (PrivateDaoTokenPayrollIERC20(token).balanceOf(address(this)) < batch.netAmount) revert InsufficientTreasury();
        batch.status = PayrollStatus.Settled;
        batch.settledAt = uint64(block.timestamp);
        if (!PrivateDaoTokenPayrollIERC20(token).transfer(batch.recipient, batch.netAmount)) revert TransferFailed();
        emit PayrollSettled(batchId, batch.recipient, batch.netAmount);
    }
}
