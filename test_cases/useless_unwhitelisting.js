const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME } = require('./constants');

module.exports = {
    useless_unwhitelisting: async function useless_unwhitelisting() {

        const {accounts, expect} = this;
        const {ERC20, ERC2280} = this.contracts;

        const T721Controller = this.contracts[T721C_CONTRACT_NAME];
        const T721AttachmentsController = this.contracts[T721AC_CONTRACT_NAME];

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
        
        await expect(T721AttachmentsController.removeERC20(accounts[0])).to.eventually.be.rejectedWith('T721AC::removeERC20 | useless transaction');
        await expect(T721AttachmentsController.removeERC2280(accounts[0])).to.eventually.be.rejectedWith('T721AC::removeERC2280 | useless transaction');

        await T721AttachmentsController.whitelistERC20(ERC20.address, 10, 10);
        await T721AttachmentsController.whitelistERC2280(ERC2280.address, 10, 10);

        expect((await T721AttachmentsController.getERC20Fee(ERC20.address, 100)).toNumber()).to.equal(11);
        expect((await T721AttachmentsController.getERC2280Fee(ERC2280.address, 100)).toNumber()).to.equal(11);

        await T721AttachmentsController.whitelistERC20(ERC20.address, 10, 0);
        await T721AttachmentsController.whitelistERC2280(ERC2280.address, 10, 0);

        expect((await T721AttachmentsController.getERC20Fee(ERC20.address, 100)).toNumber()).to.equal(10);
        expect((await T721AttachmentsController.getERC2280Fee(ERC2280.address, 100)).toNumber()).to.equal(10);

        await expect(T721AttachmentsController.getERC20Fee(ERC20.address, 9)).to.eventually.be.rejectedWith('T721AC::getERC20Fee | paid amount is under fixed fee');
        await expect(T721AttachmentsController.getERC2280Fee(ERC2280.address, 9)).to.eventually.be.rejectedWith('T721AC::getERC2280Fee | paid amount is under fixed fee');

        await T721AttachmentsController.removeERC20(ERC20.address);
        await T721AttachmentsController.removeERC2280(ERC2280.address);

    }
};
