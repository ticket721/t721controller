const { T721C_CONTRACT_NAME } = require('./constants');

module.exports = {
    removeAdmin_from_non_owner: async function removeAdmin_from_non_owner() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        await T721Controller.addAdmin(id, accounts[2], {from: accounts[0]});
        await expect(T721Controller.isAdmin(id, accounts[2])).to.eventually.equal(true);
        return expect(T721Controller.removeAdmin(id, accounts[2], {from: accounts[3]})).to.eventually.be.rejectedWith('T721C::groupOwnerOnly | unauthorized tx sender');

    }
};
