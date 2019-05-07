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
        //这个只是一个临时的容器而已，不是真正意义上的缓存区
        //没有length，没有缓冲区，就单纯的读就完了
        this.buffer = Buffer.alloc(this.highWaterMark);
        //当你给这个对象添加一个事件监听方法的时候，会触发这个函数
        this.on('newListener', (type, listener) => {
            //如果添加的是data事件的话直接调用read方法来读取内容
            if (type == 'data') {
                this.flowing = true;
                this.read();
            }
        });
        //可读流结束的时候
        this.on('end', () => {
            if (this.autoClose) {
                this.destroy();
            }
        });
        //可读流依然是首先打开这个文件
        this.open();
    }
    read() {
        if (typeof this.fd != 'number') {
            return this.once('open', () => this.read());
        }
        //读多少字节？如果是有end值，那么就使用这个值减去当前的位置，但是有可能读的比较多
        //如果超出最高水位线的话，则使用水位线；如果没有end值就按照水位线来依次读取
        let n = this.end ? Math.min(this.end - this.pos, this.highWaterMark) : this.highWaterMark;
        fs.read(this.fd,this.buffer,0,n,this.pos,(err,bytesRead)=>{
            if(err){
             return;
            }
            //实际读到的字节数量
            if(bytesRead){
                //获取实际读到的数据
                let data = this.buffer.slice(0,bytesRead);
                //转码
                data = this.encoding?data.toString(this.encoding):data;
                //触发data事件
                this.emit('data',data);
                //移动当前指针的位置，下次直接从上次读完的地方开始读
                this.pos += bytesRead;
                //如果当前指针到达了要读的位置的末尾的话触发end事件
                if(this.end && this.pos > this.end){
                  return this.emit('end');
                }
                //如果flowing为true的话，继续往下读调用read方法
                if(this.flowing)
                    this.read();
            }else{
                //如果读的过程中发现没有读到的数据的话也会触发end事件
                this.emit('end');
            }
        })
    }
    open() {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            if (err) return this.emit('error', err);
            this.fd = fd;
            this.emit('open', fd);
        })
    }
    end() {
        if (this.autoClose) {
            this.destroy();
        }
    }
    destroy() {
        fs.close(this.fd, () => {
            this.emit('close');
        })
    }

}
module.exports = ReadStream;