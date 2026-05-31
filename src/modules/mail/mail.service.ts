import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM ?? 'Velo <noreply@velo.app>';
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Redefinição de senha — Velo',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Redefinição de senha</h2>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta Velo.</p>
          <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${link}"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Redefinir senha
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">
            Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.
          </p>
          <p style="color:#6b7280;font-size:12px">
            Ou copie e cole este link no navegador:<br>${link}
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${JSON.stringify(error)}`);
    }
  }
}
