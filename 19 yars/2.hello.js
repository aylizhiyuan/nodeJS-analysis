let yargs = require('yargs');
//它可以帮我们解析命令行参数，把参数数组变成对象的形式
// -n  --name两种方式传值都可以
let argv = yargs.options('n', {
    alias: 'name',//别名
    demand: true,//必填
    default: 'zypx',
    description: '请输入你的姓名'
})
    .usage('hellp [opitons]')
    .help()//指定帮助信息
    .example('hello -name zypx', '执行hello命令，然后传入name参数为zypx')
    .alias('h', 'help')
    .argv;
console.log(argv);

console.log('hello ' + argv.name);

//配合hello.bat一起来看，初步认识yargs的用法
//window下的用法