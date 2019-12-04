const { CONTRACT_NAME } = require('./constants');

module.exports = {
    useless_unwhitelisting: async function useless_unwhitelisting() {

        const {accounts, expect} = this;
        const {ERC20, ERC2280} = this.contracts;

        const T721Controller = this.contracts[CONTRACT_NAME];

        await expect(T721Controller.removeERC20(accounts[0])).to.eventually.be.rejectedWith('T721C::removeERC20 | useless transaction');
        await expect(T721Controller.removeERC2280(accounts[0])).to.eventually.be.rejectedWith('T721C::removeERC2280 | useless transaction');

        await T721Controller.whitelistERC20(ERC20.address, 10, 0);
        await T721Controller.whitelistERC2280(ERC2280.address, 10, 0);

        expect((await T721Controller.getERC20Fee(ERC20.address, 100)).toNumber()).to.equal(10);
        expect((await T721Controller.getERC2280Fee(ERC2280.address, 100)).toNumber()).to.equal(10);

        await expect(T721Controller.getERC20Fee(ERC20.address, 9)).to.eventually.be.rejectedWith('T721C::getERC20Fee | paid amount is under fixed fee');
        await expect(T721Controller.getERC2280Fee(ERC2280.address, 9)).to.eventually.be.rejectedWith('T721C::getERC2280Fee | paid amount is under fixed fee');

        await T721Controller.removeERC20(ERC20.address);
        await T721Controller.removeERC2280(ERC2280.address);

    }
};
