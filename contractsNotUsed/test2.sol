// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import './test3.sol';

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 */
contract Test2 is Test3 {

    string private name = "test2";
    uint256[] private someArr = [1,2,3];


    function test2() public view onlyOwner() returns (string memory) {
        return name;
    }
    
    function callTest3() public view returns (string memory) {
        return test3();
    }
    
    
    function setTest2(string memory _name) public  onlyOwner() {
        name = _name;
    }
    
    function enuVal() public pure returns (SALE_TYPE) {
        return SALE_TYPE.direct;
    }
    
    function getArr() public view returns (uint256[] memory) {
        return someArr;
    }
    
    function addToArr(uint256 _element) public {
        someArr.push(_element);
    }
}