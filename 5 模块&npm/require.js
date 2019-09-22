// Usage
//
//   require.register("browser/debug.js", function(module, exports, require){
//     // Module code goes here
//   });
//
//   var debug = require("browser/debug.js");


function require(p){
    //p是模块的位置
    var path = require.resolve(p);//找到模块文件的实际位置
    var mod = require.modules[path];//mod是模块文件加载后要执行的函数
    if(!mod) throw new Error('failed to require"' + p + '"');
    if(!mod.exports){
        mod.exports = {};
        //函数.call()是改变函数的this指向，并且传参
        //模块的内部this应该是指向模块本身的。
        //this == module.exports
        //每一个模块里面同时可以访问module,exports,require方法
        mod.call(mod.exports,mod,mod.exports,require.relative(path));
    }
    return mod.exports;
}
require.modules = {};

require.resolve = function(path){
    var orig = path;
    var reg = path + '.js'; //添加后缀
    var index = path + '/index.js';//添加默认文件
    return require.modules[reg] && reg || require.modules[index] && index || orig
}
//先注册一个模块，使用的方法是requrie.register
//path是加载的模块的路径,fn是模块的代码会放入的位置
require.register = function(path,fn){
    require.modules[path] = fn;//先将   require.modules = { 模块的位置:执行的方法,模块的位置:执行的方法 }
}
//这个是模块内部的require方法
require.relative = function(parent){
    return function(p){
        //如果你引入的并不是当前模块所在文件夹下的模块
        //则直接调用require方法
        if('.' != p.charAt(0)) return require(p);
        //如果你引入是当前模块所在文件夹下的模块的话
        var path = parent.split('/');
        var segs = p.split('/');
        path.pop();
        for(var i=0;i<segs.length;i++){
            var seg = segs[i];
            if('..' == seg) path.pop();
            else if('.' != seg) path.push(seg);
        }
        return require(path.join('/'));
    }
}