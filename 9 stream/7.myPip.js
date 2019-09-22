let fs = require('fs');
let ReadStream = require('./ReadStream');
let rs = ReadStream('./1.txt', {
    flags: 'r',
    encoding: 'utf8',
    highWaterMark: 3
});
let FileWriteStream = require('./WriteStream');
let ws = FileWriteStream('./2.txt',{
    flags:'w',
    encoding:'utf8',
    highWaterMark:3
});
rs.pipe(ws);

ReadStream.prototype.pipe = function (dest) {
    this.on('data', (data)=>{
        let flag = dest.write(data);
        if(!flag){
            this.pause();
        }
    });
    dest.on('drain', ()=>{
        this.resume();
    });
    this.on('end', ()=>{
        dest.end();
    });
}
ReadStream.prototype.pause = function(){
    this.flowing = false;

}
ReadStream.prototype.resume = function(){
    this.flowing = true;
    this.read();
}