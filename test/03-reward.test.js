const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupFull, increaseTime, CONSTANTS, toWei } = require("./test-helpers");
describe("ContentCreatorSystem - Reward Mechanics Tests", function () {
  let contract,
    owner,
    moderator,
    validator1,
    validator2,
    creator1,
    creator2,
    addresses;

  async function submitAndValidateWithCooldown(
    creator,
    qualityScore,
    engagementScore = 100
  ) {
    const contentHash = ethers.utils.id("test content " + Math.random());
    const tx = await contract.connect(creator).submitContent(contentHash, 0);
    const receipt = await tx.wait();
    const contentId = receipt.events.find((e) => e.event === "ContentSubmitted")
      .args.contentId;

    // Validate content
    await contract.connect(validator1).validateContent(contentId, qualityScore);
    await contract.connect(validator2).validateContent(contentId, qualityScore);

    // Record engagement
    await contract
      .connect(moderator)
      .recordEngagement(contentId, engagementScore);

    return contentId;
  }

  beforeEach(async function () {
    ({
      contract,
      owner,
      moderator,
      validator1,
      validator2,
      creator1,
      creator2,
      addresses,
    } = await setupFull());
  });

  describe("Content Engagement", function () {
    it("Should record engagement correctly", async function () {
      const contentId = await submitAndValidateWithCooldown(creator1, 90);
      await contract.connect(moderator).recordEngagement(contentId, 80);
      const achievements = await contract.getCreatorAchievements(
        addresses.creator1
      );
      expect(achievements.totalEngagement).to.equal(180); // 100 from initial + 80 from additional
    });

    it("Should update creator level based on engagement", async function () {
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await increaseTime(CONSTANTS.COOLDOWN_PERIOD + 100);
          await ethers.provider.send("evm_mine", []);
        }
        await submitAndValidateWithCooldown(creator1, 90);
      }

      const achievements = await contract.getCreatorAchievements(
        addresses.creator1
      );
      console.log("Achievement stats:", {
        totalContent: achievements.totalContent.toString(),
        highQualityContent: achievements.highQualityContent.toString(),
        totalEngagement: achievements.totalEngagement.toString(),
        level: achievements.level.toString(),
      });
      expect(achievements.level).to.be.gt(0);
    });
  });

  describe("Creator Achievements", function () {
    it("Should track content statistics correctly", async function () {
      // First content
      await submitAndValidateWithCooldown(creator1, 90);

      // Wait for cooldown
      await increaseTime(CONSTANTS.COOLDOWN_PERIOD + 100);
      await ethers.provider.send("evm_mine", []);

      // Second content with lower quality
      await submitAndValidateWithCooldown(creator1, 70);

      const achievements = await contract.getCreatorAchievements(
        addresses.creator1
      );
      expect(achievements.totalContent).to.equal(2);
      expect(achievements.highQualityContent).to.equal(1);
    });

    it("Should level up based on achievements", async function () {
      // Submit multiple contents with high quality and maximum engagement
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await increaseTime(CONSTANTS.COOLDOWN_PERIOD + 100);
          await ethers.provider.send("evm_mine", []);
        }
        // Submit content with maximum valid engagement score
        const contentId = await submitAndValidateWithCooldown(
          creator1,
          90,
          100
        );
        // Add additional engagement within valid range
        await contract.connect(moderator).recordEngagement(contentId, 100);
      }

      const achievements = await contract.getCreatorAchievements(
        addresses.creator1
      );
      const stats = {
        totalContent: achievements.totalContent.toString(),
        highQualityContent: achievements.highQualityContent.toString(),
        totalEngagement: achievements.totalEngagement.toString(),
        level: achievements.level.toString(),
      };
      console.log("Final Achievement stats:", stats);

      // Given the engagement criteria (500 total engagement for level 1)
      // and we've submitted 5 contents with 200 engagement each (100 initial + 100 additional)
      // we should definitely have leveled up
      expect(achievements.level).to.be.gt(0);
    });
  });

  describe("Vesting Schedule", function () {
    it("Should initialize vesting schedule on first reward", async function () {
      // Submit and validate content to trigger reward
      await submitAndValidateWithCooldown(creator1, 90);

      const schedule = await contract.getVestingSchedule(addresses.creator1);
      expect(schedule.initialized).to.be.true;
      expect(schedule.totalAmount).to.be.gt(0);
    });

    it("Should accumulate rewards in vesting schedule", async function () {
      // First content submission
      await submitAndValidateWithCooldown(creator1, 90);
      const schedule1 = await contract.getVestingSchedule(addresses.creator1);

      // Wait for cooldown
      await increaseTime(CONSTANTS.COOLDOWN_PERIOD + 100);
      await ethers.provider.send("evm_mine", []);

      // Second content submission
      await submitAndValidateWithCooldown(creator1, 90);
      const schedule2 = await contract.getVestingSchedule(addresses.creator1);

      expect(schedule2.totalAmount).to.be.gt(schedule1.totalAmount);
    });
  });

  describe("Seasonal Rewards", function () {
    it("Should manage seasons correctly", async function () {
      await contract.startNewSeason();
      expect(await contract.seasonalRewardsActive()).to.be.true;

      await increaseTime(90 * 24 * 60 * 60); // 90 days
      await contract.endSeason();
      expect(await contract.seasonalRewardsActive()).to.be.false;
    });

    it("Should apply seasonal multiplier to rewards", async function () {
      // First content without seasonal bonus
      const balanceBefore1 = await contract.balanceOf(addresses.creator1);
      await submitAndValidateWithCooldown(creator1, 90);
      const balanceAfter1 = await contract.balanceOf(addresses.creator1);
      const regularReward = balanceAfter1.sub(balanceBefore1);

      // Start season
      await contract.startNewSeason();
      await increaseTime(CONSTANTS.COOLDOWN_PERIOD + 100);
      await ethers.provider.send("evm_mine", []);

      // Second content with seasonal bonus
      const balanceBefore2 = await contract.balanceOf(addresses.creator2);
      await submitAndValidateWithCooldown(creator2, 90);
      const balanceAfter2 = await contract.balanceOf(addresses.creator2);
      const seasonalReward = balanceAfter2.sub(balanceBefore2);

      expect(seasonalReward).to.be.gt(regularReward);
    });
  });
});
