let fs = require('fs');
let EventEmitter = require('events');
class WriteStream extends  EventEmitter{
    constructor(path, options) {
        super(path, options);
        this.path = path;
        this.fd = options.fd;
        this.flags = options.flags || 'w';
        this.mode = options.mode || 0o666;
        this.encoding = options.encoding;
        this.start = options.start || 0;
        this.pos = this.start;
        this.writing = false;
        this.autoClose = true;
        this.highWaterMark = options.highWaterMark || 16 * 1024;
        this.buffers = [];
        this.length = 0;
        this.open();
    }
    //可读流首先要先打开文件
    open() {
        fs.open(this.path, this.flags, this.mode, (err, fd) => {
            //出错后监听流的error事件
            if (err) return this.emit('error', err);
            this.fd = fd;
            //打开文件成功后出发可写流的open事件
            this.emit('open', fd);
        })
    }
    //ws.write(1);ws.write(1)每调用一次，就会往缓冲区里面写入数据，当缓冲区满了之后，就要停止
    //写入操作，将缓冲区里面的数据写入到文件中去，等缓冲区清空后，再继续往缓冲区写
    write(chunk, encoding, cb) {
        if (typeof encoding == 'function') {
            cb = encoding;
            encoding = null;
        }
        //判断一下写入的数据是否是二进制，如果不是，则转化成二进制形式
        chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, this.encoding || 'utf8');
        let len = chunk.length;
        //length会累加每次写入数据的长度
        this.length += len;
        //当你写入的长度大于缓冲区大小的时候，返回false,否则返回true
        let ret = this.length < this.highWaterMark;
        //第二次调用write的时候，把数据放入缓冲区里面
        //随后所有调用write都会把数据放入缓冲区里面，因为writing的值一直是true
        if (this.writing) {
            this.buffers.push({
                chunk,
                encoding,
                cb,
            });
        } else {
            //第一次调用write的时候，直接用_write方法向文件写入数据
            this.writing = true;
            //这时候，第一次的数据已经写入文件了，并且其余调用的数据都在缓冲区里面了
            //我们应该做的就是清空缓存区，将缓存区里面的数据也写入到文件里面去
            //你可以理解为_write方法是异步的
            this._write(chunk, encoding,this.clearBuffer.bind(this));
        }
        return ret;
    }
    //直接写入
    _write(chunk, encoding, cb) {
        //一旦文件没有打开的话，则触发open事件
        if (typeof this.fd != 'number') {
            return this.once('open', () => this._write(chunk, encoding, cb));
        }
        fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, written) => {
            if (err) {
                if (this.autoClose) {
                    this.destroy();
                }
                return this.emit('error', err);
            }
            //写入多少字节，缓存区要减少多少字节
            this.length -= written;
            //下次再调用_write的时候，应该从上一次写完的位置开始写
            this.pos += written;
            //清空缓存区内容
            cb && cb();
        });
    }

    clearBuffer() {
        //取出缓存区的第一个缓冲的数据
        let data = this.buffers.shift();
        if (data) {
            //循环调用_write函数把缓存区内的数据写入文件里面去
            this._write(data.chunk, data.encoding, this.clearBuffer.bind(this))
        } else {
            //如果缓存区没有数据了，则将writing设置为false,并触发drain事件
            //下次调用write的时候，则又开始写入文件，将剩余的内容缓存了.....
            this.writing = false;
            this.emit('drain');
        }
    }
    //可读流的结束时候调用的方法
    end() {
        if (this.autoClose) {
            this.emit('end');
            this.destroy();
        }
    }
    //可读流结束的时候将文件关闭
    destroy() {
        fs.close(this.fd, () => {
            this.emit('close');//触发可读流的close事件
        })
    }

}

module.exports = WriteStream;