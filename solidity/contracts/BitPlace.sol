// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BitPlace is Ownable, ReentrancyGuard {
    // ============================================================
    // Board constants
    // ============================================================

    uint16 public constant BOARD_WIDTH = 510;
    uint16 public constant BOARD_HEIGHT = 300;
    uint32 public constant TOTAL_CELLS = 153000;
    uint8 public constant FREE_PAINTS_PER_WINDOW = 10;

    // ============================================================
    // Events
    // ============================================================

    event PixelPainted(
        address indexed painter,
        uint16 indexed x,
        uint16 indexed y,
        uint24 color
    );

    event LotteryWon(
        address indexed winner,
        uint256 winnerAmount,
        uint256 feeRecipientAmount
    );

    event PaidPaint(address indexed painter, uint256 amount);

    // ============================================================
    // Structs
    // ============================================================

    struct FreePaintWindow {
        uint64 windowStart;
        uint8 paintsUsedInWindow;
    }

    // ============================================================
    // Storage
    // ============================================================

    // key = flattened index (y * BOARD_WIDTH + x)
    // value = 0 means empty
    // value > 0 means painted color encoded as uint32(color) + 1
    mapping(uint32 => uint32) private pixelData;

    // per-wallet personal 24h paint window
    mapping(address => FreePaintWindow) private freePaintWindows;

    // admin painters bypass quota + fee logic
    mapping(address => bool) public adminPainters;

    // exact ETH fee required for paid paints
    uint256 public paidPaintFeeWei;

    // recipient of the 25% lottery split
    address public feeRecipient;

    uint256 public minLotteryPayoutWei;
    uint16 public lotteryWinBps;

    // ============================================================
    // Constructor
    // ============================================================

    constructor(
        uint256 _paidPaintFeeWei,
        address _feeRecipient,
        uint256 _minLotteryPayoutWei,
        uint16 _lotteryWinBps
    ) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_lotteryWinBps <= 10000, "Invalid lottery odds");

        paidPaintFeeWei = _paidPaintFeeWei;
        feeRecipient = _feeRecipient;
        minLotteryPayoutWei = _minLotteryPayoutWei;
        lotteryWinBps = _lotteryWinBps;
    }

    // ============================================================
    // Owner-only admin/config functions
    // ============================================================

    function setPaidPaintFeeWei(uint256 _paidPaintFeeWei) external onlyOwner {
        paidPaintFeeWei = _paidPaintFeeWei;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function setAdminPainter(address account, bool isAdmin) external onlyOwner {
        require(account != address(0), "Invalid admin address");
        adminPainters[account] = isAdmin;
    }

    function setMinLotteryPayoutWei(
        uint256 _minLotteryPayoutWei
    ) external onlyOwner {
        minLotteryPayoutWei = _minLotteryPayoutWei;
    }

    function setLotteryWinBps(uint16 _lotteryWinBps) external onlyOwner {
        require(_lotteryWinBps <= 10000, "Invalid lottery odds");
        lotteryWinBps = _lotteryWinBps;
    }

    // ============================================================
    // Read helpers
    // ============================================================

    function getPixel(uint16 x, uint16 y) external view returns (uint32) {
        require(x < BOARD_WIDTH, "X out of bounds");
        require(y < BOARD_HEIGHT, "Y out of bounds");

        uint32 index = _flatten(x, y);
        return pixelData[index];
    }

    function getPixelsRange(
        uint32 startIndex,
        uint32 count
    ) external view returns (uint32[] memory) {
        require(startIndex < TOTAL_CELLS, "Start out of bounds");
        require(count > 0, "Count must be > 0");
        require(startIndex + count <= TOTAL_CELLS, "Range out of bounds");

        uint32[] memory result = new uint32[](count);

        for (uint32 i = 0; i < count; i++) {
            result[i] = pixelData[startIndex + i];
        }

        return result;
    }

    function getCurrentWindow(
        address account
    ) external view returns (uint64 windowStart, uint8 paintsUsedInWindow) {
        FreePaintWindow memory window = freePaintWindows[account];

        if (
            window.windowStart == 0 ||
            block.timestamp >= uint256(window.windowStart) + 1 days
        ) {
            return (0, 0);
        }

        return (window.windowStart, window.paintsUsedInWindow);
    }

    // ============================================================
    // Core paint function
    // ============================================================

    function paint(
        uint16 x,
        uint16 y,
        uint24 color
    ) external payable nonReentrant {
        require(x < BOARD_WIDTH, "X out of bounds");
        require(y < BOARD_HEIGHT, "Y out of bounds");

        bool shouldRunLottery = _consumePaintAllowance(msg.sender, 1);
        uint32 index = _flatten(x, y);

        // Encode color so:
        // 0 = empty
        // uint32(color) + 1 = painted color
        pixelData[index] = uint32(color) + 1;

        emit PixelPainted(msg.sender, x, y, color);

        if (shouldRunLottery) {
            _handleLottery(msg.sender);
        }
    }

    function paintBatch(
        uint16[] calldata xs,
        uint16[] calldata ys,
        uint24[] calldata colors
    ) external payable nonReentrant {
        uint256 count = xs.length;

        require(count > 0, "Empty batch");
        require(ys.length == count, "Y array length mismatch");
        require(colors.length == count, "Color array length mismatch");

        bool shouldRunLottery = _consumePaintAllowance(msg.sender, count);

        for (uint256 i = 0; i < count; i++) {
            uint16 x = xs[i];
            uint16 y = ys[i];
            uint24 color = colors[i];

            require(x < BOARD_WIDTH, "X out of bounds");
            require(y < BOARD_HEIGHT, "Y out of bounds");

            uint32 index = _flatten(x, y);
            pixelData[index] = uint32(color) + 1;

            emit PixelPainted(msg.sender, x, y, color);
        }

        if (shouldRunLottery) {
            _handleLottery(msg.sender);
        }
    }

    // ============================================================
    // Internal helpers
    // ============================================================

    function getPaintStatus(
        address user
    )
        external
        view
        returns (bool isFree, uint8 paintsUsed, uint256 windowStartTime)
    {
        FreePaintWindow memory window = freePaintWindows[user];

        if (
            window.windowStart == 0 ||
            block.timestamp >= uint256(window.windowStart) + 1 days
        ) {
            return (true, 0, 0);
        }

        return (
            window.paintsUsedInWindow < FREE_PAINTS_PER_WINDOW,
            window.paintsUsedInWindow,
            window.windowStart
        );
    }

    function _flatten(uint16 x, uint16 y) internal pure returns (uint32) {
        return uint32(y) * BOARD_WIDTH + uint32(x);
    }

    function _consumePaintAllowance(
        address painter,
        uint256 paintCount
    ) internal returns (bool shouldRunLottery) {
        bool isAdmin = adminPainters[painter];

        if (isAdmin) {
            require(msg.value == 0, "Admin paint should not send ETH");
            return false;
        }

        FreePaintWindow storage window = freePaintWindows[painter];

        if (
            window.windowStart == 0 ||
            block.timestamp >= uint256(window.windowStart) + 1 days
        ) {
            window.windowStart = uint64(block.timestamp);
            window.paintsUsedInWindow = 0;
        }

        require(
            paintCount <= type(uint8).max - window.paintsUsedInWindow,
            "Batch too large"
        );

        uint256 paintsUsedBefore = window.paintsUsedInWindow;
        uint256 paintsUsedAfter = paintsUsedBefore + paintCount;

        if (
            paintsUsedBefore < FREE_PAINTS_PER_WINDOW &&
            paintsUsedAfter > FREE_PAINTS_PER_WINDOW
        ) {
            revert("Cannot mix free and paid paints");
        }

        if (paintsUsedAfter <= FREE_PAINTS_PER_WINDOW) {
            require(msg.value == 0, "Do not send ETH for free paint");
        } else {
            uint256 totalFee = paidPaintFeeWei * paintCount;
            require(msg.value == totalFee, "Incorrect ETH amount");
            emit PaidPaint(painter, msg.value);

            // The lottery should run once when the user's first paid paint
            // happens. For a paid batch, that means the batch starts after
            // the free window has already been fully consumed.
            if (paintsUsedBefore == FREE_PAINTS_PER_WINDOW) {
                shouldRunLottery = true;
            }
        }

        window.paintsUsedInWindow += uint8(paintCount);
    }

    function _handleLottery(address painter) internal {
        uint256 balance = address(this).balance;

        if (balance < minLotteryPayoutWei) {
            return;
        }

        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    painter,
                    balance
                )
            )
        );

        uint256 roll = randomNumber % 10000;

        if (roll >= lotteryWinBps) {
            return;
        }

        uint256 winnerAmount = (balance * 75) / 100;
        uint256 recipientAmount = balance - winnerAmount;

        (bool winnerSuccess, ) = payable(painter).call{value: winnerAmount}("");
        require(winnerSuccess, "Winner payout failed");

        (bool recipientSuccess, ) = payable(feeRecipient).call{
            value: recipientAmount
        }("");
        require(recipientSuccess, "Fee recipient payout failed");

        emit LotteryWon(painter, winnerAmount, recipientAmount);
    }
}
