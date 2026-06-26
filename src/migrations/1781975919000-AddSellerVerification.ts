import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerVerification1781975919000 implements MigrationInterface {
  name = 'AddSellerVerification1781975919000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Email/UI language preference, drives transactional emails.
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" character varying NOT NULL DEFAULT 'en'`,
    );

    await queryRunner.query(`CREATE TABLE "seller_verifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "national_id_hash" character varying,
      "national_id_front_url" character varying,
      "national_id_back_url" character varying,
      "iban_encrypted" character varying,
      "iban_last4" character varying,
      "bank_name" character varying,
      "status" character varying NOT NULL DEFAULT 'in_review',
      "terms_accepted_at" TIMESTAMP,
      "submitted_at" TIMESTAMP,
      "reviewed_at" TIMESTAMP,
      "reviewed_by" uuid,
      "rejection_reason" character varying,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_seller_verifications" PRIMARY KEY ("id")
    )`);

    // One verification row per user.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_seller_verifications_user_id" ON "seller_verifications" ("user_id")`,
    );
    // National-ID-hash uniqueness = "this ID has not been used before".
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_seller_verifications_national_id_hash" ON "seller_verifications" ("national_id_hash") WHERE "national_id_hash" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_verifications" ADD CONSTRAINT "CHK_seller_verifications_status" CHECK ("status" IN ('in_review','pending','approved','rejected'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_verifications" ADD CONSTRAINT "FK_seller_verifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller_verifications" DROP CONSTRAINT "FK_seller_verifications_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_verifications" DROP CONSTRAINT "CHK_seller_verifications_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_seller_verifications_national_id_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_seller_verifications_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "seller_verifications"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locale"`);
  }
}
