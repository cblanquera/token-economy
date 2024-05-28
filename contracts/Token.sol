// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// ============ Errors ============

error InvalidCall();

// ============ Contract ============

contract Token is
  Context,
  Pausable,
  AccessControl,
  ERC20Capped
{
  // ============ Constants ============
  
  //all custom roles
  bytes32 private constant _MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 private constant _PAUSER_ROLE = keccak256("PAUSER_ROLE");

  // ============ Deploy ============

  constructor(address admin) 
    ERC20("Game Stop", "GME") 
    ERC20Capped(10000 ether) 
  {
    //set up roles for the contract creator
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    _setupRole(_PAUSER_ROLE, admin);
    //start paused
    _pause();
  }

  // ============ Write Methods ============

  /**
   * @dev Creates `amount` new tokens for `to`.
   */
  function mint(
    address to, 
    uint256 amount
  ) external onlyRole(_MINTER_ROLE) {
    _mint(to, amount);
  }

  /**
   * @dev Pauses all token transfers.
   */
  function pause() external onlyRole(_PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Unpauses all token transfers.
   */
  function unpause() external onlyRole(_PAUSER_ROLE) {
    _unpause();
  }

  // ============ Internal Methods ============

  /**
   * @dev Minters can mint even when paused
   */
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    //if the sender is not a minter
    if (!hasRole(_MINTER_ROLE, _msgSender()) 
      //and is paused
      && paused()
    ) revert InvalidCall();

    super._beforeTokenTransfer(from, to, amount);
  }
}
