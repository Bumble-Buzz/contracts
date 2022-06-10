pragma solidity ^0.5.0;

contract BookContract {
   struct Book { 
      string title;
      string author;
      mapping(uint256 => uint256) items;
      mapping(uint256 => uint256[]) complexItems;
      uint book_id;
   }
   Book book;

   function setBook() public {
      book = Book('Learn Java', 'TP', 1);
   }
   
   function getBook() public pure returns (uint256 key, uint256 value) {
      return (123, 123);
   }

   function setBookId(uint _id) public {
      book.book_id = _id;
   }

   function getBookId() public view returns (uint) {
      return book.book_id;
   }

   function setBookItems(uint256 _items) public {
      book.items[0] = _items;
   }

   function getBookItems() public view returns (uint) {
      return book.items[0];
   }

   function setBookComplexItems(uint256 _items) public {
      book.complexItems[0].push(_items);
   }

   function getBookComplexItems() public view returns (uint256[] memory) {
      return book.complexItems[0];
   }

   function getFixedArray() public pure returns (uint256[3] memory) {
      uint256[3] memory data = [uint256(50), 77, 90];
      return data;
   }
}