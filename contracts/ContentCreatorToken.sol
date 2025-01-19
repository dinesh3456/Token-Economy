// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContentCreatorSystem is ERC20, ReentrancyGuard, Pausable, Ownable {
    // Token Constants
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18; // 100 million tokens
    uint256 public constant MAX_SUPPLY = 200_000_000 * 10 ** 18; // 200 million tokens

    // Content Management Constants
    uint256 public constant MIN_VALIDATORS_REQUIRED = 2;
    uint256 public constant MIN_QUALITY_SCORE = 50;
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    uint256 public constant BASE_REWARD = 10 * 10 ** 18; // 10 tokens base reward

    // Reward Mechanism
    uint256 public constant VALIDATOR_STAKE_REQUIREMENT = 1000 * 10 ** 18; // 1000 tokens
    uint256 public constant VESTING_PERIOD = 7 days;
    uint256 public constant ENGAGEMENT_MULTIPLIER = 2;
    uint256 public constant SEASONAL_BONUS_MULTIPLIER = 3;
    uint256 public constant MIN_STAKE_DURATION = 30 days;

    // Enums
    enum ContentType {
        Article,
        Image,
        Video,
        Other
    }
    enum ContentStatus {
        Pending,
        Approved,
        Rejected,
        Removed
    }

    // Structs
    struct Content {
        address creator;
        string contentHash;
        uint256 timestamp;
        ContentType contentType;
        ContentStatus status;
        uint256 qualityScore;
        bool isValidated;
        uint256 validationCount;
        mapping(address => bool) validators;
    }

    // Struct for vesting schedule
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        bool initialized;
    }

    // Struct for validator stakes
    struct ValidatorStake {
        uint256 amount;
        uint256 startTime;
        bool isStaked;
    }

    // Struct for creator achievements
    struct CreatorAchievements {
        uint256 totalContent;
        uint256 highQualityContent;
        uint256 totalEngagement;
        uint256 rewardPoints;
        uint8 level;
    }

    // Role Management
    mapping(address => bool) public moderators;
    mapping(address => bool) public validators;

    // Content Management
    mapping(bytes32 => Content) public contents;
    mapping(address => bytes32[]) public creatorContent;
    mapping(address => uint256) public lastContentSubmission;

    // State variables for Reward mechanism
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => ValidatorStake) public validatorStakes;
    mapping(address => CreatorAchievements) public creatorAchievements;
    mapping(bytes32 => uint256) public contentEngagement;

    uint256 public seasonStartTime;
    uint256 public seasonDuration = 90 days;
    bool public seasonalRewardsActive;

    // Events - Token Related
    event ModeratorAdded(address indexed moderator);
    event ModeratorRemoved(address indexed moderator);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    // Events - Content Related
    event ContentSubmitted(
        bytes32 indexed contentId,
        address indexed creator,
        ContentType contentType
    );
    event ContentValidated(
        bytes32 indexed contentId,
        address indexed validator,
        uint256 qualityScore
    );
    event ContentStatusUpdated(
        bytes32 indexed contentId,
        ContentStatus newStatus
    );
    event QualityScoreUpdated(bytes32 indexed contentId, uint256 newScore);

    // Events for Reward Mechanism
    event RewardVested(address indexed user, uint256 amount);
    event ValidatorStaked(address indexed validator, uint256 amount);
    event ValidatorUnstaked(address indexed validator, uint256 amount);
    event AchievementUnlocked(address indexed creator, uint8 level);
    event EngagementRecorded(
        bytes32 indexed contentId,
        uint256 engagementScore
    );
    event SeasonalRewardDistributed(address indexed creator, uint256 amount);

    // Modifiers
    modifier onlyModerator() {
        require(moderators[msg.sender], "Caller is not a moderator");
        _;
    }

    modifier onlyValidator() {
        require(validators[msg.sender], "Caller is not a validator");
        _;
    }

    modifier contentExists(bytes32 contentId) {
        require(
            contents[contentId].creator != address(0),
            "Content does not exist"
        );
        _;
    }

    modifier onlyContentCreator(bytes32 contentId) {
        require(
            contents[contentId].creator == msg.sender,
            "Not content creator"
        );
        _;
    }

    // Modifiers for Reward Mechanism
    modifier onlyStakedValidator() {
        require(validatorStakes[msg.sender].isStaked, "Validator not staked");
        require(
            validatorStakes[msg.sender].amount >= VALIDATOR_STAKE_REQUIREMENT,
            "Insufficient stake"
        );
        _;
    }

    constructor() ERC20("Content Creator Token", "CCT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // ============ Role Management Functions ============

    function addModerator(address moderator) external onlyOwner {
        require(moderator != address(0), "Invalid address");
        require(!moderators[moderator], "Already a moderator");
        moderators[moderator] = true;
        emit ModeratorAdded(moderator);
    }

    function removeModerator(address moderator) external onlyOwner {
        require(moderators[moderator], "Not a moderator");
        moderators[moderator] = false;
        emit ModeratorRemoved(moderator);
    }

    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid address");
        require(!validators[validator], "Already a validator");
        validators[validator] = true;
        emit ValidatorAdded(validator);
    }

    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Not a validator");
        validators[validator] = false;
        emit ValidatorRemoved(validator);
    }

    // ============ Content Management Functions ============

    function submitContent(
        string memory contentHash,
        ContentType contentType
    ) external whenNotPaused nonReentrant returns (bytes32) {
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");
        require(
            block.timestamp >=
                lastContentSubmission[msg.sender] + COOLDOWN_PERIOD,
            "Cooldown period not elapsed"
        );

        bytes32 contentId = keccak256(
            abi.encodePacked(msg.sender, contentHash, block.timestamp)
        );

        require(
            contents[contentId].creator == address(0),
            "Content already exists"
        );

        Content storage newContent = contents[contentId];
        newContent.creator = msg.sender;
        newContent.contentHash = contentHash;
        newContent.timestamp = block.timestamp;
        newContent.contentType = contentType;
        newContent.status = ContentStatus.Pending;
        newContent.qualityScore = 0;
        newContent.isValidated = false;
        newContent.validationCount = 0;

        creatorContent[msg.sender].push(contentId);
        lastContentSubmission[msg.sender] = block.timestamp;

        emit ContentSubmitted(contentId, msg.sender, contentType);
        return contentId;
    }

    function validateContent(
        bytes32 contentId,
        uint256 qualityScore
    )
        external
        onlyValidator
        whenNotPaused
        nonReentrant
        contentExists(contentId)
    {
        require(qualityScore <= 100, "Invalid quality score");

        Content storage content = contents[contentId];
        require(!content.validators[msg.sender], "Already validated");
        require(content.creator != msg.sender, "Cannot validate own content");
        require(content.status == ContentStatus.Pending, "Content not pending");

        content.validators[msg.sender] = true;
        content.validationCount++;
        content.qualityScore =
            ((content.qualityScore * (content.validationCount - 1)) +
                qualityScore) /
            content.validationCount;

        if (content.validationCount >= MIN_VALIDATORS_REQUIRED) {
            content.isValidated = true;
            if (content.qualityScore >= MIN_QUALITY_SCORE) {
                content.status = ContentStatus.Approved;
                _rewardCreator(content.creator, content.qualityScore);
            } else {
                content.status = ContentStatus.Rejected;
            }
            emit ContentStatusUpdated(contentId, content.status);
        }

        emit ContentValidated(contentId, msg.sender, qualityScore);
        emit QualityScoreUpdated(contentId, content.qualityScore);
    }

    function removeContent(
        bytes32 contentId
    ) external whenNotPaused nonReentrant contentExists(contentId) {
        require(
            msg.sender == contents[contentId].creator || moderators[msg.sender],
            "Not authorized"
        );
        require(
            contents[contentId].status != ContentStatus.Removed,
            "Already removed"
        );

        contents[contentId].status = ContentStatus.Removed;
        emit ContentStatusUpdated(contentId, ContentStatus.Removed);
    }

    // ============ Token Management Functions ============

    function mint(
        address to,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant {
        require(to != address(0), "Invalid address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) external whenNotPaused nonReentrant {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // ============ Emergency Functions ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == address(this)) {
            require(balanceOf(address(this)) >= amount, "Insufficient balance");
            _transfer(address(this), owner(), amount);
        } else {
            (bool success, ) = token.call(
                abi.encodeWithSelector(0xa9059cbb, owner(), amount)
            );
            require(success, "Transfer failed");
        }
    }

    // ============ View Functions ============

    function getContent(
        bytes32 contentId
    )
        external
        view
        returns (
            address creator,
            string memory contentHash,
            uint256 timestamp,
            ContentType contentType,
            ContentStatus status,
            uint256 qualityScore,
            bool isValidated,
            uint256 validationCount
        )
    {
        Content storage content = contents[contentId];
        return (
            content.creator,
            content.contentHash,
            content.timestamp,
            content.contentType,
            content.status,
            content.qualityScore,
            content.isValidated,
            content.validationCount
        );
    }

    function getCreatorContents(
        address creator
    ) external view returns (bytes32[] memory) {
        return creatorContent[creator];
    }

    // Override transfer functions to implement pause
    function transfer(
        address to,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    // New functions for Phase 3

    function stakeAsValidator() external nonReentrant whenNotPaused {
        require(validators[msg.sender], "Not a validator");
        require(!validatorStakes[msg.sender].isStaked, "Already staked");
        require(
            balanceOf(msg.sender) >= VALIDATOR_STAKE_REQUIREMENT,
            "Insufficient balance"
        );

        _transfer(msg.sender, address(this), VALIDATOR_STAKE_REQUIREMENT);

        validatorStakes[msg.sender] = ValidatorStake({
            amount: VALIDATOR_STAKE_REQUIREMENT,
            startTime: block.timestamp,
            isStaked: true
        });

        emit ValidatorStaked(msg.sender, VALIDATOR_STAKE_REQUIREMENT);
    }

    function unstakeValidator() external nonReentrant {
        require(validatorStakes[msg.sender].isStaked, "Not staked");
        require(
            block.timestamp >=
                validatorStakes[msg.sender].startTime + MIN_STAKE_DURATION,
            "Minimum stake duration not met"
        );

        uint256 stakeAmount = validatorStakes[msg.sender].amount;
        validatorStakes[msg.sender].isStaked = false;
        validatorStakes[msg.sender].amount = 0;

        _transfer(address(this), msg.sender, stakeAmount);
        emit ValidatorUnstaked(msg.sender, stakeAmount);
    }

    function recordEngagement(
        bytes32 contentId,
        uint256 engagementScore
    ) external onlyModerator contentExists(contentId) {
        require(engagementScore <= 100, "Invalid engagement score");

        contentEngagement[contentId] = engagementScore;

        // Update creator achievements
        Content storage content = contents[contentId];
        CreatorAchievements storage achievements = creatorAchievements[
            content.creator
        ];
        achievements.totalEngagement += engagementScore;

        // Check for level up
        uint8 newLevel = calculateCreatorLevel(achievements);
        if (newLevel > achievements.level) {
            achievements.level = newLevel;
            emit AchievementUnlocked(content.creator, newLevel);
        }

        emit EngagementRecorded(contentId, engagementScore);
    }

    function startNewSeason() external onlyOwner {
        require(!seasonalRewardsActive, "Season already active");
        seasonStartTime = block.timestamp;
        seasonalRewardsActive = true;
    }

    function endSeason() external onlyOwner {
        require(seasonalRewardsActive, "No active season");
        require(
            block.timestamp >= seasonStartTime + seasonDuration,
            "Season not finished"
        );

        distributeSeasonalRewards();
        seasonalRewardsActive = false;
    }

    // Internal functions

    function _rewardCreator(
        address creator,
        uint256 qualityScore
    ) internal virtual {
        uint256 baseReward = (qualityScore * BASE_REWARD) / 100;

        // Apply engagement multiplier
        uint256 totalReward = baseReward;
        CreatorAchievements storage achievements = creatorAchievements[creator];

        if (achievements.level > 0) {
            totalReward += (baseReward * achievements.level) / 10; // 10% bonus per level
        }

        if (seasonalRewardsActive) {
            totalReward = (totalReward * SEASONAL_BONUS_MULTIPLIER);
        }

        // Create vesting schedule and mint tokens
        VestingSchedule storage schedule = vestingSchedules[creator];
        if (!schedule.initialized) {
            schedule.initialized = true;
            schedule.startTime = block.timestamp;
        }
        schedule.totalAmount += totalReward;

        // Mint tokens directly to creator
        _mint(creator, totalReward);

        // Update achievements
        achievements.totalContent++;
        if (qualityScore >= 80) {
            achievements.highQualityContent++;
        }
        achievements.rewardPoints += totalReward;
    }

    function calculateCreatorLevel(
        CreatorAchievements memory achievements
    ) internal pure returns (uint8) {
        if (
            achievements.highQualityContent >= 100 &&
            achievements.totalEngagement >= 10000
        ) {
            return 5;
        } else if (
            achievements.highQualityContent >= 50 &&
            achievements.totalEngagement >= 5000
        ) {
            return 4;
        } else if (
            achievements.highQualityContent >= 25 &&
            achievements.totalEngagement >= 2500
        ) {
            return 3;
        } else if (
            achievements.highQualityContent >= 10 &&
            achievements.totalEngagement >= 1000
        ) {
            return 2;
        } else if (
            achievements.highQualityContent >= 5 &&
            achievements.totalEngagement >= 500
        ) {
            return 1;
        }
        return 0;
    }

    function distributeSeasonalRewards() internal {
        // Implementation of seasonal reward distribution logic
        // This could be based on relative performance during the season
    }

    // View functions

    function getVestingSchedule(
        address user
    )
        external
        view
        returns (
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 startTime,
            bool initialized
        )
    {
        VestingSchedule storage schedule = vestingSchedules[user];
        return (
            schedule.totalAmount,
            schedule.releasedAmount,
            schedule.startTime,
            schedule.initialized
        );
    }

    function getValidatorStake(
        address validator
    ) external view returns (uint256 amount, uint256 startTime, bool isStaked) {
        ValidatorStake storage stake = validatorStakes[validator];
        return (stake.amount, stake.startTime, stake.isStaked);
    }

    function getCreatorAchievements(
        address creator
    )
        external
        view
        returns (
            uint256 totalContent,
            uint256 highQualityContent,
            uint256 totalEngagement,
            uint256 rewardPoints,
            uint8 level
        )
    {
        CreatorAchievements storage achievements = creatorAchievements[creator];
        return (
            achievements.totalContent,
            achievements.highQualityContent,
            achievements.totalEngagement,
            achievements.rewardPoints,
            achievements.level
        );
    }
}
