const T721Controller_v0 = artifacts.require('T721Controller_v0');
const T721AttachmentsController_v0 = artifacts.require('T721AttachmentsController_v0');
const ERC20Mock_v0 = artifacts.require("ERC20Mock_v0");
const ERC721Mock_v0 = artifacts.require("ERC721Mock_v0");
const ERC2280Mock_v0 = artifacts.require("ERC2280Mock_v0");
const config = require('../truffle-config');

const ZADDRESS = '0x0000000000000000000000000000000000000000';

const hasArtifact = (name) => {
    return (config && config.artifacts
        && config.artifacts[name]);
};

const getArtifact = (name) => {
    return config.artifacts[name];
}

module.exports = async function(deployer, networkName, accounts) {
    if (['test_T721AttachmentsController.js', 'soliditycoverage'].indexOf(networkName) === -1) {

        if (hasArtifact('ticketforge')) {

            const network_id = await web3.eth.net.getId();
            const TicketForge = getArtifact('ticketforge').TicketForge;

            await deployer.deploy(T721Controller_v0, TicketForge.networks[network_id].address, network_id);

        } else {
            throw new Error('Deployment requires Ticket721 repo setup to inject daiplus & ticketforge configuration');
        }

    } else {

        const network_id = await web3.eth.net.getId();

        await deployer.deploy(ERC721Mock_v0);
        const ERC721Instance = await ERC721Mock_v0.deployed();

        await deployer.deploy(ERC20Mock_v0);
        const ERC20Instance = await ERC20Mock_v0.deployed();

        await deployer.deploy(ERC2280Mock_v0, ERC20Instance.address);
        const ERC2280Instance = await ERC2280Mock_v0.deployed();

        await deployer.deploy(T721Controller_v0, ERC721Instance.address, network_id);

        const T721Controller_v0Instance = await T721Controller_v0.deployed();

        await deployer.deploy(T721AttachmentsController_v0, T721Controller_v0Instance.address, ERC721Instance.address, network_id);

        const T721AttachmentsController_v0Instance = await T721AttachmentsController_v0.deployed();

        await ERC721Instance.createScope("t721_test", ZADDRESS, [], [T721Controller_v0Instance.address]);
        const scope = await ERC721Instance.getScope("t721_test");
        const scope_index = scope.scope_index.toNumber();

        await T721Controller_v0Instance.setScopeIndex(scope_index);
        await T721Controller_v0Instance.setFeeCollector(accounts[9]);
        console.log(`T721C: whitelisting erc20 ${ERC20Instance.address}`);
        await T721Controller_v0Instance.whitelistERC20(ERC20Instance.address, 10, 10);
        console.log(`T721C: whitelisting erc20 ${ERC2280Instance.address}`);
        await T721Controller_v0Instance.whitelistERC20(ERC2280Instance.address, 10, 10);
        console.log(`T721C: whitelisting erc2280 ${ERC2280Instance.address}`);
        await T721Controller_v0Instance.whitelistERC2280(ERC2280Instance.address, 10, 10);

        await T721AttachmentsController_v0Instance.setFeeCollector(accounts[9]);
        console.log(`T721AC: whitelisting erc20 ${ERC20Instance.address}`);
        await T721AttachmentsController_v0Instance.whitelistERC20(ERC20Instance.address, 0, 3);
        console.log(`T721AC: whitelisting erc20 ${ERC2280Instance.address}`);
        await T721AttachmentsController_v0Instance.whitelistERC20(ERC2280Instance.address, 0, 3);
        console.log(`T721AC: whitelisting erc2280 ${ERC2280Instance.address}`);
        await T721AttachmentsController_v0Instance.whitelistERC2280(ERC2280Instance.address, 0, 3);

    }
};

