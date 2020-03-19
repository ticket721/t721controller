const { T721C_CONTRACT_NAME } = require('../test/constants');

module.exports = {
    setScopeIndex: async function setScopeIndex() {

        const {expect} = this;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        await T721Controller.setScopeIndex(123);

        const result = await T721Controller.scope_index();

        expect(result.toNumber()).to.equal(123);

    }
};
