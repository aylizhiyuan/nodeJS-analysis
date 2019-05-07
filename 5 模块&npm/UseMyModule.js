//nodejs在是通过require加载其他模块的
//1.第一步是找到这个文件
//2.读取此文件模块的内容
//3.把它封装到一个函数里面执行
let myModule = require('./MyModule');
//在这个位置打上个断点开始调试调试，看看Node是如何加载模块的
debugger
console.log(myModule);