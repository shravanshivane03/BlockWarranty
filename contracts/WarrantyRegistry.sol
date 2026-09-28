// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WarrantyRegistry {
    enum ClaimStatus { Pending, Approved, Rejected, Completed }

    struct Profile {
        string name;
        string email;
        string phone;
        string addressLine;
        uint256 updatedAt;
    }

    struct Warranty {
        uint256 productId;
        string productName;
        string serialNumber;
        string ownerName;
        address owner;
        string billingAddress;
        uint256 purchaseDate;
        uint256 warrantyMonths;
        uint256 extensionMonths;
        bool active;
        bool voided;
        string voidReason;
    }

    struct Claim {
        uint256 claimId;
        uint256 productId;
        address claimant;
        string issue;
        string description;
        ClaimStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
        string resolutionNote;
    }

    struct ServiceRecord {
        uint256 serviceId;
        uint256 productId;
        address serviceProvider;
        string serviceCenter;
        string diagnosis;
        string workPerformed;
        uint256 serviceDate;
        uint256 createdAt;
    }

    uint256 private nextProductId = 1;
    uint256 private nextClaimId = 1;
    uint256 private nextServiceId = 1;
    address public immutable administrator;

    mapping(uint256 => Warranty) private warranties;
    mapping(address => Profile) private profiles;
    mapping(uint256 => Claim[]) private productClaims;
    mapping(uint256 => ServiceRecord[]) private productServices;
    uint256[] private allProductIds;

    event ProfileUpdated(address indexed account, string name, string email, string phone, string addressLine);
    event WarrantyRegistered(uint256 indexed productId, string productName, string serialNumber, string ownerName, address indexed owner, string billingAddress, uint256 purchaseDate, uint256 warrantyMonths);
    event WarrantyTransferred(uint256 indexed productId, address indexed previousOwner, string previousOwnerName, address indexed newOwner, string newOwnerName, string newBillingAddress, uint256 transferDate);
    event WarrantyVoided(uint256 indexed productId, address indexed administrator, string reason, uint256 voidedAt);
    event WarrantyExtended(uint256 indexed productId, uint256 addedMonths, uint256 newTotalMonths, address indexed administrator, string reason, uint256 extendedAt);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed productId, address indexed claimant, string issue, uint256 createdAt);
    event ClaimStatusChanged(uint256 indexed claimId, uint256 indexed productId, ClaimStatus status, string resolutionNote, uint256 resolvedAt);
    event ServiceRecordAdded(uint256 indexed serviceId, uint256 indexed productId, address indexed serviceProvider, string serviceCenter, string diagnosis, string workPerformed, uint256 serviceDate, uint256 createdAt);

    constructor() {
        administrator = msg.sender;
    }

    modifier onlyOwner(uint256 productId) {
        require(warranties[productId].owner == msg.sender, "Only warranty owner can perform this action");
        _;
    }

    modifier onlyAdministrator() {
        require(msg.sender == administrator, "Only administrator can perform this action");
        _;
    }

    modifier warrantyExists(uint256 productId) {
        require(warranties[productId].productId != 0, "Warranty not found");
        _;
    }

    function setProfile(string calldata name, string calldata email, string calldata phone, string calldata addressLine) external {
        require(bytes(name).length > 0, "Name is required");
        profiles[msg.sender] = Profile(name, email, phone, addressLine, block.timestamp);
        emit ProfileUpdated(msg.sender, name, email, phone, addressLine);
    }

    function getProfile(address account) external view returns (Profile memory) {
        return profiles[account];
    }

    function registerWarranty(
        string calldata productName,
        string calldata serialNumber,
        string calldata ownerName,
        address initialOwner,
        string calldata billingAddress,
        uint256 purchaseDate,
        uint256 warrantyMonths
    ) external onlyAdministrator returns (uint256) {
        require(bytes(productName).length > 0, "Product name is required");
        require(bytes(serialNumber).length > 0, "Serial number is required");
        require(bytes(ownerName).length > 0, "Owner name is required");
        require(initialOwner != address(0), "Initial owner is required");
        require(bytes(billingAddress).length > 0, "Billing address is required");
        require(warrantyMonths > 0, "Warranty period must be greater than zero");
        require(purchaseDate <= block.timestamp, "Purchase date cannot be in the future");

        uint256 productId = nextProductId++;
        warranties[productId] = Warranty({
            productId: productId,
            productName: productName,
            serialNumber: serialNumber,
            ownerName: ownerName,
            owner: initialOwner,
            billingAddress: billingAddress,
            purchaseDate: purchaseDate,
            warrantyMonths: warrantyMonths,
            extensionMonths: 0,
            active: true,
            voided: false,
            voidReason: ""
        });
        allProductIds.push(productId);

        if (bytes(profiles[initialOwner].name).length == 0) {
            profiles[initialOwner] = Profile(ownerName, "", "", billingAddress, block.timestamp);
            emit ProfileUpdated(initialOwner, ownerName, "", "", billingAddress);
        }

        emit WarrantyRegistered(productId, productName, serialNumber, ownerName, initialOwner, billingAddress, purchaseDate, warrantyMonths);
        return productId;
    }

    function getWarranty(uint256 productId) external view warrantyExists(productId) returns (Warranty memory) {
        return warranties[productId];
    }

    function getAllProductIds() external view returns (uint256[] memory) {
        return allProductIds;
    }

    function getProductsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 count;
        for (uint256 i = 0; i < allProductIds.length; i++) {
            if (warranties[allProductIds[i]].owner == owner) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < allProductIds.length; i++) {
            if (warranties[allProductIds[i]].owner == owner) ids[j++] = allProductIds[i];
        }
        return ids;
    }

    function getExpiryDate(uint256 productId) public view warrantyExists(productId) returns (uint256) {
        Warranty memory warranty = warranties[productId];
        return warranty.purchaseDate + ((warranty.warrantyMonths + warranty.extensionMonths) * 30 days);
    }

    function isWarrantyValid(uint256 productId) public view warrantyExists(productId) returns (bool) {
        Warranty memory warranty = warranties[productId];
        return warranty.active && !warranty.voided && block.timestamp <= getExpiryDate(productId);
    }

    function getWarrantyStatus(uint256 productId) external view warrantyExists(productId) returns (uint8) {
        Warranty memory warranty = warranties[productId];
        if (warranty.voided) return 3; // VOIDED
        if (!warranty.active || block.timestamp > getExpiryDate(productId)) return 2; // EXPIRED
        uint256 expiry = getExpiryDate(productId);
        if (expiry <= block.timestamp + 30 days) return 1; // EXPIRING_SOON
        return 0; // ACTIVE
    }

    function transferWarranty(uint256 productId, address newOwner, string calldata newOwnerName, string calldata newBillingAddress) external onlyOwner(productId) warrantyExists(productId) {
        require(newOwner != address(0), "Invalid new owner");
        require(newOwner != msg.sender, "New owner must be different");
        require(bytes(newOwnerName).length > 0, "New owner name is required");
        require(bytes(newBillingAddress).length > 0, "New billing address is required");
        require(isWarrantyValid(productId), "Warranty is not transferable");

        address previousOwner = warranties[productId].owner;
        string memory previousOwnerName = warranties[productId].ownerName;
        warranties[productId].owner = newOwner;
        warranties[productId].ownerName = newOwnerName;
        warranties[productId].billingAddress = newBillingAddress;

        if (bytes(profiles[newOwner].name).length == 0) {
            profiles[newOwner] = Profile(newOwnerName, "", "", newBillingAddress, block.timestamp);
            emit ProfileUpdated(newOwner, newOwnerName, "", "", newBillingAddress);
        }

        emit WarrantyTransferred(productId, previousOwner, previousOwnerName, newOwner, newOwnerName, newBillingAddress, block.timestamp);
    }

    function voidWarranty(uint256 productId, string calldata reason) external onlyAdministrator warrantyExists(productId) {
        Warranty storage warranty = warranties[productId];
        require(warranty.active, "Warranty is already inactive");
        require(bytes(reason).length > 0, "Void reason is required");
        warranty.active = false;
        warranty.voided = true;
        warranty.voidReason = reason;
        emit WarrantyVoided(productId, msg.sender, reason, block.timestamp);
    }

    function extendWarranty(uint256 productId, uint256 addedMonths, string calldata reason) external onlyAdministrator warrantyExists(productId) {
        require(addedMonths > 0, "Extension must be greater than zero");
        require(isWarrantyValid(productId), "Only an active warranty can be extended");
        warranties[productId].extensionMonths += addedMonths;
        emit WarrantyExtended(productId, addedMonths, warranties[productId].warrantyMonths + warranties[productId].extensionMonths, msg.sender, reason, block.timestamp);
    }

    function submitClaim(uint256 productId, string calldata issue, string calldata description) external onlyOwner(productId) warrantyExists(productId) returns (uint256) {
        require(isWarrantyValid(productId), "Warranty is not active");
        require(bytes(issue).length > 0, "Issue is required");
        require(bytes(description).length > 0, "Description is required");
        uint256 claimId = nextClaimId++;
        productClaims[productId].push(Claim(claimId, productId, msg.sender, issue, description, ClaimStatus.Pending, block.timestamp, 0, ""));
        emit ClaimSubmitted(claimId, productId, msg.sender, issue, block.timestamp);
        return claimId;
    }

    function getClaims(uint256 productId) external view warrantyExists(productId) returns (Claim[] memory) {
        return productClaims[productId];
    }

    function getAllClaims() external view onlyAdministrator returns (Claim[] memory) {
        uint256 count;
        for (uint256 i = 0; i < allProductIds.length; i++) count += productClaims[allProductIds[i]].length;
        Claim[] memory result = new Claim[](count);
        uint256 j;
        for (uint256 i = 0; i < allProductIds.length; i++) {
            Claim[] storage claims = productClaims[allProductIds[i]];
            for (uint256 k = 0; k < claims.length; k++) result[j++] = claims[k];
        }
        return result;
    }

    function updateClaimStatus(uint256 productId, uint256 claimId, ClaimStatus status, string calldata resolutionNote) external onlyAdministrator warrantyExists(productId) {
        Claim[] storage claims = productClaims[productId];
        for (uint256 i = 0; i < claims.length; i++) {
            if (claims[i].claimId == claimId) {
                require(status != ClaimStatus.Pending, "Claim is already pending");
                claims[i].status = status;
                claims[i].resolutionNote = resolutionNote;
                claims[i].resolvedAt = block.timestamp;
                emit ClaimStatusChanged(claimId, productId, status, resolutionNote, block.timestamp);
                return;
            }
        }
        revert("Claim not found");
    }

    function addServiceRecord(uint256 productId, string calldata serviceCenter, string calldata diagnosis, string calldata workPerformed, uint256 serviceDate) external onlyAdministrator warrantyExists(productId) returns (uint256) {
        require(bytes(serviceCenter).length > 0, "Service center is required");
        require(bytes(diagnosis).length > 0, "Diagnosis is required");
        require(bytes(workPerformed).length > 0, "Work performed is required");
        require(serviceDate <= block.timestamp, "Service date cannot be in the future");
        uint256 serviceId = nextServiceId++;
        productServices[productId].push(ServiceRecord(serviceId, productId, msg.sender, serviceCenter, diagnosis, workPerformed, serviceDate, block.timestamp));
        emit ServiceRecordAdded(serviceId, productId, msg.sender, serviceCenter, diagnosis, workPerformed, serviceDate, block.timestamp);
        return serviceId;
    }

    function getServiceHistory(uint256 productId) external view warrantyExists(productId) returns (ServiceRecord[] memory) {
        return productServices[productId];
    }

    function getNextProductId() external view returns (uint256) { return nextProductId; }
}
