//liunx经典的管道的概念
//前者的输出是后者的输入
let fs = requrie('fs');
let rs = fs.createReadStream('./1.txt',{
    highWaterMark:3
})
let ws = fs.createWriteStream('./2.txt',{
    highWaterMark:3
})
rs.pipe(ws); 

//相当于

// var fs = require('fs');
// var ws = fs.createWriteStream('./2.txt');
// var rs = fs.createReadStream('./1.txt');
// rs.on('data', function (data) {
//     var flag = ws.write(data);
//     if(!flag)
//     rs.pause();
// });
// ws.on('drain', function () {
//     rs.resume(); 
// });
// rs.on('end', function () {
//     ws.end();
// });

//创建一个可读流来读取文件的内容，当你监听data事件的时候，不走缓存区，
//它会不断的将数据发射出去，这时候我们将发射出去的数据放入可写流，可写流又会将数据放入缓冲区
//当你用write方法写入缓冲区的时候，它的返回值会告诉你缓冲区是否已经满了，满了之后我们会暂停发射数据，
//当操作系统将缓冲区里面的数据排空的时候 drain的时候，我们可以继续发射data，直到可读流结束，可写流也相应的结束

//文件a -----> 可读流  ----> 发射data数据 ----->  可写流 ------> 缓冲区 -----> 文件b




