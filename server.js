const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('Set ADMIN_PASSWORD (12+ chars) and SESSION_SECRET (32+ chars) in .env before starting.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before starting.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'6mb'}));
app.use(session({
 name:'zavren_admin', secret:SESSION_SECRET, resave:false, saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}
}));
const loginLimiter = rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:true,legacyHeaders:false});
const orderLimiter = rateLimit({windowMs:60*60*1000,limit:12,standardHeaders:true,legacyHeaders:false});
async function dbRequest(path, options={}) {
 const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...options,
  headers: {
   apikey: SUPABASE_SERVICE_ROLE_KEY,
   Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
   'Content-Type': 'application/json',
   ...(options.headers||{})
  }
 });
 const body = await response.text();
 if (!response.ok) throw new Error(`Database request failed (${response.status}): ${body.slice(0,300)}`);
 return body ? JSON.parse(body) : [];
}
async function readOrders(){return await dbRequest('orders?select=order_data&order=created_at.desc');}
async function readProducts(){return (await dbRequest('products?select=id,product_data&order=created_at.desc')).map(x=>x.product_data);}
function validProduct(p){return p && typeof p.name==='string' && p.name.trim().length>1 && p.name.length<=100 && Number.isInteger(Number(p.price)) && Number(p.price)>0 && Number(p.price)<=10000000 && typeof p.image==='string' && p.image.startsWith('https://') && Array.isArray(p.sizes) && p.sizes.length>0;}
function auth(req,res,next){if(req.session && req.session.admin===true)return next();return res.status(401).json({error:'Please sign in as store admin.'});}
function clean(v,max=500){return String(v||'').trim().slice(0,max);}

