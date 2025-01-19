const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Starting deployment...");

    // Get the deployer's account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy the contract
    const ContentCreatorSystem = await ethers.getContractFactory(
      "ContentCreatorSystem"
    );
    console.log("Deploying ContentCreatorSystem...");
    const contentCreatorSystem = await ContentCreatorSystem.deploy();
    await contentCreatorSystem.deployed();

    console.log(
      "ContentCreatorSystem deployed to:",
      contentCreatorSystem.address
    );

    // Setup initial roles (optional - you can do this later too)
    console.log("Setting up initial roles...");

    // Wait for a few blocks for better verification
    console.log("Waiting for block confirmations...");
    await contentCreatorSystem.deployTransaction.wait(5);

    // Verify the contract
    console.log("Verifying contract...");
    await hre.run("verify:verify", {
      address: contentCreatorSystem.address,
      constructorArguments: [],
    });

    console.log("Deployment completed successfully!");

    // Log important contract information
    console.log("\nDeployment Summary:");
    console.log("--------------------");
    console.log("Contract Address:", contentCreatorSystem.address);
    console.log("Deployer Address:", deployer.address);
    console.log("Network:", hre.network.name);
    console.log("Block Number:", await ethers.provider.getBlockNumber());

    // Log initial contract state
    const totalSupply = await contentCreatorSystem.totalSupply();
    console.log("Initial Total Supply:", ethers.utils.formatEther(totalSupply));
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
