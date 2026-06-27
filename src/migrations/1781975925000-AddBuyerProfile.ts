import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyerProfile1781975925000 implements MigrationInterface {
  name = 'AddBuyerProfile1781975925000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "buyer_profiles" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "username" character varying,
      "bio" text,
      "city" character varying,
      "style_preferences" text,
      "billing_address" text,
      "notifications" text,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_buyer_profiles" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_buyer_profiles_user_id" ON "buyer_profiles" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyer_profiles" ADD CONSTRAINT "FK_buyer_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "buyer_profiles" DROP CONSTRAINT "FK_buyer_profiles_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_buyer_profiles_user_id"`);
    await queryRunner.query(`DROP TABLE "buyer_profiles"`);
  }
}
