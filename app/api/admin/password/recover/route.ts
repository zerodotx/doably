import {NextRequest,NextResponse} from 'next/server';
import {setStoredPassword} from '@/lib/admin';
import {ensureDatabase} from '@/db/setup';

export async function POST(r:NextRequest){
  await ensureDatabase();
  const {recoveryPassword,newPassword}=await r.json();
  const recovery=String(recoveryPassword||'');
  const next=String(newPassword||'');
  if(!process.env.ADMIN_PASSWORD||recovery!==process.env.ADMIN_PASSWORD)
    return NextResponse.json({error:'Recovery password is incorrect.'},{status:401});
  if(next.length<12)
    return NextResponse.json({error:'New password must be at least 12 characters.'},{status:400});
  await setStoredPassword(next);
  return NextResponse.json({ok:true});
}
