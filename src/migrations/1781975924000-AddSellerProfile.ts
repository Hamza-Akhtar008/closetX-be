import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerProfile1781975924000 implements MigrationInterface {
  name = 'AddSellerProfile1781975924000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "seller_profiles" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "bio" character varying,
      "about" text,
      "mission" text,
      "city" character varying,
      "policies" text,
      "notifications" text,
      "vacation_mode" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_seller_profiles" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_seller_profiles_user_id" ON "seller_profiles" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" ADD CONSTRAINT "FK_seller_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller_profiles" DROP CONSTRAINT "FK_seller_profiles_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_seller_profiles_user_id"`);
    await queryRunner.query(`DROP TABLE "seller_profiles"`);
  }
}
