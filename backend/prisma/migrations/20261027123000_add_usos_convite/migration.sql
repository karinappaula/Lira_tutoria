-- AlterTable
ALTER TABLE `CONVITE` ADD COLUMN `usos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `usos_maximos` INTEGER NOT NULL DEFAULT 1;

-- DomainChecks
ALTER TABLE `CONVITE`
    ADD CONSTRAINT `CONVITE_usos_chk` CHECK (`usos` >= 0),
    ADD CONSTRAINT `CONVITE_usos_maximos_chk` CHECK (`usos_maximos` >= 1);
