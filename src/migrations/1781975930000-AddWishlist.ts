import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlist1781975930000 implements MigrationInterface {
  name = 'AddWishlist1781975930000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "wishlist_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "listing_id" uuid NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_wishlist_items" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_wishlist_user_listing" ON "wishlist_items" ("user_id", "listing_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_wishlist_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_wishlist_listing" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_listing"`);
    await queryRunner.query(`ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_wishlist_user_listing"`);
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
  }
}
