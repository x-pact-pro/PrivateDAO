// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal product-specific payroll settlement boundary.
/// Sensitive payroll data stays off-chain; only a batch commitment and the
/// approved payout are bound to the on-chain settlement receipt.
contract PrivateDaoPayroll {
    enum PayrollStatus { None, Pending, Approved, Settled, Cancelled }

    struct Batch {
        bytes32 batchCommitment;
        address payable recipient;
        uint256 netAmount;
        PayrollStatus status;
        uint64 createdAt;
        uint64 approvedAt;
        uint64 settledAt;
    }

    address public immutable owner;
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

    constructor(address checkerAddress) {
        if (checkerAddress == address(0) || checkerAddress == msg.sender) revert InvalidRole();
        owner = msg.sender;
        maker = msg.sender;
        checker = checkerAddress;
    }

    receive() external payable {}

    function createPayroll(bytes32 batchId, bytes32 batchCommitment, address payable recipient, uint256 netAmount) external onlyMaker {
        if (batchId == bytes32(0) || batchCommitment == bytes32(0) || recipient == address(0) || netAmount == 0) revert InvalidPayroll();
        if (batches[batchId].status != PayrollStatus.None) revert InvalidStatus();
        batches[batchId] = Batch({
            batchCommitment: batchCommitment,
            recipient: recipient,
            netAmount: netAmount,
            status: PayrollStatus.Pending,
            createdAt: uint64(block.timestamp),
            approvedAt: 0,
            settledAt: 0
        });
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
        if (address(this).balance < batch.netAmount) revert InsufficientTreasury();
        batch.status = PayrollStatus.Settled;
        batch.settledAt = uint64(block.timestamp);
        (bool sent, ) = batch.recipient.call{value: batch.netAmount}("");
        if (!sent) revert TransferFailed();
        emit PayrollSettled(batchId, batch.recipient, batch.netAmount);
    }
}
