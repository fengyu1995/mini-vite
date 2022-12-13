//koa
const Koa = require('koa')
//创建实例
const app = new Koa()
const fs = require('fs')
const path = require('path')
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

//中间件配置

app.use(async ctx =>{
    const { url,query } = ctx.request
    //首页请求
    if(url==='/'){
        //加载index.html  
        ctx.type = 'text/html'
        ctx.body = fs.readFileSync(path.join(__dirname,'./index.html'),'utf8')
    } else if (url.endsWith('.js')){
        //js 文件的加载处理
        const p = path.join(__dirname,url)
        ctx.type = 'application/javascript'
        ctx.body = rewriteImport(fs.readFileSync(p,'utf8'))
    } else if (url.startsWith('/@modules/')){
        //裸模块名称
        const moduleName = url.replace('/@modules/', '')
        //去node_modules目录中找
        const prefix = path.join(__dirname,'./node_modules',moduleName)
        //package.json 中获取module字段
        const module = require(prefix + '/package.json').module
        const filePath = path.join(prefix,module)
        const ret = fs.readFileSync(filePath,'utf8')
        ctx.type = 'application/javascript'
        ctx.body = rewriteImport(ret)
    } else if(url.indexOf('.vue') > -1){
        //获取加载文件的路径
        const p = path.join(__dirname,url.split('?')[0])
        const ret = compilerSFC.parse(fs.readFileSync(p,'utf8'))
        if(!query.type) {
           //SFC请求
           //读取vue文件,解析为js
           //获取脚本内容
           const scriptContent = ret.descriptor.script.content
           //替换默认导出为一个常量,方便后续修改
           const script = scriptContent.replace('export default','const __script = ')
           ctx.type = 'application/javascript'
           ctx.body = `
           ${rewriteImport(script)}
           //解析tpl
           import { render as __render} from '${url}?type=template'
           import '${url}?type=styles'
           __script.render = __render
           export default __script
           `
       }else if(query.type === 'template'){
            const tpl = ret.descriptor.template.content
            //编译为render函数
            const render = compilerDOM.compile(tpl,{mode: 'module'}).code
            ctx.type = 'application/javascript'
            ctx.body = rewriteImport(render)
       }else if(query.type === 'styles') {
          const styles = ret.descriptor.styles
          let scss = styles.reduce((prev,val)=> {
            return prev+val.content
          },'')
          let css = await scssLoad(scss)
          ctx.type = 'application/javascript',
          ctx.body = `
          const style = document.createElement('style')
          style.setAttribute('type', 'text/css')
          style.innerHTML = \`${css}\`
          document.head.appendChild(style)
        `
       }
    }
})

//裸模块地址重写
//import xx from 'vue'
//import xx from '@/modules/vue'
function rewriteImport(content) {
   return content.replace(/ from ['"](.*)['"]/g,function(s1,s2){
        if(s2.startsWith('/') || s2.startsWith('./') || s2.startsWith('../')){
            return s1
        }else {
            //裸模块
            return ` from '/@modules/${s2}'`
        }
    })
}
async function scssLoad(scss) {
   const result = await require('sass').compileStringAsync(scss)
   return result.css
}
app.listen(8090,()=>{
    console.log('Server run at http://localhost:8090');
})