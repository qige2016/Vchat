//服务器及页面部分
var express = require('express'),
    app = express(),
    users = [];//保存所有在线用户的昵称
    port = process.env.PORT || 3000;
    server = app.listen(port),
    io = require('socket.io').listen(server),

app.use('/', express.static(__dirname + '/static'));
var NeteaseMusic = require('simple-netease-cloud-music');

//socket部分
io.sockets.on('connection', function(socket) {
    //昵称设置
    socket.on('login', function(nickname) {
        if (users.indexOf(nickname) > -1) {
            socket.emit('nickExisted');
        } else {
            socket.nickname = nickname;
            users.push(nickname);
            socket.emit('loginSuccess');
            io.sockets.emit('system', nickname, users, users.length, 'login');//向所有连接到服务器的客户端发送用户信息
        };
    });
    //断开连接的事件
    socket.on('disconnect', function() {
        if (socket.nickname != null) {
            //将断开连接的用户从users中删除
            users.splice(users.indexOf(socket.nickname), 1);
            //通知除自己以为的所有人
            socket.broadcast.emit('system', socket.nickname, users, users.length, 'logout');
        }
    });
    //接收点播则发送所有人
    socket.on('play', function(musicName, arName, url, src, playIndex) {
        io.sockets.emit('newPlay', socket.nickname, musicName, arName, url, src, playIndex);
    });
    //接收新信息则广播其他人
    socket.on('postMsg', function(msg, color) {
        socket.broadcast.emit('newMsg', socket.nickname, msg, color);
    });
    //接收用户发来的图片则广播其他人
    socket.on('img', function(imgData, color) {
        //通过一个newImg事件分发到除自己外的每个用户
        socket.broadcast.emit('newImg', socket.nickname, imgData, color);
    });
    //接收弹幕则广播其他人
    socket.on('danmu', function(msg, color) {
        socket.broadcast.emit('newDanmu', socket.nickname, msg, color);
    });
    //接收搜索则后台开始搜索
    socket.on('search', function(keywords) {
        var nm = new NeteaseMusic();
        nm.search(keywords).then(data => {
            // io.sockets.emit('search', data);
            socket.to(socket.nickname).emit('search', data);//给指定的客户端发送消息
        }); 
    });
});



