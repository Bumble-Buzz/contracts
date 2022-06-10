// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 */
contract Test {

    uint256 per15 = 2;

    /**
     * @dev Store value in variable
     * @param num value to store
     */
    function per1(uint256 num) public view returns (uint256) {
        uint256 number = (num * per15 / 100);
        return number;
    }
}