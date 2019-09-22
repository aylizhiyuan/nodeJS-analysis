/**
 * nextTick setImmediate 区别和联系
 * nextTick 把回调函数放在当前执行栈的底部
 * setImmediate 把回调函数放在事件队列的尾部
 */

function read1(){
  setImmediate(function(){
    console.log(1);
    process.nextTick(function(){
      console.log(2);
      process.nextTick(function(){
        console.log(3);
      })
      setImmediate(function(){
        console.log(5);
      })
      //这两个谁先谁后不一定
      setTimeout(function(){
        console.log(6);
      });
    })
  })
  process.nextTick(function(){
    console.log(0); // 0 1 2 3 6 5
  })
}

function read2(){
  setImmediate(function(){
    console.log(1);
    setImmediate(function(){
      console.log(2);
      process.nextTick(function(){
        console.log(0);
      })
      setImmediate(function(){
        console.log(3);
      })
    })
  })
 }