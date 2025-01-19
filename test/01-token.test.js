const { expect } = require("chai");
const { setupBasic, CONSTANTS, toWei } = require("./test-helpers");

describe("ContentCreatorSystem - Token Tests", function () {
  let contract, owner, moderator, validator1, addresses;

  beforeEach(async function () {
    ({ contract, owner, moderator, validator1, addresses } =
      await setupBasic());
  });

  describe("Token Basics", function () {
    it("Should deploy with correct initial supply", async function () {
      expect(await contract.totalSupply()).to.equal(CONSTANTS.INITIAL_SUPPLY);
      expect(await contract.balanceOf(addresses.owner)).to.equal(
        CONSTANTS.INITIAL_SUPPLY
      );
    });

    it("Should have correct name and symbol", async function () {
      expect(await contract.name()).to.equal("Content Creator Token");
      expect(await contract.symbol()).to.equal("CCT");
    });
  });

  describe("Role Management", function () {
    it("Should add and remove moderator correctly", async function () {
      expect(await contract.moderators(addresses.moderator)).to.be.false;

      await contract.addModerator(addresses.moderator);
      expect(await contract.moderators(addresses.moderator)).to.be.true;

      await contract.removeModerator(addresses.moderator);
      expect(await contract.moderators(addresses.moderator)).to.be.false;
    });

    it("Should add and remove validator correctly", async function () {
      expect(await contract.validators(addresses.validator1)).to.be.false;

      await contract.addValidator(addresses.validator1);
      expect(await contract.validators(addresses.validator1)).to.be.true;

      await contract.removeValidator(addresses.validator1);
      expect(await contract.validators(addresses.validator1)).to.be.false;
    });

    it("Should prevent non-owners from managing roles", async function () {
      await expect(
        contract.connect(moderator).addModerator(addresses.validator1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Token Operations", function () {
    it("Should transfer tokens correctly", async function () {
      const amount = toWei(1000);
      await contract.transfer(addresses.moderator, amount);
      expect(await contract.balanceOf(addresses.moderator)).to.equal(amount);
    });

    it("Should handle approvals and transferFrom", async function () {
      const amount = toWei(1000);
      await contract.approve(addresses.moderator, amount);
      await contract
        .connect(moderator)
        .transferFrom(addresses.owner, addresses.validator1, amount);
      expect(await contract.balanceOf(addresses.validator1)).to.equal(amount);
    });

    it("Should mint tokens within max supply", async function () {
      const amount = toWei(1000);
      await contract.mint(addresses.moderator, amount);
      expect(await contract.balanceOf(addresses.moderator)).to.equal(amount);
    });

    it("Should prevent minting above max supply", async function () {
      const amount = CONSTANTS.MAX_SUPPLY;
      await expect(
        contract.mint(addresses.moderator, amount)
      ).to.be.revertedWith("Exceeds maximum supply");
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause and unpause correctly", async function () {
      await contract.pause();
      await expect(
        contract.transfer(addresses.moderator, 100)
      ).to.be.revertedWith("Pausable: paused");

      await contract.unpause();
      await expect(contract.transfer(addresses.moderator, 100)).to.not.be
        .reverted;
    });

    it("Should handle emergency withdrawal", async function () {
      const amount = toWei(100);
      await contract.transfer(contract.address, amount);
      await contract.emergencyWithdraw(contract.address, amount);
      expect(await contract.balanceOf(contract.address)).to.equal(0);
    });
  });

  describe("Events", function () {
    it("Should emit correct events for role management", async function () {
      await expect(contract.addModerator(addresses.moderator))
        .to.emit(contract, "ModeratorAdded")
        .withArgs(addresses.moderator);

      await expect(contract.addValidator(addresses.validator1))
        .to.emit(contract, "ValidatorAdded")
        .withArgs(addresses.validator1);
    });

    it("Should emit correct events for token operations", async function () {
      const amount = toWei(100);
      await expect(contract.mint(addresses.moderator, amount))
        .to.emit(contract, "TokensMinted")
        .withArgs(addresses.moderator, amount);
    });
  });
});
