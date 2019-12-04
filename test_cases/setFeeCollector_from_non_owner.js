const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME } = require('./constants');

module.exports = {
    setFeeCollector_from_non_owner: async function setFeeCollector_from_non_owner() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
        const T721AttachmentsController = this.contracts[T721AC_CONTRACT_NAME];

        await expect(T721Controller.setFeeCollector(accounts[2], {from: accounts[3]})).to.eventually.be.rejectedWith('T721C::ownerOnly | unauthorized account');
        return expect(T721AttachmentsController.setFeeCollector(accounts[2], {from: accounts[3]})).to.eventually.be.rejectedWith('T721AC::ownerOnly | unauthorized account');

    }
};
