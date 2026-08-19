import { NextResponse, NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@starlinkee.com',
      to: 'vikbobinski@gmail.com',
      subject: 'Test z Vercela - omijanie logiki biznesowej',
      text: 'Test powiodl sie.',
    });

    return NextResponse.json({ success: true, messageId: info.messageId, host: process.env.SMTP_HOST });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, host: process.env.SMTP_HOST }, { status: 500 });
  }
}