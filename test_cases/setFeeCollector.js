const { T721C_CONTRACT_NAME } = require('../test/constants');

module.exports = {
    setFeeCollector: async function setFeeCollector() {

        const {accounts, expect} = this;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        await T721Controller.setFeeCollector(accounts[5]);

        const result = await T721Controller.fee_collector();

        expect(result).to.equal(accounts[5]);

    }
};
