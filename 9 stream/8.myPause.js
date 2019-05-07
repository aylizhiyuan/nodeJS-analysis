let fs = requrie('fs');
let ReadStream = require('./PauseReadStream.js');
let rs = new ReadStrem('1.txt',{
    start:0,
    highWaterMark:3
});
//暂停模式
//当可读流创建成功后，会立刻进入暂停模式，填充缓冲区
rs.on("readble",function(){
    //这个打印出来的就是真实缓冲区的大小
    //console.log(rs._readableState.length);\
    console.log(rs.length);//缓冲区的大小
    let char = rs.read(1);//从缓存区中读一个字节
    console.log(char);
})

// 打开文件  ------> 放入缓存区 ---------> read方法从缓存区内读字节 ---------> 