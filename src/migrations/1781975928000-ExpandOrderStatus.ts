import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandOrderStatus1781975928000 implements MigrationInterface {
  name = 'ExpandOrderStatus1781975928000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraint BEFORE remapping (new values aren't allowed by it).
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
    await queryRunner.query(`UPDATE "orders" SET "status" = 'paid' WHERE "status" = 'placed'`);
    await queryRunner.query(`UPDATE "orders" SET "status" = 'in_transit' WHERE "status" = 'dispatched'`);
    await queryRunner.query(`UPDATE "orders" SET "status" = 'completed' WHERE "status" = 'received'`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('paid','confirmed','preparing','shipped','in_transit','delivered','completed','cancelled','disputed'))`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'paid'`);

    // Milestone timestamps
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "in_transit_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "completed_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "delivered_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "in_transit_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shipped_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "confirmed_at"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('placed','preparing','dispatched','received','cancelled'))`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'placed'`);
  }
}
