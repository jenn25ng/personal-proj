import "server-only";
import nodemailer from "nodemailer";

export type MailResult = { delivered: "smtp" } | { delivered: "console"; link: string };

const SMTP_URL = process.env.SMTP_URL;
const MAIL_FROM = process.env.MAIL_FROM ?? "생각 먼저 AI <no-reply@localhost>";

/**
 * SMTP_URL이 있으면 실제로 보내고, 없으면 개발용으로 링크를 서버 콘솔에 출력한다.
 * 운영에서 SMTP_URL이 비어 있으면 메일이 아무 데도 가지 않으므로 시작 시 경고한다.
 */
if (!SMTP_URL && process.env.NODE_ENV === "production") {
  console.warn("[mail] SMTP_URL이 설정되지 않아 인증·재설정 메일이 콘솔에만 출력됩니다.");
}

const transport = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

export async function sendMail(to: string, subject: string, text: string, link: string): Promise<MailResult> {
  if (!transport) {
    console.log(`\n[mail → ${to}] ${subject}\n${text}\n링크: ${link}\n`);
    return { delivered: "console", link };
  }
  await transport.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html: text
      .split("\n")
      .map((line) => (line.trim() === link ? `<a href="${link}">${link}</a>` : escapeHtml(line)))
      .join("<br>"),
  });
  return { delivered: "smtp" };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function verifyEmailText(name: string, link: string) {
  return `${name} 님, 생각 먼저 AI에 가입해 주셔서 고마워요.
아래 링크를 열고 "인증 완료" 버튼을 누르면 이메일 인증이 끝나요. 링크는 24시간 동안만 유효해요.

${link}

본인이 가입한 게 아니라면 이 메일은 무시해도 돼요.`;
}

export function resetPasswordText(name: string, link: string) {
  return `${name} 님, 비밀번호 재설정을 요청하셨어요.
아래 링크에서 새 비밀번호를 정할 수 있어요. 링크는 1시간 동안만 유효해요.

${link}

요청한 적이 없다면 이 메일은 무시해도 돼요. 비밀번호는 바뀌지 않아요.`;
}
