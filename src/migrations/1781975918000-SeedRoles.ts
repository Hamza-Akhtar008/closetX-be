import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1781975918000 implements MigrationInterface {
  name = 'SeedRoles1781975918000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("id", "name") VALUES
        (1, 'admin'),
        (2, 'seller'),
        (3, 'buyer'),
        (4, 'seller+buyer')
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "roles" WHERE "id" IN (1, 2, 3, 4)`);
  }
}
