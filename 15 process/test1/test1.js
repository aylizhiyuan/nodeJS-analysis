//console.log();
//输出所有传递的参数
for (let i = 0; i < process.argv.length; i++) {
    process.stdout.write('hello ' + process.argv[i] + '\r\n');
}
//当你给进程输入参数的时候，直接输出？
process.stdin.on('data', function (data) {
    process.stdout.write('子'+data);
});