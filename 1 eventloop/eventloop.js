function read(){
    console.log(1);
    settimeout(function(){
        console.log(2);
    })
    console.log(3);
}
//执行read的时候的顺序是怎么样的？思考一下为什么会这样

function read2(){
    console.log(1)
    settimeout(function(){
        console.log(2)
        settimeout(function(){
            console.log(4);
        })
    })
    settimeout(function(){
        console.log(5);
    })
    console.log(3);
}
//它的执行顺序又是怎么样的呢？
//结合网络上的event loop图来理解

function read3(){
    console.log(1);
    ajax(); //它需要3秒菜可以返回4
    settimeout(function(){
        console.log(3);
    },1000)
}
//异步的代码总是等待在同步的代码执行完毕后才会去执行的



