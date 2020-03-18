pragma solidity 0.5.15;

import "./ITicketForge_v0.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./T721ControllerDomain_v0.sol";
import "./BytesUtil_v0.sol";

// @notice the T721Controller handles all the ticket categories and minting
contract T721Controller_v0 is T721ControllerDomain_v0 {

    using SafeMath for uint256;

    event Mint(
        bytes32 indexed group,
        bytes32 indexed category,
        address indexed owner,
        uint256 ticket_id,
        address buyer
    );

    event Attach(
        bytes32 indexed group,
        bytes32 indexed attachment,
        uint256 indexed ticket_id,
        uint256 amount
    );

    struct Currency {
        bool active;
        uint256 fix;
        uint256 variable;
    }

    struct Affiliation {
        bool active;
        bytes32 group;
        bytes32 category;
    }

    mapping (bytes32 => mapping (address => uint256)) balances;

    ITicketForge_v0                     public t721;
    uint256                             public scope_index;
    address                             public owner;
    address                             public fee_collector;
    mapping (address => uint)           public group_nonce;
    mapping (uint256 => Affiliation)    public tickets;
    mapping (address => Currency)       public whitelist;
    mapping (uint256 => bool)           public authorization_code_registry;

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
    // @notice Retrieve the current balance for a group
    //
    // @param group ID of the group
    //
    // @param currency Currency balance to inspect
    //
    function balanceOf(bytes32 group, address currency) public view returns (uint256) {
        return balances[group][currency];
    }

    function getGroupID(address _owner, string memory id) public pure returns (bytes32) {
        return keccak256(abi.encode(
                _owner,
                id
            ));
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
    function withdraw(
        address event_controller,
        string calldata id,
        address currency,
        uint256 amount,
        address target,
        uint256 code,
        bytes calldata signature
    ) external {

        bytes32 group = getGroupID(event_controller, id);

        bytes32 hash = keccak256(
            abi.encode(
                "withdraw",
                group,
                currency,
                amount,
                target,
                code
            )
        );

        require(verify(Authorization(event_controller, target, hash), signature) == event_controller,
            "T721C::withdraw | invalid signature");
        require(balances[group][currency] >= amount, "T721C::withdraw | balance too low");
        consumeCode(code);

        IERC20(currency).transfer(target, amount);

        balances[group][currency] = balances[group][currency].sub(amount);

    }

    function getTicketAffiliation(
        uint256 ticket_id
    ) external view returns (bool active, bytes32 group, bytes32 category) {
        return (tickets[ticket_id].active, tickets[ticket_id].group, tickets[ticket_id].category);
    }

    function executePayement(bytes32 group, uint256 amount, uint256 fee, address currency) internal {

        IERC20(currency).transferFrom(msg.sender, address(this), amount);
        IERC20(currency).transferFrom(msg.sender, fee_collector, fee);

        balances[group][currency] = balances[group][currency].add(amount);

    }

    function consumeCode(uint256 code) internal {
        require(authorization_code_registry[code] == false, "T721C::consumeCode | code already used");

        authorization_code_registry[code] = true;
    }

    function isCodeConsummable(uint256 code) public view returns (bool) {
        return !authorization_code_registry[code];
    }

    function attach(
        string memory id,
        bytes32[] memory b32,
        uint256[] memory uints,
        address[] memory addr,
        bytes memory bs
    ) public {

        uint256 uints_idx = 1;
        uint256 addr_idx = 1;
        bytes memory prices = "";
        address event_controller;

        // Payment Processing
        {
            require(uints.length > 0, "T721C::attach | missing uints[0] (currency number)");
            require(addr.length > 0, "T721C::attach | missing addr[0] (event controller)");

            uint256 currency_number = uints[0];
            event_controller = addr[0];
            bytes32 group = getGroupID(event_controller, id);

            if (currency_number > 0) {

                // Now that we now the number of currencies used for payment, we can verify that the required amount
                // of arguments in uints and addr are respected
                require(uints.length >= (currency_number * 2) + 1, "T721C::attach | not enough space on uints (1)");
                require(addr.length >= currency_number, "T721C::attach | not enough space on addr (1)");

                for (uint256 currency_idx = 0; currency_idx < currency_number; ++currency_idx) {

                    prices = BytesUtil_v0.concat(prices, abi.encode(uints[uints_idx + (currency_idx * 2)]));
                    prices = BytesUtil_v0.concat(prices, abi.encode(uints[uints_idx + 1 + (currency_idx * 2)]));
                    prices = BytesUtil_v0.concat(prices, abi.encode(addr[addr_idx + currency_idx]));

                    executePayement(
                        group,
                        uints[uints_idx + (currency_idx * 2)],
                        uints[uints_idx + 1 + (currency_idx * 2)],
                        addr[addr_idx + currency_idx]
                    );

                }

                uints_idx += currency_number * 2;
                addr_idx += currency_number;

            }


        }

        // Attachment Event Emission
        {
            // Same as above, first we check the bare minimum arguments
            require(uints.length - uints_idx > 0, "T721C::attach | missing attachmentCount on uints");

            uint256 attachment_number = uints[uints_idx];
            ++uints_idx;

            require(attachment_number > 0, "T721C::attach | why would you attach 0 attachments ?");
            require(b32.length == attachment_number, "T721C::attach | not enough space on b32");
            require(uints.length - uints_idx == attachment_number * 3, "T721C::attach | not enough space on uints (2)");
            require(bs.length / 65 == attachment_number && bs.length % 65 == 0,
                "T721C::attachment | not enough space or invalid length on bs");

            for (uint256 attachment_idx = 0; attachment_idx < attachment_number; ++attachment_idx) {

                // We extract arguments for one attachment
                uint256 amount = uints[uints_idx + (attachment_idx * 3)];

                // Signature Verification Scope
                {

                    bytes memory signature = BytesUtil_v0.slice(bs, (attachment_idx * 65), 65);
                    bytes memory encoded;

                    {
                        uint256 code = uints[uints_idx + 1 + (attachment_idx * 3)];
                        bytes32 name = b32[attachment_idx];

                        encoded = abi.encode(
                            "attach",
                            prices,
                            name,
                            amount,
                            code
                        );

                        consumeCode(code);
                    }

                    bytes32 hash = keccak256(encoded);

                    address ticket_owner = t721.ownerOf(uints[uints_idx + 2 + (attachment_idx * 3)]);

                    // Core verification, this is what controls the flow of minted tickets
                    require(verify(Authorization(event_controller, ticket_owner, hash), signature) == event_controller,
                        "T721C::attach | invalid signature");

                }

                // Attachment Emission
                {

                    bytes32 group = getGroupID(event_controller, id);
                    bytes32 name = b32[attachment_idx];

                    emit Attach(group, name, uints[uints_idx + 2 + (attachment_idx * 3)], amount);

                }

            }

        }

    }

    /**
     *
     *
     */
    function mint(
        string memory id,
        bytes32[] memory b32,
        uint256[] memory uints,
        address[] memory addr,
        bytes memory bs
    ) public {

        uint256 uints_idx = 1;
        uint256 addr_idx = 1;
        bytes memory prices = "";
        address event_controller;
        bytes32 group;

        // Payment Processing Scope
        {

            // We verify that the bare minimum arguments are here before accessing them
            require(uints.length > 0, "T721C::mint | missing uints[0] (currency number)");
            require(addr.length > 0, "T721C::mint | missing addr[0] (event controller)");

            uint256 currency_number = uints[0];
            event_controller = addr[0];
            group = getGroupID(event_controller, id);

            if (currency_number > 0) {

                // Now that we now the number of currencies used for payment, we can verify that the required amount
                // of arguments in uints and addr are respected
                require(uints.length - 1 >= (currency_number * 2), "T721C::mint | not enough space on uints (1)");
                require(addr.length - 1 >= currency_number, "T721C::mint | not enough space on addr (1)");

                for (uint256 currency_idx = 0; currency_idx < currency_number; ++currency_idx) {

                    prices = BytesUtil_v0.concat(prices, abi.encode(uints[uints_idx + (currency_idx * 2)]));
                    prices = BytesUtil_v0.concat(prices, abi.encode(uints[uints_idx + 1 + (currency_idx * 2)]));
                    prices = BytesUtil_v0.concat(prices, abi.encode(addr[addr_idx + currency_idx]));

                    executePayement(
                        group,
                        uints[uints_idx + (currency_idx * 2)],
                        uints[uints_idx + 1 + (currency_idx * 2)],
                        addr[addr_idx + currency_idx]
                    );

                }

                uints_idx += currency_number * 2;
                addr_idx += currency_number;

            }

        }


        // Ticket Minting Scope
        {

            // Same as above, first we check the bare minimum arguments
            require(uints.length - uints_idx > 0, "T721C::mint | missing ticketCount on uints");

            uint256 ticket_number = uints[uints_idx];
            ++uints_idx;

            // Being the last step, we can now verify exact amounts of arguments, and not a minimum required
            require(ticket_number > 0, "T721C::mint | why would you mint 0 tickets ?");
            require(b32.length == ticket_number, "T721C::mint | not enough space on b32");
            require(bs.length / 65 == ticket_number && bs.length % 65 == 0,
                "T721C::mint | not enough space or invalid length on bs");
            require(addr.length - addr_idx == ticket_number, "T721C::mint | not enough space on addr (2)");
            require(uints.length - uints_idx == ticket_number, "T721C::mint | not enough space on uints (2)");


            for (uint256 ticket_idx = 0; ticket_idx < ticket_number; ++ticket_idx) {

                // We extract arguments for one ticket
                bytes memory signature = BytesUtil_v0.slice(bs, (ticket_idx * 65), 65);
                uint256 code = uints[uints_idx + ticket_idx];
                bytes32 category = b32[ticket_idx];
                address ticket_owner = addr[addr_idx + ticket_idx];

                // Signature Verification Scope
                {

                    bytes32 hash = keccak256(abi.encode(
                            "mint",
                            prices,
                            group,
                            category,
                            code
                        ));

                    // Core verification, this is what controls the flow of minted tickets
                    require(verify(Authorization(event_controller, ticket_owner, hash), signature) == event_controller,
                        "T721C::mint | invalid signature");
                    consumeCode(code);

                }

                // Minting Scope
                {
                    // We call the TicketForge to issue a new ticket
                    uint256 ticket_id = t721.mint(ticket_owner, scope_index);

                    // We register group and category information for the new ticket
                    tickets[ticket_id] = Affiliation({
                        active: true,
                        group: group,
                        category: category
                        });

                    // We emit a Mint event that is caught by the infrastructure
                    emit Mint(group, category, ticket_owner, ticket_id, msg.sender);
                }
            }

        }

    }

}
