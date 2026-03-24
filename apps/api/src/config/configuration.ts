export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  infra: {
    dbMode: process.env.ASIST_DB_MODE ?? 'on',
    queueMode: process.env.ASIST_QUEUE_MODE ?? 'off',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
    host: process.env.DATABASE_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'asist',
    password: process.env.DATABASE_PASSWORD ?? 'asist',
    name: process.env.DATABASE_NAME ?? 'asist',
  },
  typeOrmSync: process.env.TYPEORM_SYNC === 'true',
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessTtlSec: parseInt(process.env.JWT_ACCESS_TTL_SEC ?? '900', 10),
    refreshTtlSec: parseInt(process.env.JWT_REFRESH_TTL_SEC ?? '604800', 10),
  },
  otp: {
    ttlSec: parseInt(process.env.OTP_TTL_SEC ?? '180', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
    exposeDebugCode: process.env.OTP_EXPOSE_DEBUG_CODE === 'true',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER ?? 'local',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      defaultPaymentMethod:
        process.env.STRIPE_TEST_DEFAULT_PAYMENT_METHOD ?? 'pm_card_visa',
    },
  },
});
