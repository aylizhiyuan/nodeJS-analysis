//创建一个可写流
//当你往可写流里写数据的时候，不会立即写入文件
//先写入缓存区，缓存区满了之后再写入文件

//过程： 打开该文件 -----> 向缓冲区写入数据 ------>缓冲区满了 -----> 写入该文件中去
let fs = require('fs');
let ws = fs.createWriteStream('./2.txt',{
  flags:'w',
  mode:0o666,
  start:0,
  highWaterMark:3 //缓冲区的大小
})
//如果缓存区已满的话，返回false,否则的话，返回true
let flag = ws.write('1');
console.log(flag);//true
let flag = ws.write('1');
console.log(flag); //true
let flag = ws.write('1');
console.log(flag);//false
let flag = ws.write('1');
console.log(flag);//false 
//如果你继续往里面写的话，数据也不会消失。。。。等缓存区清空以后，再往缓存区写




