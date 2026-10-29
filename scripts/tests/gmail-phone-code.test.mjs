import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { buildPhoneCodeMessage, createPhoneCodeMailer } from "../test-env/gmail-sender.mjs";

/** A tiny SMTP server that records what the client says. */
function fakeSmtp() {
  const log = { lines: [], data: "" };
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let inData = false;
    let pending = "";
    socket.write("220 fake ready\r\n");
    socket.on("data", (chunk) => {
      pending += chunk;
      let index;
      while ((index = pending.indexOf("\r\n")) !== -1) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 2);
        if (inData) {
          if (line === ".") { inData = false; socket.write("250 queued\r\n"); } else log.data += line + "\n";
          continue;
        }
        log.lines.push(line);
        if (line.startsWith("EHLO")) socket.write("250-fake\r\n250 AUTH LOGIN\r\n");
        else if (line === "AUTH LOGIN") socket.write("334 VXNlcm5hbWU6\r\n");
        else if (log.lines.at(-2) === "AUTH LOGIN") socket.write("334 UGFzc3dvcmQ6\r\n");
        else if (log.lines.at(-3) === "AUTH LOGIN") socket.write("235 ok\r\n");
        else if (line.startsWith("MAIL FROM") || line.startsWith("RCPT TO")) socket.write("250 ok\r\n");
        else if (line === "DATA") { inData = true; socket.write("354 go\r\n"); }
        else if (line === "QUIT") socket.end("221 bye\r\n");
      }
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, log, port: server.address().port })));
}

const decodeBody = (raw) => Buffer.from(raw.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString();

test("a demo phone code is emailed to the chosen inbox with the phone number in the subject", async () => {
  const { server, log, port } = await fakeSmtp();
  try {
    const mailer = createPhoneCodeMailer({ user: "owner@gmail.com", appPassword: "abcd efgh ijkl mnop", inbox: "tester@example.com", host: "127.0.0.1", port, mode: "plain" });
    await mailer.send({ phoneE164: "+970590007777", code: "482913", locale: "en", expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    assert.ok(log.lines.includes("RCPT TO:<tester@example.com>"));
    const subjectLine = log.data.split("\n").find((line) => line.startsWith("Subject: "));
    const subject = Buffer.from(subjectLine.match(/=\?UTF-8\?B\?(.*)\?=/)[1], "base64").toString();
    assert.match(subject, /\+970590007777/);
    const body = Buffer.from(log.data.split("\n\n").at(-1).replace(/\n/g, ""), "base64").toString();
    assert.match(body, /\r\n\r\n482913\r\n\r\n/);
  } finally { server.close(); }
});

test("the inbox defaults to the sender when none is given", async () => {
  const { server, log, port } = await fakeSmtp();
  try {
    const mailer = createPhoneCodeMailer({ user: "owner@gmail.com", appPassword: "abcdefghijklmnop", host: "127.0.0.1", port, mode: "plain" });
    await mailer.send({ phoneE164: "+970590007778", code: "111222", locale: "en" });
    assert.ok(log.lines.includes("RCPT TO:<owner@gmail.com>"));
  } finally { server.close(); }
});

test("the Arabic phone-code email says it replaces the text message", () => {
  const raw = buildPhoneCodeMessage({ from: "owner@gmail.com", to: "t@example.com", phone: "+970590007777", code: "123456", locale: "ar" });
  const text = decodeBody(raw);
  assert.match(text, /بديل تجريبي/);
  assert.match(text, /123456/);
});
