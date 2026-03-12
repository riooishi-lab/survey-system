import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to,
        subject: "【サーベイシステム】パスワードリセットのご案内",
        text: `
パスワードリセットのリクエストを受け付けました。

以下のURLをクリックして新しいパスワードを設定してください。
このURLの有効期限は1時間です。

${resetUrl}

このメールに心当たりがない場合は、無視してください。
パスワードは変更されません。
        `.trim(),
        html: `
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4f46e5;">パスワードリセットのご案内</h2>
  <p>パスワードリセットのリクエストを受け付けました。</p>
  <p>以下のボタンをクリックして新しいパスワードを設定してください。<br>
  このURLの<strong>有効期限は1時間</strong>です。</p>
  <p style="margin: 32px 0;">
    <a href="${resetUrl}"
       style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      パスワードを再設定する
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">
    このメールに心当たりがない場合は、無視してください。パスワードは変更されません。
  </p>
</body>
</html>
        `.trim(),
    });
}
