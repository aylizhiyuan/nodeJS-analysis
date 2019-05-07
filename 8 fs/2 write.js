//从指定的位置进行写操作，区别于writeFile，它是整体写入的
let fs = require('fs');
//追加形式的写入
fs.open('./2.txt','r+',0o666,function(err,fd){
    // 读取buffer的偏移量 读三个字节 写入的索引的位置
    fd.write(fd,Buffer.from('李志远'),0,3,3,function(err,bytesWritten){
        console.log(bytesWritten);
    })
})

//实现大文件的拷贝功能
const BUFFER_SIZE = 3; //缓存大小3个字节
function copy(src,target){
    fs.open(src,'r',0o666,function(err,readFd){
        fs.open(target,'w',0o666,function(err,writeFd){
            let buff = Buffer.alloc(BUFFER_SIZE);
            !function next(){
                fs.read(readFd,buff,0,BUFFER_SIZE,null,function(err,bytesRead,buffer){
                    if(bytesRead > 0){
                        fs.write(writeFd,buff,0,bytesRead,null,next);
                    }
                })
            }();//自执行函数
        })
    })
}
copy('1.txt','2.txt');

//写文件的时候，我们一般不会直接写入文件，而是直接写入缓存区



