import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListings1781975920000 implements MigrationInterface {
  name = 'AddListings1781975920000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "listings" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "title" character varying NOT NULL,
      "description" text,
      "brand" character varying,
      "category" character varying,
      "subcategory" character varying,
      "condition" character varying,
      "size" character varying,
      "color" character varying,
      "price_usd" numeric NOT NULL DEFAULT 0,
      "shipping_option" character varying,
      "dispatch_time" character varying,
      "photo_keys" text,
      "status" character varying NOT NULL DEFAULT 'DRAFT',
      "published_at" TIMESTAMP,
      "reviewed_at" TIMESTAMP,
      "reviewed_by" uuid,
      "rejection_reason" character varying,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_listings" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_listings_user_id" ON "listings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_listings_status" ON "listings" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "CHK_listings_status" CHECK ("status" IN ('DRAFT','UNDER_REVIEW','ACTIVE','PAUSED','REJECTED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "FK_listings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listings" DROP CONSTRAINT "FK_listings_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listings" DROP CONSTRAINT "CHK_listings_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_listings_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_listings_user_id"`);
    await queryRunner.query(`DROP TABLE "listings"`);
  }
}
