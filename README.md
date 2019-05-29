## nodeJS核心知识整理


### 1. 理解js中的执行上下文（程序执行中栈空间的分配情况）

栈的结构可以看看深入理解操作系统，里面有关于栈的具体代码执行中的分配情况，更容易理解js的执行上下文

![](http://davidshariff.com/blog/wp-content/uploads/2012/06/ecstack.jpg)

看一个例子：
            
            (function foo(i) {
            if (i === 3) {
            return;
            }
            else {
            foo(++i);
            }
            }(0));

![](http://davidshariff.com/blog/wp-content/uploads/2012/06/es1.gif)

一个函数调用就会在栈中创建一个栈帧。然而，我们主要关心的是在js层面，在解释器的内部，每次调用执行环境会有两个阶段：

1. 创建阶段

- 初始化作用域链
- 创建变量、函数和参数
    - 创建arguments object,检查上下文获取入参，初始化形参名称和数值，并创建一个引用拷贝
    - 扫描上下文获取内部函数声明：发现一个函数就在variable object中创建一个和函数名一样的属性，该属性作为一个引用的指针指向函数
    - 如果在variable object中已经存在了相同名称的属性，那么属性会重写
    - 对发现的每一个内部变量的声明，都在variable object中创建一个和变量名一样的属性，并将其初始化undefine
    - 如果在对象中发现已经存在相同变量名称的属性，那么就跳过，不做任何操作，继续扫描
- 确定this的值

2. 激活/代码执行阶段

- 执行上下文中的函数代码，逐行运行js代码，并给变量赋值

        executionContextObj = {
        scopeChain: { /* variableObject + all parent execution context's variableObject */ },
        //作用域链：{变量对象＋所有父执行环境的变量对象}
        variableObject: { /* function arguments / parameters, inner variable and function declarations */ },
        //变量对象:{函数形参＋内部的变量＋函数声明(但不包含表达式)}
        this: {}




看一个例子：

        function foo(i) {
            var a = 'hello';
            var b = function privateB() {

            };
            function c() {

            }
        }

        foo(22);

当刚调用foo(22)函数的时候，创建阶段的上下文大致是下面的样子：

        fooExecutionContext = {
            scopeChain: { ... },
            variableObject: {
                arguments: {  // 创建了参数对象
                    0: 22,
                    length: 1
                },
                i: 22,  // 检查上下文，创建形参名称，赋值/或创建引用拷贝
                c: pointer to function c()  // 检查上下文，发现内部函数声明，创建引用指向函数体
                a: undefined,  // 检查上下文，发现内部声明变量a，初始化为undefined
                b: undefined   // 检查上下文，发现内部声明变量b，初始化为undefined，此时并不赋值，右侧的函数作为赋值语句，在代码未执行前，并不存在
            },
            this: { ... }
        }

在执行完后的上下文大致如下：

        fooExecutionContext = {
            scopeChain: { ... },
            variableObject: {
                arguments: {
                    0: 22,
                    length: 1
                },
                i: 22,
                c: pointer to function c()
                a: 'hello',
                b: pointer to function privateB()
            },
            this: { ... }
        }





### 2. nodeJS中的eventLoop（异步实现）

#### 浏览器的异步实现原理

其实你如果理解了线程的问题，你就知道线程才是真正的并行，一般的思路就是用多线程来实现异步

当你同时要做两件事儿的时候，他们是执行在不同的线程中去，这就像柜台卖东西，来了一个人就得找一个员工陪他，直到这个人走了这个员工才能接待下一个客人

店内的员工就像线程池中的空闲的线程一样，空闲的时候可以去接待客人，课时同时只能接待一个人，要接待其他的人就得开辟一个线程

这种实在是非常的耗费系统的资源，于是浏览器实际是单线程的，也就是说同一时间只做一件事儿，这点跟apache是不一样的，apache是一个典型的多线程的服务器，每一个请求都会有一个线程单独处理，但是作为浏览器而言，javascript主要的用途是跟用户互动以及操作DOM。如果他是多线程的话，那么就会很麻烦，假定有两个线程，一个添加内容，一个删除内容，这时候浏览器就要考虑线程的同步问题了

所以，我们需要考虑在单线程的情况下，如何实现异步？

单线程就意味着，所有任务都需要排队，前一个任务结束，才会执行后一个任务。如果前一个任务很耗时，后一个任务就不得不一直等着

如果排队是因为计算量大，CPU忙不过来，倒也算了，但是很多时候CPU都是闲着，因为IO设备很慢(比如ajax操作从网络读取数据),不得不等结果出来，再往下执行

javascript语言的设计者意识到，这时候主线程完全可以不管IO设备，挂起处于等待中的任务，先运行排在后面的任务。等到IO设备返回了结果，再回头把挂起的任务继续执行下去

于是，所有的任务就分成了两种，一种是同步任务，一种是异步任务，同步任务指的是，在主线程中排队执行的任务，只有前一个任务执行完毕后才能执行后一个任务。异步任务指的是，不进入主线程，而进入"任务队列"的任务，只有任务队列通知主线程，某个异步任务可以执行了，该任务才会进入主线程执行

主线程从任务队列中读取事件，这个过程是循环不断的，所以，整个运行机制就是Event Loop(事件循环)

![event loop](http://www.ruanyifeng.com/blogimg/asset/2014/bg2014100802.png)

像是这样:

    // `eventLoop` is an array that acts as a queue (first-in, first-out)
    var eventLoop = [ ];
    var event;

    // keep going "forever"
    while (true) {
        // perform a "tick"
        if (eventLoop.length > 0) {
            // get the next event in the queue
            event = eventLoop.shift();

            // now, execute the next event
            try {
                event();
            }
            catch (err) {
                reportError(err);
            }
        }
    }


#### 更近一步的理解浏览器异步队列任务

宏队列,macrotask，也叫task，一些异步的任务的回调会进入macro task queue

- setTimeout
- setInterval
- setImmediate
- requestAnimationFrame
- I/O
- UI rendering(浏览器独有)

微队列，microtask,也叫jobs,另一些异步任务的回调会进入micro task queue

- process.nextTick(Node独有)
- Promise
- Object.observe
- MutationObserve

![event loop](https://segmentfault.com/img/remote/1460000016278118?w=710&h=749)

让我们看一下一个代码执行的具体流程:

1. 执行全局script同步代码,这些同步代码执行完毕后，调用栈清空（有几个函数就有几个栈帧）
2. 从微队列中取出位于队首的回调任务，放入执行栈中执行,长度减一
3. 继续取出位于队首的任务，放入调用栈中执行，直到把微队列中的所有任务执行完毕。如果这时候在执行的时候产生了新的微任务，那么会加入到队列的末尾，也会在这个周期被调用执行
4. 所有的微队列的任务执行完毕的时候，此时队列为空，调用栈为空
5. 取出宏队列中位于队首的任务，放入栈中执行
6. 执行完毕后，调用栈为空
7. 重复3-7的过程

这就是浏览器的事件循环Event Loop

实例代码理解：

        console.log(1); //同步代码
        //第一个宏任务
        setTimeout(() => {
        console.log(2);
        Promise.resolve().then(() => {
            console.log(3) //第二个微任务
        });
        });

        new Promise((resolve, reject) => {
        console.log(4) //同步代码
        resolve(5)
        }).then((data) => {
        console.log(data); //第一个微任务
        })
        //第二个宏 任务
        setTimeout(() => {
        console.log(6);
        })

        console.log(7); // 同步代码

简单的说，就是微任务 ---> 第一个宏任务 ---> 微任务 ---> 第二个宏任务  ----> 不断循环


#### nodeJS中的libuv异步实现原理

先来看nodeJS中的libuv的结构图：
![](https://segmentfault.com/img/remote/1460000016278119?w=800&h=316)

nodeJS中执行宏任务有6个阶段：

![](https://segmentfault.com/img/remote/1460000016278120?w=670&h=339)

各个阶段执行的任务如下：

- timers阶段：这个阶段执行setTimeout和setinterval预定的callback
- I/O callback阶段：执行除了close事件的callbacks、被timers设定的callbacks、setImmediate()设定的callbacks这些之外的callbacks
- idle,prepare阶段：仅node内部使用
- poll阶段：获取新的I/O事件，适当的条件下node会阻塞
- check阶段：执行setImmediate()设置的callbacks
- close callback阶段：执行socket.on('close')这些

你可以理解为在node中宏任务有很多种，但在浏览器中只有一种

不同的宏任务会放在不同的宏队列里面

nodejs中微队列主要有两个:

- next tick queue 是放置process.nextTick回调任务
- 其他的：比如promise

你可以理解为浏览器只有一个微任务队列，而在nodeJS中有两个

![](https://segmentfault.com/img/remote/1460000016278121?w=951&h=526)

大体解释下nodeJS的event loop过程：

1. 执行全局的script同步代码
2. 执行微任务，先执行所有的next tick 中的所有任务，再执行类似于promise之类的微任务
3. 开始执行宏任务，一共6个阶段，从第一阶段开始执行相应每一个阶段宏任务中的所有任务，注意，这里是所有每个阶段的宏任务队列的所有任务，在浏览器中只是取出第一个宏任务，每一个阶段的宏任务执行完毕后，开始执行微任务
4. 微任务nextTick--->微任务Promise---->timers阶段 ---> 微任务 ---> I/O阶段 ---> 微任务 --> check阶段 ---> 微任务 ---> close阶段 --> 微任务 --> 重新回到timers阶段 ---> 继续循环



![](https://segmentfault.com/img/remote/1460000016278122?w=420&h=433)
![](https://segmentfault.com/img/remote/1460000016278123?w=676&h=449)

看一个例子：

        console.log('1'); //同步代码
        //timer阶段的宏任务1
        setTimeout(function() {
            console.log('2');
            process.nextTick(function() {
                console.log('3');
            })
            new Promise(function(resolve) {
                console.log('4');
                resolve();
            }).then(function() {
                console.log('5')
            })
        })
        //微任务Promise
        new Promise(function(resolve) {
            console.log('7');
            resolve();
        }).then(function() {
            console.log('8')
        })
        //微任务nextTick
        process.nextTick(function() {
        console.log('6');
        })
        //timer阶段的宏任务2
        setTimeout(function() {
            console.log('9');
            process.nextTick(function() {
                console.log('10');
            })
            new Promise(function(resolve) {
                console.log('11');
                resolve();
            }).then(function() {
                console.log('12')
            })
        })


总结： 

1. 浏览器可以理解成只有1个宏任务队列和1个微任务队列，先执行全局Script代码，执行完同步代码调用栈清空后，从微任务队列中依次取出所有的任务放入调用栈执行，微任务队列清空后，从宏任务队列中只取位于队首的任务放入调用栈执行，注意这里和Node的区别，只取一个，然后继续执行微队列中的所有任务，再去宏队列取一个，以此构成事件循环。

2. NodeJS可以理解成有4个宏任务队列和2个微任务队列，但是执行宏任务时有6个阶段。先执行全局Script代码，执行完同步代码调用栈清空后，先从微任务队列Next Tick Queue中依次取出所有的任务放入调用栈中执行，再从微任务队列Other Microtask Queue中依次取出所有的任务放入调用栈中执行。然后开始宏任务的6个阶段，每个阶段都将该宏任务队列中的所有任务都取出来执行（注意，这里和浏览器不一样，浏览器只取一个），每个宏任务阶段执行完毕后，开始执行微任务，再开始执行下一阶段宏任务，以此构成事件循环。

3. MacroTask包括： setTimeout、setInterval、 setImmediate(Node)、requestAnimation(浏览器)、IO、UI rendering

4. Microtask包括： process.nextTick(Node)、Promise、Object.observe、MutationObserver



### 3. nodeJS中的流

流是一种数据传输手段，是有顺序的，有起点和终点，比如你要把数据从一个地方传到另外一个地方

流非常的重要，gulp/webpack/http里面的请求和响应，http里的socket都是流，包括后面的压缩和加密

有时候我们不关于文件的主体内容，只关心能不能取到数据，取到数据后应该怎么处理

对于小型的文本文件，我们可以把文件的内容全部读入内存，然后再写入文件

对于体积较大的二进制文件，比如音频、视频文件，动辄好几个G大小，如果使用这种方法，很容易让内存爆仓

理想的方法是读一部分，写一部分，不管文件有多大，只要时间允许，总会处理完成

个人对于流的理解：首先实现流必须要理解文件的读写，而操作系统是用open/read/write实现文件的读写的

在nodejs中有四种流：

- Readable - 可读的流 (例如 fs.createReadStream()).
- Writable - 可写的流 (例如 fs.createWriteStream()).
- Duplex - 可读写的流 (例如 net.Socket).
- Transform - 在读写过程中可以修改和变换数据的 Duplex 流 (例如 zlib.createDeflate()).

#### readable可读流

![](https://upload-images.jianshu.io/upload_images/3241721-0d0dd65389c687de.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/742/format/webp)

资源的数据流并不是直接流向消费者，而是先push到缓存池，缓存池有一个水位标记highWatermark，超过这个标记阈值,push的时候会返回flase,从而控制读取数据流的速度，如同水管上的阀门，当水管面装满了水，就暂时关上阀门，不再从资源里抽水出来

- 消费者主动执行了pause()
- 消费速度比数据push到缓存池的生产速度慢

![](https://upload-images.jianshu.io/upload_images/3241721-35e90580c88ed250.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/702/format/webp)

这是puase模式下的可读流，在这种模式下可读流有三个状态

- readable._readableState.flowing = null 目前没有数据消费者，所以不会从资源中读取数据
- readable._readableState.flowing = false 暂停从资源库读取数据，但不会暂停数据生成，主动触发readable.puase()方法，readable.unpip()方法或者接收"背压"可达到此状态
- readable._readableState.flowing = true 正在从资源中读取数据，监听"data"事件，调用readable.pipe()方法或者调用readable.resume()方法可达到此状态

这种模式下，需要显式的调用read方法来读取数据，readable状态只是代表着有数据可读，要读还是要调用read方法

#### writeStream可写流

![](https://upload-images.jianshu.io/upload_images/3241721-b65ebaafd635caf9.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/726/format/webp)

数据流过来的时候，会直接写入到资源池，当写入速度比较缓慢或者写入暂停时，数据流会进入队列池缓存起来，当生产者写入速度过快，把队列池装满了之后，就会出现背压，这个时候是需要告诉生产者暂停生产，当队列释放完毕后，会给生产者发送一个drain消息，让他恢复生产

write方法向流中写入数据，并在数据处理完毕后调用callback.在确认了chunk后，如果内部缓冲区的大小小于创建流时设定的highWaterMark阈值，函数返回true.如果返回值为false(队列池已经满了)，应该停止向流中写数据，直到drain事件触发





### 4. nodeJS中的模块化

commonJS规范API：

require:加载所要依赖的其他模块
module.exports 或者 exports:对外暴露接口

特点:

1. 模块输出的是一个值的拷贝，模块是运行时加载，同步加载
2. CommonJS模块的顶层this指向当前模块
3. exports是对module.exports的引用，不能直接给exports赋值，直接赋值无效
4. 一个文件不能写多个module.exports，如果写多个，对外暴露的接口是最后一个
5. 模块如果没有指定使用Module.exports或者exports对外暴露接口，在其他文件中引用该模块，得到的就是个空的对象

问题:

    //创建两个文件，module1.js 和 module2.js，并且让它们相互引用
    // module1.js
    exports.a = 1;
    require('./module2');
    exports.b = 2;
    exports.c = 3;
    
    // module2.js
    const Module1 = require('./module1');
    console.log('Module1 is partially loaded here', Module1);

在 module1 完全加载之前需要先加载 module2，而 module2 的加载又需要 module1。这种状态下，我们从 exports 对象中能得到的就是在发生循环依赖之前的这部分。上面代码中，只有 a 属性被引入，因为 b 和 c 都需要在引入 module2 之后才能加载进来。

Node 使这个问题简单化，在一个模块加载期间开始创建 exports 对象。如果它需要引入其他模块，并且有循环依赖，那么只能部分引入，也就是只能引入发生循环依赖之前所定义的这部分。


AMD规范API:

define(id?,[]?,callback) 定义声明模块，参数id,模块id标识(可选),参数二是一个数组(可选),依赖其他的模块，最后是回调函数

require([module],callback) 加载模块，参数1是数组，指定加载的模块，参数2是回调函数，模块加载完毕后执行

    require.config({
        baseUrl://基础路径
        path://对象，对外加载的模块名称
        shim://对象，配置非AMD模式的文件
    })

特点：异步加载，不会阻塞页面的加载，能并行加载多个模块，但是不能按需加载，必须提前加载所需依赖

ES6规范API：

export 用于规定模块的对外接口

import 用与输入其他模块提供的功能

特点：

1. 顶层的this指向undefined,即不应该在顶层代码中使用this
2. 自动采用严格模式 ”use strict“
3. 静态化，编译时加载或者静态加载，编译时候输出接口
4. export/import必须处于模块的顶层
5. 模块输出的是值的引用

问题:

ES6 中，imports 是 exprts 的只读视图，直白一点就是，imports 都指向 exports 原本的数据，比如：

        //------ lib.js ------
        export let counter = 3;
        export function incCounter() {
            counter++;
        }
        
        //------ main.js ------
        import { counter, incCounter } from './lib';
        
        // The imported value `counter` is live
        console.log(counter); // 3
        incCounter();
        console.log(counter); // 4
        
        // The imported value can’t be changed
        counter++; // TypeError

因此在 ES6 中处理循环引用特别简单，看下面这段代码：

        //------ a.js ------
        import {bar} from 'b'; // (1)
        export function foo() {
        bar(); // (2)
        }
        
        //------ b.js ------
        import {foo} from 'a'; // (3)
        export function bar() {
        if (Math.random()) {
            foo(); // (4)
        }
        }

假设先加载模块 a，在模块 a 加载完成之后，bar 间接性地指向的是模块 b 中的 bar。无论是加载完成的 imports 还是未完成的 imports，imports 和 exports 之间都有一个间接的联系，所以总是可以正常工作。





### 5. nodeJS中的异步Promise/async/await

异步的实现这里就不再叙述了，这里要分析的是异步代码管理的几种写法:

我们要控制异步，让他能跟同步一样

1. 回调函数(简单来说，就是在一个异步任务的回调函数中再套一个异步任务，根据程序的执行顺序，永远都会先执行同步代码，第一个异步任务的代码首先被执行，剩下的就是第二个异步任务了，简单吧，实现的话通过setTimeout你可以很轻松的把一个函数变成一个异步的任务)
2. 事件监听(事件也是宏任务，但是实现来说的话，事件是需要手动触发的，自己实现一下很容易)
3. Promise(无非还是callback，只不过改了一种顺眼的写法而已了，它严格上来讲也是因为回调实现的，实现一个也非常的轻松)
4. Generator(实现原理确认是跟栈帧有关系的)
5. async/await(是在generator的基础上的语法糖)

#### Generator

ES6中引入了很多此前没有的概念，Iterator就是其中一个。它是一个指针对象，类似于单项链表的数据结构，通过next()将指针指向下一个节点

我们可以定义一个数组，然后生成数组的Iterator对象

    const arr = [100,200,300]
    const iterator = arr[Symbol.iterator]()

好，我现在已经生成了一个数组的Iterator对象，有两种方式使用它:next 和for...of

    console.log(iterator.next())  // { value: 100, done: false }
    console.log(iterator.next())  // { value: 200, done: false }
    console.log(iterator.next())  // { value: 300, done: false }
    console.log(iterator.next())  // { value: undefined, done: true }

在看第二种:

    let i
    for (i of iterator) {
        console.log(i)
    }
    // 打印：100 200 300     

执行const h = Hello()得到的就是一个iterator对象，因为h[Symbol.iterator]是有值的，那么就可以用next()和for...of进行操作

    function* Hello() {
        yield 100
        yield (function () {return 200})()
        return 300 
    }
    const h = Hello()
    console.log(h[Symbol.iterator])  // [Function: [Symbol.iterator]]

下面是结果:

    console.log(h.next())  // { value: 100, done: false }
    console.log(h.next())  // { value: 200, done: false }
    console.log(h.next())  // { value: 300, done: false }
    console.log(h.next())  // { value: undefined, done: true }

    let i
    for (i of h) {
        console.log(i)
    }  

下面我们来分析一下所有的步骤:

- Generator不是函数，不是函数，不是函数
- hello()不会立即出发执行，而是一上来暂停
- 每次h.next()都会打破暂停状态去执行，直到遇到下一个yield或者return
- 遇到yield时候，会执行yield后面的表达式，并返回执行之后的值，然后再次进入暂停状态，此时done:false
- 遇到return时，会返回值，执行结束，即done:true
- 每次h.next()的返回值都是{value:....,done:....}的形式


next和yield参数传递

我们之前已经知道，yield具有返回数据的功能。yield后面的数据被返回，存放到返回结果的value属性中

    function* G() {
        yield 100
    }
    const g = G()
    console.log( g.next() ) // {value: 100, done: false}

还有另外一个方向的参数传递,就是next向yield传递

    function* G() {
        const a = yield 100
        console.log('a', a)  // a aaa
        const b = yield 200
        console.log('b', b)  // b bbb
        const c = yield 300
        console.log('c', c)  // c ccc
    }
    const g = G()
    g.next()    // value: 100, done: false
    g.next('aaa') // value: 200, done: false
    g.next('bbb') // value: 300, done: false
    g.next('ccc') // value: undefined, done: true

- 执行第一个g.next()时，为传递任何参数，返回的{value: 100, done: false}，这个应该没有疑问
- 执行第二个g.next('aaa')时，传递的参数是'aaa'，这个'aaa'就会被赋值到G内部的a标量中，然后执行console.log('a', a)打印出来，最后返回{value: 200, done: false}
- 执行第三个、第四个时，道理都是完全一样的，大家自己捋一捋。

有一个要点需要注意，就g.next('aaa')是将'aaa'传递给上一个已经执行完了的yield语句前面的变量，而不是即将执行的yield前面的变量。这句话要能看明白，看不明白就说明刚才的代码你还没看懂，继续看。


普通函数在被调用时，JS引擎会创建一个栈帧，在里面准备好局部变量、函数参数、临时值、代码执行的位置（也就是说这个函数的第一行对应到代码区里的第几行机器码），在当前栈帧里设置好返回位置，然后将新帧压入栈顶。待函数执行结束后，这个栈帧将被弹出栈然后销毁，返回值会被传给上一个栈帧。

当执行到yield语句时，Generator的栈帧同样会被弹出栈外，但Generator在这里耍了个花招——它在堆里保存了栈帧的引用（或拷贝）！这样当iter.next方法被调用时，JS引擎便不会重新创建一个栈帧，而是把堆里的栈帧直接入栈。因为栈帧里保存了函数执行所需的全部上下文以及当前执行的位置，所以当这一切都被恢复如初之时，就好像程序从原本暂停的地方继续向前执行了。

而因为每次yield和iter.next都对应一次出栈和入栈，所以可以直接利用已有的栈机制，实现值的传出和传入。

这就是Generator魔法背后的秘密！


### 6. koa实现原理分析

![](https://pic4.zhimg.com/80/v2-f0731a5f944119b3b59bde4d1bf3f58b_hd.jpg)

koa的实现步骤：

1. 封装node http server
2. 构造request,response,context对象
3. 中间件机制
4. 错误处理

#### 主线一:封装node http server

    // application.js
    let http = require('http');

    class Application {

        /**
        * 构造函数
        */
        constructor() {
            this.callbackFunc;
        }

        /**
        * 开启http server并传入callback
        */
        listen(...args) {
            let server = http.createServer(this.callback());
            server.listen(...args);
        }

        /**
        * 挂载回调函数
        * @param {Function} fn 回调处理函数
        */
        use(fn) {
            this.callbackFunc = fn;
        }

        /**
        * 获取http server所需的callback函数
        * @return {Function} fn
        */
        callback() {
            return (req, res) => {
                this.callbackFunc(req, res);
            };
        }

    }

    module.exports = Application;

#### 主线二：构造request,response,context对象

request是对node原生request的封装，response是对node原生response的封装，context对象则是回调函数上下文对象，挂载了request和response对象

首先创建request.js

    // request.js
    let url = require('url');

    module.exports = {

        get query() {
            return url.parse(this.req.url, true).query;
        }

    };

很简单，就是导出一个对象，其中包含query的读取方法，用this.req.url是原生获取url的方法    

然后创建response.js

    // response.js
    module.exports = {

        get body() {
            return this._body;
        },

        /**
        * 设置返回给客户端的body内容
        *
        * @param {mixed} data body内容
        */
        set body(data) {
            this._body = data;
        },

        get status() {
            return this.res.statusCode;
        },

        /**
        * 设置返回给客户端的stausCode
        *
        * @param {number} statusCode 状态码
        */
        set status(statusCode) {
            if (typeof statusCode !== 'number') {
                throw new Error('statusCode must be a number!');
            }
            this.res.statusCode = statusCode;
        }

    };
也很简单，status读取方法分别设置或读取this.res.statusCode ,body的读写方法分别设置this._data的属性

然后创建context.js

    // context.js
    module.exports = {

        get query() {
            return this.request.query;
        },

        get body() {
            return this.response.body;
        },

        set body(data) {
            this.response.body = data;
        },

        get status() {
            return this.response.status;
        },

        set status(statusCode) {
            this.response.status = statusCode;
        }

    };    

可以看到主要是做一些常用方法的代理，通过context.query直接代理了context.request.query，context.body和context.status代理了context.response.body与context.response.status。而context.request，context.response则会在application.js中挂载

    // application.js
    let http = require('http');
    let context = require('./context');
    let request = require('./request');
    let response = require('./response');

    class Application {

        /**
        * 构造函数
        */
        constructor() {
            this.callbackFunc;
            this.context = context;
            this.request = request;
            this.response = response;
        }

        /**
        * 开启http server并传入callback
        */
        listen(...args) {
            let server = http.createServer(this.callback());
            server.listen(...args);
        }

        /**
        * 挂载回调函数
        * @param {Function} fn 回调处理函数
        */
        use(fn) {
            this.callbackFunc = fn;
        }

        /**
        * 获取http server所需的callback函数
        * @return {Function} fn
        */
        callback() {
            return (req, res) => {
                let ctx = this.createContext(req, res);
                let respond = () => this.responseBody(ctx);
                this.callbackFunc(ctx).then(respond);
            };
        }

        /**
        * 构造ctx
        * @param {Object} req node req实例
        * @param {Object} res node res实例
        * @return {Object} ctx实例
        */
        createContext(req, res) {
            // 针对每个请求，都要创建ctx对象
            let ctx = Object.create(this.context);
            ctx.request = Object.create(this.request);
            ctx.response = Object.create(this.response);
            ctx.req = ctx.request.req = req;
            ctx.res = ctx.response.res = res;
            return ctx;
        }

        /**
        * 对客户端消息进行回复
        * @param {Object} ctx ctx实例
        */
        responseBody(ctx) {
            let content = ctx.body;
            if (typeof content === 'string') {
                ctx.res.end(content);
            }
            else if (typeof content === 'object') {
                ctx.res.end(JSON.stringify(content));
            }
        }

    }

可以看到，最主要的是增加了createContext方法，基于我们之前创建的context 为原型，使用Object.create(this.context)方法创建了ctx，并同样通过Object.create(this.request)和Object.create(this.response)创建了request/response对象并挂在到了ctx对象上面。此外，还将原生node的req/res对象挂载到了ctx.request.req/ctx.req和ctx.response.res/ctx.res对象上。

回过头去看我们之前的context/request/response.js文件，就能知道当时使用的this.res或者this.response之类的是从哪里来的了，原来是在这个createContext方法中挂载到了对应的实例上。一张图来说明其中的关系：

构建了运行时上下文ctx之后，我们的app.use回调函数参数就都基于ctx了。

#### 主线三：中间件机制

    /**
    * @file simpleKoa application对象
    */
    let http = require('http');
    let context = require('./context');
    let request = require('./request');
    let response = require('.//response');

    class Application {

        /**
        * 构造函数
        */
        constructor() {
            this.middlewares = [];
            this.context = context;
            this.request = request;
            this.response = response;
        }

        // ...省略中间 

        /**
        * 中间件挂载
        * @param {Function} middleware 中间件函数
        */
        use(middleware) {
            this.middlewares.push(middleware);
        }

        /**
        * 中间件合并方法，将中间件数组合并为一个中间件
        * @return {Function}
        */
        compose() {
            // 将middlewares合并为一个函数，该函数接收一个ctx对象
            return async ctx => {

                function createNext(middleware, oldNext) {
                    return async () => {
                        await middleware(ctx, oldNext);
                    }
                }

                let len = this.middlewares.length;
                let next = async () => {
                    return Promise.resolve();
                };
                for (let i = len - 1; i >= 0; i--) {
                    let currentMiddleware = this.middlewares[i];
                    next = createNext(currentMiddleware, next);
                }

                await next();
            };
        }

        /**
        * 获取http server所需的callback函数
        * @return {Function} fn
        */
        callback() {
            return (req, res) => {
                let ctx = this.createContext(req, res);
                let respond = () => this.responseBody(ctx);
                let fn = this.compose();
                return fn(ctx).then(respond);
            };
        }

        // ...省略后面 

    }

    module.exports = Application;


可以看到，首先对app.use进行改造了，每次调用app.use，就向this.middlewares中push一个回调函数。然后增加了一个compose()方法，利用我们前文分析的原理，对middlewares数组中的函数进行组装，返回一个最终的函数。最后，在callback()方法中，调用compose()得到最终回调函数，并执行

#### 主线四:错误处理

    /**
    * @file simpleKoa application对象
    */

    let EventEmitter = require('events');
    let http = require('http');
    let context = require('./context');
    let request = require('./request');
    let response = require('./response');

    class Application extends EventEmitter {

        /**
        * 构造函数
        */
        constructor() {
            super();
            this.middlewares = [];
            this.context = context;
            this.request = request;
            this.response = response;
        }

        // ...

        /**
        * 获取http server所需的callback函数
        * @return {Function} fn
        */
        callback() {
            return (req, res) => {
                let ctx = this.createContext(req, res);
                let respond = () => this.responseBody(ctx);
                let onerror = (err) => this.onerror(err, ctx);
                let fn = this.compose();
                // 在这里catch异常，调用onerror方法处理异常
                return fn(ctx).then(respond).catch(onerror);
            };
        }

        // ... 

        /**
        * 错误处理
        * @param {Object} err Error对象
        * @param {Object} ctx ctx实例
        */
        onerror(err, ctx) {
            if (err.code === 'ENOENT') {
                ctx.status = 404;
            }
            else {
                ctx.status = 500;
            }
            let msg = err.message || 'Internal error';
            ctx.res.end(msg);
            // 触发error事件
            this.emit('error', err);
        }

    }

    module.exports = Application;


详细的源代码可以查看simpleKoa文件夹







### 7. 如何分析nodeJS中的内存泄漏

牢记内存四区:全局区、代码区、堆区、栈区

全局区的变量是在程序执行完毕后释放的，也就是你关闭页面后消失的。而栈里面的数据是当函数执行完毕后浏览器自动回收的

堆区的变量是需要手动回收的，代码区存放一条一条执行的指令

程序执行过程中的栈结构:main函数位于栈底---->执行一个函数就压入栈（函数的栈帧）----->函数参数首先入栈 -----> 返回地址入栈 ------> 被保存的寄存器的值（main函数中可能有些值是存在寄存器中的，所以要保存一下）-----> 局部变量 -----> 参数构造区(该函数要传递出去的参数)


内存泄漏是指由于疏忽或错误造成程序未能释放已经不再使用的内存的情况

内存泄漏的几种情况:

1）  全局变量

        a = 10;
        global.b = 11; 

这种比较简单的原因，是因为全局的变量只能在代码执行完毕后才会被清除掉

2）  闭包

        function out(){
            const bigData = new Buffer(10);
            inner = function(){
                void bigData;
            }
        }

闭包会引用到父级函数中的变量，如果闭包未被释放，就会导致内存泄漏。上面的例子是inner直接挂在了root上，从而导致内存泄漏(bigData不会释放)

3） 事件监听

事件监听也可能出现内存泄漏。例如对同一个事件重复监听，忘记移除，将造成内存泄漏。例如nodejs中的Agent的keep-alive为true的时候

分析nodeJS中的内存泄漏可以通过内存快照来查看

### 8. nodeJS进程


#### 进程的概念

一个程序首先要经历一个编译的过程：

main.c sum.c ----> 翻译器 cpp（预处理文件） ccl(c编译器生成汇编) as(汇编器生成一个可重定位二进制文件) 生成main.o ---> 翻译器 cpp,ccl,as生成sum.o ----> main.o + sum.o 通过ld链接器（符号解析和重定位） ---> 可执行文件 proc

这个可执行文件有代码段、数据段、符号表和一些调试信息

这里会用到虚拟内存，比如当我们用gcc编译一个c程序的时候，这时候程序还没有运行，根本没有物理内存的地址？所以，需要一个虚拟内存，内核会为系统中的每一个进程维护一份相互独立的页映射表，页映射表的基本原理就是将程序运行过程中需要访问的一段虚拟内存空间通过页映射表映射到一段物理内存中。

![](https://s1.51cto.com/oss/201903/14/e129e77ac26651cdeabe9edc29f5c8be.jpg)

虚拟内存是操作系统里面的概念，对于操作系统来说，虚拟内存就是一张张的对照表，p1获取a内存里的数据时候应该去物理内存的A地址去找，而找B内存里的数据应该去物理内存的C地址

我们知道系统的基本单位字节，如果将每一个虚拟内存的字节都对应到物理内存的地址，那么每个条目至少需要8个字节(32位地址)，在4G内存情况下，需要32G的空间来存表，于是操作系统引入了页的概念

在系统启动的时候，操作系统将整个物理内存以4K为单位，划分为各个页。之后进行内存分配都以页为单位。那么虚拟内存页对应物理内存页的映射表就笑的多了，4G内存只需要8M的映射表即可。一些进程没有使用到的虚拟内存页并不保存映射关系。操作系统虚拟内存到物理内存的映射表叫页表

我们知道通过虚拟内存的机制，每个进程都以为自己占用了全局的内存，进程访问内存的时候，操作系统都会把进程提供的虚拟内存转化成物理内存，再去对应的物理内存上获取数据。CPU中有一个硬件叫MMU内存管理单元专门用来翻译虚拟内存地址，CPU还为页表寻址设置了缓存机制


虚拟内存可以实现数据共享：在进程加载系统库(系统头文件stdio.h)，总是要分配一块内存，将磁盘中的库文件加载到内存中，在直接使用物理内存时，由于物理内存的地址唯一，即使系统发现同一个库在系统内加载了两次，但每个进程指定的加载内存不一样，系统也无能为力，而在使用虚拟内存时，系统只需要将进程的虚拟内存地址指向库文件所在的物理内存地址即可，如上图所示，进程p1和p2的B地址都指向了物理地址C。

虚拟内存实现SWAP：Liunx提出了SWAP的概念，可以使用SWAP分区，再分配物理内存，但可用内存不足的时候，将暂时不同的内存数据放到磁盘上，让有需要的进程先使用，等进程再需要使用数据的时候，再讲这些数据加载到内存中来，这种交换的技术，可以让进程使用更多的内存

当你输入 ./proc 执行该程序的时候，会产生一个进程，操作系统会给这个进程分配对应的内存空间

一个进程指的是一个正在运行的程序。一个正在运行的程序在内存中的情况（虚拟内存）:
内核内存(对用户来说不可见) ----> 用户栈(运行的时候创建) ----> 共享库的内存映射区域（c标准库、数学库等等库文件、头文件） ----> 运行时的堆（程序员自己分配的内存空间） ----> 读/写段（已经初始化未初始化的全局静态变量） ----> 只读代码段（常量、只读数据、程序代码）

以上可以简称：内存四区

让我们加入虚拟内存的技术，再来看看对应的虚拟内存和物理内存的情况：

![](https://img-blog.csdn.net/20180830111258836?watermark/2/text/aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2x2eWliaW44OTA=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70)

任何一条指令执行的顺序都是按下面的流程(这时候程序已经在内存中了):

1. 取指：CPU从内存中读取指令字节，地址为程序计数器的值PC
2. 译码：从寄存器文件读入最多两个操作数,ra和rb字段指明的寄存器
3. 执行：算数逻辑单元要么执行指令指明的操作，计算内存引用的有效地址，要么增加或者减少栈指针，也可能设置条件码
4. 访存：将数据写入内存或从内存读出数据（跟上面的内存四区联系一下）
5. 写回：写回阶段最多可以写两个结果到寄存器文件
6. 更新PC：将PC设置成吓一跳指令的地址





#### 进程和线程的区别

计算机的核心是cpu,它承担了所有的计算任务,它就像是一个工厂，时刻都在运行

假定工厂的电力有限，一次只能供给一个车间使用，也就是说，一个车间开工的时候，其他的车间都必须停工，背后的含义就是单个cpu一次只能运行一个任务

进程就好比工厂的车间，它代表cpu所能处理的单个任务，任一时刻，cpu总是运行一个进程，其他进程处于非运行状态

这就是并发，就是同一时刻只有一个任务在执行，因为速度太快所以感觉好像在同时发生一样。并行才是真正的同一时刻同时执行两个任务

工厂的车间之间可以独立生产，也可以协作生产，但同一时刻，只能有一个车间在生产，这就涉及到进程之间的通信问题

进程的通信分为以下几个方法：1. 管道  2. 信号  3. 共享内存  4. 消息队列（这些都是通过操作系统内核完成的）

一个车间内，可以有很多工人，他们协同完成一个任务

线程好比车间里面的工人，一个进程可以有多个线程，并且这些线程可以同一时刻一起运行，就是并行

车间的空间是工人们共享的，比如很多房间是每个工人都可以进入的。这象征着一个进程的内存空间是共享的。每个线程都可以使用这些共享内存

可是，每间房间的大小不同，有些房间最多只能容纳一个人，比如厕所。里面有人的时候，其他人就不能进去了。这代表着一个线程使用某些共享内存的时候，其他的线程只能等待它结束才能使用这一块内存

这就涉及到线程同步的必要性，当多个线程共享相同的内存的时候，需要每一个线程看到相同的视图，当一个线程修改变量的时候，其他的线程也可以读取读取或者修改这个变量。就需要对线程进行同步，确保他们不会访问到无效的变量

一个防止他人进入的简单方法，就是门口加一把锁，先到的人锁上门，后到的人看到上锁，就在门口排队，等锁打开再进去，这就是互斥锁，防止多个线程同时读写某一块内存区域

有时候你会好奇线程有堆栈吗？其实是有栈，并且这个栈是放在进程堆空间中分配的


#### nodeJS里面的多进程








####  解决高并发的方案

高并发：在极短的单位时间内，极多个请求同时发起到服务器

服务器的压力会很大，然后，数据库的压力也会很大，所以，解决的思路应该放在服务器上（软件和硬件）和数据库（设计和查询）上面

高并发的服务器使用的是epoll（nginx的策略）,不是所谓的多进程和多线程,这个需要注意！！！！具体的实现可以看我的网络文档

1.分布式缓存：redis、memcached等，结合CDN来解决图片文件等访问。

2.消息队列中间件：activeMQ等，解决大量消息的异步处理能力。（这里可以参考下我设计的社区系统，用户登录成功后，又要检查用户信息、又要发送邮箱、最后还要检查是否有该用户的消息，这些连续的操作用消息队列再合适不过了）

3.应用拆分:一个工程被拆分为多个工程部署，利用dubbo解决多工程之间的通信。

4.数据库垂直拆分和水平拆分(分库分表)等。

5.数据库读写分离，解决大数据的查询问题。

6.还可以利用nosql ，例如mongoDB配合mysql组合使用。

7.还需要建立大数据访问情况下的服务降级以及限流机制等

### 9. 负载均衡

### 10. 错误管理

### 11. 单元测试

### 未完待续....






