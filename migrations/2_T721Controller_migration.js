const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;
const config = require('../truffle-config');

const hasArtifact = (name) => {
    return (config && config.extra_config && config.extra_config.external_modules
        && config.extra_config.external_modules[name] && config.extra_config.external_modules[name].artifact);
};

const getArtifact = (name) => {
    return config.extra_config.external_modules[name].artifact;
};

async function deploy(options) {

    add({ contractsData: [{ name: 'T721Controller_v0', alias: 'T721Controller' }] });

    await push(options);

    await create(Object.assign({ contractAlias: 'T721Controller', methodName: 'initialize_v0', methodArgs: [] }, options));
}

module.exports = async function(deployer, networkName, accounts) {
    if (['test', 'soliditycoverage'].indexOf(networkName) === -1) {

        await deployer.then(async () => {
            const {network, txParams} = await ConfigManager.initNetworkConfiguration({
                network: networkName,
                from: accounts[1]
            });
            await deploy({network, txParams});
        })

    }
};

