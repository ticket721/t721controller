pragma solidity 0.5.15;

import "./ITicketForge_v0.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "erc2280/contracts/IERC2280.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./T721ControllerDomain_v0.sol";
import "./BytesUtil_v0.sol";

// @notice the T721Controller handles all the ticket categories and minting
contract T721Controller_v0 is T721ControllerDomain_v0 {

    using SafeMath for uint256;

    event NewGroup(bytes32 indexed id, address indexed owner, string controllers);
    event GroupAdminAdded(bytes32 indexed id, address indexed admin);
    event GroupAdminRemoved(bytes32 indexed id, address indexed admin);
    event NewCategory(bytes32 indexed group_id, bytes32 indexed category_name, uint256 indexed idx);
    event EditCategory(bytes32 indexed group_id, bytes32 indexed category_name, uint256 indexed idx);
    event Mint(
        bytes32 indexed group_id,
        bytes32 indexed category_name,
        address indexed owner,
        uint256 ticket_id,
        address buyer
    );

    struct Currency {
        bool active;
        uint256 fix;
        uint256 variable;
    }

    struct Affiliation {
        bool active;
        bytes32 group_id;
        uint256 category_idx;
    }

    struct Category {
        uint256 amount;
        uint256 sale_start;
        uint256 sale_end;
        uint256 resale_start;
        uint256 resale_end;

        address authorization;
        address attachment;

        bytes32 name;
        bytes32 hierarchy;

        uint256 sold;
        address[] currencies;
        mapping(address => uint256) prices;
    }

    struct Group {
        string controllers;
        address owner;
        mapping (address => bool) admins;
        Category[] categories;
        mapping (bytes32 => bool) category_names;
        mapping (address => uint256) balances;
    }

    ITicketForge_v0                     public t721;
    uint256                             public scope_index;
    address                             public owner;
    address                             public fee_collector;
    mapping (address => uint)           public group_nonce;
    mapping (uint256 => Affiliation)    public tickets;
    mapping (bytes32 => Group)          public groups;
    mapping (address => Currency)       public erc20_whitelist;
    mapping (address => Currency)       public erc2280_whitelist;
    mapping (uint256 => bool)           public authorization_code_registry;
    bytes32 public current_id = 0x0000000000000000000000000000005437323120436f6e74726f6c6c65722031; // T721 Controller 1

    constructor(address _t721, uint256 _chain_id)
    T721ControllerDomain_v0("T721 Controller", "0", _chain_id)
    public {
        t721 = ITicketForge_v0(_t721);
        owner = msg.sender;
        fee_collector = msg.sender;
    }

    //
    // @notice Modifier to prevent non-owner message senders
    //
    modifier ownerOnly() {
        require(msg.sender == owner, "T721C::ownerOnly | unauthorized account");
        _;
    }

    //
    // @notice Modifier to prevent non-group-owner and non-group-admin message senders
    //
    // @param group_id ID of the group
    //
    modifier groupOwnerOnly(bytes32 group_id) {
        require(msg.sender == groups[group_id].owner, "T721C::groupOwnerOnly | unauthorized tx sender");
        _;
    }

    //
    // @notice Modifier to prevent non-group-owner and non-group-admin message senders
    //
    // @param group_id ID of the group
    //
    modifier groupOwnerOrAdminOnly(bytes32 group_id) {
        require(isAdminOrOwner(group_id, msg.sender) == true,
            "T721C::groupOwnerOrAdminOnly | unauthorized tx sender");
        _;
    }

    //
    // @notice Set scope index of the tickets to create
    //
    // @param _scope_index Scope index to use
    //
    function setScopeIndex(uint256 _scope_index) external ownerOnly {
        scope_index = _scope_index;
    }

    //
    // @notice Set the address receiving all collected fees
    //
    // @param fee_collector_address Address receiving all cllected fees
    //
    function setFeeCollector(address fee_collector_address) public ownerOnly {
        fee_collector = fee_collector_address;
    }

    //
    // @notice Add an ERC20 address to the payment whitelist and sets the fix and variable fee values
    //
    // @param erc20_address Address to whitelist for ERC20 payments
    //
    // @param fix_fee Fix amount to collect on every payment made with this currency
    //
    // @param var_fee Percent to collect on every payment made with this currency. Max is 1000 (100%).
    //
    function whitelistERC20(address erc20_address, uint256 fix_fee, uint256 var_fee) public ownerOnly {
        erc20_whitelist[erc20_address] = Currency({
            active: true,
            fix: fix_fee,
            variable: var_fee
            });
    }

    //
    // @notice Remove an ERC20 address from the payment whitelist
    //
    // @param erc20_address Address to remove from the payment whitelist
    //
    function removeERC20(address erc20_address) public ownerOnly {
        require(erc20_whitelist[erc20_address].active == true, "T721C::removeERC20 | useless transaction");
        erc20_whitelist[erc20_address].active = false;
    }

    //
    // @notice Add an ERC2280 address to the payment whitelist and sets the fix and variable fee values
    //
    // @param erc20_address Address to whitelist for ERC2280 payments
    //
    // @param fix_fee Fix amount to collect on every payment made with this currency
    //
    // @param var_fee Percent to collect on every payment made with this currency. Max is 1000 (100%).
    //
    function whitelistERC2280(address erc2280_address, uint256 fix_fee, uint256 var_fee) public ownerOnly {
        erc2280_whitelist[erc2280_address] = Currency({
            active: true,
            fix: fix_fee,
            variable: var_fee
            });
    }

    //
    // @notice Remove an ERC2280 address from the payment whitelist
    //
    // @param erc20_address Address to remove from the payment whitelist
    //
    function removeERC2280(address erc2280_address) public ownerOnly {
        require(erc2280_whitelist[erc2280_address].active == true, "T721C::removeERC2280 | useless transaction");
        erc2280_whitelist[erc2280_address].active = false;
    }

    //
    // @notice Retrieve the current balance for a group
    //
    // @param group ID of the group
    //
    // @param currency Currency balance to inspect
    //
    function balanceOf(bytes32 group_id, address currency) public view returns (uint256) {
        return groups[group_id].balances[currency];
    }

    //
    // @notice Retrieve the fee to apply for a specific ERC20 currency and amount
    //
    // @param erc20_address Currency to use for fee computation
    //
    // @param amount Total amount to tax
    //
    function getERC20Fee(address erc20_address, uint256 amount) public view returns (uint256) {
        require(amount >= erc20_whitelist[erc20_address].fix,
            "T721C::getERC20Fee | paid amount is under fixed fee");

        if (erc20_whitelist[erc20_address].variable != 0) {
            return amount
            .mul(erc20_whitelist[erc20_address].variable)
            .div(1000)
            .add(erc20_whitelist[erc20_address].fix);
        }
        return erc20_whitelist[erc20_address].fix;
    }

    //
    // @notice Retrieve the fee to apply for a specific ERC2280 currency and amount
    //
    // @param erc20_address Currency to use for fee computation
    //
    // @param amount Total amount to tax
    //
    function getERC2280Fee(address erc2280_address, uint256 amount) public view returns (uint256) {
        require(amount >= erc2280_whitelist[erc2280_address].fix,
            "T721C::getERC2280Fee | paid amount is under fixed fee");

        if (erc2280_whitelist[erc2280_address].variable != 0) {
            return amount
            .mul(erc2280_whitelist[erc2280_address].variable)
            .div(1000)
            .add(erc2280_whitelist[erc2280_address].fix);
        }
        return erc2280_whitelist[erc2280_address].fix;
    }

    //
    // @notice Check if address is group admin
    //
    // @param group_id ID of the group
    //
    // @param admin Address to verify
    //
    function isAdmin(bytes32 group_id, address admin) public view returns (bool) {
        return groups[group_id].admins[admin];
    }

    //
    // @notice Utility to check if given address if owner or admin
    //
    // @param group_id ID of the group
    //
    // @param admin_or_owner Address to check
    //
    function isAdminOrOwner(bytes32 group_id, address admin_or_owner) public view returns (bool) {
        return groups[group_id].owner == admin_or_owner || isAdmin(group_id, admin_or_owner);
    }

    //
    // @notice Utility to get next group ID
    //
    function getNextGroupId() external view returns (bytes32) {

        return keccak256(abi.encode(
                current_id,
                msg.sender,
                group_nonce[msg.sender]
            ));
    }

    //
    // @notice Create a group that can contain several categories
    //
    // @param controllers string containing all used controllers
    //
    function createGroup(string calldata controllers) external {
        bytes32 selected_id = keccak256(abi.encode(
                current_id,
                msg.sender,
                group_nonce[msg.sender]
            ));

        Group storage grp = groups[selected_id];
        grp.controllers = controllers;
        grp.owner = msg.sender;

        current_id = selected_id;

        group_nonce[msg.sender] += 1;

        emit NewGroup(selected_id, msg.sender, controllers);

    }

    //
    // @notice Add admin to group
    //
    // @param group_id ID of the group
    //
    // @param admin Address to verify
    //
    function addAdmin(bytes32 group_id, address admin) external groupOwnerOnly(group_id) {
        require(groups[group_id].admins[admin] == false, "T721C::addAdmin | address is already admin");
        groups[group_id].admins[admin] = true;
        emit GroupAdminAdded(group_id, admin);
    }

    //
    // @notice Add admin from group
    //
    // @param group_id ID of the group
    //
    // @param admin Address to verify
    //
    function removeAdmin(bytes32 group_id, address admin) external groupOwnerOnly(group_id) {
        require(groups[group_id].admins[admin] == true, "T721C::removeAdmin | address is not already admin");
        groups[group_id].admins[admin] = false;
        emit GroupAdminRemoved(group_id, admin);
    }

    //
    // @notice Withdraw group funds
    //
    // @param group_id ID of the group
    //
    // @param currency Currency to withdraw
    //
    // @param amount Amount to withdraw
    //
    // @param mode 1 for ERC20, 2 for ERC2280. Sets withdraw method
    //
    // @param target Withdraw toward this address
    //
    function withdraw(bytes32 group_id, address currency, uint256 amount, uint256 mode, address target)
    external groupOwnerOrAdminOnly(group_id) {
        require(balanceOf(group_id, currency) >= amount, "T721C::withdraw | balance too low");

        if (mode == 1 || mode == 2) { // ERC20 & ERC2280
            IERC20(currency).transfer(target, amount);
        } else {
            revert("T721C::withdraw | invalid withdraw mode");
        }
    }

    //
    // @notice Checks that timestamps are valid
    //
    function checkTimestamps(
        uint256 sale_start,
        uint256 sale_end,
        uint256 resale_start,
        uint256 resale_end
    ) internal view {

        // Check #1 Sale Start should not be in past
        require(sale_start > block.timestamp,
            "T721C::checkTimestamps | sale start is in the past");

        // Check #2 Sale End should be after Sale Start
        require(sale_end > sale_start,
            "T721C::checkTimestamps | sale end is not after sale start");

        // Check #3 Sale Start should not be in past
        require(resale_start == 0 || resale_start > block.timestamp,
            "T721C::checkTimestamps | resale start is in the past");

        // Check #4 Sale End should be after Sale Start
        require(resale_end == 0 || resale_end > resale_start,
            "T721C::checkTimestamps | resale end is not after resale start");

    }

    function checkCategoryInfos(
        uint256 nums_idx,
        uint256 addr_idx,
        uint256 byte_data_idx,
        uint256[] memory nums,
        address[] memory addr,
        bytes32[] memory byte_data
    ) internal view {

        // Checks 1 to 4 in checkTimestamps
        checkTimestamps(nums[nums_idx + 1], nums[nums_idx + 2], nums[nums_idx + 3], nums[nums_idx + 4]);

        // Check #5 Number of Uint256 argument is valid
        require(nums.length - nums_idx >= 6 + nums[nums_idx + 5],
            "T721C::checkCategoryInfos | invalid nums argument count");

        // Check #6 Number of Address arguments is valid
        require(addr.length - addr_idx >= 2 + nums[nums_idx + 5],
            "T721C::checkCategoryInfos | invalid addr argument count");

        // Check #7 Number of Byte Data arguments is valid
        require(byte_data.length - byte_data_idx >= 2,
            "T721C::checkCategoryInfos | invalid byte_data argument count");

    }

    // @notice This method register multiple categories inside a group. Each category is define by its timestamps
    //         (when the sale starts and ends, when the resale starts and ends), the amount of ticket to sell, and
    //         a set of currencies and prices. The nums, addr and byte_data arguments work like stacks. They contain
    //         all the information listed above.
    //
    // @dev nums Array containing the uint256 values to configure the categories. For each category, we have 6+
    //           values used to configure it: `amount`, `sale_start`, `sale_end`, `resale_start`, `resale_end`,
    //           `prices_count`, and `prices_count` times `price`. Below is an example of nums argument when adding
    //           two categories.
    //
    //           ```
    //           | amount           |\
    //           | sale_start       | \
    //           | sale_end         |  \
    //           | resale_start     |   \ Arguments for 1st category
    //           | resale_end       |   /
    //           | prices_count = 2 |  /
    //           | price 1          | /
    //           |_price 2__________|/
    //           | amount           |\
    //           | sale_start       | \
    //           | sale_end         |  \
    //           | resale_start     |   \
    //           | resale_end       |    > Arguments for 2nd category
    //           | prices_count = 3 |   /
    //           | price 1          |  /
    //           | price 2          | /
    //           | price 3          |/
    //           ```
    //
    //
    // @dev addr Array containing the address values to configure the categories. For each category we have 1+
    //           values used to configure it: `authorization` and `prices_count` times `currency`. Below is an
    //           example of addr argument when adding two categories (with the same `prices_count` as above)
    //
    //           ```
    //           | authorization |\
    //           | attachment    | \
    //           | currency 1    | / Arguments for 1st category (with prices_count = 2)
    //           |_currency 2____|/
    //           | authorization |\
    //           | attachment    | \
    //           | currency 1    |  > Arguments for 2nd category (with prices_count = 3)
    //           | currency 2    | /
    //           | currency 3    |/
    //           ```
    //
    // @dev byte_data Array containing the bytes32 values to configure categories. For each category we have 2
    //                values used to configure it: `name` and `hierarchy`
    //
    function registerCategories(
        bytes32 group_id,
        uint256[] memory nums,
        address[] memory addr,
        bytes32[] memory byte_data
    ) groupOwnerOrAdminOnly(group_id) public {

        uint addr_idx = 0;
        uint nums_idx = 0;
        uint byte_data_idx = 0;

        while (addr_idx < addr.length || nums_idx < nums.length || byte_data_idx < byte_data.length) {

            require(groups[group_id].category_names[byte_data[byte_data_idx]] == false,
                "T721C::registerCategories | category name already in use in group");
            checkCategoryInfos(nums_idx, addr_idx, byte_data_idx, nums, addr, byte_data);

            uint256 current_idx = groups[group_id].categories.push(
                Category({
                amount: nums[nums_idx],
                sale_start: nums[nums_idx + 1],
                sale_end: nums[nums_idx + 2],
                resale_start: nums[nums_idx + 3],
                resale_end: nums[nums_idx + 4],

                authorization: addr[addr_idx],
                attachment: addr[addr_idx + 1],

                name: byte_data[byte_data_idx],
                hierarchy: byte_data[byte_data_idx + 1],

                sold: 0,
                currencies: new address[](nums[nums_idx + 5])
                })
            );

            Category storage cat = groups[group_id].categories[current_idx - 1];
            uint256 prices_count = nums[nums_idx + 5];

            for (uint price_idx = 0; price_idx < prices_count; ++price_idx) {
                require(erc20_whitelist[addr[addr_idx + 2 + price_idx]].active == true
                || erc2280_whitelist[addr[addr_idx + 2 + price_idx]].active == true,
                    "T721C::registerCategories | unauthorized currency added");
                require(nums[nums_idx + 6 + price_idx] != 0,
                    "T721C::registerCategories | invalid price 0");
                require(cat.prices[addr[addr_idx + 2 + price_idx]] == 0,
                    "T721C::registerCategories | duplicate currency");
                cat.currencies[price_idx] = addr[addr_idx + 2 + price_idx];
                cat.prices[addr[addr_idx + 2 + price_idx]] = nums[nums_idx + 6 + price_idx];
            }

            emit NewCategory(group_id, byte_data[byte_data_idx], current_idx - 1);
            groups[group_id].category_names[byte_data[byte_data_idx]] = true;

            addr_idx += 2 + prices_count;
            byte_data_idx += 2;
            nums_idx += 6 + prices_count;

        }

    }

    function getCategoryPrice(bytes32 group_id, uint256 idx, address currency) public view returns (uint256 price) {
        require(groups[group_id].categories.length > idx, "T721C::getCategoryPrice | index out of range");

        return groups[group_id].categories[idx].prices[currency];
    }

    function getTicketAffiliation(
        uint256 ticket_id
    ) external view returns (bool active, bytes32 group_id, uint256 category_idx) {
        return (tickets[ticket_id].active, tickets[ticket_id].group_id, tickets[ticket_id].category_idx);
    }

    function getCategoryAttachmentAuthorizationAddress(
        bytes32 group_id,
        uint256 category_idx
    ) external view returns (address attachment) {
        return groups[group_id].categories[category_idx].attachment;
    }

    function getCategory(
        bytes32 group_id,
        uint256 idx
    ) public view returns (
        uint256 amount,
        uint256 sale_start,
        uint256 sale_end,
        uint256 resale_start,
        uint256 resale_end,

        address authorization,
        address attachment,

        bytes32 name,
        bytes32 hierarchy,

        address[] memory currencies,

        uint256 sold) {
        require(groups[group_id].categories.length > idx, "T721C::getCategory | index out of range");

        Category storage cat = groups[group_id].categories[idx];

        return (
        cat.amount,
        cat.sale_start,
        cat.sale_end,
        cat.resale_start,
        cat.resale_end,
        cat.authorization,
        cat.attachment,
        cat.name,
        cat.hierarchy,
        cat.currencies,
        cat.sold
        );
    }

    function editCategory(
        bytes32 group_id,
        uint256 idx,
        uint256[] calldata nums,
        address authorization,
        address attachment,
        bytes32 hierarchy,
        uint256[] calldata prices,
        address[] calldata currencies
    ) external groupOwnerOrAdminOnly(group_id) {

        checkTimestamps(nums[1], nums[2], nums[3], nums[4]);

        Category storage cat = groups[group_id].categories[idx];

        require(cat.sold <= nums[0],
            "T721C::editCategory | cannot change ticket amount under number of sold tickets");
        require(prices.length == currencies.length,
            "T721C::editCategory | invalid prices and currencies argument");

        // Ifs cost less than writes. It looks ugly, but it is cheaper

        if (cat.amount != nums[0]) {
            cat.amount = nums[0];
        }

        if (cat.sale_start != nums[1]) {
            cat.sale_start = nums[1];
        }

        if (cat.sale_end != nums[2]) {
            cat.sale_end = nums[2];
        }

        if (cat.resale_start != nums[3]) {
            cat.resale_start = nums[3];
        }

        if (cat.resale_end != nums[4]) {
            cat.resale_end = nums[4];
        }

        if (cat.authorization != authorization) {
            cat.authorization = authorization;
        }

        if (cat.attachment != attachment) {
            cat.attachment = attachment;
        }

        if (cat.hierarchy != hierarchy) {
            cat.hierarchy = hierarchy;
        }

        for (uint price_idx = 0; price_idx < prices.length; ++price_idx) {
            require(erc20_whitelist[currencies[price_idx]].active == true
            || erc2280_whitelist[currencies[price_idx]].active == true,
                "T721C::editCategory | unauthorized currency");
            if (cat.prices[currencies[price_idx]] == 0) {
                cat.currencies.push(currencies[price_idx]);
            }
            cat.prices[currencies[price_idx]] = prices[price_idx];
        }

        emit EditCategory(group_id, cat.name, idx);

    }

    function isAuthorizationCodeAvailable(uint256 code) public view returns (bool) {
        return !authorization_code_registry[code];
    }

    // @notice Internal ERC20 payment verifier
    function verifyERC20MintPayment(
        Category storage cat,
        uint256[] memory nums,
        address[] memory addr,
        uint256 nums_idx,
        uint256 addr_idx
    ) internal view returns (uint256) {

        //        ___ nums_idx
        //       /
        // [..., `payment_mode`, `amount`, ...]
        require(nums.length - nums_idx >= 2,
            "T721C::verifyERC20MintPayment | invalid number of nums arguments");

        //        ___ addr_idx
        //       /
        // [..., `currency`, ...]
        require(addr.length - addr_idx >= 1,
            "T721C::verifyERC20MintPayment | invalid number of addr arguments");

        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx + 1];

        require(erc20_whitelist[currency].active == true,
            "T721C::verifyERC20MintPayment | unauthorized erc20 currency");

        require(cat.prices[currency] != 0,
            "T721C::verifyERC20MintPayment | invalid currency");

        require(IERC20(currency).allowance(msg.sender, address(this)) >= amount,
            "T721C::verifyERC20MintPayment | erc20 allowance too low");

        getERC20Fee(currency, amount);

        return ((amount * 100) / cat.prices[currency]);

    }

    // @notice Internal ERC20 payment processor
    function processERC20MintPayment(
        bytes32 group_id,
        Category storage cat,
        uint256[] memory nums,
        address[] memory addr,
        uint256 nums_idx,
        uint256 addr_idx
    ) internal returns (uint256) {

        //        ___ nums_idx
        //       /
        // [..., `payment_mode`, `amount`, ...]
        require(nums.length - nums_idx >= 2,
            "T721C::processERC20MintPayment | invalid number of nums arguments");

        //        ___ addr_idx
        //       /
        // [..., `currency`, ...]
        require(addr.length - addr_idx >= 1,
            "T721C::processERC20MintPayment | invalid number of addr arguments");

        Group storage grp = groups[group_id];
        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx + 1];

        require(erc20_whitelist[currency].active == true,
            "T721C::processERC20MintPayment | unauthorized erc20 currency");

        require(cat.prices[currency] != 0,
            "T721C::processERC20MintPayment | invalid currency");

        IERC20(currency).transferFrom(msg.sender, address(this), amount);
        uint256 fee = getERC20Fee(currency, amount);
        IERC20(currency).transfer(fee_collector, fee);

        grp.balances[currency] = grp.balances[currency]
        .add(amount)
        .sub(fee);

        return ((amount * 100) / cat.prices[currency]);

    }

    // @notice Internal ERC2280 payment verifier
    function verifyERC2280MintPayment(
        Category storage cat,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature,
        uint256 nums_idx,
        uint256 addr_idx,
        uint256 sig_idx
    ) internal view returns (uint256) {

        //        ___ nums_idx
        //       /
        // [..., `payment_mode`, `amount`, ...]
        require(nums.length - nums_idx >= 2,
            "T721C::verifyERC2280MintPayment | invalid number of nums arguments");

        //        ___ addr_idx
        //       /
        // [..., `currency`, ...]
        require(addr.length - addr_idx >= 1,
            "T721C::verifyERC2280MintPayment | invalid number of addr arguments");

        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx + 1];

        require(erc2280_whitelist[currency].active == true,
            "T721C::verifyERC2280MintPayment | unauthorized erc2280 currency");

        //               ___ sig_idx           sig_idx + 65 bytes___ (ERC2280 transfer signature)
        //              /                                           \
        // 0x76bad53e...597d82fa5e7b52653f46af...8f5462564e4af27b5e5f...
        require(signature.length - sig_idx >= 65,
            "T721C::verifyERC2280MintPayment | invalid signature size");

        require(cat.prices[currency] != 0,
            "T721C::verifyERC2280MintPayment | invalid currency");

        uint256 nonce = IERC2280(currency).nonceOf(msg.sender);

        address[3] memory actors = [
        msg.sender,
        address(this),
        address(this)
        ];

        uint256[5] memory txparams = [
        nonce,
        0,
        0,
        0,
        amount
        ];

        bytes memory erc2280_sig = BytesUtil_v0.slice(signature, sig_idx, 65);

        IERC2280(currency).verifyTransfer(actors, txparams, erc2280_sig);
        getERC2280Fee(currency, amount);

        return ((amount * 100) / cat.prices[currency]);

    }

    // @notice Internal ERC2280 payment processor
    function processERC2280MintPayment(
        bytes32 group_id,
        Category storage cat,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature,
        uint256 nums_idx,
        uint256 addr_idx,
        uint256 sig_idx
    ) internal returns (uint256) {


        //        ___ nums_idx
        //       /
        // [..., `payment_mode`, `amount`, ...]
        require(nums.length - nums_idx >= 2,
            "T721C::processERC2280MintPayment | invalid number of nums arguments");

        //        ___ addr_idx
        //       /
        // [..., `currency`, ...]
        require(addr.length - addr_idx >= 1,
            "T721C::processERC2280MintPayment | invalid number of addr arguments");

        Group storage grp = groups[group_id];
        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx + 1];

        require(erc2280_whitelist[currency].active == true,
            "T721C::processERC2280MintPayment | unauthorized erc2280 currency");

        //               ___ sig_idx           sig_idx + 65 bytes___ (ERC2280 transfer signature)
        //              /                                           \
        // 0x76bad53e...597d82fa5e7b52653f46af...8f5462564e4af27b5e5f...
        require(signature.length - sig_idx >= 65,
            "T721C::processERC2280MintPayment | invalid signature size");

        require(cat.prices[currency] != 0,
            "T721C::processERC2280MintPayment | invalid currency");

        uint256 nonce = IERC2280(currency).nonceOf(msg.sender);

        address[3] memory actors = [
        msg.sender,
        address(this),
        address(this)
        ];

        uint256[5] memory txparams = [
        nonce,
        0,
        0,
        0,
        amount
        ];

        bytes memory erc2280_sig = BytesUtil_v0.slice(signature, sig_idx, 65);

        IERC2280(currency).signedTransfer(actors, txparams, erc2280_sig);
        uint256 fee = getERC2280Fee(currency, amount);
        IERC2280(currency).transfer(fee_collector, fee);

        grp.balances[currency] = grp.balances[currency]
        .add(amount)
        .sub(fee);

        return ((amount * 100) / cat.prices[currency]);

    }

    // @notice This method verifies arguments for the mint method. It takes all the same arguments, identically. If
    //         there are not reverts generated => arguments are valid.
    //
    // @dev group_id ID of the group containing the category to purchase.
    //
    // @dev category_idx Index of the category inside the group.
    //
    // @dev nums Array containing the uint256 values to configure the purchase. Its size is dynamic and depends on
    //           several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //           Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //           currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //           signature. We will use this example for all arguments.
    //
    //           ```
    //           | currencies = 2       |\ General config: number of currencies + number of tickets to create
    //           |_owners = 3___________|/
    //           | type = 1 (ERC20)     |\ Configuration for $ONE payment (erc20)
    //           |_amount_______________|/
    //           | type = 2 (ERC2280)   |\ Configuration for $TWO payment (erc2280)
    //           |_amount_______________|/
    //           | authorization code 1 |\
    //           | authorization code 2 | > Authorization codes for the 3 tickets
    //           | authorization code 3 |/
    //           ```
    //
    // @dev addr Array containing the address values to configure the purchase. Its size is dynamic and depends on
    //           several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //           Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //           currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //           signature. We will use this example for all arguments.
    //
    //           ```
    //           |_address of $ONE______| > Address of $ONE currency
    //           |_address of $TWO______| > Address of $TWO currency
    //           | owner 1              |\
    //           | owner 2              | > Addresses of ticket owners
    //           | owner 3              |/
    //           ```
    //
    // @dev signature Bytes argument containing all the required signatures. Its size is dynamic and depends on
    //                several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //                Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //                currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //                signature. We will use this example for all arguments. Each chunk here is a 65 bytes long
    //                signature.
    //
    //           ```
    //           |_ERC2280 transfer signature_| > Signature for $TWO payment
    //           | authorization signature 1  |\
    //           | authorization signature 2  | > Authorization signatures for all tickets
    //           | authorization signature 3  |/
    //           ```
    //
    function verifyMint(
        bytes32 group_id,
        uint256 category_idx,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature
    ) public view {

        require(nums.length >= 2, "T721C::verifyMint | invalid nums length");

        uint256 nums_idx = 2;
        uint256 addr_idx = 0;
        uint256 sig_idx = 0;
        uint256 currency_count = nums[0];
        uint256 owner_count = nums[1];
        uint256 score = 0;

        require(owner_count > 0, "T721C::verifyMint | useless minting for 0 owners");

        Category storage cat = groups[group_id].categories[category_idx];

        require(cat.sold + owner_count <= cat.amount,
            "T721C::verifyMint | no tickets left to sell for category");

        for (uint256 idx = 0; idx < currency_count; ++idx) {

            if (nums[nums_idx] == 1) { // ERC20

                score += verifyERC20MintPayment(cat, nums, addr, nums_idx, addr_idx);
                nums_idx += 2;
                addr_idx += 1;

            } else if (nums[nums_idx] == 2) { // ERC2280

                score += verifyERC2280MintPayment(cat, nums, addr, signature, nums_idx, addr_idx, sig_idx);
                nums_idx += 2;
                addr_idx += 1;
                sig_idx += 65;

            } else {

                revert("T721C::verifyMint | unknown payment mode");

            }

        }

        require(score >= owner_count * 100, "T721C::verifyMint | payment score too low");

        if (cat.authorization != address(0)) { // Authorization => ON

            require(signature.length - sig_idx >= 65 * owner_count,
                "T721C::verifyMint | invalid authorization signature count");
            require(nums.length - nums_idx >= owner_count,
                "T721C::verifyMint | invalid authorization code count");

            for (uint256 code_idx = 0; code_idx < owner_count; ++code_idx) {
                for (uint256 check_idx = code_idx + 1; check_idx < owner_count; ++check_idx) {
                    require(nums[nums_idx + code_idx] != nums[nums_idx + check_idx],
                        "T721C::verifyMint | authorization code duplicate");
                }
            }

            for (uint256 idx = 0; idx < owner_count; ++idx) {

                require(isAuthorizationCodeAvailable(nums[nums_idx + idx]) == true,
                    "T721C::verifyMint | authorization code already used");

                MintingAuthorization memory ma = MintingAuthorization(
                    nums[nums_idx + idx],
                    cat.authorization,
                    addr[addr_idx + idx],
                    group_id,
                    cat.name
                );

                bytes memory owner_signature = BytesUtil_v0.slice(
                    signature,
                    sig_idx + idx * 65,
                    65
                );

                require(verify(ma, owner_signature) == cat.authorization,
                    "T721C::verifyMint | invalid authorization signature");

            }

        } else {

            require(signature.length - sig_idx == 0,
                "T721C::verifyMint | useless authorization signature provided");
            require(nums.length - nums_idx == 0,
                "T721C::verifyMint | useless authorization codes provided");

        }

    }

    // @notice This method creates one or more tickets if payment is properly made and tickets are left for sale.
    //         Payment can be made from multiple currencies if they all are accepted. Payer can only be `msg.sender`.
    //
    // @dev group_id ID of the group containing the category to purchase.
    //
    // @dev category_idx Index of the category inside the group.
    //
    // @dev nums Array containing the uint256 values to configure the purchase. Its size is dynamic and depends on
    //           several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //           Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //           currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //           signature. We will use this example for all arguments.
    //
    //           ```
    //           | currencies = 2       |\ General config: number of currencies + number of tickets to create
    //           |_owners = 3___________|/
    //           | type = 1 (ERC20)     |\ Configuration for $ONE payment (erc20)
    //           |_amount_______________|/
    //           | type = 2 (ERC2280)   |\ Configuration for $TWO payment (erc2280)
    //           |_amount_______________|/
    //           | authorization code 1 |\
    //           | authorization code 2 | > Authorization codes for the 3 tickets
    //           | authorization code 3 |/
    //           ```
    //
    // @dev addr Array containing the address values to configure the purchase. Its size is dynamic and depends on
    //           several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //           Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //           currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //           signature. We will use this example for all arguments.
    //
    //           ```
    //           |_address of $ONE______| > Address of $ONE currency
    //           |_address of $TWO______| > Address of $TWO currency
    //           | owner 1              |\
    //           | owner 2              | > Addresses of ticket owners
    //           | owner 3              |/
    //           ```
    //
    // @dev signature Bytes argument containing all the required signatures. Its size is dynamic and depends on
    //                several variable: amount of currencies used, types of currencies, amount of authorization codes.
    //                Let's say we want to pay with two currencies called $ONE and $TWO for 3 tickets. $ONE is an ERC20
    //                currency while $TWO is an ERC2280 currency. The category requires an authorization code and
    //                signature. We will use this example for all arguments. Each chunk here is a 65 bytes long
    //                signature.
    //
    //           ```
    //           |_ERC2280 transfer signature_| > Signature for $TWO payment
    //           | authorization signature 1  |\
    //           | authorization signature 2  | > Authorization signatures for all tickets
    //           | authorization signature 3  |/
    //           ```
    //
    function mint(
        bytes32 group_id,
        uint256 category_idx,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature
    ) public {

        require(nums.length >= 2, "T721C::mint | invalid nums length");

        uint256 owner_count = nums[1];
        uint256 addr_idx = 0;
        Category storage cat = groups[group_id].categories[category_idx];

        {
            uint256 currency_count = nums[0];
            uint256 nums_idx = 2;
            uint256 sig_idx = 0;
            uint256 score = 0;

            require(owner_count > 0, "T721C::mint | useless minting for 0 owners");


            require(cat.sold + owner_count <= cat.amount,
                "T721C::mint | no tickets left to sell for category");

            for (uint256 idx = 0; idx < currency_count; ++idx) {

                if (nums[nums_idx] == 1) { // ERC20

                    score += processERC20MintPayment(group_id, cat, nums, addr, nums_idx, addr_idx);
                    nums_idx += 2;
                    addr_idx += 1;

                } else if (nums[nums_idx] == 2) { // ERC2280

                    score += processERC2280MintPayment(
                        group_id,
                        cat,
                        nums,
                        addr,
                        signature,
                        nums_idx,
                        addr_idx,
                        sig_idx
                    );
                    nums_idx += 2;
                    addr_idx += 1;
                    sig_idx += 65;

                } else {

                    revert("T721C::mint | unknown payment mode");

                }

            }

            require(score >= owner_count * 100, "T721C::mint | payment score too low");

            if (cat.authorization != address(0)) { // Authorization => ON

                require(signature.length - sig_idx >= 65 * owner_count,
                    "T721C::mint | invalid authorization signature count");
                require(nums.length - nums_idx >= owner_count,
                    "T721C::mint | invalid authorization code count");

                for (uint256 idx = 0; idx < owner_count; ++idx) {

                    require(isAuthorizationCodeAvailable(nums[nums_idx + idx]) == true,
                        "T721C::mint | authorization code already used");

                    MintingAuthorization memory ma = MintingAuthorization(
                        nums[nums_idx + idx],
                        cat.authorization,
                        addr[addr_idx + idx],
                        group_id,
                        cat.name
                    );

                    bytes memory owner_signature = BytesUtil_v0.slice(
                        signature,
                        sig_idx + idx * 65,
                        65
                    );

                    require(verify(ma, owner_signature) == cat.authorization,
                        "T721C::mint | invalid authorization signature");

                    authorization_code_registry[nums[nums_idx + idx]] = true;

                }

            } else { // Authorization => OFF

                require(signature.length - sig_idx == 0,
                    "T721C::mint | useless authorization signature provided");
                require(nums.length - nums_idx == 0,
                    "T721C::mint | useless authorization codes provided");

            }
        }

        for (uint256 idx = 0; idx < owner_count; ++idx) {

            uint256 ticket_id = t721.mint(addr[addr_idx + idx], scope_index);
            tickets[ticket_id] = Affiliation({
                active: true,
                group_id: group_id,
                category_idx: category_idx
                });
            emit Mint(group_id, cat.name, addr[addr_idx + idx], ticket_id, msg.sender);

        }

        cat.sold += owner_count;

    }

}
