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

1. 执行全局script同步代码,这些同步代码执行完毕后，调用栈清空
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

### 4. nodeJS中的模块化思想

### 5. nodeJS中的异步Promise/async/await

### 6. nodeJS如何实现高并发

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

一个进程指的是一个正在运行的程序。一个正在运行的程序在内存中的情况:
内核内存(对用户来说不可见) ----> 用户栈(运行的时候创建) ----> 共享库的内存映射区域（程序如果有动态库的话） ----> 运行时的堆（程序员自己分配的内存空间） ----> 读/写段（已经初始化未初始化的全局静态变量） ----> 只读代码段（常量、只读数据、程序代码）

以上可以简称：内存四区

#### 进程和线程的区别

计算机的核心是cpu,它承担了所有的计算任务,它就像是一个工厂，时刻都在运行

假定工厂的电力有限，一次只能供给一个车间使用，也就是说，一个车间开工的时候，其他的车间都必须停工，背后的含义就是单个cpu一次只能运行一个任务

进程就好比工厂的车间，它代表cpu所能处理的单个任务，任一时刻，cpu总是运行一个进程，其他进程处于非运行状态

这就是并发，就是同一时刻只有一个任务在执行，因为速度太快所以感觉好像在同时发生一样。并行才是真正的同一时刻同时执行两个任务

工厂的车间之间可以独立生产，也可以协作生产，但同一时刻，只能有一个车间在生产，这就涉及到进程之间的通信问题

进程的通信分为以下几个方法：1. 管道  2. 信号  3. 共享内存  4. 消息队列

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








