# Content Creator System

A blockchain-based content monetization and reward system implemented within Supra Containers.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Design Choices](#design-choices)
- [Phase-wise Development](#phase-wise-development)
- [Architecture](#architecture)
- [Smart Contract Working](#smart-contract-working)
- [Setup and Deployment](#setup-and-deployment)

## Problem Statement

In today's digital landscape, content creators face several challenges:

- Lack of transparent monetization mechanisms
- Difficulty in verifying content quality
- Limited engagement tracking
- Absence of standardized reward systems

The project aims to create a decentralized ecosystem that:

1. Rewards quality content creation
2. Implements fair validation mechanisms
3. Tracks user engagement
4. Provides transparent monetization

## Design Choices

### Why Content Monetization?

Drawing from experience at Donatuz (a content monetization platform), we identified key pain points in traditional content platforms:

- Centralized control over monetization
- Opaque reward mechanisms
- Limited stakeholder participation

### Technical Decisions

1. **Token Standard**:

   - Chose ERC20 for wide compatibility
   - Enables easy integration with existing DeFi ecosystems

2. **Validation Mechanism**:

   - Multi-validator approach for quality assurance
   - Stake-based validation to ensure commitment
   - Consensus-based content approval

3. **Reward System**:
   - Quality-based rewards
   - Engagement multipliers
   - Achievement system for long-term engagement
   - Seasonal rewards for continued participation

## Phase-wise Development

### Phase 1: Token Foundation

- Basic ERC20 implementation
- Role management system
- Security features
- Emergency controls

### Phase 2: Content Management

- Content submission system
- Multi-validator architecture
- Quality scoring mechanism
- Content lifecycle management

### Phase 3: Reward Mechanics

- Validator staking
- Achievement system
- Engagement tracking
- Seasonal rewards
- Vesting schedules

## Architecture

### Smart Contract Architecture

classDiagram
class ContentCreatorSystem {
+submitContent()
+validateContent()
+recordEngagement()
+stakeAsValidator()
+startNewSeason()
}
class ERC20 {
+transfer()
+approve()
+transferFrom()
}
class ReentrancyGuard {
#nonReentrant
}
class Pausable {
+pause()
+unpause()
}
class Ownable {
+owner()
+transferOwnership()
}

    ContentCreatorSystem --|> ERC20
    ContentCreatorSystem --|> ReentrancyGuard
    ContentCreatorSystem --|> Pausable
    ContentCreatorSystem --|> Ownable

    class Content {
        +address creator
        +string contentHash
        +uint256 timestamp
        +ContentType contentType
        +ContentStatus status
        +uint256 qualityScore
        +bool isValidated
        +uint256 validationCount
    }

    class VestingSchedule {
        +uint256 totalAmount
        +uint256 releasedAmount
        +uint256 startTime
        +bool initialized
    }

    class ValidatorStake {
        +uint256 amount
        +uint256 startTime
        +bool isStaked
    }

    class CreatorAchievements {
        +uint256 totalContent
        +uint256 highQualityContent
        +uint256 totalEngagement
        +uint256 rewardPoints
        +uint8 level
    }

    ContentCreatorSystem ..> Content : manages
    ContentCreatorSystem ..> VestingSchedule : manages
    ContentCreatorSystem ..> ValidatorStake : manages
    ContentCreatorSystem ..> CreatorAchievements : manages

# Content Creator System

A blockchain-based content monetization and reward system implemented within Supra Containers.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Design Choices](#design-choices)
- [Phase-wise Development](#phase-wise-development)
- [Architecture](#architecture)
- [Smart Contract Working](#smart-contract-working)
- [Setup and Deployment](#setup-and-deployment)

## Problem Statement

In today's digital landscape, content creators face several challenges:

- Lack of transparent monetization mechanisms
- Difficulty in verifying content quality
- Limited engagement tracking
- Absence of standardized reward systems

The project aims to create a decentralized ecosystem that:

1. Rewards quality content creation
2. Implements fair validation mechanisms
3. Tracks user engagement
4. Provides transparent monetization

## Design Choices

### Why Content Monetization?

Drawing from experience at Donatuz (a content monetization platform), we identified key pain points in traditional content platforms:

- Centralized control over monetization
- Opaque reward mechanisms
- Limited stakeholder participation

### Technical Decisions

1. **Token Standard**:

   - Chose ERC20 for wide compatibility
   - Enables easy integration with existing DeFi ecosystems

2. **Validation Mechanism**:

   - Multi-validator approach for quality assurance
   - Stake-based validation to ensure commitment
   - Consensus-based content approval

3. **Reward System**:
   - Quality-based rewards
   - Engagement multipliers
   - Achievement system for long-term engagement
   - Seasonal rewards for continued participation

## Phase-wise Development

### Phase 1: Token Foundation

- Basic ERC20 implementation
- Role management system
- Security features
- Emergency controls

### Phase 2: Content Management

- Content submission system
- Multi-validator architecture
- Quality scoring mechanism
- Content lifecycle management

### Phase 3: Reward Mechanics

- Validator staking
- Achievement system
- Engagement tracking
- Seasonal rewards
- Vesting schedules

## Architecture

### Smart Contract Architecture

The system is built on a modular architecture that inherits from key OpenZeppelin contracts and implements custom functionality for content management and rewards.

[Architecture Diagram Above]

Key Components:

1. **Base Contracts**

   - ERC20: Token standard implementation
   - ReentrancyGuard: Protection against reentrancy attacks
   - Pausable: Emergency pause functionality
   - Ownable: Access control management

2. **Core Structures**

   - Content: Stores content metadata and validation status
   - VestingSchedule: Manages reward vesting
   - ValidatorStake: Handles validator staking
   - CreatorAchievements: Tracks creator progress

3. **Interaction Flow**
   - Content Creation → Validation → Reward Distribution
   - Validator Staking → Content Validation → Stake Release
   - Engagement Recording → Achievement Updates → Level Progress

## Smart Contract Working

### Content Lifecycle

1. **Content Submission**

   ```solidity
   function submitContent(string memory contentHash, ContentType contentType) external
   ```

````

- Creator submits content
- System generates unique contentId
- Content enters pending state

2. **Validation Process**

   ```solidity
   function validateContent(bytes32 contentId, uint256 qualityScore) external
   ```

   - Multiple validators review content
   - Quality scores are averaged
   - Content status updated based on consensus

3. **Reward Distribution**
   ```solidity
   function _rewardCreator(address creator, uint256 qualityScore) internal
   ```
   - Base reward calculated from quality score
   - Multipliers applied (seasonal, level)
   - Rewards vested according to schedule

### Achievement System

1. **Level Progression**

   - Based on:
     - Content quality
     - Engagement metrics
     - Consistency

2. **Seasonal Rewards**
   - Active seasons provide multipliers
   - Special rewards for top creators
   - Encourages continued participation

## Setup and Deployment

### Prerequisites

```bash
node version 14.x or higher
npm version 6.x or higher
```

### Dependencies

```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^2.0.2",
    "hardhat": "^2.19.5",
    "@nomiclabs/hardhat-ethers": "^2.2.3",
    "chai": "^4.3.7",
    "ethers": "^5.7.2"
  },
  "dependencies": {
    "@openzeppelin/contracts": "^4.9.3"
  }
}
```

### Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd content-creator-system
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure environment

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run tests
   ```bash
   npx hardhat test
   ```

### Deployment

1. To Base Sepolia Network:

   ```bash
   npx hardhat run scripts/deploy.js --network base-sepolia
   ```

2. Verify contract:
   ```bash
   npx hardhat verify --network base-sepolia <DEPLOYED_CONTRACT_ADDRESS>
   ```

### Post-Deployment Setup

1. Add initial validators

   ```bash
   npx hardhat run scripts/setup-validators.js --network base-sepolia
   ```

2. Configure seasonal rewards
   ```bash
   npx hardhat run scripts/setup-season.js --network base-sepolia
   ```

## Security Considerations

1. **Access Control**

   - Role-based permissions
   - Ownable pattern
   - Multi-validator consensus

2. **Economic Security**

   - Validator staking
   - Vesting schedules
   - Rate limiting

3. **Emergency Controls**
   - Pausable functionality
   - Emergency withdrawal
   - Upgradeable design
````
