const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { CONTRACT_NAME } = require('../test_cases/constants');

contract('t721controller', (accounts) => {

    before(async function () {
        const T721ControllerArtifact = artifacts.require(CONTRACT_NAME);
        const T721ControllerInstance = await T721ControllerArtifact.new();

        //const ERC20MockArtifact = artifacts.require('ERC20Mock');
        //const ERC2280MockArtifact = artifacts.require('ERC2280Mock');
        //const ERC721MockArtifact = artifacts.require('ERC721Mock');

        //const ERC20Instance = await ERC20MockArtifact.new();
        //const ERC2280Instance = await ERC2280MockArtifact.new(ERC20Instance.address);
        //const ERC721Instance = await ERC721MockArtifact.new();

        //await ERC721Instance.createScope(SCOPE_NAME, '0x0000000000000000000000000000000000000000', [MetaMarketplaceInstance.address], []);
        //const scope = await ERC721Instance.getScope(SCOPE_NAME);
        //setScopeIndex(scope.scope_index.toNumber());

        this.contracts = {
            [CONTRACT_NAME]: T721ControllerInstance
        };

        this.snap_id = await snapshot();
        this.accounts = accounts;
        this.expect = expect;
    });

    beforeEach(async function () {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    it('placeholder', function() {
        console.log(this.contracts);
    })

});
