const T721Controller_v0 = artifacts.require('T721Controller_v0');
const T721AttachmentsController_v0 = artifacts.require('T721AttachmentsController_v0');
const DaiMock_v0 = artifacts.require("DaiMock_v0");
const ERC20Mock_v0 = artifacts.require("ERC20Mock_v0");
const ERC721Mock_v0 = artifacts.require("ERC721Mock_v0");
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
    if (['test', 'soliditycoverage'].indexOf(networkName) === -1) {

        if (hasArtifact('t721token')) {

            const network_id = await web3.eth.net.getId();
            const T721Token = getArtifact('t721token').T721Token.networks[network_id].address;
            const T721Controller = await T721Controller_v0.deployed();
            const T721AController = await T721AttachmentsController_v0.deployed();

            console.log(`T721C: whitelisting erc20 ${T721Token}`);
            await T721Controller.whitelistCurrency(T721Token, 10, 10);
            console.log(`T721AC: whitelisting erc20 ${T721Token}`);
            await T721AController.whitelistCurrency(T721Token, 10, 10);

        } else {
            throw new Error('Deployment requires Ticket721 repo setup to inject t721token configuration');
        }

    } else {


    }
};

