//使用fs模块来读写文件
let fs = require('fs');
// fs.readFile('./1.txt',{encoding:'utf8',flag:'w'},function(err,data){
//     if(err){
//         console.log(err);
//     }else{
//         console.log(data);
//     }
// })

//写入的参数和写入的数据
fs.writeFile('./2.txt','data',{encoding:'utf8',flag:'w'},function(err){
    console.log(err);
})

//追加写入数据
fs.appendFile('./2.txt','data',function(err){
    console.log(err);
})

//如果文件特别大，这么读文件是不行的，会非常的慢，所以，如果你要操作非常大的文件的时候，就必须
//精确的控制读取的字节数
//这里用到的就是read函数，readfile是整体读取一个文件

fs.open('./1.txt','r',0o666,function(err,fd){
    let buff = Buffer.alloc(3);
    //buffer 写入索引 从文件中读取几个字节  文件的读取位置
    fs.read(fd,buff,0,3,0,function(err,bytesRead,buffer){
        console.log(buff.toString()); //123
    }) 
})





