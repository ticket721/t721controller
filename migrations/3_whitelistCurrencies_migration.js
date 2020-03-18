const T721Controller_v0 = artifacts.require('T721Controller_v0');
const config = require('../truffle-config');

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

            console.log(`T721C: whitelisting erc20 ${T721Token}`);
            await T721Controller.whitelistCurrency(T721Token, 10, 10);

        } else {
            throw new Error('Deployment requires Ticket721 repo setup to inject t721token configuration');
        }

    } else {

    }
};

