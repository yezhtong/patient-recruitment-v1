// 短信服务抽象。生产接入商用短信时，实现同一接口替换即可。
export interface SmsProvider {
  /** 发送验证码，返回 provider 回执 */
  sendCode(phone: string, code: string): Promise<{ ok: boolean; message?: string }>;
}

class DevConsoleSmsProvider implements SmsProvider {
  async sendCode(phone: string, code: string) {
    console.info(`[dev-sms] to=${phone} code=${code}`);
    return { ok: true };
  }
}

let _provider: SmsProvider | null = null;
export function smsProvider(): SmsProvider {
  if (_provider) return _provider;
  _provider = new DevConsoleSmsProvider();
  return _provider;
}

/** 开发环境固定码：验证码永远是 123456。上线前替换为真实生成 + 发送。 */
export const DEV_FIXED_SMS_CODE = "123456";
