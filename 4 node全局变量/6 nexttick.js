function Clock(){
    this.listener;
    
    this.listener();
}
Clock.prototype.add = function(listener){
    this.listener  = listener;
}
let c = new Clock();
c.add(()=>{console.log('ok')});
//nexttick是位于IO队列和异步队列之间的一个独立的队列