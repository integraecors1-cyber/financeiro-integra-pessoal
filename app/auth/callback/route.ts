import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

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

  // Magic link (OTP) — token_hash + type=email
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (!error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }

  // OAuth code exchange (compatibilidade com fluxo anterior)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
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
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
