import {createHmac,timingSafeEqual} from 'crypto'; import {cookies} from 'next/headers';
const COOKIE='doably_admin',MAX=604800;
function sig(v:string){return createHmac('sha256',process.env.ADMIN_PASSWORD||'').update(v).digest('hex')}
export function createAdminToken(){const v=String(Date.now());return v+'.'+sig(v)}
export function validAdminToken(token?:string){if(!token||!process.env.ADMIN_PASSWORD)return false;const [v,s]=token.split('.');if(!v||!s||Date.now()-Number(v)>MAX*1000)return false;const e=sig(v);try{return timingSafeEqual(Buffer.from(s),Buffer.from(e))}catch{return false}}
export async function isAdmin(){const c=await cookies();return validAdminToken(c.get(COOKIE)?.value)}
export const adminCookie={name:COOKIE,maxAge:MAX};
