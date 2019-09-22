//如何创建目录
let fs = require('fs');
//创建目录的时候，必须要求父目录是存在的，否则将会创建失败
fs.mkdir('a/b',function(err){
    console.log(err);
})

//判断一个文件或者目录，是否存在 以前叫fs.exists
fs.access('a',fs.constants.R_OK,function(err){
    console.log(err);
})

//递归异步创建目录
function mkdirp(dir){
     let paths = dir.split('/');
     !function next(index){
        if(index > paths.length) return;
        let current = paths.slice(0,index).join('/');
        fs.access(current,fs.constants.R_OK,function(err){
            if(err){
                fs.mkdir(current,0o666,()=>next(index + 1));
            }else{
                next(index + 1);
            } 
        })
     }(1);
}
mkdirp('a/b/c');

//同步删除非空的目录
let fs = require('fs');
function rmdirp(target){
  let files = fs.readdirSync(target);
  files.forEach(function(item){
    let child = target+'/'+item;
    if(fs.statSync(child).isDirectory()){
      rmdirp(child);
    }else{
      fs.unlinkSync(child);
    }
  });
  //如果把一个目录下面所有的文件或目录全部删除后
  //再删除自己本身
  fs.rmdirSync(target);
}
rmdirp('a');



