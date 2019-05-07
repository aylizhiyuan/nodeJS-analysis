//爬虫的服务器端
let http = require('http');
let querystring = require('querystring');
let server = http.createServer();
server.on('request', function (req, res) {
    console.log(req.url);
    console.log(req.method);
    let result = [];
    req.on('data', function (data) {
        result.push(data);
    });
    req.on('end', function () {
        let str = Buffer.concat(result).toString();
        //如果把字符串转成对象
        let contentType = req.headers['content-type'];
        let body;
        if (contentType == 'application/x-www-form-urlencoded') {
            body = querystring.parse(str);
        } else if (contentType == 'application/json') {
            body = JSON.parse(str);
        } else {
            body = querystring.parse(str);
        }
        res.end(JSON.stringify(body))
    });
});
server.listen(8080);
