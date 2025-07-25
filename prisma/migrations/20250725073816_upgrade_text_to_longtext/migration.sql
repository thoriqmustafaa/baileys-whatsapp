-- AlterTable
ALTER TABLE `auth_data` MODIFY `value` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `chat_history` MODIFY `message` LONGTEXT NOT NULL,
    MODIFY `metadata` LONGTEXT NULL;
