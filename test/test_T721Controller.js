const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { T721C_CONTRACT_NAME, T721AC_CONTRACT_NAME }  = require('../test_cases/constants');

const {useless_unwhitelisting} = require('../test_cases/useless_unwhitelisting');

const {createGroup} = require('../test_cases/createGroup');

const {addAdmin} = require('../test_cases/addAdmin');
const {addAdmin_from_non_owner} = require('../test_cases/addAdmin_from_non_owner');
const {addAdmin_already_admin} = require('../test_cases/addAdmin_already_admin');
const {setScopeIndex_unauthorized_account} = require('../test_cases/setScopeIndex_unauthorized_account');

const {removeAdmin} = require('../test_cases/removeAdmin');
const {removeAdmin_from_non_owner} = require('../test_cases/removeAdmin_from_non_owner');
const {removeAdmin_not_already_admin} = require('../test_cases/removeAdmin_not_already_admin');

const {groupDeterministicId} = require('../test_cases/groupDeterministicId');
const {registerCategories} = require('../test_cases/registerCategories');
const {registerCategories_disable_resale} = require('../test_cases/registerCategories_disable_resale');
const {registerCategories_invalid_nums} = require('../test_cases/registerCategories_invalid_nums');
const {registerCategories_invalid_addr} = require('../test_cases/registerCategories_invalid_addr');
const {registerCategories_invalid_byte_data} = require('../test_cases/registerCategories_invalid_byte_data');
const {registerCategories_invalid_sale_start} = require('../test_cases/registerCategories_invalid_sale_start');
const {registerCategories_invalid_sale_end} = require('../test_cases/registerCategories_invalid_sale_end');
const {registerCategories_invalid_resale_start} = require('../test_cases/registerCategories_invalid_resale_start');
const {registerCategories_invalid_resale_end} = require('../test_cases/registerCategories_invalid_resale_end');
const {registerCategories_from_admin} = require('../test_cases/registerCategories_from_admin');
const {registerCategories_from_unauthorized} = require('../test_cases/registerCategories_from_unauthorized');
const {registerCategories_name_already_in_use} = require('../test_cases/registerCategories_name_already_in_use');
const {registerCategories_invalid_currency} = require('../test_cases/registerCategories_invalid_currency');
const {registerCategories_invalid_price} = require('../test_cases/registerCategories_invalid_price');
const {registerCategories_duplicate_currency} = require('../test_cases/registerCategories_duplicate_currency');
const {getCategory_out_of_range} = require('../test_cases/getCategory_out_of_range');
const {editCategory_sale_start} = require('../test_cases/editCategory_sale_start');
const {editCategory_all_but_sale_start} = require('../test_cases/editCategory_all_but_sale_start');
const {editCategory_amount_too_low} = require('../test_cases/editCategory_amount_too_low');
const {editCategory_invalid_lengths} = require('../test_cases/editCategory_invalid_lengths');
const {editCategory_add_erc2280} = require('../test_cases/editCategory_add_erc2280');
const {editCategory_invalid_currency} = require('../test_cases/editCategory_invalid_currency');

