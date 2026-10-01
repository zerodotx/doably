import {NextRequest,NextResponse} from 'next/server';
import {authenticateAdminPassword,isAdmin,setStoredPassword} from '@/lib/admin';
import {ensureDatabase} from '@/db/setup';

export async function POST(r:NextRequest){
  if(!(await isAdmin())) return NextResponse.json({error:'Unauthorized'},{status:401});
  await ensureDatabase();
  const {currentPassword,newPassword}=await r.json();
  const current=String(currentPassword||'');
  const next=String(newPassword||'');
  if(next.length<12) return NextResponse.json({error:'New password must be at least 12 characters.'},{status:400});
  if(!current||!(await authenticateAdminPassword(current)))
    return NextResponse.json({error:'Current password is incorrect.'},{status:401});
  await setStoredPassword(next);
  return NextResponse.json({ok:true});
}
