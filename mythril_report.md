# Analysis results for DecoEscrowStub.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrowStub
- Function name: `fallback`
- PC address: 8722

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrowStub.sol:15

## Exception state

- Type: Informational
- Contract: DecoEscrowStub
- Function name: `fallback`
- PC address: 8735

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrowStub.sol:15

# Analysis result for DecoTestToken

No issues found.
# Analysis results for DecoProjectsMock.sol

## Exception state

- Type: Informational
- Contract: DecoProjectsMock
- Function name: `getSupplementalAgreementId(bytes32,uint256)`
- PC address: 3050

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsMock.sol:15

## Exception state

- Type: Informational
- Contract: DecoProjectsMock
- Function name: `clientProjects(address,uint256)`
- PC address: 5257

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsMock.sol:15

# Analysis results for DecoEscrow.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrow
- Function name: `fallback`
- PC address: 8697

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrow.sol:33

### Code

```
nceForA
```

## Exception state

- Type: Informational
- Contract: DecoEscrow
- Function name: `fallback`
- PC address: 8710

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrow.sol:33

### Code

```
;

    // ETH a
```

# Analysis result for SafeMath

No issues found.
# Analysis result for DecoMilestonesStub

No issues found.
# Analysis result for BasicToken

No issues found.
# Analysis result for DecoEscrowFactory

No issues found.
# Analysis result for StandardToken

No issues found.
# Analysis result for DecoBaseProjectsMarketplace

No issues found.
# Analysis result for ECRecovery

No issues found.
# Analysis result for DecoMilestones

No issues found.
# Analysis results for DecoProjects.sol

## Exception state

- Type: Informational
- Contract: DecoProjects
- Function name: `getSupplementalAgreementId(bytes32,uint256)`
- PC address: 2972

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjects.sol:398

### Code

```
additionalAgreements[_position]
```

## Exception state

- Type: Informational
- Contract: DecoProjects
- Function name: `clientProjects(address,uint256)`
- PC address: 5179

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjects.sol:74

### Code

```
mapping (address => bytes32[]) public clientProjects
```

# Analysis results for DecoEscrowMock.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrowMock
- Function name: `fallback`
- PC address: 9802

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrowMock.sol:29

## Exception state

- Type: Informational
- Contract: DecoEscrowMock
- Function name: `fallback`
- PC address: 9815

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrowMock.sol:29

# Analysis results for DecoProjectsStub.sol

## Exception state

- Type: Informational
- Contract: DecoProjectsStub
- Function name: `getSupplementalAgreementId(bytes32,uint256)`
- PC address: 3207

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsStub.sol:26

## Exception state

- Type: Informational
- Contract: DecoProjectsStub
- Function name: `clientProjects(address,uint256)`
- PC address: 5339

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsStub.sol:26

# Analysis result for CloneFactory

No issues found.
# Analysis result for Ownable

No issues found.
# Analysis result for DecoRelay

No issues found.
