const cp =  require('child_process');

const DefaultCirrusServerWorkspace=String.raw`D:\Project\Git\PixelStreamingInfrastructure_UE5.4\SignallingWebServer`;
const DefaultCirrusServerNode = String.raw`platform_scripts\cmd\node\node.exe`;
//const DefaultClient = String.raw`D:\UnrealEngine\LocalBuilds\Museum\WindowsClient\JZWClient.exe`
const DefaultClient = String.raw`D:\UnrealEngine\LocalBuilds\Museum\WindowsClient\JiuZhou_World\Binaries\Win64\JZWClient.exe`
const DefaultConfig = {
    WebPort : 900,
    StreamServerPort:8900
};

function init()
{
    
}

function createCirrusServer(httpport=900,streamport=8900){
	let opts = { cwd: DefaultCirrusServerWorkspace };
	let program = DefaultCirrusServerNode;
	let args = [
        'cirrus', 
        `--HttpPort`,`${httpport}`, 
        `--StreamerPort` ,`${streamport}`,
        '--UseMatchmaker',`true`
    ];
	let child = cp.execFile(program, args,opts);

    
	// 监听标准输出数据
	child.stdout.on('data', (data) => {
		console.log(`Server[${httpport},${streamport}]: ${data}`);
	});
  
  	// 监听标准错误输出数据
  	child.stderr.on('data', (data) => {
		console.error(`Server[${httpport},${streamport}] Error: ${data}`);
	});
  
  // 监听子进程关闭事件
  child.on('close', (code) => {
	console.log(`Server[${httpport},${streamport}] Quit,Code:${code}`);
  });
  

  return child;
}

function createClient(psport=8900)
{
	let program = DefaultClient;
	let args = [
		'127.0.0.1:7777', 
		`-PixelStreamingURL=ws://127.0.0.1:${psport}`, 
		'-AudioMixer',
		`-windowed -ResX=1280 -ResY=720`
        //,`-log`
	];

	let child = cp.spawn(program, args);

    
    // 监听标准输出数据
    // 这里可能是因为版本为Development的关系，如果使用spawn且不监听输出信息，会卡在启动界面
    // 应该是卡在Client向PS服务器推流逻辑前后
    
	child.stdout.on('data', (data) => {
		//console.log(`Client[${psport}]: ${data}`);
	});
  
  	// 监听标准错误输出数据
  	child.stderr.on('data', (data) => {
		console.error(`Client[${psport}] Error: ${data}`);
	});
  
  // 监听子进程关闭事件
  child.on('close', (code) => {
	console.log(`Client[${psport}] Quit,Code:${code}`);
  });

    return child;
}


class StreamerServer
{
    constructor(config=undefined)
    {
        this._Server=undefined;
        this._Client=undefined;
    }

    CreateServer(httpport=900,streamport=8900)
    {
        this._Server = createCirrusServer(httpport,streamport)
    }

    CreateClient(psport=8900)
    {
        this._Client = createClient(psport)
    }

    Dispose()
    {
        this._Client.kill();
        this._Server.kill();
    }
}

class StreamerServerManager
{
    constructor(config=undefined)
    {
        this.ServerList=new Map();
        this.ServerPool = [];
    }

    RequestNewServer()
    {
        let index = this.ServerList.size;
        if(this.ServerPool.length>0)
        {
            index = this.ServerPool.pop();
        }
        let s = new StreamerServer();

        let wport = DefaultConfig.WebPort+index;
        let ssport = DefaultConfig.StreamServerPort+index;
        s.CreateServer(wport,ssport);
        s.CreateClient(ssport);

        this.ServerList.set(wport,s);
    }

    DisposeServer(wport){
        if(this.ServerList.has(wport))
        {
            console.log(`Server[${wport}] Dispose.`);
            let index = wport-DefaultConfig.WebPort;
            this.ServerPool.push(index);
            this.ServerList.get(wport).Dispose();
            this.ServerList.delete(wport);
        }else
        {
            console.warn(`Server[${wport}] not found!`);
        }
    }
}

const Manager = new StreamerServerManager(); 
module.exports = { Manager};
