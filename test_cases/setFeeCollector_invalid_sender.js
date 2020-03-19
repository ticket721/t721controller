const { T721C_CONTRACT_NAME } = require('../test/constants');

module.exports = {
    setFeeCollector_invalid_sender: async function setFeeCollector() {

        const {accounts, expect} = this;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        await expect(T721Controller.setFeeCollector(accounts[5], {from: accounts[1]})).to.eventually.be.rejectedWith('T721C::ownerOnly | unauthorized account');

    }
};
