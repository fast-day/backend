/*
  Warnings:

  - The primary key for the `themes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `company_id` on the `themes` table. All the data in the column will be lost.
  - The `id` column on the `themes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[settings_id]` on the table `themes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `settings_id` to the `themes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "THEME_MODE" AS ENUM ('light', 'dark');

-- DropForeignKey
ALTER TABLE "themes" DROP CONSTRAINT "themes_company_id_fkey";

-- DropIndex
DROP INDEX "themes_company_id_key";

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "theme_preset_id" INTEGER;

-- AlterTable
ALTER TABLE "themes" DROP CONSTRAINT "themes_pkey",
DROP COLUMN "company_id",
ADD COLUMN     "settings_id" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "themes_preset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "background_color" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT NOT NULL,
    "on_surface" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "mode" "THEME_MODE" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_preset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_preset_name_key" ON "themes_preset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "themes_settings_id_key" ON "themes"("settings_id");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_theme_preset_id_fkey" FOREIGN KEY ("theme_preset_id") REFERENCES "themes_preset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
