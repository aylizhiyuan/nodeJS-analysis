let fs = require('fs');
 let FileWriteStream = require('./WriteStream.js');
 let ws = FileWriteStream('./2.txt',{
     flags:'w',
     encoding:'utf8',
     highWaterMark:3
 });
 let i = 10;
 function write(){
     let  flag = true;
     while(i&&flag){
         flag = ws.write("1",'utf8',(function(i){
             return function(){
                 console.log(i);
             }
         })(i));
         i--;
         console.log(flag);
     }
 }
 write();
 ws.on('drain',()=>{
     console.log("drain");
     write();
 });
 /**
  10
  9
  8
  drain
  7
  6
  5
  drain
  4
  3
  2
  drain
  1
  **/