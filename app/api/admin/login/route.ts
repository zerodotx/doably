import {NextRequest,NextResponse} from 'next/server';
import {adminCookie,authenticateAdminPassword,createAdminToken,getStoredPasswordHash,setStoredPassword} from '@/lib/admin';
import {ensureDatabase} from '@/db/setup';

export async function POST(r:NextRequest){
  await ensureDatabase();
  const {password}=await r.json();
  if(!password||!(await authenticateAdminPassword(String(password))))
    return NextResponse.json({error:'Invalid password'},{status:401});

  if(!(await getStoredPasswordHash())) await setStoredPassword(String(password));

  const out=NextResponse.json({ok:true});
  out.cookies.set(adminCookie.name,await createAdminToken(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:adminCookie.maxAge});
  return out;
}
