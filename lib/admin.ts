import {createHmac,timingSafeEqual,randomBytes,scryptSync} from 'crypto';
import {cookies} from 'next/headers';
import {sql} from '@/db';

const COOKIE='doably_admin',MAX=604800;

function legacySig(v:string){return createHmac('sha256',process.env.ADMIN_PASSWORD||'').update(v).digest('hex')}
function passwordHash(password:string,salt:string){return scryptSync(password,salt,64).toString('hex')}
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+passwordHash(password,salt)}
export function verifyPassword(password:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const actual=passwordHash(password,salt);try{return timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(actual,'hex'))}catch{return false}}

export async function getStoredPasswordHash(){
  const rows=await sql`SELECT password_hash FROM admin_credentials WHERE id=1 LIMIT 1`;
  return rows[0]?.password_hash as string|undefined;
}

export async function setStoredPassword(password:string){
  const hash=hashPassword(password);
  await sql`INSERT INTO admin_credentials(id,password_hash) VALUES(1,${hash})
    ON CONFLICT(id) DO UPDATE SET password_hash=EXCLUDED.password_hash,updated_at=NOW()`;
}

export async function authenticateAdminPassword(password:string){
  const stored=await getStoredPasswordHash();
  if(stored) return verifyPassword(password,stored);
  return Boolean(process.env.ADMIN_PASSWORD && password===process.env.ADMIN_PASSWORD);
}

export function createAdminToken(){const v=String(Date.now());return v+'.'+legacySig(v)}
export function validAdminToken(token?:string){
  if(!token||!process.env.ADMIN_PASSWORD)return false;
  const [v,s]=token.split('.');if(!v||!s||Date.now()-Number(v)>MAX*1000)return false;
  const e=legacySig(v);try{return timingSafeEqual(Buffer.from(s),Buffer.from(e))}catch{return false}
}
export async function isAdmin(){
  const c=await cookies();
  const token=c.get(COOKIE)?.value;
  if(!token)return false;
  if(validAdminToken(token))return true;
  return false;
}
export const adminCookie={name:COOKIE,maxAge:MAX};
