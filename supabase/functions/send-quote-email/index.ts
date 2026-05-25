import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { to, subject, items, total, prospectName, sellerName, pdfBase64, filename } =
      await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: to, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build HTML body
    const rowsHtml = (items ?? [])
      .map(
        (i: { name: string; qty: number; price: number }) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ede8">${i.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ede8;text-align:center">${i.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ede8;text-align:right">$${Number(i.price * i.qty).toLocaleString('es-MX')}</td>
          </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:#185FA5;padding:24px 32px;display:flex;align-items:center">
      <div style="width:40px;height:40px;background:rgba(255,255,255,.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;margin-right:12px">
        <span style="color:#fff;font-size:22px;font-weight:700;line-height:1">K</span>
      </div>
      <div>
        <div style="color:#fff;font-size:15px;font-weight:700">KIUVO CRM</div>
        <div style="color:rgba(255,255,255,.7);font-size:12px">Cotización</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="margin:0 0 8px;font-size:15px;color:#1c1b19">
        ${prospectName ? `Estimado(a) <strong>${prospectName}</strong>,` : 'Estimado(a) cliente,'}
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#888780;line-height:1.6">
        Adjunto encontrarás tu cotización${sellerName ? ` preparada por <strong style="color:#1c1b19">${sellerName}</strong>` : ''}.
        ${pdfBase64 ? 'El PDF está adjunto a este correo.' : ''}
      </p>

      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#185FA5">
            <th style="padding:10px 12px;text-align:left;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;border-radius:4px 0 0 4px">PRODUCTO</th>
            <th style="padding:10px 12px;text-align:center;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px">CANT.</th>
            <th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;border-radius:0 4px 4px 0">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <!-- Total -->
      <div style="display:flex;justify-content:flex-end;align-items:center;padding:12px 0;border-top:1px solid #f0ede8">
        <span style="font-size:13px;color:#888780;margin-right:16px">TOTAL</span>
        <span style="font-size:22px;font-weight:700;color:#185FA5">$${Number(total).toLocaleString('es-MX')}</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f4f2ee;border-top:1px solid #e8e5e0">
      <p style="margin:0;font-size:11px;color:#888780;text-align:center">
        Generado automáticamente por KIUVO CRM
      </p>
    </div>
  </div>
</body>
</html>`

    const emailPayload: Record<string, unknown> = {
      from: 'KIUVO CRM <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }

    if (pdfBase64 && filename) {
      emailPayload.attachments = [{ filename, content: pdfBase64 }]
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.message ?? `Resend error ${res.status}`)
    }

    return new Response(
      JSON.stringify({ id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
