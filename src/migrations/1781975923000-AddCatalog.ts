import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalog1781975923000 implements MigrationInterface {
  name = 'AddCatalog1781975923000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "categories" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying NOT NULL,
      "sizes" text NOT NULL DEFAULT '[]',
      "position" integer NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_categories_name" UNIQUE ("name")
    )`);

    await queryRunner.query(`CREATE TABLE "subcategories" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "category_id" uuid NOT NULL,
      "name" character varying NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_subcategories" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_subcategories_category_id" ON "subcategories" ("category_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subcategories" ADD CONSTRAINT "FK_subcategories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`CREATE TABLE "brands" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "name" character varying NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_brands" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_brands_name" UNIQUE ("name")
    )`);

    // Multiple shipping options per listing: JSON array of { method, dispatchTime }.
    await queryRunner.query(
      `ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "shipping_options" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP COLUMN "shipping_options"`);
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(
      `ALTER TABLE "subcategories" DROP CONSTRAINT "FK_subcategories_category"`,
    );
    await queryRunner.query(`DROP TABLE "subcategories"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
