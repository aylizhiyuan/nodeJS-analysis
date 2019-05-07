//流的第一种形式：flowing模式---流动模式
let fs = require('fs')
let rs = fs.createReadStream('./1.txt',{
    highWaterMark:3
})
//一旦调用data就进入了流动模式
// rs.on('data',function(data){
//     console.log(data);
// })
// rs.on('end',function(){
//     console.log('end');
// })



//尝试手动模式
//当监听readable事件的时候，可读流会马上向底层读取文件，然后把读到的文件放到缓冲区里面

rs.on('readalbe',function(){
   let ch = rs.read(1);//从缓冲区里面读取一个字节
   console.log(ch);
   //当你读了一个字节后，发现剩了两个字节，不够highWaterMark，会再次读取highWaterMark个字节，就变成5个字节了。。
   //这个真是很奇怪的
   //缓冲区的大小是不断在变化的
   setTimeout(()=>{
       console.log(rs._readableState.length);
   },200)
});//进入暂停模式


//流的经典应用场景
//回车和换行
//我们写一个按行读取的读取器
//我们现在写一个程序，这个程序可以传入一个文件路径
//可以监听它的newLine事件，当行读取器每次读到一行的时候
//就会向外头发布newLine事件，当读到结束的时候，会发射end事件
let EventEmitter = require('events');
let util = require('util');
let fs = require('fs');
const NEW_LINE = 0x0A; // n
const RETURN = 0x0D; // r
function LineReader(path){
    EventEmitter.call(this);
    //创建一个可读流
    this._reader = fs.createReadStream(path);
    //给这个对象添加一个新的监听函数，会触发newListener事件
    //就是你添加newLine事件的时候，会触发这个newListener
    this.on('newListener',function(type,listener){
        if(type == 'newLine'){
            //如果添加了newLine，就开始读取文件内容并按行读取
            //当我们监听了可读流的readable事件的话，流会调用底层
            //读取文件的API方法并填充缓存区，填充完毕后向外发射
            //readable的事件
            let buffers = [];
            this._reader.on('readable',()=>{
                //这时候意味着缓冲区已经满了
                let char;
                while(null != (char = this._reader.read(1))){
                    switch (char[0]){
                        case NEW_LINE:
                            this.emit('newLine',Buffer.from(buffers));
                            buffers.length = 0;
                            break;
                        case RETURN:
                            //遇到回车的话
                            this.emit('newLine',Buffer.from(buffers));
                            buffers.length = 0;
                            let newChar = this._reader.read(1);
                            if(newChar[0] != NEW_LINE){
                                buffers.push(newChar[0]);     
                            }
                            break;
                        default:
                            //如果读到的是一个正常的字符的话
                            //就放到数组里面
                            buffers.push(char[0]);
                            break;
                    } 
                } 
            });
            this._reader.on('end',()=>{
                //当你结束的时候，缓冲区里面可能还有内容，所以，要再次将
                //缓冲区里面的内容清空掉才行
                if (buffer.length > 0) {
                    this.emit('newLine', Buffer.from(buffer));
                    buffer.length = 0;
                    this.emit('end');
                }
            })
        }
    })
}
util.inherits(LineReader,EventEmitter);


//实际用一下试试
var lineReader = new LineReader('./1.txt');
lineReader.on('newLine', function (data) {
    console.log(data.toString());
}).on('end', function () {
    console.log("end");
})