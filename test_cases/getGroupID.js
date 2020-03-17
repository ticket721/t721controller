const { T721C_CONTRACT_NAME } = require('./constants');

module.exports = {
    getGroupID: async function getGroupID() {

        const {accounts, expect} = this;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];

        const uuid = 'c4758045-fe85-4935-8e2e-fab04966907d'.toLowerCase();
        const encoded = web3.eth.abi.encodeParameters(['address', 'string'], [accounts[0], uuid]);
        const result = web3.utils.keccak256(encoded);

        const groupId = await T721Controller.getGroupID(accounts[0], uuid);

        expect(groupId).to.equal(result);
    }
};
