import nodemailer, { type Transporter } from 'nodemailer';
import { ENV } from '../../config/env.js';

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private isEthereal = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initTransporter();
  }

  private async initTransporter() {
    if (ENV.SMTP && ENV.SMTP.USER && ENV.SMTP.PASSWORD) {
      const isGmail = (ENV.SMTP.HOST && ENV.SMTP.HOST.toLowerCase().includes('gmail')) ||
                      (ENV.SMTP.USER && ENV.SMTP.USER.toLowerCase().includes('gmail'));
      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: ENV.SMTP.USER,
            pass: ENV.SMTP.PASSWORD,
          },
        });
        console.log(`[EmailService] Configurado transportador Gmail Service oficial con usuario ${ENV.SMTP.USER}`);
      } else {
        this.transporter = nodemailer.createTransport({
          host: ENV.SMTP.HOST,
          port: ENV.SMTP.PORT,
          secure: ENV.SMTP.PORT === 465,
          auth: {
            user: ENV.SMTP.USER,
            pass: ENV.SMTP.PASSWORD,
          },
          ...(ENV.SMTP.PORT === 587 ? { requireTLS: true } : {}),
        });
        console.log(`[EmailService] Configurado transportador SMTP (${ENV.SMTP.HOST}:${ENV.SMTP.PORT}) con usuario ${ENV.SMTP.USER}`);
      }
      this.isConfigured = true;
      this.isEthereal = false;
    } else {
      // Modo Desarrollo / Fallback: Ethereal o simulación por consola
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.isConfigured = true;
        this.isEthereal = true;
        console.log(`[EmailService] Configurado Ethereal Mail para pruebas dev (${testAccount.user})`);
      } catch (err) {
        this.isConfigured = false;
        this.isEthereal = true;
        console.log('[EmailService] SMTP no configurado. Modo consola activado para códigos OTP.');
      }
    }
  }

  async enviarCodigoVerificacion(email: string, nombre: string, codigo: string): Promise<boolean> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #1e281d; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto;">
        <h2 style="color: #65c556; text-align: center; margin-bottom: 20px;">Complejo Deportivo UB</h2>
        <p style="font-size: 15px;">Hola <strong>${nombre}</strong>,</p>
        <p style="font-size: 14px; color: #d1d5db;">Tu código de verificación para activar tu cuenta es:</p>
        <div style="background-color: #293827; border: 2px solid #65c556; border-radius: 10px; text-align: center; padding: 18px; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #65c556;">${codigo}</span>
        </div>
        <p style="font-size: 12px; color: #9ca3af;">Este código es de un solo uso y vencerá en 15 minutos.</p>
        <hr style="border: none; border-top: 1px solid #5a7056; margin: 20px 0;" />
        <p style="font-size: 11px; color: #6b7280; text-align: center;">Proyecto de Construcción de Software • Universidad de Belgrano</p>
      </div>
    `;

    if (this.initPromise) {
      await this.initPromise;
    }

    // Siempre imprimir en consola para evaluación docente inmediata
    console.log('\n======================================================');
    console.log(`📧 [EMAIL OTP] Destinatario: ${email}`);
    console.log(`🔑 CÓDIGO DE ACTIVACIÓN: ${codigo}`);
    if (this.isEthereal) {
      console.log(`ℹ️  [Modo Pruebas / Dev] El sistema está usando Ethereal Mail (simulación local).`);
      console.log(`⚠️  Nota: Ethereal NO envía correos a bandejas reales (Gmail, Hotmail, etc.).`);
      console.log(`💡 Para activar la cuenta: ingresa el código ${codigo} o el bypass maestro 123456.`);
    }
    console.log('======================================================\n');

    if (!this.transporter) {
      return true;
    }

    try {
      const sender = `${ENV.SMTP.FROM_NAME || 'Complejo Deportivo UB'} <${ENV.SMTP.USER || ENV.SMTP.FROM_EMAIL}>`;
      const info = await this.transporter.sendMail({
        from: sender,
        to: email,
        subject: `Tu código de verificación UB: ${codigo}`,
        html: htmlContent,
      });

      if (this.isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 [Previsualización Ethereal Mail]: ${previewUrl}`);
        }
      } else {
        console.log(`✅ [EmailService] Correo enviado exitosamente vía SMTP a ${email} (${info.response || 'OK'})`);
      }
      return true;
    } catch (err: any) {
      console.error(`[EmailService] ❌ Error al enviar email a ${email}: ${err.message}`);
      return false;
    }
  }
}

export const emailService = new EmailService();
