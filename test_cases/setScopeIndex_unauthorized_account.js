const { CONTRACT_NAME } = require('./constants');

module.exports = {
    setScopeIndex_unauthorized_account: async function setScopeIndex_unauthorized_account() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        expect(T721Controller.setScopeIndex(0, {from: accounts[1]})).to.eventually.be.rejectedWith('T721C::ownerOnly | unauthorized account');

    }
};
