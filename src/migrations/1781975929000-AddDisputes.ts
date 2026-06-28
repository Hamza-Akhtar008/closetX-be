import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisputes1781975929000 implements MigrationInterface {
  name = 'AddDisputes1781975929000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "disputes" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "buyer_id" uuid NOT NULL,
      "seller_id" uuid NOT NULL,
      "reason" character varying NOT NULL,
      "detail" text,
      "status" character varying NOT NULL DEFAULT 'open',
      "photo_keys" text,
      "seller_response" text,
      "responded_at" TIMESTAMP,
      "escalated_at" TIMESTAMP,
      "resolution" text,
      "outcome" character varying,
      "resolved_by" character varying,
      "refund_amount" numeric(12,2),
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      "resolved_at" TIMESTAMP,
      CONSTRAINT "PK_disputes" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_disputes_reason" CHECK ("reason" IN ('not_received','not_as_described','wrong_item','arrived_damaged')),
      CONSTRAINT "CHK_disputes_status" CHECK ("status" IN ('open','escalated','resolved','rejected','cancelled'))
    )`);
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_disputes_buyer" ON "disputes" ("buyer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_disputes_order" ON "disputes" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_disputes_status" ON "disputes" ("status")`);

    // A resolved-in-buyer's-favour dispute moves the order to refunded.
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('paid','confirmed','preparing','shipped','in_transit','delivered','completed','cancelled','disputed','refunded'))`,
    );

    // Seller strike counter (escalating penalties).
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "strikes" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "strikes"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('paid','confirmed','preparing','shipped','in_transit','delivered','completed','cancelled','disputed'))`,
    );
    await queryRunner.query(`DROP TABLE "disputes"`);
  }
}
