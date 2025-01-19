const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupFull, increaseTime, CONSTANTS } = require("./test-helpers");

describe("ContentCreatorSystem - Content Management Tests", function () {
  let contract,
    owner,
    moderator,
    validator1,
    validator2,
    creator1,
    creator2,
    addresses;

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

  describe("Content Submission", function () {
    it("Should submit content correctly", async function () {
      const contentHash = ethers.utils.id("test content");
      const tx = await contract.connect(creator1).submitContent(contentHash, 0); // ContentType.Article
      const receipt = await tx.wait();
      const event = receipt.events.find((e) => e.event === "ContentSubmitted");
      const contentId = event.args.contentId;

      const content = await contract.getContent(contentId);
      expect(content.creator).to.equal(addresses.creator1);
      expect(content.contentHash).to.equal(contentHash);
      expect(content.contentType).to.equal(0);
      expect(content.status).to.equal(0); // Pending
    });

    it("Should enforce cooldown period", async function () {
      const contentHash = ethers.utils.id("test content");
      await contract.connect(creator1).submitContent(contentHash, 0);

      await expect(
        contract.connect(creator1).submitContent(contentHash, 0)
      ).to.be.revertedWith("Cooldown period not elapsed");
    });

    it("Should allow submission after cooldown", async function () {
      const contentHash1 = ethers.utils.id("test content 1");
      await contract.connect(creator1).submitContent(contentHash1, 0);

      await increaseTime(CONSTANTS.COOLDOWN_PERIOD);

      const contentHash2 = ethers.utils.id("test content 2");
      await expect(contract.connect(creator1).submitContent(contentHash2, 0)).to
        .not.be.reverted;
    });
  });

  describe("Content Validation", function () {
    let contentId;

    beforeEach(async function () {
      const contentHash = ethers.utils.id("test content");
      const tx = await contract.connect(creator1).submitContent(contentHash, 0);
      const receipt = await tx.wait();
      contentId = receipt.events.find((e) => e.event === "ContentSubmitted")
        .args.contentId;
    });

    it("Should validate content correctly", async function () {
      await contract.connect(validator1).validateContent(contentId, 80);
      await contract.connect(validator2).validateContent(contentId, 90);

      const content = await contract.getContent(contentId);
      expect(content.isValidated).to.be.true;
      expect(content.status).to.equal(1); // Approved
      expect(content.qualityScore).to.equal(85);
    });

    it("Should reject content with low quality score", async function () {
      await contract.connect(validator1).validateContent(contentId, 40);
      await contract.connect(validator2).validateContent(contentId, 30);

      const content = await contract.getContent(contentId);
      expect(content.isValidated).to.be.true;
      expect(content.status).to.equal(2); // Rejected
    });

    it("Should prevent duplicate validation", async function () {
      await contract.connect(validator1).validateContent(contentId, 80);
      await expect(
        contract.connect(validator1).validateContent(contentId, 90)
      ).to.be.revertedWith("Already validated");
    });

    it("Should prevent self-validation", async function () {
      await contract.addValidator(addresses.creator1);
      await expect(
        contract.connect(creator1).validateContent(contentId, 90)
      ).to.be.revertedWith("Cannot validate own content");
    });
  });

  describe("Content Management", function () {
    let contentId;

    beforeEach(async function () {
      const contentHash = ethers.utils.id("test content");
      const tx = await contract.connect(creator1).submitContent(contentHash, 0);
      const receipt = await tx.wait();
      contentId = receipt.events.find((e) => e.event === "ContentSubmitted")
        .args.contentId;
    });

    it("Should allow creator to remove content", async function () {
      await contract.connect(creator1).removeContent(contentId);
      const content = await contract.getContent(contentId);
      expect(content.status).to.equal(3); // Removed
    });

    it("Should allow moderator to remove content", async function () {
      await contract.connect(moderator).removeContent(contentId);
      const content = await contract.getContent(contentId);
      expect(content.status).to.equal(3); // Removed
    });

    it("Should prevent unauthorized content removal", async function () {
      await expect(
        contract.connect(creator2).removeContent(contentId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Reward System", function () {
    it("Should reward creator for high-quality content", async function () {
      const contentHash = ethers.utils.id("test content");
      const tx = await contract.connect(creator1).submitContent(contentHash, 0);
      const receipt = await tx.wait();
      const contentId = receipt.events.find(
        (e) => e.event === "ContentSubmitted"
      ).args.contentId;

      const initialBalance = await contract.balanceOf(addresses.creator1);

      await contract.connect(validator1).validateContent(contentId, 90);
      await contract.connect(validator2).validateContent(contentId, 90);

      const finalBalance = await contract.balanceOf(addresses.creator1);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not reward creator for low-quality content", async function () {
      const contentHash = ethers.utils.id("test content");
      const tx = await contract.connect(creator1).submitContent(contentHash, 0);
      const receipt = await tx.wait();
      const contentId = receipt.events.find(
        (e) => e.event === "ContentSubmitted"
      ).args.contentId;

      const initialBalance = await contract.balanceOf(addresses.creator1);

      await contract.connect(validator1).validateContent(contentId, 40);
      await contract.connect(validator2).validateContent(contentId, 40);

      const finalBalance = await contract.balanceOf(addresses.creator1);
      expect(finalBalance).to.equal(initialBalance);
    });
  });
});
