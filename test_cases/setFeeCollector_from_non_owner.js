const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME } = require('./constants');

module.exports = {
    setFeeCollector_from_non_owner: async function setFeeCollector_from_non_owner() {

        const {accounts, expect} = this;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        await expect(T721Controller.setFeeCollector(accounts[2], {from: accounts[3]})).to.eventually.be.rejectedWith('T721C::ownerOnly | unauthorized account');

    }
};
