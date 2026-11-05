import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
const originalFetch=globalThis.fetch
const originalStorage=globalThis.localStorage
afterEach(()=>{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage})
const ok=data=>({ok:true,status:200,json:async()=>data})
let number=0
const fresh=()=>import(`../src/composables/useAuth.js?case=${++number}`)

test('private fetches share a refresh request and keep tokens out of local storage',async()=>{
 const module=await fresh()
 let refreshes=0
 const requests=[]
 globalThis.localStorage={setItem(){throw new Error('Tokens must not be saved')}}
 globalThis.fetch=async(path,options)=>{
  if(path==='/api/auth/refresh'){refreshes++;return ok({access_token:'private-token',user:{id:'alice'}})}
  requests.push(options.headers.get('Authorization'))
  return ok({items:[]})
 }
 await Promise.all([module.authorizedFetch('/one'),module.authorizedFetch('/two')])
 assert.equal(refreshes,1)
 assert.deepEqual(requests,['Bearer private-token','Bearer private-token'])
 assert.equal(module.auth.user.id,'alice')
})

test('expired access tokens retry once with a refreshed bearer',async()=>{
 const module=await fresh()
 const headers=[]
 globalThis.fetch=async(path,options)=>{
  if(path==='/api/auth/login')return ok({access_token:'old',user:{id:'alice'}})
  if(path==='/api/auth/refresh')return ok({access_token:'new',user:{id:'alice'}})
  headers.push(options.headers.get('Authorization'))
  return headers.length===1?{ok:false,status:401}:ok({})
 }
 await module.login('alice@example.com','password')
 assert.equal((await module.authorizedFetch('/private')).status,200)
 assert.deepEqual(headers,['Bearer old','Bearer new'])
})

test('logout clears user state and the current user’s upload resume metadata',async()=>{
 const module=await fresh()
 const removed=[]
 globalThis.localStorage={removeItem:key=>removed.push(key)}
 globalThis.fetch=async(path)=>path.endsWith('/login')?ok({access_token:'token',user:{id:'alice'}}):ok(null)
 await module.login('alice@example.com','password')
 await module.logout()
 assert.equal(module.auth.user,null)
 assert.ok(removed.includes('corpus-upload-v1:alice'))
})
