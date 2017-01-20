var express=require('express');
var app=express();
var fs =require('fs');
var net=require('net');
var http=require('http').createServer(app);
var io=require('socket.io').listen(http);
var os=require('os');
//����Ĭ��IP�Ͷ˿ں�
var IPaddr='192.168.0.101'
var DataPort=3100;
var CmdPort=4100;
//������IP�Ͷ˿ں�
var newIPaddr=0;
var newDataPort=0;
var newCmdPort=0;
//��EventEmitter����������
var EventEmitter = require('events').EventEmitter;
var ee = new EventEmitter();
//nodeServer��Ҫ�ı���
var nodeServer = new net.Socket();
var client = new net.Socket();
var ExBuffer = require('./ExBuffer');
var len = 4027;
var offset=4;
var dataNum=0;
var exBuffer = new ExBuffer().uint32Head().littleEndian();
var sbuf = new Buffer(4);
var haha=0;
// �洢�ͻ��˵�WebSocket����ʵ��
var aSocket = null;
//����������������8888�˿ڣ�ʡ��127.0.0.1��
var server = http.listen(8888,function () {

  var host = server.address().address
  var port = server.address().port

  console.log("welcome to http://%s:%s", host, port)

});
ee.setMaxListeners(10);
app.use(express.static('public'));
app.get('/',function(req,res){

  res.sendfile(__dirname+'/index.html');
});

// ͬ�ͻ��˽�������
io.sockets.on('connection', function (socketIO) {
  aSocket=socketIO;
  // �����ã����ӳɹ�
  socketIO.emit("test","your websocket has connected");
  //��������ʹ�ã�����C������
  socketIO.on('fromWebClient', function (webClientData) {
    console.log(webClientData);
    var head=new Buffer([0xAA,0x01,0x11,0x11,0x11,0x11]);
    var cmdData=new Buffer(webClientData);
    var cmdControl=Buffer.concat([head,cmdData]);
    console.log(cmdControl);
    client.write(cmdControl);
  });
  socketIO.on('fromCmd',function(CmdData){
    if(newIPaddr!=CmdData.IPaddr){
      newIPaddr=CmdData.IPaddr;
    }else(
        console.log('newIPaddr is same')
    )
    if(newCmdPort!=parseFloat(CmdData.CmdPort)){
      newCmdPort=parseFloat(CmdData.CmdPort);
      connectCPort(newCmdPort,newIPaddr);
    }else(
        console.log('newCmdPort is same')
    )
    if(newDataPort!=parseFloat(CmdData.DataPort)){
      newDataPort=parseFloat(CmdData.DataPort);
      connectDPort(newDataPort,newIPaddr);
    }else(
        console.log('newDataPort is same')
    )
  })
});

// ��C��������������
nodeServer.on('data', function (data) {
  dataNum=data.readInt32LE(6);
  if(data.readUInt8(0)==170){
    sbuf.writeUInt32LE(len,0);//д�����
    exBuffer.put(sbuf);
    exBuffer.put(data);

  }
  else{
    exBuffer.put(data);
  }
  console.log('nodeServer'+data.length);
});
//��nodeServer�յ����������ݰ�ʱ
exBuffer.on('data', function(buffer) {
  console.log('>> nodeServer receive data.length:'+buffer.length);
  //console.log(buffer);
  //console.log(buffer.readInt32LE(826));
  haha++;
  console.log(haha);
  console.log('free mem : ' + Math.ceil(os.freemem()/(1024*1024)) + 'mb');
  var useData=byteArrayUntil.getUseJson(buffer,offset);
  console.log(useData.low);
  console.log(useData.high);
  //��ͻ��˷���json����
  //�ж�websocket�Ƿ��Ѿ�����
  if(aSocket!=null){
    aSocket.emit('pushToWebClient',useData);
    //�ͻ��˶Ͽ�����
    aSocket.on('disconnect', function () {
      console.log('DISCONNECTED FROM CLIENT');
    });

  }

});
// Ϊ�ͻ�����ӡ�close���¼�������
nodeServer.on('close', function() {
  console.log('nodeServer connection closed');
});
client.on('close',function(){
  console.log('client connection closed')
})

//���ӵ�C������DataPort�˿�
function connectDPort(DataPort,IPaddr){
  nodeServer.connect(DataPort, IPaddr, function() {
    console.log('CONNECTED TO:',IPaddr,DataPort);
    // �������Ӻ�������������������ݣ����������յ���Щ����
    var receive = new Buffer([0xAA,0x02,0xFE]);
    nodeServer.write(receive);
    nodeServer.write('your'+ DataPort +'socket has connected');
  });
  nodeServer.on('error',function(err){
    console.error(err);
    nodeServer.destroy();
  })
};

//���ӵ�C������CmdPort�˿�
function connectCPort(CmdPort,IPaddr){
  client.connect(CmdPort, IPaddr, function() {
    console.log('CONNECTED TO:',IPaddr,CmdPort);
  });
  client.on('error',function(err){
    console.error(err);
    client.destroy();
  })
}
//����һ����������,�ֱ𷵻�array����json
var byteArrayUntil=new function(){
  this.getUseData=function(data,offset){
    var arr=[];
    for(var i=0;i<dataNum;i++){
      arr.push(data.readInt32LE(826+i*offset));
    }
    return arr;
  }
  this.getUseJson=function(data,offset){
    var arr=[];
    var low=null;
    var high=null;
    for(var i=0;i<dataNum;i++){
      arr.push(data.readInt32LE(826+i*offset));
    }
    low=parseInt(data.readInt32LE(14)/1000);
    high=parseInt(data.readInt32LE(18)/1000);
    return {'hz':arr,
            'low':low,
            'high':high,
            'num':dataNum};
  }

}();