let argv = {};
let args = process.argv;
//node 2.hello.js --name zypx
for (let i = 2; i < args.length; i++) {
    let val = args[i];
    if (val.startsWith('--')) {
        argv[val.slice(2)] = args[++i]
    }
}

exports.argv = argv;

//yargs模块的内部实现