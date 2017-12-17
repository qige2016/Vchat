window.onload = function() {
    //实例并初始化vchat
    var vchat = new VChat();
    vchat.init();
};
//定义我们的Vchat类
var VChat = function() {
    this.socket = null;
};
//向原型添加业务方法
VChat.prototype = {
    init: function() {//此方法初始化程序
        var that = this;
        //建立到服务器的socket连接
        this.socket = io.connect();
        //监听socket的connect事件，此事件表示连接已经建立
        this.socket.on('connect', function() {
            //连接到服务器后，显示昵称输入框
            document.getElementById('info').innerText = '请输出你的昵称:)';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });
        this.socket.on('nickExisted', function() {
            document.getElementById('info').innerText = '昵称已被占用';//显示昵称已被占有的提示
        });
        this.socket.on('loginSuccess', function() {
            document.title = 'Vchat | ' + document.getElementById('nicknameInput').value;
            document.getElementById('loginWrapper').style.display = 'none';//隐藏遮罩层显示聊天界面
            document.getElementById('messageInput').focus();//让消息输入框获得焦点
        });
        this.socket.on('error', function(err) {
            if (document.getElementById('loginWrapper').style.display == 'none') {
                document.getElementById('status').innerText = '连接失败:(';
            } else {
                document.getElementById('info').innerText = '连接失败:(';
            }
        });
        this.socket.on('system', function(nickName, users, userCount, type) {
            //判断用户是否连接还是离开以显示不同的信息
            var msg = nickName + (type == 'login' ? ' 在线' : ' 离线');
            that._displayNewMsg('系统消息', msg, 'red');
            document.getElementById('status').innerText = userCount + '名用户在线' + '\n' + users + '在线';
        });
        this.socket.on('newMsg', function(user, msg, color) {
            //发送信息
            that._displayNewMsg(user, msg, color);
        });
        this.socket.on('newImg', function(user, img, color) {
            //发送图片
            that._displayImage(user, img, color);
        });
        //登录事件
        document.getElementById('loginBtn').addEventListener('click', function() {
            var nickName = document.getElementById('nicknameInput').value;
            if (nickName.trim().length != 0) {
                that.socket.emit('login', nickName);
            } else {
                document.getElementById('nicknameInput').focus();
            };
        }, false);
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                };
            };
        }, false);
        //发送信息
        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                //获取颜色
                color = document.getElementById('colorStyle').value;
                nickName = document.getElementById('nicknameInput').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg(nickName, msg, color);
            };
        }, false);
        //清除事件
        document.getElementById('clearBtn').addEventListener('click', function() {
            document.getElementById('historyMsg').innerText = '';
        }, false);
        //发送图片
        document.getElementById('sendImage').addEventListener('change', function() {
            var nickName = document.getElementById('nicknameInput').value;
            //检查是否有文件被选择
            if (this.files.length != 0) {
                //获取文件并用FileReader进行读取
                var file = this.files[0],
                    reader = new FileReader(),
                    color = document.getElementById('colorStyle').value;
                if (!reader) {
                    that._displayNewMsg('system', '浏览器不支持FileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function(e) {
                    this.value = '';
                    if(!/image\/\w+/.test(file.type)){
                        that._displayNewMsg('system', '不支持上传文件类型', 'red');
                    }else{
                        that.socket.emit('img', e.target.result, color);//读取结果值
                        that._displayImage(nickName, e.target.result, color);
                    }
                };
                reader.readAsDataURL(file);//读取指定对象内容
            };
        }, false);
        //表情事件
        this._initialEmoji();
        //单击表情按钮显示表情窗口
        //再单击则取消
        document.getElementById('emoji').addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();//终止冒泡过程
        },false);
        //单机页面其他地方关闭表情窗口
        document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if (e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            };
        },false);
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            //获取被单击的表情
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            };
        }, false);
    },
    _initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();//
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    },
    _displayNewMsg: function(user, msg, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8),
            //将消息中的表情转换为图片
            msg = this._showEmoji(msg);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');
            };
        };
        return result;
    }
};
