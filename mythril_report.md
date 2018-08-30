# Analysis results for DecoEscrowStub.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrowStub
- Function name: `fallback`
- PC address: 3029

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrowStub.sol:18

## Exception state

- Type: Informational
- Contract: DecoEscrowStub
- Function name: `fallback`
- PC address: 3042

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrowStub.sol:18

# Analysis results for DecoProjectsMock.sol

## Exception state

- Type: Informational
- Contract: DecoProjectsMock
- Function name: `getSupplementalAgreementId(bytes32,uint256)`
- PC address: 3156

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsMock.sol:26

## Exception state

- Type: Informational
- Contract: DecoProjectsMock
- Function name: `clientProjects(address,uint256)`
- PC address: 4911

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjectsMock.sol:26

# Analysis results for DecoEscrow.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrow
- Function name: `fallback`
- PC address: 2694

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrow.sol:31

### Code

```
given
```

## Exception state

- Type: Informational
- Contract: DecoEscrow
- Function name: `fallback`
- PC address: 2707

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrow.sol:31

### Code

```
ss.
     * Acc
```

# Analysis result for SafeMath

No issues found.
# Analysis result for DecoEscrowFactory

No issues found.
# Analysis result for DecoMilestonesMock

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
- PC address: 2921

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjects.sol:387

### Code

```
additionalAgreements[_position]
```

## Exception state

- Type: Informational
- Contract: DecoProjects
- Function name: `clientProjects(address,uint256)`
- PC address: 4751

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoProjects.sol:71

### Code

```
mapping (address => bytes32[]) public clientProjects
```

# Analysis results for DecoEscrowMock.sol

## Integer Overflow

- Type: Warning
- Contract: DecoEscrowMock
- Function name: `fallback`
- PC address: 2760

### Description

A possible integer overflow exists in the function `fallback`.
The addition or multiplication may result in a value higher than the maximum representable integer.
In file: DecoEscrowMock.sol:11

## Exception state

- Type: Informational
- Contract: DecoEscrowMock
- Function name: `fallback`
- PC address: 2773

### Description

A reachable exception (opcode 0xfe) has been detected. This can be caused by type errors, division by zero, out-of-bounds array access, or assert violations. This is acceptable in most situations. Note however that `assert()` should only be used to check invariants. Use `require()` for regular input checking.
In file: DecoEscrowMock.sol:11

# Analysis result for CloneFactory

No issues found.
# Analysis result for Ownable

No issues found.
