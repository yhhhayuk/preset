// src/routes/api/preview.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/preview')({
  GET: async ({ request }) => {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Parameter url wajib diisi' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      )
    }

    try {
      const origin = new URL(request.url).origin

      // 1. Ambil data video dari endpoint TikTok yang sudah ada
      const headers: HeadersInit = {}
      if (process.env.BOT_KEY) headers['x-am-key'] = process.env.BOT_KEY

      const tiktokRes = await fetch(
        `${origin}/api/tiktok?url=${encodeURIComponent(url)}`,
        { headers },
      )
      const tiktokJson = await tiktokRes.json()

      if (!tiktokJson.ok) {
        return new Response(JSON.stringify(tiktokJson), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        })
      }

      const tiktok = tiktokJson.data

      // 2. Ambil oEmbed TikTok untuk embed HTML (opsional, tapi disarankan)
      let oembed: any = null
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        )
        if (oembedRes.ok) oembed = await oembedRes.json()
      } catch {
        // abaikan jika oEmbed gagal; preview tetap bisa pakai direct video
      }

      // 3. Gabungkan hasil
      const preview = {
        id: tiktok.id,
        title: tiktok.title,
        cover: tiktok.cover,
        duration: tiktok.duration,
        author: tiktok.author,
        stats: tiktok.stats,
        video: {
          sd: tiktok.video,   // sudah diproksi /api/media
          hd: tiktok.videoHd, // sudah diproksi /api/media
        },
        embedHtml: oembed?.html ?? null,
        embedUrl: oembed ? extractSrc(oembed.html) : null,
        width: oembed?.width ?? 325,
        height: oembed?.height ?? 578,
      }

      return new Response(JSON.stringify({ ok: true, data: preview }), {
        headers: {
          'content-type': 'application/json',
          // Ganti '*' dengan domain client app Anda agar lebih aman
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: String(err) }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }
  },
})

function extractSrc(html: string): string | null {
  const match = html.match(/src="([^"]+)"/)
  return match ? match[1] : null
}
