import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCart1781975926000 implements MigrationInterface {
  name = 'AddCart1781975926000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "cart_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "listing_id" uuid NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_cart_items" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cart_user_listing" ON "cart_items" ("user_id", "listing_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_cart_listing" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_listing"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_cart_user_listing"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
  }
}
