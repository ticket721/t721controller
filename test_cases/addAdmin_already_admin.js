const { T721C_CONTRACT_NAME } = require('./constants');

module.exports = {
    addAdmin_already_admin: async function addAdmin_already_admin() {

        const {accounts, expect} = this;
        const controllers = 'core@1.0.0:esport@1.0.0';

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const res = await T721Controller.createGroup(controllers, {from: accounts[0]});
        const id = res.logs[0].args.id;

        await T721Controller.addAdmin(id, accounts[2], {from: accounts[0]});
        await expect(T721Controller.isAdmin(id, accounts[2])).to.eventually.equal(true);
        return expect(T721Controller.addAdmin(id, accounts[2], {from: accounts[0]})).to.eventually.be.rejectedWith('T721C::addAdmin | address is already admin');

    }
};
