const {spawn} = require('child_process');
const ls = spawn('ls',['-lh','/usr']);
// ls.stdout.on('data',(data)=>{
//     console.log(`stdout:${data}`);
// })
//子进程的输出

ls.stdin.on('data',(data)=>{
    console.log(`stdin:${data}`)
})