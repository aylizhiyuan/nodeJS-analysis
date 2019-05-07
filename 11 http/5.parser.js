// parser方法解析请求对象，其实就是请求信息，然后解析出请求头，再传给请求监听函数
//socket.on("data",(data)=>{})其实就是如果获取到data，请求中的内容
//拿到请求头和请求体之后，将它解析成req,然后再建立res,将结果返回
let fs = require('fs');
let path = require('path');
let { StringDecoder } = require('string_decoder');
//把buffer转成字符串。可以保不乱码
let decoder = new StringDecoder();
//流有什么特点，读一点少一点
// 总请求长度是130K，请求头部分是70K，请求体应该是60K
//1 64K
//2 64K   一共读走了128K。那么意味着只剩下2K
//3 
function parser(requestStream, requestListener) {
    function onReadable() {
        let buf;
        let buffers = [];
        //不断的调用read方法从缓冲区里面读取请求的内容
        while (null != (buf = requestStream.read())) {
            buffers.push(buf);
            let result = Buffer.concat(buffers);
            let str = decoder.write(result);//转成字符串
            if (str.match(/\r\n\r\n/)) {
                let values = str.split(/\r\n\r\n/);//根据请求头和请求体切成数组
                let headers = values.shift();//拿到请求头 
                let headerObj = parseHeader(headers);//请求头解析成对象
                Object.assign(requestStream, headerObj);
                let body = values.join('\r\n\r\n');//解析完毕后再跟请求体连接成一个整体
                requestStream.removeListener('readable', onReadable);
                //unshift
                //这个流里需要将已经读到的内容再重新塞回去
                requestStream.unshift(Buffer.from(body));
                return requestListener(requestStream);
            }
        }

    };
    //可读流的readble事件，可读流马上就会读取文件的内容，并放入缓冲区
    requestStream.on('readable', onReadable);
}
function parseHeader(headerStr) {
    let lines = headerStr.split(/\r\n/);
    let startLine = lines.shift();
    let starts = startLine.split(' ');
    let method = starts[0];
    let url = starts[1];
    let protocal = starts[2];
    let protocalName = protocal.split('/')[0];
    let protocalVersion = protocal.split('/')[1];
    let headers = {};
    lines.forEach(line => {
        let row = line.split(': ');
        headers[row[0]] = row[1];
    });
    return { headers, method, url, protocalName, protocalVersion };
}

//测试一下parser是否可以对请求的内容进行解析
let rs = fs.createReadStream(path.join(__dirname, 'req.txt'));
//socket拆成二个对象，一个请求一个响应
parser(rs, function (req) {
    console.log(req.method);//POST
    console.log(req.url);// /
    console.log(req.headers);
    //应该拿到完整的请求体
    req.on('data', function (data) {
        console.log(data.toString());
    });
    req.on('end', function () {
        console.log('请求处理结束，开始响应 res.end()');
    });
});

//一个parser方法，解析请求头和请求体