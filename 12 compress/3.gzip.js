let zlib = require('zlib');
let str = 'hello';
zlib.gzip(str, (err, buffer) => {
    console.log(buffer.length);
    zlib.unzip(buffer, (err, data) => {
        console.log(data.toString());
    });
});
//如果拿到的数据（要压缩的是不是流）是一个字符串，而不是流的话能不能压缩呢？