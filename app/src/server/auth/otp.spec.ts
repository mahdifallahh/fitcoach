import { OtpChannel, OtpPurpose } from '@prisma/client';
import { OtpService } from './otp';
import { BadRequestException, HttpException } from '../http/errors';
import { hashSecret } from '../utils/crypto';

function makeConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = { OTP_LENGTH: 6, OTP_TTL_SECONDS: 300, ...overrides };
  return { get: (k: string) => values[k] } as any;
}

describe('OtpService.verifyLoginCode', () => {
  let prisma: any;
  let service: OtpService;

  beforeEach(() => {
    prisma = {
      otpToken: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    service = new OtpService(prisma, makeConfig());
  });

  it('throws OTP_INVALID when no active token exists', async () => {
    prisma.otpToken.findFirst.mockResolvedValue(null);
    await expect(service.verifyLoginCode('+989120000000', '123456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('consumes the token on a correct code', async () => {
    prisma.otpToken.findFirst.mockResolvedValue({
      id: 't1',
      codeHash: hashSecret('123456'),
      attempts: 0,
    });
    await expect(service.verifyLoginCode('+989120000000', '123456')).resolves.toBeUndefined();
    expect(prisma.otpToken.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it('increments attempts and rejects on a wrong code', async () => {
    prisma.otpToken.findFirst.mockResolvedValue({
      id: 't1',
      codeHash: hashSecret('123456'),
      attempts: 1,
    });
    await expect(service.verifyLoginCode('+989120000000', '000000')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.otpToken.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('locks after too many attempts', async () => {
    prisma.otpToken.findFirst.mockResolvedValue({
      id: 't1',
      codeHash: hashSecret('123456'),
      attempts: 5,
    });
    await expect(service.verifyLoginCode('+989120000000', '123456')).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});

describe('OtpService.createLoginCode', () => {
  it('issues a 6-digit code and persists its hash', async () => {
    const prisma: any = {
      otpToken: {
        findFirst: jest.fn().mockResolvedValue(null), // no cooldown
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new OtpService(prisma, makeConfig());
    const code = await service.createLoginCode('+989120000000', OtpChannel.SMS);
    expect(code).toMatch(/^\d{6}$/);
    const createArg = prisma.otpToken.create.mock.calls[0][0].data;
    expect(createArg.codeHash).toBe(hashSecret(code));
    expect(createArg.purpose).toBe(OtpPurpose.LOGIN);
  });
});
