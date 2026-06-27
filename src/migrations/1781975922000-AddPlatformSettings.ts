import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_SETTINGS: Record<string, string> = {
  'commission.platform': '8',
  'commission.vat': '15',
  'shipping.standard': '25',
  'shipping.express': '35',
  'fee.payment': '2.5',
  'fee.chargeback': '75',
  'platform.autoReleaseDays': '14',
  'platform.minPayoutSar': '75',
  'platform.disputeWindowDays': '14',
  'platform.shippingReminderDays': '3',
  'platform.otpExpirySec': '60',
  'flag.listingsPerHourCap': '200',
  'flag.featuredHome': '8',
  'flag.maintenanceMode': 'false',
  'flag.sellerRegistration': 'true',
};

export class AddPlatformSettings1781975922000 implements MigrationInterface {
  name = 'AddPlatformSettings1781975922000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "settings" (
      "key" character varying NOT NULL,
      "value" text NOT NULL,
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_settings" PRIMARY KEY ("key")
    )`);

    await queryRunner.query(`CREATE TABLE "announcement_banners" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "text" character varying NOT NULL,
      "placement" character varying,
      "status" character varying NOT NULL DEFAULT 'paused',
      "tone" character varying,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_announcement_banners" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `ALTER TABLE "announcement_banners" ADD CONSTRAINT "CHK_banner_status" CHECK ("status" IN ('live','scheduled','paused'))`,
    );

    await queryRunner.query(`CREATE TABLE "email_templates" (
      "key" character varying NOT NULL,
      "name" character varying NOT NULL,
      "subject" character varying NOT NULL,
      "html" text NOT NULL,
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_email_templates" PRIMARY KEY ("key")
    )`);

    // Seed default settings.
    const values = Object.entries(DEFAULT_SETTINGS)
      .map(([k, v]) => `('${k}', '${v}')`)
      .join(', ');
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value") VALUES ${values} ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_templates"`);
    await queryRunner.query(`DROP TABLE "announcement_banners"`);
    await queryRunner.query(`DROP TABLE "settings"`);
  }
}
