// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;


import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 */
contract Test3 is Ownable {

    string private name = "test3";
    
    enum SALE_TYPE { direct, fixed_price, auction }


    function test3() internal view onlyOwner() returns (string memory) {
        return name;
    }
}