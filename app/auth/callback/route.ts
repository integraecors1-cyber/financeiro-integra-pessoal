import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Return a script to inform the parent window and close the popup
      return new NextResponse(
        `<html>
           <body>
             <script>
               if (window.opener) {
                 window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                 window.close();
               } else {
                 window.location.href = '${origin}';
               }
             </script>
             <p>Autenticação bem-sucedida. Esta janela fechará automaticamente.</p>
           </body>
         </html>`,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }
  }

  // Handle case where code is missing or exchange failed
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
