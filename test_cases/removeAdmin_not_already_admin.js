const { CONTRACT_NAME } = require('./constants');

module.exports = {
    removeAdmin_not_already_admin: async function removeAdmin_not_already_admin() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        return expect(T721Controller.removeAdmin(id, accounts[2], {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::removeAdmin | address is not already admin');

    }
};
