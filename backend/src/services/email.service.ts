import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface MensagemEmail {
  para: string;
  assunto: string;
  texto: string;
}

let transporte: Transporter | null = null;

// Modo 2: SMTP configurado por variável de ambiente (SMTP_*).
function obterTransporte(): Transporter {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true", // true só para a porta 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporte;
}

// Modo 1: API HTTPS do Brevo. Sai pela porta 443, a mesma de qualquer site,
// então funciona mesmo quando a rede ou a hospedagem bloqueia as portas de
// e-mail (25, 465 e 587).
async function enviarPeloBrevo(mensagem: MensagemEmail): Promise<void> {
  const remetente = process.env.EMAIL_REMETENTE;
  if (!remetente) throw new Error("EMAIL_REMETENTE deve ser um remetente verificado no Brevo.");

  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "LIRA Tutoria", email: remetente },
      to: [{ email: mensagem.para }],
      subject: mensagem.assunto,
      textContent: mensagem.texto,
    }),
  });
  if (!resposta.ok) {
    // Não inclui o corpo nem a chave na mensagem de erro.
    throw new Error(`Brevo recusou o envio (HTTP ${resposta.status}).`);
  }
}

// Ordem: API do Brevo, depois SMTP, depois terminal (só fora de produção).
export async function enviarEmail(mensagem: MensagemEmail): Promise<void> {
  if (process.env.BREVO_API_KEY) {
    await enviarPeloBrevo(mensagem);
    return;
  }

  if (process.env.SMTP_HOST) {
    await obterTransporte().sendMail({
      from: process.env.EMAIL_REMETENTE ?? process.env.SMTP_USER,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
    });
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Nenhum serviço de e-mail configurado (BREVO_API_KEY ou SMTP_HOST).");
  }
  console.log(
    `\n[E-MAIL - modo desenvolvimento, nenhum serviço configurado]\nPara: ${mensagem.para}\nAssunto: ${mensagem.assunto}\n\n${mensagem.texto}\n`
  );
}
