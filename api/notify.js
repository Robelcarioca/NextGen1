// ================================================
// Vercel Serverless Function: /api/notify
// Handles order notifications via Telegram + Email
// ================================================
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, email, pkg, description } = req.body;
  if (!name || !phone || !email || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const results = { telegram: false, email: false };

  // ── TELEGRAM ──────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const msg = `🎨 *NEW ORDER — NEXT-GEN CREATIVE*\n\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `📧 *Email:* ${email}\n` +
        `📦 *Package:* ${pkg || 'Not specified'}\n` +
        `📝 *Description:* ${description}\n\n` +
        `🕐 *Time:* ${new Date().toLocaleString()}`;

      const tgRes = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: msg,
            parse_mode: 'Markdown',
          }),
        }
      );
      results.telegram = tgRes.ok;
    } catch (e) {
      console.error('Telegram error:', e.message);
    }
  }

  // ── EMAIL ─────────────────────────────────────
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Next-Gen Creative" <${process.env.EMAIL_USER}>`,
        to: 'nahifele96@gmail.com',
        subject: `🎨 New Order: ${pkg || 'Design Request'} from ${name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:580px;background:#111;color:#f0f0f0;border-radius:12px;overflow:hidden">
            <div style="background:#d4a843;padding:24px 32px">
              <h1 style="margin:0;color:#000;font-size:24px;letter-spacing:2px">NEXT-GEN CREATIVE</h1>
              <p style="margin:6px 0 0;color:rgba(0,0,0,.7);font-size:13px">New Order Received</p>
            </div>
            <div style="padding:32px">
              <table width="100%" style="border-collapse:collapse">
                <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase">CLIENT</td><td style="padding:10px 0;border-bottom:1px solid #222;font-weight:700;font-size:16px">${name}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase">PHONE</td><td style="padding:10px 0;border-bottom:1px solid #222">${phone}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase">EMAIL</td><td style="padding:10px 0;border-bottom:1px solid #222">${email}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #222;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase">PACKAGE</td><td style="padding:10px 0;border-bottom:1px solid #222;color:#d4a843;font-weight:700;font-size:18px">${pkg || 'Custom Request'}</td></tr>
                <tr><td colspan="2" style="padding:16px 0;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase">DESCRIPTION</td></tr>
                <tr><td colspan="2" style="padding:0 0 16px;line-height:1.7">${description}</td></tr>
              </table>
              <a href="https://wa.me/962465928?text=${encodeURIComponent(`Hi ${name}! I received your order. Let me get started!`)}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:10px">💬 Reply on WhatsApp</a>
              <a href="https://t.me/Next_Gen_nah" style="display:inline-block;background:#229ED9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">✈️ Telegram</a>
            </div>
          </div>
        `,
      });
      results.email = true;
    } catch (e) {
      console.error('Email error:', e.message);
    }
  }

  return res.status(200).json({ success: true, results });
};