app.post('/api/orders',orderLimiter,async (req,res)=>{
 const c=req.body?.customer||{}, incoming=req.body?.items;
 const customer={name:clean(c.name,100),phone:clean(c.phone,25),email:clean(c.email,150),city:clean(c.city,80),address:clean(c.address,700),notes:clean(c.notes,500)};
 if(!customer.name||!customer.phone||!customer.city||!customer.address) return res.status(400).json({error:'Please complete all required delivery details.'});
 if(!Array.isArray(incoming)||incoming.length<1||incoming.length>20) return res.status(400).json({error:'Your shopping bag is empty or invalid.'});
 let currentProducts; try { currentProducts=await readProducts(); } catch(err) { return res.status(503).json({error:'Store catalogue is temporarily unavailable.'}); }
 const productMap=new Map(currentProducts.filter(p=>p.active!==false).map(p=>[p.name,p]));
 const items=[];
 for(const line of incoming){
  const name=clean(line.name,120), size=clean(line.size,5), qty=Number(line.qty);
  if(!productMap.has(name)||!productMap.get(name).sizes.includes(size)||!Number.isInteger(qty)||qty<1||qty>20)
   return res.status(400).json({error:'One of the products in your bag is invalid. Please refresh and try again.'});
  items.push({name,size,qty,price:Number(productMap.get(name).price)});
 }
 const total=items.reduce((sum,x)=>sum+x.price*x.qty,0);
 const order={id:'ZV-'+crypto.randomBytes(4).toString('hex').toUpperCase(),createdAt:new Date().toISOString(),customer,items,total,payment:'Cash on Delivery',status:'New'};
 try {
  await dbRequest('orders', {method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify({id:order.id,created_at:order.createdAt,order_data:order})});
  res.status(201).json({order:{id:order.id,total:order.total}});
 } catch(err) { console.error(err); res.status(503).json({error:'Order could not be saved right now. Please try again.'}); }
});
app.get('/api/products',async(req,res)=>{try{const products=await readProducts();res.json({products:products.filter(p=>p.active!==false)});}catch(err){console.error(err);res.status(503).json({error:'Could not load products.'});}});
app.get('/api/admin/products',auth,async(req,res)=>{try{res.json({products:await readProducts()});}catch(err){console.error(err);res.status(503).json({error:'Could not load products.'});}});
app.post('/api/admin/products',auth,async(req,res)=>{const p=req.body||{};if(!validProduct(p))return res.status(400).json({error:'Name, valid price, uploaded image and at least one size are required.'});try{const product={id:crypto.randomUUID(),name:p.name.trim(),price:Number(p.price),image:p.image,sizes:p.sizes.filter(x=>['S','M','L','XL','XXL'].includes(x)),description:clean(p.description,300),active:p.active!==false};if(!product.sizes.length)return res.status(400).json({error:'Select at least one valid size.'});await dbRequest('products',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:product.id,created_at:new Date().toISOString(),product_data:product})});res.status(201).json({product});}catch(err){console.error(err);res.status(503).json({error:'Could not save product.'});}});
app.put('/api/admin/products/:id',auth,async(req,res)=>{const p=req.body||{};if(!validProduct(p))return res.status(400).json({error:'Name, valid price, uploaded image and at least one size are required.'});try{const rows=await dbRequest(`products?id=eq.${encodeURIComponent(req.params.id)}&select=id`);if(!rows.length)return res.status(404).json({error:'Product not found.'});const product={id:req.params.id,name:p.name.trim(),price:Number(p.price),image:p.image,sizes:p.sizes.filter(x=>['S','M','L','XL','XXL'].includes(x)),description:clean(p.description,300),active:p.active!==false};await dbRequest(`products?id=eq.${encodeURIComponent(req.params.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({product_data:product})});res.json({product});}catch(err){console.error(err);res.status(503).json({error:'Could not update product.'});}});
app.delete('/api/admin/products/:id',auth,async(req,res)=>{try{await dbRequest(`products?id=eq.${encodeURIComponent(req.params.id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});res.json({ok:true});}catch(err){console.error(err);res.status(503).json({error:'Could not delete product.'});}});
app.post('/api/admin/upload',auth,async(req,res)=>{const {name,type,data}=req.body||{};if(!/^image\/(jpeg|png|webp)$/.test(type||'')||typeof data!=='string'||data.length>5_500_000)return res.status(400).json({error:'Upload a JPG, PNG or WEBP image under 4 MB.'});try{const ext=type.split('/')[1].replace('jpeg','jpg');const key=`${crypto.randomUUID()}.${ext}`;const bytes=Buffer.from(data,'base64');if(bytes.length>4*1024*1024)return res.status(400).json({error:'Image must be under 4 MB.'});const up=await fetch(`${SUPABASE_URL}/storage/v1/object/zavren-products/${key}`,{method:'POST',headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':type,'x-upsert':'false'},body:bytes});if(!up.ok)throw new Error((await up.text()).slice(0,250));res.json({url:`${SUPABASE_URL}/storage/v1/object/public/zavren-products/${key}`});}catch(err){console.error(err);res.status(503).json({error:'Image upload failed. Check Supabase storage setup.'});}});
app.post('/api/admin/login',loginLimiter,(req,res)=>{
 const user=clean(req.body?.username,100), pass=String(req.body?.password||'');
 const ok=user===ADMIN_USER && crypto.timingSafeEqual(Buffer.from(crypto.createHash('sha256').update(pass).digest()),Buffer.from(crypto.createHash('sha256').update(ADMIN_PASSWORD).digest()));
 if(!ok)return res.status(401).json({error:'Incorrect username or password.'});
 req.session.admin=true;res.json({ok:true});
});
app.post('/api/admin/logout',auth,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/orders',auth,async (req,res)=>{
 try { const rows=await readOrders(); res.json({orders:rows.map(x=>x.order_data)}); }
 catch(err) { console.error(err); res.status(503).json({error:'Could not load orders from database.'}); }
});
app.patch('/api/admin/orders/:id',auth,async (req,res)=>{
 const allowed=['New','Confirmed','Dispatched','Delivered','Cancelled'];
 const status=clean(req.body?.status,20);if(!allowed.includes(status))return res.status(400).json({error:'Invalid order status.'});
 try {
  const found=await dbRequest(`orders?id=eq.${encodeURIComponent(req.params.id)}&select=order_data`);
  if(!found.length)return res.status(404).json({error:'Order not found.'});
  const order=found[0].order_data; order.status=status; order.updatedAt=new Date().toISOString();
  await dbRequest(`orders?id=eq.${encodeURIComponent(req.params.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_data:order})});
  res.json({order});
 } catch(err) { console.error(err); res.status(503).json({error:'Could not update order status.'}); }
});
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.listen(PORT,()=>console.log(`ZAVREN store running on port ${PORT}`));
