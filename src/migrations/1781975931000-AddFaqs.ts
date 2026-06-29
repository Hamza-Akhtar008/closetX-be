import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFaqs1781975931000 implements MigrationInterface {
  name = 'AddFaqs1781975931000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "faqs" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "category" character varying NOT NULL,
      "question" character varying NOT NULL,
      "answer" text NOT NULL,
      "status" character varying NOT NULL DEFAULT 'published',
      "position" integer NOT NULL DEFAULT 0,
      "helpful" integer NOT NULL DEFAULT 0,
      "views" integer NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_faqs" PRIMARY KEY ("id"),
      CONSTRAINT "CHK_faqs_status" CHECK ("status" IN ('published','draft'))
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "faqs"`);
  }
}
