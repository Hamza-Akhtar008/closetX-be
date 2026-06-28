import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrders1781975927000 implements MigrationInterface {
  name = 'AddOrders1781975927000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Saved shipping addresses
    await queryRunner.query(`CREATE TABLE "addresses" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "label" character varying,
      "name" character varying NOT NULL,
      "phone" character varying NOT NULL,
      "street" character varying NOT NULL,
      "apartment" character varying,
      "region" character varying,
      "city" character varying NOT NULL,
      "postal_code" character varying,
      "lat" character varying,
      "lng" character varying,
      "notes" text,
      "is_default" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_addresses" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD CONSTRAINT "FK_addresses_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_addresses_user" ON "addresses" ("user_id")`);

    // Orders (one per seller)
    await queryRunner.query(`CREATE TABLE "orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "buyer_id" uuid NOT NULL,
      "seller_id" uuid NOT NULL,
      "status" character varying NOT NULL DEFAULT 'placed',
      "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
      "discount" numeric(12,2) NOT NULL DEFAULT 0,
      "shipping" numeric(12,2) NOT NULL DEFAULT 0,
      "vat" numeric(12,2) NOT NULL DEFAULT 0,
      "total" numeric(12,2) NOT NULL DEFAULT 0,
      "delivery_method" character varying NOT NULL DEFAULT 'standard',
      "payment_method" character varying,
      "address" text,
      "placed_at" TIMESTAMP NOT NULL DEFAULT now(),
      "preparing_at" TIMESTAMP,
      "dispatched_at" TIMESTAMP,
      "received_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('placed','preparing','dispatched','received','cancelled'))
    )`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_buyer" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_seller" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_orders_buyer" ON "orders" ("buyer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_seller" ON "orders" ("seller_id")`);

    // Order line items (snapshot of the listing at purchase time)
    await queryRunner.query(`CREATE TABLE "order_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "order_id" uuid NOT NULL,
      "listing_id" uuid,
      "title" character varying NOT NULL,
      "brand" character varying,
      "condition" character varying,
      "size" character varying,
      "price_sar" numeric(12,2) NOT NULL DEFAULT 0,
      "price_usd" numeric(12,2) NOT NULL DEFAULT 0,
      "cover_key" character varying,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_order_items_order" ON "order_items" ("order_id")`);

    // In-app notifications
    await queryRunner.query(`CREATE TABLE "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid NOT NULL,
      "type" character varying NOT NULL,
      "title" character varying NOT NULL,
      "body" text,
      "link" character varying,
      "read" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id")`);

    // Allow listings to be marked SOLD
    await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "CHK_listings_status"`);
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "CHK_listings_status" CHECK ("status" IN ('DRAFT','UNDER_REVIEW','ACTIVE','PAUSED','REJECTED','SOLD'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "CHK_listings_status"`);
    await queryRunner.query(
      `ALTER TABLE "listings" ADD CONSTRAINT "CHK_listings_status" CHECK ("status" IN ('DRAFT','UNDER_REVIEW','ACTIVE','PAUSED','REJECTED'))`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
  }
}
