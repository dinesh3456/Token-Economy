const { ethers } = require("hardhat");

// Helper functions
const toWei = (value) => ethers.utils.parseEther(value.toString());
const fromWei = (value) => ethers.utils.formatEther(value);

// Constants used across tests
const CONSTANTS = {
  INITIAL_SUPPLY: toWei(100000000),
  MAX_SUPPLY: toWei(200000000),
  MIN_VALIDATORS_REQUIRED: 2,
  MIN_QUALITY_SCORE: 50,
  COOLDOWN_PERIOD: 86400, // 1 day in seconds
  BASE_REWARD: toWei(10),
  VALIDATOR_STAKE: toWei(1000),
  MIN_STAKE_DURATION: 30 * 24 * 60 * 60, // 30 days in seconds
};

// Utility functions
async function increaseTime(seconds) {
  // Ensure seconds is a valid number and within safe limits
  const safeSeconds = Math.min(Math.max(0, seconds), Math.pow(2, 31) - 1);
  await ethers.provider.send("evm_increaseTime", [safeSeconds]);
  await ethers.provider.send("evm_mine");
}

// Basic setup without role assignment
async function setupBasic() {
  const [owner, moderator, validator1, validator2, creator1, creator2] =
    await ethers.getSigners();

  const ContentCreatorSystem = await ethers.getContractFactory(
    "ContentCreatorSystem"
  );
  const contract = await ContentCreatorSystem.deploy();
  await contract.deployed();

  return {
    contract,
    owner,
    moderator,
    validator1,
    validator2,
    creator1,
    creator2,
    addresses: {
      owner: owner.address,
      moderator: moderator.address,
      validator1: validator1.address,
      validator2: validator2.address,
      creator1: creator1.address,
      creator2: creator2.address,
    },
  };
}

// Full setup with roles and stakes
async function setupFull() {
  const setup = await setupBasic();
  const { contract, addresses, validator1, validator2 } = setup;

  // Setup roles
  await contract.addValidator(addresses.validator1);
  await contract.addValidator(addresses.validator2);
  await contract.addModerator(addresses.moderator);

  // Transfer and stake tokens
  await contract.transfer(addresses.validator1, CONSTANTS.VALIDATOR_STAKE);
  await contract.transfer(addresses.validator2, CONSTANTS.VALIDATOR_STAKE);
  await contract.connect(validator1).stakeAsValidator();
  await contract.connect(validator2).stakeAsValidator();

  return setup;
}

// Helper function for content submission
async function submitAndValidateContent(
  contract,
  creator,
  validator1,
  validator2,
  qualityScore
) {
  const contentHash = ethers.utils.id("test content " + Math.random());
  const tx = await contract.connect(creator).submitContent(contentHash, 0);
  const receipt = await tx.wait();
  const contentId = receipt.events.find((e) => e.event === "ContentSubmitted")
    .args.contentId;

  await contract.connect(validator1).validateContent(contentId, qualityScore);
  await contract.connect(validator2).validateContent(contentId, qualityScore);

  return contentId;
}

module.exports = {
  toWei,
  fromWei,
  CONSTANTS,
  setupBasic,
  setupFull,
  increaseTime,
  submitAndValidateContent,
};
