let fs = require('fs');//456789
//创建一个可读流
let rs = fs.createReadStream('./2.txt',{
    start:3,
    end:8, //这点需要特别记忆：包括结束位置的索引
    highWaterMark:3,//设置缓冲区的大小
    encoding:'utf8', 
    mode:'0o666',
    flags:'r'
});  
//监听data事件的时候，流就可以读文件的内容并且发射data
//默认情况下，当你监听data事件之后，会不停的读取数据，中间是不会停止的


//过程  读取文件的内容 --------> 发射出去data
rs.on('data',function(data){
  console.log(data.toString());
  rs.pause();//暂停读取和发射data事件
  settimeout(function(){
    rs.resume();//恢复读取触发data事件
  },2000)
});
//如果文件的内容读完了，则调用关闭
  
rs.on('end',function(){
    console.log('over');
});
//如果读取文件出错了，会触发error事件
rs.on('error',function(err){
    console.log(err);
});


//如果你是个文件流的话，那么还有oepn和close状态
rs.on('open',function(){
    console.log('open');
});
rs.on('close',function(){
    console.log('close');
}); 