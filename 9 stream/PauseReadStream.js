let fs = require('fs');
let EventEmitter = require('events');
class ReadStream extends EventEmitter {
    constructor(path, options) {
        super(path, options);
        this.path = path;
        this.fd = options.fd;
        this.flags = options.flags || 'r';
        this.encoding = options.encoding;
        this.start = options.start || 0;
        this.pos = this.start;
        this.end = options.end;
        this.flowing = false;
        this.autoClose = true;
        this.highWaterMark = options.highWaterMark || 64 * 1024;
        this.buffer = Buffer.alloc(this.highWaterMark);
        this.length = 0;
        this.buffers = [];//真正的缓存区，在源码中是一个链表的结构
        this.open();
        //当你给这个对象添加一个事件监听方法的时候，会触发这个函数
        this.on('newListener',(type,listener)=>{
            
        });
    }
    open(){
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) return this.emit('error', err);
            this.fd = fd;
            this.emit('open', fd);
            this.read();//马上就会去调用read方法
        })
    }
    read(n){
        let ret;
        //,缓存区足够用,从缓存区里面取数据
        if(0<n<this.length){
            ret = Buffer.alloc(n);
            let index = 0;
            let b;
            //循环缓冲区
            while(null != (b = this.buffers.shift())){
                for(let i=0;i<b.length;i++){
                    //把缓存区里面需要读的数据给ret
                    ret[index++] = b[i];
                    if(index == n){
                        //读够了以后返回ret
                        b = b.slice(i);
                        this.buffers.unshift(b);
                        this.length -= n;//缓存区大小变小了
                        break;
                    }
                }
            }
        }
        //第一次调用read
        if(this.length == 0 || this.length < this.highWaterMark){
            //你要读几个字节
            fs.read(this.fd,this.buffer,0,this.highWaterMark,null,(err,bytes)=>{
                if(bytes){
                    let b;
                    b = this.buffer.slice(0,bytes);
                    //放入缓存区
                    this.buffers.push(b);
                    //让缓存区的数量加上读到的字节数量
                    this.length += bytes;
                    //发射readble事件
                    this.emit('readable'); 
                }else{
                    this.emit('end');
                }
            }) 
        }
        return ret && this.encoding ? ret.toString(this.encoding) : ret;      
    }
}
module.exports = ReadStream;