const {mint_10_owners_2_currencies_with_authorization} = require('../test_cases/mint_10_owners_2_currencies_with_authorization');
const {mint_10_owners_2_currencies_without_authorization} = require('../test_cases/mint_10_owners_2_currencies_without_authorization');
const {mint_10_owners_erc2280_with_authorization} = require('../test_cases/mint_10_owners_erc2280_with_authorization');
const {mint_erc20_invalid_nums} = require('../test_cases/mint_erc20_invalid_nums');
const {mint_erc2280_invalid_nums} = require('../test_cases/mint_erc2280_invalid_nums');
const {mint_erc20_invalid_addr} = require('../test_cases/mint_erc20_invalid_addr');
const {mint_erc2280_invalid_addr} = require('../test_cases/mint_erc2280_invalid_addr');
const {mint_erc20_unauthorized_currency} = require('../test_cases/mint_erc20_unauthorized_currency');
const {mint_erc2280_unauthorized_currency} = require('../test_cases/mint_erc2280_unauthorized_currency');
const {mint_erc2280_invalid_sig_size} = require('../test_cases/mint_erc2280_invalid_sig_size');
const {mint_erc20_invalid_currency} = require('../test_cases/mint_erc20_invalid_currency');
const {mint_erc2280_invalid_currency} = require('../test_cases/mint_erc2280_invalid_currency');
const {mint_erc20_allowance_too_low} = require('../test_cases/mint_erc20_allowance_too_low');
const {mint_invalid_nums} = require('../test_cases/mint_invalid_nums');
const {mint_0_owners} = require('../test_cases/mint_0_owners');
const {mint_no_tickets_left} = require('../test_cases/mint_no_tickets_left');
const {mint_invalid_payment_method} = require('../test_cases/mint_invalid_payment_method');
const {mint_payment_score_too_low} = require('../test_cases/mint_payment_score_too_low');
const {mint_invalid_authorization_signature_count} = require('../test_cases/mint_invalid_authorization_signature_count');
const {mint_invalid_authorization_code_count} = require('../test_cases/mint_invalid_authorization_code_count');
const {mint_authorization_code_duplicate} = require('../test_cases/mint_authorization_code_duplicate');
const {mint_authorization_code_duplicate_two_tx} = require('../test_cases/mint_authorization_code_duplicate_two_tx');
const {mint_invalid_authorization_signature} = require('../test_cases/mint_invalid_authorization_signature');
const {mint_useless_signature} = require('../test_cases/mint_useless_signature');
const {mint_useless_code} = require('../test_cases/mint_useless_code');

const {getTicketAffiliation} = require('../test_cases/getTicketAffiliation');
const {setFeeCollector_from_non_owner} = require('../test_cases/setFeeCollector_from_non_owner');

const {fixAttachments_with_authorization} = require('../test_cases/fixAttachments_with_authorization');

