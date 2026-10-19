import nodemailer, { type Transporter } from 'nodemailer';
import { ENV } from '../../config/env.js';

export interface SendEmailResult {
  success: boolean;
  delivered: boolean;
  isSandbox: boolean;
  message: string;
  previewUrl?: string | null;
  error?: string;
}

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
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        console.log(`[EmailService] Configurado transportador Gmail oficial con usuario ${ENV.SMTP.USER}`);
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
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
        console.log(`[EmailService] Configurado transportador SMTP (${ENV.SMTP.HOST}:${ENV.SMTP.PORT}) con usuario ${ENV.SMTP.USER}`);
      }
      this.isConfigured = true;
      this.isEthereal = false;

      // Verificación proactiva de credenciales SMTP
      this.transporter.verify((verifyErr) => {
        if (verifyErr) {
          console.error(`[EmailService] ❌ Verificación de credenciales SMTP falló: ${verifyErr.message}. Verifica usuario y Contraseña de Aplicación en Render.`);
          this.isConfigured = false;
        } else {
          console.log(`[EmailService] ✅ Conexión SMTP verificada exitosamente. Listo para entregar correos a bandejas reales.`);
        }
      });
    } else {
      // Modo Desarrollo / Fallback: Ethereal con timeout ágil o simulación por consola
      try {
        const testAccountPromise = nodemailer.createTestAccount();
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout creación cuenta Ethereal')), 2500)
        );
        const testAccount: any = await Promise.race([testAccountPromise, timeoutPromise]);
        if (testAccount) {
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
            connectionTimeout: 3000,
            greetingTimeout: 3000,
            socketTimeout: 4000,
          });
          this.isConfigured = false; // Ethereal es simulador, no entrega a bandejas reales
          this.isEthereal = true;
          console.log(`[EmailService] Configurado Ethereal Mail para pruebas dev (${testAccount.user})`);
        }
      } catch (err) {
        this.isConfigured = false;
        this.isEthereal = true;
        console.log('[EmailService] SMTP no configurado / Ethereal no disponible. Modo consola activado para códigos OTP.');
      }
    }
  }

  async enviarCodigoVerificacion(email: string, nombre: string, codigo: string): Promise<SendEmailResult> {
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
      try {
        await Promise.race([
          this.initPromise,
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch {
        // Ignorar demoras en la inicialización
      }
    }

    // Siempre imprimir en consola para evaluación docente y auditoría
    console.log('\n======================================================');
    console.log(`📧 [EMAIL OTP] Destinatario: ${email}`);
    console.log(`🔑 CÓDIGO DE ACTIVACIÓN: ${codigo}`);
    if (this.isEthereal || !this.isConfigured) {
      console.log(`ℹ️  [Modo Pruebas / Dev] El sistema está usando simulación local.`);
      console.log(`⚠️  Nota: Sin SMTP configurado, los correos NO se entregan a bandejas reales.`);
      if (ENV.AUTH?.OTP_MASTER_CODE) {
        console.log(`💡 Para activar la cuenta: ingresa el código ${codigo} o el bypass maestro ${ENV.AUTH.OTP_MASTER_CODE}.`);
      } else {
        console.log(`💡 Para activar la cuenta: ingresa el código ${codigo}.`);
      }
    }
    console.log('======================================================\n');

    if (!this.transporter) {
      return {
        success: true,
        delivered: false,
        isSandbox: true,
        message: 'Código generado en modo consola/dev.',
      };
    }

    try {
      const sender = `${ENV.SMTP.FROM_NAME || 'Complejo Deportivo UB'} <${ENV.SMTP.USER || ENV.SMTP.FROM_EMAIL || 'no-reply@complejoub.com'}>`;
      const sendPromise = this.transporter.sendMail({
        from: sender,
        to: email,
        subject: `Tu código de verificación UB: ${codigo}`,
        html: htmlContent,
      });

      const timeoutPromise = new Promise<{ timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ timedOut: true }), 12000)
      );

      const result: any = await Promise.race([sendPromise, timeoutPromise]);
      if (result && result.timedOut) {
        console.warn(`[EmailService] ⏱️ Timeout (12s) al conectar con SMTP para enviar a ${email}. Código registrado en consola.`);
        return {
          success: false,
          delivered: false,
          isSandbox: this.isEthereal,
          message: 'El servidor de correo tardó demasiado en responder.',
          error: 'TIMEOUT_SMTP',
        };
      }

      if (this.isEthereal && result) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        if (previewUrl) {
          console.log(`🔗 [Previsualización Ethereal Mail]: ${previewUrl}`);
        }
        return {
          success: true,
          delivered: false,
          isSandbox: true,
          message: 'Código despachado en entorno de pruebas Ethereal.',
          previewUrl: previewUrl || null,
        };
      } else {
        console.log(`✅ [EmailService] Correo aceptado y entregado exitosamente vía SMTP a ${email} (${result?.response || 'OK'})`);
        return {
          success: true,
          delivered: true,
          isSandbox: false,
          message: 'Correo entregado exitosamente a tu casilla de correo.',
        };
      }
    } catch (err: any) {
      console.error(`[EmailService] ❌ Error SMTP al enviar email a ${email}: ${err.message}`);
      return {
        success: false,
        delivered: false,
        isSandbox: this.isEthereal,
        message: `Error al enviar correo por SMTP: ${err.message}`,
        error: err.message,
      };
    }
  }
}

export const emailService = new EmailService();
