'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const port=Number(option('--port','4175')),base='/'+String(option('--base','/')).replace(/^\/+|\/+$/g,'');
const prefix=base==='/'?'/':base+'/',root=__dirname;
if(!Number.isInteger(port)||port<1024||port>65535||base.includes('..'))throw Error('Invalid preview options');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400);res.end();return}
 if(prefix!=='/'&&pathname===base){res.writeHead(302,{Location:prefix});res.end();return}
 if(!pathname.startsWith(prefix)){res.writeHead(404);res.end('Not found');return}
 const relative=pathname.slice(prefix.length)||'index.html';
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||relative.split(/[\\/]/).some(segment=>segment.startsWith('.'))){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)})
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+prefix));