contract('T721Controller_v0', (accounts) => {

    before(async function () {
        const T721ControllerArtifact = artifacts.require(T721C_CONTRACT_NAME);
        const T721ControllerInstance = await T721ControllerArtifact.deployed();

        const T721AttachmentsControllerArtifact = artifacts.require(T721AC_CONTRACT_NAME);
        const T721AttachmentsControllerInstance = await T721AttachmentsControllerArtifact.deployed();

        const ERC20MockArtifact = artifacts.require('ERC20Mock_v0');
        const ERC2280MockArtifact = artifacts.require('ERC2280Mock_v0');
        const ERC721MockArtifact = artifacts.require('ERC721Mock_v0');

        const ERC20Instance = await ERC20MockArtifact.deployed();
        const ERC2280Instance = await ERC2280MockArtifact.deployed();
        const ERC721Instance = await ERC721MockArtifact.deployed();

        //await ERC721Instance.createScope(SCOPE_NAME, '0x0000000000000000000000000000000000000000', [MetaMarketplaceInstance.address], []);
        //const scope = await ERC721Instance.getScope(SCOPE_NAME);
        //setScopeIndex(scope.scope_index.toNumber());

        this.contracts = {
            [T721C_CONTRACT_NAME]: T721ControllerInstance,
            [T721AC_CONTRACT_NAME]: T721AttachmentsControllerInstance,
            ERC721: ERC721Instance,
            ERC20: ERC20Instance,
            ERC2280: ERC2280Instance
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

    describe('Attachments', function () {

        it('fixAttachments with authorization', fixAttachments_with_authorization);

    });

    describe('Categories', function () {

        it('groupDeterministicId', groupDeterministicId);
        it('registerCategories', registerCategories);
        it('registerCategories disable resale', registerCategories_disable_resale);
        it('registerCategories invalid nums', registerCategories_invalid_nums);
        it('registerCategories invalid addr', registerCategories_invalid_addr);
        it('registerCategories invalid byte data', registerCategories_invalid_byte_data);
        it('registerCategories invalid sale start', registerCategories_invalid_sale_start);
        it('registerCategories invalid sale end', registerCategories_invalid_sale_end);
        it('registerCategories invalid resale start', registerCategories_invalid_resale_start);
        it('registerCategories invalid resale end', registerCategories_invalid_resale_end);
        it('registerCategories from admin', registerCategories_from_admin);
        it('registerCategories from unauthorized', registerCategories_from_unauthorized);
        it('registerCategories name already in use', registerCategories_name_already_in_use);
        it('registerCategories invalid currency', registerCategories_invalid_currency);
        it('registerCategories invalid price', registerCategories_invalid_price);
        it('registerCategories duplicate currency', registerCategories_duplicate_currency);
        it('getCategory out of range', getCategory_out_of_range);
        it('editCategory sale start', editCategory_sale_start);
        it('editCategory all but sale start', editCategory_all_but_sale_start);
        it('editCategory amount too low', editCategory_amount_too_low);
        it('editCategory invalid lengths', editCategory_invalid_lengths);
        it('editCategory add erc2280', editCategory_add_erc2280);
        it('editCategory invalid currency', editCategory_invalid_currency);

    });

    describe('Mint', function () {

        it('mint 10 owners 2 currencies with authorization', mint_10_owners_2_currencies_with_authorization);
        it('mint 10 owners 2 currencies without authorization', mint_10_owners_2_currencies_without_authorization);
        it('mint 10 owners erc2280 with authorization', mint_10_owners_erc2280_with_authorization);
        it('mint erc20 invalid nums', mint_erc20_invalid_nums);
        it('mint erc2280 invalid nums', mint_erc2280_invalid_nums);
        it('mint erc20 invalid addr', mint_erc20_invalid_addr);
        it('mint erc2280 invalid addr', mint_erc2280_invalid_addr);
        it('mint erc20 unauthorized currency', mint_erc20_unauthorized_currency);
        it('mint erc2280 unauthorized currency', mint_erc2280_unauthorized_currency);
        it('mint erc2280 invalid sig size', mint_erc2280_invalid_sig_size);
        it('mint erc20 invalid currency', mint_erc20_invalid_currency);
        it('mint erc2280 invalid currency', mint_erc2280_invalid_currency);
        it('mint erc20 allowance too low', mint_erc20_allowance_too_low);
        it('mint invalid nums', mint_invalid_nums);
        it('mint 0 owners', mint_0_owners);
        it('mint no tickets left', mint_no_tickets_left);
        it('mint invalid payment method', mint_invalid_payment_method);
        it('mint payment score too low', mint_payment_score_too_low);
        it('mint invalid authorization signature count', mint_invalid_authorization_signature_count);
        it('mint invalid authorization code count', mint_invalid_authorization_code_count);
        it('mint authorization code duplicate', mint_authorization_code_duplicate);
        it('mint authorization code duplicate (two tx)', mint_authorization_code_duplicate_two_tx);
        it('mint invalid authorization signature', mint_invalid_authorization_signature);
        it('mint useless signature', mint_useless_signature);
        it('mint useless code', mint_useless_code);

    });

    describe('Utils', function () {

        it('getTicketAffiliation', getTicketAffiliation);
        it('setFeeCollector from non owner', setFeeCollector_from_non_owner);

    });

    describe('Scope Index', function () {

        it('setScopeIndex unauthorized account', setScopeIndex_unauthorized_account);

    });

    describe('Whitelisting', function () {

        it('useless unwhitelisting', useless_unwhitelisting);

    });

    describe('Group', function () {

        it('createGroup', createGroup);
        it('addAdmin', addAdmin);
        it('addAdmin from non owner', addAdmin_from_non_owner);
        it('addAdmin already admin', addAdmin_already_admin);
        it('removeAdmin', removeAdmin);
        it('removeAdmin from non owner', removeAdmin_from_non_owner);
        it('removeAdmin not already admin', removeAdmin_not_already_admin);

    });

});
