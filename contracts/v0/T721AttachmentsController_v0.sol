pragma solidity 0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./T721AttachmentsControllerDomain_v0.sol";
import "./T721Controller_v0.sol";
import "./ITicketForge_v0.sol";
import "./BytesUtil_v0.sol";

contract T721AttachmentsController_v0 is T721AttachmentsControllerDomain_v0 {

    using SafeMath for uint256;

    event AttachmentFixed(
        uint256 indexed ticket_id,
        bytes32 indexed attachment,
        uint256 amount,
        bytes prices,
        bytes currencies
    );

    struct Currency {
        bool active;
        uint256 fix;
        uint256 variable;
    }

    T721Controller_v0                                   public t721c;
    ITicketForge_v0                                     public t721;
    address                                             public owner;
    address                                             public fee_collector;
    mapping (address => Currency)                       public whitelist;
    mapping (uint256 => bool)                           public authorization_code_registry;
    mapping (bytes32 => mapping (address => uint256))   public balances;

    constructor(address _t721c, address _t721, uint256 _chain_id)
    T721AttachmentsControllerDomain_v0("T721 Attachments Controller", "0", _chain_id)
    public {
        t721c = T721Controller_v0(_t721c);
        t721 = ITicketForge_v0(_t721);
        owner = msg.sender;
        fee_collector = msg.sender;
    }

    //
    // @notice Modifier to prevent non-owner message senders
    //
    modifier ownerOnly() {
        require(msg.sender == owner, "T721AC::ownerOnly | unauthorized account");
        _;
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
    function whitelistCurrency(address _address, uint256 fix_fee, uint256 var_fee) public ownerOnly {
        whitelist[_address] = Currency({
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
    function removeCurrency(address _address) public ownerOnly {
        require(whitelist[_address].active == true, "T721AC::removeCurrency | useless transaction");
        whitelist[_address].active = false;
    }

    //
    // @notice Retrieve the current balance for a group
    //
    // @param group ID of the group
    //
    // @param currency Currency balance to inspect
    //
    function balanceOf(bytes32 group, address currency) external view returns (uint256) {
        return balances[group][currency];
    }

    //
    // @notice Modifier to prevent non-group-owner and non-group-admin message senders
    //
    // @param group_id ID of the group
    //
    modifier groupOwnerOrAdminOnly(bytes32 group_id) {
        require(t721c.isAdminOrOwner(group_id, msg.sender) == true,
            "T721AC::groupOwnerOrAdminOnly | unauthorized tx sender");
        _;
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
    function withdraw(bytes32 group_id, address currency, uint256 amount, address target)
    external groupOwnerOrAdminOnly(group_id) {
        require(balances[group_id][currency] >= amount, "T721AC::withdraw | balance too low");

        IERC20(currency).transfer(target, amount);
    }

    //
    // @notice Retrieve the fee to apply for a specific ERC20 currency and amount
    //
    // @param erc20_address Currency to use for fee computation
    //
    // @param amount Total amount to tax
    //
    function getFee(address _address, uint256 amount) public view returns (uint256) {
        require(amount >= whitelist[_address].fix,
            "T721AC::getFee | paid amount is under fixed fee");

        if (whitelist[_address].variable != 0) {
            return amount
            .mul(whitelist[_address].variable)
            .div(1000)
            .add(whitelist[_address].fix);
        }
        return whitelist[_address].fix;
    }

    //
    // @notice Verify ERC20 Payment arguments
    //
    function verifyAttachmentPayment(
        uint256[] memory nums,
        address[] memory addr,
        uint256 nums_idx,
        uint256 addr_idx
    ) internal view {
        require(nums.length - nums_idx >= 1, "T721AC::verifyAttachmentPayment | invalid nums argument count");
        require(addr.length - addr_idx >= 1, "T721AC::verifyAttachmentPayment | invalid addr argument count");

        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx];
        getFee(currency, amount);
    }

    //
    // @notice Process ERC20 Payment arguments
    //
    function processAttachmentPayment(
        bytes32 group_id,
        uint256[] memory nums,
        address[] memory addr,
        uint256 nums_idx,
        uint256 addr_idx
    ) internal {
        require(nums.length - nums_idx >= 1, "T721AC::processAttachmentPayment | invalid nums argument count");
        require(addr.length - addr_idx >= 1, "T721AC::processAttachmentPayment | invalid addr argument count");

        address currency = addr[addr_idx];
        uint256 amount = nums[nums_idx];
        uint256 fee = getFee(currency, amount);

        IERC20(currency).transferFrom(msg.sender, address(this), amount);
        IERC20(currency).transfer(fee_collector, fee);
        balances[group_id][currency] = balances[group_id][currency].add(amount).sub(fee);
    }

    //
    // @notice Verify if code is not already used
    //
    // @param code Code to check
    //
    function isAuthorizationCodeAvailable(uint256 code) public view returns (bool) {
        return code != 0 && !authorization_code_registry[code];
    }

    //
    // @notice Verify is attachment purchase arguments are valid. Arguments differ a bit from the purchase method
    //
    // @param ticket_id Ticket on which to add the attachments
    //
    // @param b32 Bytes32 argument array.
    //
    //           ```
    //           |_group_id__________| > Group id of the ticket
    //           |_attachment_name_1_| > Name of first attachment
    //           |_attachment_name_2_| > Name of second attachment
    //           ```
    //
    // @param nums Uint256 argument array
    //
    //           ```
    //           |_category_idx_______________| > Group id of the ticket
    //           | payment_count = 2          | > Using 2 currencies for attachment purchase
    //           | price                      | > Price paid with first currency
    //           | price                      | > Price paid with second currency
    //           | code                       | \ Amount and code of attachment to add for attachment purchase 1/2
    //           |_amount_____________________| /
    //           | payment_count = 1          | > Using 1 currency for attachment purchase
    //           | price                      | > Price paid with first (and only) currency
    //           | code                       | \ Amount and code of attachment to add for attachment purchase 2/2
    //           |_amount_____________________| /
    //           ```
    //
    // @param addr Address argument array
    //
    //           ```
    //           | payment_address_1 | > Currency for payment 1/2 of attachment 1/2
    //           | payment_address_2 | > Currency for payment 2/2 of attachment 1/2
    //           | payment_address_3 | > Currency for payment 1/1 of attachment 2/2
    //           ```
    //
    // @param signature Signature argument. Each segment represents a 65 bytes signature.
    //
    //           ```
    //           | attachment_signature_1    | > Authorization signature for attachment 1/2
    //           | attachment_signature_2    | > Authorization signature for attachment 2/2
    //           ```
    //
    function verifyAttachments(
        uint256 ticket_id,
        bytes32[] memory b32,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature
    ) public view {

        {
            (bool active, bytes32 group_id, uint256 category_idx) = t721c.getTicketAffiliation(ticket_id);
            require(active == true, "T721AC::verifyAttachments | invalid ticket id");
            require(group_id == b32[0], "T721AC::verifyAttachments | invalid group_id");
            require(category_idx == nums[0], "T721AC::verifyAttachments | invalid category_idx");
            require(b32.length >= 2, "T721AC::verifyAttachments | invalid b32 arguments length");
            require(t721.ownerOf(ticket_id) == msg.sender, "T721AC::verifyAttachments | caller is not ticket owner");
        }

        uint256 sig_idx = 0;
        uint256 nums_idx = 1;
        uint256 addr_idx = 0;
        uint256[] memory codes = new uint256[](b32.length - 1);
        address attachment_authorization = t721c.getCategoryAttachmentAuthorizationAddress(b32[0], nums[0]);

        for (uint256 idx = 0; idx < b32.length - 1; ++idx) {

            uint256 currency_count = nums[nums_idx];
            nums_idx += 1;

            bytes memory prices = "";
            bytes memory currencies = "";

            for (uint256 prices_idx = 0; prices_idx < currency_count; ++prices_idx) {

                verifyAttachmentPayment(nums, addr, nums_idx, addr_idx);
                prices = BytesUtil_v0.concat(prices, BytesUtil_v0.toBytes(nums[nums_idx]));
                currencies = BytesUtil_v0.concat(currencies, BytesUtil_v0.toBytes(addr[addr_idx]));

                nums_idx += 1;
                addr_idx += 1;

            }

            if (attachment_authorization != address(0)) {

                require(nums.length - nums_idx >= 2,
                    "T721AC::verifyAttachments | invalid nums length");
                require(signature.length - sig_idx >= 65,
                    "T721AC::verifyAttachments | missing attachment authorization signature");
                require(isAuthorizationCodeAvailable(nums[nums_idx]),
                    "T721AC::verifyAttachments | invalid authorization code");

                Attachment memory att = Attachment({
                    group: b32[0],
                    category: nums[0],
                    attachment: b32[1 + idx],
                    amount: nums[nums_idx + 1],
                    prices: prices,
                    currencies: currencies,
                    code: nums[nums_idx]
                    });

                codes[idx] = nums[nums_idx];

                bytes memory attachment_sig = BytesUtil_v0.slice(signature, sig_idx, 65);

                require(verify(att, attachment_sig) == attachment_authorization,
                    "T721AC::verifyAttachments | invalid attachment authorization signature");

                sig_idx += 65;
                nums_idx += 1;

            } else {

                require(nums.length - nums_idx >= 1, "T721AC::verifyAttachments | invalid nums length");

            }

            nums_idx += 1;

        }

        require(nums.length - nums_idx >= 1, "T721AC::verifyAttachments | invalid test nums length");

        uint256 total_currencies = nums[nums_idx];
        nums_idx += 1;

        for (uint256 idx = 0; idx < total_currencies; ++idx) {
            require(IERC20(addr[addr_idx + idx]).allowance(msg.sender, address(this)) >=
                nums[nums_idx + idx],
                "T721AC::verifyAttachments | erc20 allowance too low");
        }

        if (attachment_authorization != address(0)) {

            for (uint256 code_idx = 0; code_idx < codes.length; ++code_idx) {
                for (uint256 dup_idx = code_idx + 1; dup_idx < codes.length; ++dup_idx) {
                    require(codes[dup_idx] != codes[code_idx],
                        "T721AC::verifyAttachments | duplicate authorization code");
                }
            }
        }

    }

    //
    // @notice Purchase attachments. Can buy several atatchments and pay with multiple currencies for each.
    //
    // @param ticket_id Ticket on which to add the attachments
    //
    // @param b32 Bytes32 argument array.
    //
    //           ```
    //           |_group_id__________| > Group id of the ticket
    //           |_attachment_name_1_| > Name of first attachment
    //           |_attachment_name_2_| > Name of second attachment
    //           ```
    //
    // @param nums Uint256 argument array
    //
    //           ```
    //           |_category_idx_______________| > Group id of the ticket
    //           | payment_count = 2          | > Using 2 currencies for attachment purchase
    //           | price                      | > Price paid with first currency
    //           | price                      | > Price paid with second currency
    //           | code                       | \ Amount and code of attachment to add for attachment purchase 1/2
    //           |_amount_____________________| /
    //           | payment_count = 1          | > Using 1 currency for attachment purchase
    //           | price                      | > Price paid with first (and only) currency
    //           | code                       | \ Amount and code of attachment to add for attachment purchase 2/2
    //           |_amount_____________________| /
    //           ```
    //
    // @param addr Address argument array
    //
    //           ```
    //           | payment_address_1 | > Currency for payment 1/2 of attachment 1/2
    //           | payment_address_2 | > Currency for payment 2/2 of attachment 1/2
    //           | payment_address_3 | > Currency for payment 1/1 of attachment 2/2
    //           ```
    //
    // @param signature Signature argument. Each segment represents a 65 bytes signature.
    //
    //           ```
    //           | attachment_signature_1    | > Authorization signature for attachment 1/2
    //           | attachment_signature_2    | > Authorization signature for attachment 2/2
    //           ```
    //
    function fixAttachments(
        uint256 ticket_id,
        bytes32[] memory b32,
        uint256[] memory nums,
        address[] memory addr,
        bytes memory signature
    ) public {

        {
            (bool active, bytes32 group_id, uint256 category_idx) = t721c.getTicketAffiliation(ticket_id);
            require(active == true, "T721AC::fixAttachments | invalid ticket id");
            require(group_id == b32[0], "T721AC::fixAttachments | invalid group_id");
            require(category_idx == nums[0], "T721AC::fixAttachments | invalid category_idx");
            require(b32.length >= 2, "T721AC::fixAttachments | invalid b32 arguments length");
            require(t721.ownerOf(ticket_id) == msg.sender, "T721AC::fixAttachments | caller is not ticket owner");
        }

        uint256 sig_idx = 0;
        uint256 nums_idx = 1;
        uint256 addr_idx = 0;
        address attachment_authorization = t721c.getCategoryAttachmentAuthorizationAddress(b32[0], nums[0]);

        for (uint256 idx = 0; idx < b32.length - 1; ++idx) {

            uint256 currency_count = nums[nums_idx];
            nums_idx += 1;

            bytes memory prices = "";
            bytes memory currencies = "";

            for (uint256 prices_idx = 0; prices_idx < currency_count; ++prices_idx) {

                processAttachmentPayment(b32[0], nums, addr, nums_idx, addr_idx);
                prices = BytesUtil_v0.concat(prices, BytesUtil_v0.toBytes(nums[nums_idx]));
                currencies = BytesUtil_v0.concat(currencies, BytesUtil_v0.toBytes(addr[addr_idx]));

                nums_idx += 1;
                addr_idx += 1;
            }

            if (attachment_authorization != address(0)) {

                require(nums.length - nums_idx >= 2,
                    "T721AC::fixAttachments | invalid nums length");
                require(signature.length - sig_idx >= 65,
                    "T721AC::fixAttachments | missing attachment authorization signature");
                require(isAuthorizationCodeAvailable(nums[nums_idx]),
                    "T721AC::fixAttachments | invalid authorization code");

                Attachment memory att = Attachment({
                    group: b32[0],
                    category: nums[0],
                    attachment: b32[1 + idx],
                    amount: nums[nums_idx + 1],
                    prices: prices,
                    currencies: currencies,
                    code: nums[nums_idx]
                    });

                bytes memory attachment_sig = BytesUtil_v0.slice(signature, sig_idx, 65);

                require(verify(att, attachment_sig) == attachment_authorization,
                    "T721AC::fixAttachments | invalid attachment authorization signature");

                authorization_code_registry[nums[nums_idx]] = true;

                sig_idx += 65;
                nums_idx += 1;

            } else {

                require(nums.length - nums_idx >= 1, "T721AC::fixAttachments | invalid nums length");

            }

            emit AttachmentFixed(ticket_id, b32[1 + idx], nums[nums_idx], prices, currencies);
            nums_idx += 1;

        }

    }

}
