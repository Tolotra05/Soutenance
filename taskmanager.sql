-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: taskmanager
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attachment`
--

DROP TABLE IF EXISTS `attachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(120) NOT NULL,
  `url` varchar(500) NOT NULL,
  `uploaded_at` datetime NOT NULL,
  `attachment_type` varchar(30) DEFAULT NULL,
  `validation_status` varchar(20) DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `public_id` varchar(36) NOT NULL,
  `project_id` int DEFAULT NULL,
  `subtask_id` int DEFAULT NULL,
  `uploaded_by_id` int NOT NULL,
  `validated_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_795FD9BBB5B48B91` (`public_id`),
  KEY `IDX_795FD9BB166D1F9C` (`project_id`),
  KEY `IDX_795FD9BBC6D4A949` (`subtask_id`),
  KEY `IDX_795FD9BBA2B28FE8` (`uploaded_by_id`),
  KEY `IDX_795FD9BBC69DE5E5` (`validated_by_id`),
  CONSTRAINT `FK_795FD9BB166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_795FD9BBA2B28FE8` FOREIGN KEY (`uploaded_by_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_795FD9BBC69DE5E5` FOREIGN KEY (`validated_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_795FD9BBC6D4A949` FOREIGN KEY (`subtask_id`) REFERENCES `subtask` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachment`
--

LOCK TABLES `attachment` WRITE;
/*!40000 ALTER TABLE `attachment` DISABLE KEYS */;
/*!40000 ALTER TABLE `attachment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendar_event`
--

DROP TABLE IF EXISTS `calendar_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_event` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `created_by_id` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `type` varchar(30) NOT NULL,
  `description` longtext,
  `created_at` datetime NOT NULL,
  `public_id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_calendar_event_public_id` (`public_id`),
  KEY `IDX_9EDA0BB5166D1F9C` (`project_id`),
  KEY `IDX_9EDA0BB5B03A8386` (`created_by_id`),
  CONSTRAINT `FK_9EDA0BB5166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_9EDA0BB5B03A8386` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_event`
--

LOCK TABLES `calendar_event` WRITE;
/*!40000 ALTER TABLE `calendar_event` DISABLE KEYS */;
INSERT INTO `calendar_event` VALUES (1,1,1,'Rendez-vous client — rapport de cadrage','2026-09-23 19:29:00','rendez_vous','','2026-09-22 19:29:25','50a2d087-5c56-4f1c-a476-0b291e28ff30'),(2,2,NULL,'Début du cadrage','2026-06-01 00:00:00','cadrage',NULL,'2026-06-01 00:00:00','70a4bb72-3e33-427d-b93f-7efdcf2da664'),(3,2,NULL,'Rendez-vous client — rapport de cadrage','2026-06-10 00:00:00','rendez_vous','Présentation du cadrage et du périmètre au client.','2026-06-10 00:00:00','67fc675b-451b-45cc-8776-f36ffde7ac4c'),(4,2,NULL,'Fin du développement','2026-07-15 00:00:00','developpement',NULL,'2026-07-15 00:00:00','e5f9db34-d605-4553-89dd-0942f192c458'),(5,2,NULL,'Livraison finale','2026-07-31 00:00:00','livraison',NULL,'2026-07-31 00:00:00','7c3ae8d1-b2ce-4ba9-a0af-7006393465b9'),(6,3,NULL,'Début du cadrage','2026-07-01 00:00:00','cadrage',NULL,'2026-07-01 00:00:00','31617d54-943d-432a-aed0-30ca5dcbb8e7'),(7,3,NULL,'Rendez-vous client — rapport de cadrage','2026-07-08 00:00:00','rendez_vous',NULL,'2026-07-08 00:00:00','812ab8a7-cda3-4ab7-a8ab-9de3f5998400'),(8,3,NULL,'Livraison finale','2026-08-15 00:00:00','livraison',NULL,'2026-08-15 00:00:00','55c2c6c0-e816-4be0-9d23-8eeca7dea263'),(9,4,NULL,'Début du cadrage','2026-09-01 00:00:00','cadrage',NULL,'2026-09-01 00:00:00','6e38be46-a190-402a-9e09-cf036df714d4'),(10,2,1,'Rendez-vous client — rapport de cadrage','2026-09-30 21:32:00','rendez_vous','','2026-10-09 21:33:02','c21e4e1e-68ba-4951-b11c-d38ee65dec11');
/*!40000 ALTER TABLE `calendar_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctrine_migration_versions`
--

DROP TABLE IF EXISTS `doctrine_migration_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctrine_migration_versions` (
  `version` varchar(191) NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `execution_time` int DEFAULT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctrine_migration_versions`
--

LOCK TABLES `doctrine_migration_versions` WRITE;
/*!40000 ALTER TABLE `doctrine_migration_versions` DISABLE KEYS */;
INSERT INTO `doctrine_migration_versions` VALUES ('DoctrineMigrations\\Version20260916185600','2026-09-22 18:08:33',220),('DoctrineMigrations\\Version20260916185648',NULL,NULL),('DoctrineMigrations\\Version20260918060000','2026-09-22 18:23:58',54),('DoctrineMigrations\\Version20260922090000','2026-09-22 18:23:58',1656),('DoctrineMigrations\\Version20260922100000','2026-09-22 18:23:59',91),('DoctrineMigrations\\Version20260922110000','2026-09-22 19:31:37',15),('DoctrineMigrations\\Version20260922120000','2026-09-22 19:37:19',14),('DoctrineMigrations\\Version20260922130000','2026-09-22 19:42:31',156),('DoctrineMigrations\\Version20261009120000','2026-10-09 17:00:36',1457),('DoctrineMigrations\\Version20261009140000','2026-10-09 17:27:57',2036),('DoctrineMigrations\\Version20261009160000','2026-10-09 21:01:15',19),('DoctrineMigrations\\Version20261010100000','2026-10-09 21:37:35',265);
/*!40000 ALTER TABLE `doctrine_migration_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modification_request`
--

DROP TABLE IF EXISTS `modification_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modification_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `target` varchar(20) NOT NULL,
  `field` varchar(60) NOT NULL,
  `old_value` longtext NOT NULL,
  `new_value` longtext NOT NULL,
  `reason` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `review_note` longtext,
  `created_at` datetime NOT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `team_review` json DEFAULT NULL,
  `client_review` json DEFAULT NULL,
  `public_id` varchar(36) NOT NULL,
  `project_id` int NOT NULL,
  `subtask_id` int DEFAULT NULL,
  `requested_by_id` int NOT NULL,
  `reviewed_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_AF8314FAB5B48B91` (`public_id`),
  KEY `IDX_AF8314FA166D1F9C` (`project_id`),
  KEY `IDX_AF8314FAC6D4A949` (`subtask_id`),
  KEY `IDX_AF8314FA4DA1E751` (`requested_by_id`),
  KEY `IDX_AF8314FAFC6B21F1` (`reviewed_by_id`),
  CONSTRAINT `FK_AF8314FA166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_AF8314FA4DA1E751` FOREIGN KEY (`requested_by_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_AF8314FAC6D4A949` FOREIGN KEY (`subtask_id`) REFERENCES `subtask` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_AF8314FAFC6B21F1` FOREIGN KEY (`reviewed_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modification_request`
--

LOCK TABLES `modification_request` WRITE;
/*!40000 ALTER TABLE `modification_request` DISABLE KEYS */;
/*!40000 ALTER TABLE `modification_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(40) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `is_read` tinyint NOT NULL,
  `created_at` datetime NOT NULL,
  `public_id` varchar(36) NOT NULL,
  `recipient_id` int NOT NULL,
  `project_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_BF5476CAB5B48B91` (`public_id`),
  KEY `IDX_BF5476CAE92F8F78` (`recipient_id`),
  KEY `IDX_BF5476CA166D1F9C` (`project_id`),
  CONSTRAINT `FK_BF5476CA166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_BF5476CAE92F8F78` FOREIGN KEY (`recipient_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
INSERT INTO `notification` VALUES (12,'project_submitted','Nouveau projet soumis','« Test be » attend validation.',1,'2026-10-09 21:04:33','a698ac4e-379b-4856-a838-2af96ac44717',1,9),(13,'project_submitted','Nouveau projet soumis','« Test be » attend validation.',0,'2026-10-09 21:04:33','56c6f627-053a-4340-adf6-6f2b088ad91a',2,9),(14,'project_submitted','Nouveau projet soumis','« Test be » attend validation.',0,'2026-10-09 21:04:33','fd973197-fafd-4ff6-b026-4bf3e8d3aea5',3,9),(15,'subtask_assigned','Nouvelle sous-tâche','Vous avez été assigné à « Test 1 ».',0,'2026-10-09 21:06:18','4d069d9e-df3a-406a-b3d6-599711df6225',9,9),(16,'subtask_reviewed','Sous-tâche à valider','« Tests & QA » est terminée et attend votre validation.',0,'2026-10-09 21:32:29','6e2925de-78fc-4544-bd94-ef02be7040af',4,2),(17,'subtask_reviewed','Sous-tâche à valider','« Déploiement & livraison » est terminée et attend votre validation.',0,'2026-10-09 21:32:33','8e874469-f597-49a3-8992-4cc903e277d4',4,2);
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `priority` varchar(20) NOT NULL,
  `budget` int NOT NULL,
  `progress` int NOT NULL,
  `category` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL,
  `client_id` int NOT NULL,
  `manager_id` int DEFAULT NULL,
  `members` longtext,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `public_id` char(36) NOT NULL,
  `status_changed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_project_public_id` (`public_id`),
  KEY `IDX_2FB3D0EE19EB6921` (`client_id`),
  KEY `IDX_2FB3D0EE783E3463` (`manager_id`),
  CONSTRAINT `FK_2FB3D0EE19EB6921` FOREIGN KEY (`client_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_2FB3D0EE783E3463` FOREIGN KEY (`manager_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project`
--

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;
INSERT INTO `project` VALUES (1,'Test','Test','completed','urgent',-10,0,'test','2026-09-22 19:28:14',1,NULL,'[{\"userId\":\"a48e4a1d-4de9-47bd-bfdd-3115d0ed0958\",\"role\":\"client\",\"joinedAt\":\"2026-09-22T19:28:14+00:00\"}]','2026-08-31 21:00:00','2026-09-26 21:00:00','2702686b-ca0e-4b64-82d5-4cf610b73fa4','2026-10-09 21:23:16'),(2,'Plateforme E-commerce TechStart','Création d\'une plateforme e-commerce complète avec gestion de catalogue, panier, paiement Stripe et espace client. La plateforme doit être responsive et optimisée SEO.','in_progress','high',45000,83,'E-commerce','2026-05-20 08:00:00',11,4,'[{\"role\":\"client\",\"userId\":\"f62b9ea6-8fb7-4c18-8db2-3b8f5634c614\",\"joinedAt\":\"2026-05-20 00:00:00\"},{\"role\":\"chef_de_projet\",\"userId\":\"7d5572a7-a1d4-4e27-bdde-036061542296\",\"joinedAt\":\"2026-05-22 00:00:00\"},{\"role\":\"membre\",\"userId\":\"bba0dca7-a256-4b81-bb05-396025f01dc6\",\"joinedAt\":\"2026-06-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"7da62a03-6051-49a0-9140-ff3dc7b2161a\",\"joinedAt\":\"2026-06-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"e516fd41-b87e-45cb-a119-93f2e431335a\",\"joinedAt\":\"2026-06-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"f6740c29-b9df-4267-ba36-4758dcc27b26\",\"joinedAt\":\"2026-06-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"27da0080-a6eb-43b4-9b60-cf7eb71af578\",\"joinedAt\":\"2026-06-15 00:00:00\"}]','2026-06-01 00:00:00','2026-07-31 00:00:00','c45c9110-4729-41de-85d1-e9bbd0c76bd1','2026-05-20 08:00:00'),(3,'Refonte Site Vitrine EcoShop','Refonte complète du site vitrine d\'EcoShop avec nouveau design system, amélioration des performances et accessibilité. Migration vers Next.js.','in_progress','medium',22000,35,'Site vitrine','2026-06-25 08:00:00',12,5,'[{\"role\":\"client\",\"userId\":\"4f18b777-3500-4aeb-813a-c3ee70bd75e6\",\"joinedAt\":\"2026-06-25 00:00:00\"},{\"role\":\"chef_de_projet\",\"userId\":\"bc5ba905-2ff6-411e-89b5-99631289ab62\",\"joinedAt\":\"2026-06-26 00:00:00\"},{\"role\":\"membre\",\"userId\":\"7da62a03-6051-49a0-9140-ff3dc7b2161a\",\"joinedAt\":\"2026-07-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"bba0dca7-a256-4b81-bb05-396025f01dc6\",\"joinedAt\":\"2026-07-01 00:00:00\"}]','2026-07-01 00:00:00','2026-08-15 00:00:00','55aa5e33-fc3a-4c98-9897-c415bdc58448','2026-06-25 08:00:00'),(4,'Application Mobile UrbanVibes Fitness','Application mobile de coaching fitness personnalisé avec suivi des entraînements, plans nutritionnels et communauté. iOS + Android (React Native).','in_progress','urgent',75000,0,'Application mobile','2026-08-20 08:00:00',13,NULL,'[{\"role\":\"client\",\"userId\":\"e6ab5be3-492d-4ce6-a674-a9c07eb2285a\",\"joinedAt\":\"2026-08-20 00:00:00\"}]','2026-09-01 00:00:00','2026-12-15 00:00:00','7bc4c818-1365-4fb5-a8dd-a42d12064db3','2026-10-09 17:58:03'),(5,'Dashboard Analytics B2B','Tableau de bord analytics B2B avec visualisation de données en temps réel, exports PDF/Excel et gestion multi-tenant.','in_progress','high',38000,0,'Dashboard','2026-08-25 08:00:00',11,NULL,'[{\"role\":\"client\",\"userId\":\"f62b9ea6-8fb7-4c18-8db2-3b8f5634c614\",\"joinedAt\":\"2026-08-25 00:00:00\"}]','2026-09-10 00:00:00','2026-11-30 00:00:00','caca99e8-ab92-4352-9a85-147cf125b061','2026-10-09 17:58:25'),(6,'Refonte Logo & Identité — UrbanVibes','Création d\'une nouvelle identité visuelle : logo, charte graphique, déclinaisons print et digital.','rejected','low',8000,0,'Design','2026-08-10 08:00:00',13,NULL,'[{\"role\":\"client\",\"userId\":\"e6ab5be3-492d-4ce6-a674-a9c07eb2285a\",\"joinedAt\":\"2026-08-10 00:00:00\"}]','2026-08-15 00:00:00','2026-09-15 00:00:00','d543f6e1-3da8-4175-8cc2-93cd6998e929','2026-08-10 08:00:00'),(7,'Application de réservation de restaurant','Application web de réservation de tables avec gestion des disponibilités et notifications.','completed','medium',28000,100,'Application web','2026-02-15 08:00:00',12,4,'[{\"role\":\"client\",\"userId\":\"4f18b777-3500-4aeb-813a-c3ee70bd75e6\",\"joinedAt\":\"2026-02-15 00:00:00\"},{\"role\":\"chef_de_projet\",\"userId\":\"7d5572a7-a1d4-4e27-bdde-036061542296\",\"joinedAt\":\"2026-02-20 00:00:00\"},{\"role\":\"membre\",\"userId\":\"bba0dca7-a256-4b81-bb05-396025f01dc6\",\"joinedAt\":\"2026-03-01 00:00:00\"},{\"role\":\"membre\",\"userId\":\"7da62a03-6051-49a0-9140-ff3dc7b2161a\",\"joinedAt\":\"2026-03-01 00:00:00\"}]','2026-03-01 00:00:00','2026-05-31 00:00:00','e6420566-8192-4477-8f90-c47eaea28481','2026-02-15 08:00:00'),(8,'Audit de sécurité applicative','Audit complet de la sécurité de l\'application existante avec rapport détaillé.','completed','low',5000,50,'Audit','2026-05-28 08:00:00',11,NULL,'[{\"role\": \"client\", \"userId\": \"f62b9ea6-8fb7-4c18-8db2-3b8f5634c614\", \"joinedAt\": \"2026-05-28 00:00:00\"}]','2026-06-01 00:00:00','2026-06-30 00:00:00','b25a3a01-037f-454f-bbfa-5771589d1511','2026-05-28 08:00:00'),(9,'Test be','Tes be fona','completed','medium',0,100,'Non catégorisé','2026-10-09 21:04:33',1,NULL,'[{\"userId\":\"a48e4a1d-4de9-47bd-bfdd-3115d0ed0958\",\"role\":\"client\",\"joinedAt\":\"2026-10-09T21:04:33+00:00\"},{\"userId\":\"f6740c29-b9df-4267-ba36-4758dcc27b26\",\"role\":\"membre\",\"joinedAt\":\"2026-10-09T21:06:18+00:00\"}]','2026-10-09 21:00:00','2026-10-13 21:00:00','fded4dc9-552e-4065-a7de-fee3f18e1e7a','2026-10-09 21:04:33');
/*!40000 ALTER TABLE `project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_member`
--

DROP TABLE IF EXISTS `project_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_member` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(20) NOT NULL,
  `joined_at` datetime NOT NULL,
  `public_id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_PROJECT_USER` (`project_id`,`user_id`),
  UNIQUE KEY `UNIQ_project_member_public_id` (`public_id`),
  KEY `IDX_D80A6D0E166D1F9C` (`project_id`),
  KEY `IDX_D80A6D0EA76ED395` (`user_id`),
  CONSTRAINT `FK_D80A6D0E166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_D80A6D0EA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_member`
--

LOCK TABLES `project_member` WRITE;
/*!40000 ALTER TABLE `project_member` DISABLE KEYS */;
INSERT INTO `project_member` VALUES (1,1,1,'client','2026-09-22 19:28:14','efe037cc-c63e-4b73-8c2a-89fcafc8d8bf'),(2,2,11,'client','2026-05-20 00:00:00','b97f5109-f9f9-42be-80e1-b6ec3fbc6f91'),(3,2,4,'chef_de_projet','2026-05-22 00:00:00','03ad46c6-9b4a-4425-a5f7-f5a73f9a65fd'),(4,2,6,'membre','2026-06-01 00:00:00','cf9f9d57-2f3a-4e8a-9ad0-2a89f691e244'),(5,2,7,'membre','2026-06-01 00:00:00','4888c2ba-0579-4513-bd6c-ae12b0677374'),(6,2,8,'membre','2026-06-01 00:00:00','c9c3d6de-49bc-40b5-a0a9-59c3475f9fee'),(7,2,9,'membre','2026-06-01 00:00:00','82583ef7-9ed8-4c9f-ac0d-e893f2bd9100'),(8,2,10,'membre','2026-06-15 00:00:00','762c52af-9072-417d-8bca-700b1a3797d7'),(9,3,12,'client','2026-06-25 00:00:00','de2eb18e-2372-4ac6-8c03-3862ab04f387'),(10,3,5,'chef_de_projet','2026-06-26 00:00:00','df461da9-7154-4782-abb3-042a7eb59624'),(11,3,7,'membre','2026-07-01 00:00:00','bbe099a5-d990-4614-b79c-a5fd519a871d'),(12,3,6,'membre','2026-07-01 00:00:00','b8a0b48d-7b2a-4666-927a-36473c21a535'),(13,4,13,'client','2026-08-20 00:00:00','57f7f5f5-5ae8-4deb-9a9d-08d36dadd65c'),(14,5,11,'client','2026-08-25 00:00:00','5213a02d-5159-41de-bac6-fdb7ffd18741'),(15,6,13,'client','2026-08-10 00:00:00','3548cfcf-34e1-470b-8f5f-c0f1b596831c'),(16,7,12,'client','2026-02-15 00:00:00','f0396953-1083-46a4-a455-fad57e66355f'),(17,7,4,'chef_de_projet','2026-02-20 00:00:00','fb6d401e-d790-4f40-a37d-38289e01e718'),(18,7,6,'membre','2026-03-01 00:00:00','0f3dcaec-2171-4d17-a507-3f4fd479c4d1'),(19,7,7,'membre','2026-03-01 00:00:00','4b70d9a9-4e6c-4719-941c-a5755a5d6e35'),(20,8,11,'client','2026-05-28 00:00:00','0200532e-41c2-4c02-874b-b94cd6e4a614'),(21,9,1,'client','2026-10-09 21:04:33','0d48cec5-d3ea-457d-9748-507d23e3c1a2'),(22,9,9,'membre','2026-10-09 21:06:18','20aecc21-39ac-44bc-bbdb-6aa2b2af541c');
/*!40000 ALTER TABLE `project_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_status_log`
--

DROP TABLE IF EXISTS `project_status_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_status_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `actor_id` int DEFAULT NULL,
  `from_status` varchar(20) DEFAULT NULL,
  `to_status` varchar(20) NOT NULL,
  `reason` longtext,
  `created_at` datetime NOT NULL,
  `public_id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_project_status_log_public_id` (`public_id`),
  KEY `IDX_C1CE7EA4166D1F9C` (`project_id`),
  KEY `IDX_C1CE7EA410DAF24A` (`actor_id`),
  CONSTRAINT `FK_C1CE7EA410DAF24A` FOREIGN KEY (`actor_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_C1CE7EA4166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_status_log`
--

LOCK TABLES `project_status_log` WRITE;
/*!40000 ALTER TABLE `project_status_log` DISABLE KEYS */;
INSERT INTO `project_status_log` VALUES (1,1,1,NULL,'pending',NULL,'2026-09-22 19:28:14','a451dee5-0697-4306-b11d-898d3f0b248e'),(2,1,1,'pending','validated',NULL,'2026-09-22 19:28:44','a75ebdff-ff1f-4934-aa8b-aaf8677279fa'),(3,2,NULL,NULL,'pending',NULL,'2026-05-20 08:00:00','cad91f14-ce25-4380-9d88-e0aeebab9283'),(4,2,NULL,'pending','in_progress',NULL,'2026-05-20 08:00:00','98325a85-2f1d-4d14-bff6-3c697b1eafac'),(5,3,NULL,NULL,'pending',NULL,'2026-06-25 08:00:00','2bd8a975-9d32-4b87-9dd3-6bb9b6ed2a69'),(6,3,NULL,'pending','in_progress',NULL,'2026-06-25 08:00:00','b417a394-31b8-494a-bcc0-9a8835a1ad51'),(7,4,NULL,NULL,'pending',NULL,'2026-08-20 08:00:00','7681e719-03ac-485b-9ba6-d073fc9a6e1f'),(8,5,NULL,NULL,'pending',NULL,'2026-08-25 08:00:00','d9e2d65c-662d-42f1-8d4b-4d8249c93f03'),(9,5,NULL,'pending','validated',NULL,'2026-08-25 08:00:00','f19a9232-6f6f-407a-8128-6a3a1499389c'),(10,6,NULL,NULL,'pending',NULL,'2026-08-10 08:00:00','f5b195bb-3fcd-44ca-9bb8-bab18c1e2725'),(11,6,NULL,'pending','rejected','Le budget alloué est insuffisant par rapport au périmètre demandé. Nous vous invitons à revoir le budget ou réduire le périmètre (par ex. ne garder que le logo dans un premier temps).','2026-08-10 08:00:00','a9f60196-348d-4e51-8ff9-e1d9882b045d'),(12,7,NULL,NULL,'pending',NULL,'2026-02-15 08:00:00','1ab42ace-3797-45f1-89aa-d820c5c5be1c'),(13,7,NULL,'pending','completed',NULL,'2026-02-15 08:00:00','c2ddff58-5863-4b8d-87c2-56ffd61b1383'),(14,8,NULL,NULL,'pending',NULL,'2026-05-28 08:00:00','397dc907-bb25-4a6f-936e-9d8c23cc17dc'),(15,8,NULL,'pending','rejected','Périmètre trop vague. Merci de détailler les applicatifs concernés et la méthodologie d\'audit.','2026-05-28 08:00:00','b9d890d8-def8-422e-a02f-14e837a28608'),(16,1,3,'validated','in_progress',NULL,'2026-10-09 17:57:52','a402370b-f88e-456c-be27-0932e0948723'),(17,4,3,'pending','in_progress',NULL,'2026-10-09 17:58:03','4a785c07-d773-472b-8dc0-cd0fa400b18f'),(18,5,3,'validated','in_progress',NULL,'2026-10-09 17:58:25','bd3cb343-af12-417b-bbae-dcf6b6a34aad'),(19,9,1,NULL,'pending',NULL,'2026-10-09 21:04:33','824f3a8a-f325-404e-b65d-c2fa36efa8e5'),(20,9,1,'pending','validated',NULL,'2026-10-09 21:04:48','99b0e9ac-85d5-470f-b023-bb2991b74020'),(21,9,1,'validated','pending',NULL,'2026-10-09 21:05:02','a1876568-ee71-4fa0-8c0b-8196d21a70ca'),(22,9,1,'pending','validated',NULL,'2026-10-09 21:05:17','c11efe92-1012-4ad5-86a1-ed48e772ef72'),(23,9,1,'validated','in_progress',NULL,'2026-10-09 21:15:04','472f0b1b-f1ad-4bbc-84b4-b059d489010e'),(24,1,1,'in_progress','completed',NULL,'2026-10-09 21:23:16','9225e0cf-31ef-4de6-a6f0-27abbbd035d5');
/*!40000 ALTER TABLE `project_status_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `refresh_token` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `valid` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_9BACE7E1C74F2195` (`refresh_token`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES (1,'9ea6ccab9fbfe9c305bec11419a4c0774e25838431e5c34b616f3496cdc1f2e074618dc3bcf4869adda3a731b80f3b882925d653685257b4513c00af1e8d9c96','admin@example.com','2026-10-22 18:26:01'),(2,'62f19f9f6c911f88bf636551ab5df6b50395879d5a370c74b5a4e22f3abd3f9762ae17676b23e72db45942905dfa09daeaa05533fd0a68a664208fb17ccb001d','admin@example.com','2026-10-22 18:26:52'),(3,'97ba0a52b294950ffd289a68fdbfd3066b7c34225272c9d318b913fda49619491c061ebcd2862fc3c1aa40797a72dc349035475986ac3e819b229e29b5980212','admin@example.com','2026-10-22 19:09:45'),(4,'37969807bfe03a2b76479dd76fc20b54993ef5f4edc60ea2b7744c28f4cd8cd07f1bc26913f366af27232cf833c365bd64c1b05a27fec653b1c11ca7521c3289','admin@example.com','2026-10-22 19:18:59'),(5,'cbb5f745190a5c44c879ef8957c108827ab2c2e7313af036e2fe1348c31a2df359ea1a918060378c718410af7b9bedffa8aa8764a6ca6727b26baf42eae1ed7e','admin@example.com','2026-10-22 19:19:21'),(6,'87daf8bf755f8623a7dc2bb93352f28277baa778166c9d744c565d95ab9d47206695547ee076497b557d93022a7a13b870324f97c25077c8695e75ac9cef69e2','admin@example.com','2026-10-22 19:19:42'),(7,'f55d310de376a0d6a46ae4a16a60d5f8f547b18e6fef7300bca75229b6bb94305f9b2da3443892a1e80a00bf451371ce9446f965be570bae5522d167be1a6120','admin@example.com','2026-10-22 19:20:02'),(8,'fa7e3354faf1729b6791fb1a400388355b4c0f3ca47a97b66e132f753e4b01d6c2e66a969c0a175c429de46b0d8e37c5044e334d69d2fd244a036f7ec80574e7','admin@example.com','2026-10-22 19:20:24'),(9,'f4bb338032b6f9a6faf6681a905c490a8c47eb45ed5af8cb454980df611e5ac712b2e349337a6720293bca02ec187ba8a2414c90bf537c648343f4b7bae71e61','admin@example.com','2026-10-22 19:21:31'),(10,'2db330a2f1046df230b32bd778cd590635e928e061710de14070b9306a7355500eac5be04a3a8e7e81578deb571ef7a33c026cae1915eba7ca4b60663fe8f89a','admin@example.com','2026-10-22 19:22:41'),(11,'bfdfed8d6478d6a1ca141ace5eaf86dff9917de20f59877d0d52acaf816f60a81615eaeb8d274927e408bd310abff130cfa6b7429e4d3253f213df48e2579d49','admin@example.com','2026-10-22 19:22:52'),(12,'4be2e072dd0b7299fe290697795c49016cd71b2c4a708e7e35e6386f67104ca10b71ad4ef876411b3dd4c15c454292469482c191e363af0f9f18a764b4be688b','admin@example.com','2026-10-22 19:23:03'),(13,'cd8ea14a65588104cecb6fde8605c9621667a87b1a056adb4553649cf85d04adc9367a2d61273136fba5ee8c9308e975857cc4d9d3f2a281dc0267eee40d20be','admin@example.com','2026-10-22 19:23:28'),(14,'de6beb66cbf9f6232c2db7c7867f9ae349204700ebad21630ede00230ebc393bae9b8418bd9184cad67e39e7789370b90f6aa972aba0c31ea3ea6ac421301876','admin@example.com','2026-10-22 19:26:33'),(15,'1a3b8e693ed5e35556a106640d569c53c6e2b3bbf252c539dc7010c299e986ac21d00cb35108fc65380f160bbd2b5b455d50d32e90b6d4a727a2da0d9c4bff09','admin@taskmanager.local','2026-10-22 19:31:52'),(16,'8b1c45a7fc7d3b70fc7bf847fea32ab34f8e1c4e6ab364f49b55c983b0b95321edc6f198032850300d5a0e21c76d7001a07b902b283588963802294551a805fe','admin@example.com','2026-10-22 19:34:53'),(17,'0160d94b2ec2e8099dc15917bf223c1f0224491590b634e79a100a4ff608858afaa14a2d744277e0d530e056dea857fac19f739197710cfb06c7462a7225a287','sophie.laurent@proflow.io','2026-10-22 19:37:36'),(18,'72f49eb69c8fe04e1834047df4b0ed6fcbfa63a4a4d239588af2f86b07528bd019d4658836b8e8885f6d8040d6834c481c779b3eb0c756e3402f3014337e461a','thomas.dubois@proflow.io','2026-10-22 19:37:39'),(19,'676c1b248cb6c5476cd93abb187692429753d47c459109c9f4837f470702a33ba2bec37125b78f8e6708a11584dffbf34bebcc5d7a218b166f2e706d3cc292a8','camille@techstart.fr','2026-10-22 19:37:42'),(20,'f195fd05a9d8976095abdcdf81991c86c953282144dce51e5843e854a38ece434593bc8639192f01c665a0da1c7cf5ee1fb3286583f59e33930770c70dc734ea','admin@taskmanager.local','2026-10-22 19:43:00'),(21,'5270a0438d58d240694096602695e281b8ed3341cccd2f57ce88933c490f8ab5e98383ed6bbcf500a292da86a04210b1f0f804ef6d31c0faf4c82785e0f9ce68','admin@example.com','2026-10-22 19:48:34'),(22,'03754aa6ae5eedf9323d3cca8103dabdc56b12c7e144c95ffada072bf1ee5406fca05687a89f18d3ff06d3268511dd6c7aebf1d3c16c7ed81ff7c3e048e51389','admin@example.com','2026-10-22 19:53:12'),(23,'f3958bbd0f0bda33d6a758e3d91bb7fedd5e37f78cd2e77b39a6a7a263f1bd4ccaab77702a8419a41b5adcd2ead096b7e0422a7e2e94fd60dfaa85c57ba2401c','admin@example.com','2026-10-22 20:08:11'),(24,'c25a003f05f0cc6e6b90ebcdbf1423fc89a78a6ba8ec1996bf98b9e98a66e732c89fe3b44f78c91b20f82813c3aff31536b2903b034ad64bae77c2aa1a47780b','admin@taskmanager.local','2026-10-22 20:10:37'),(25,'991ca67a9636e4a6d78474fef5ef7f697a08cb95d4a15c24ba9b6627b7b99c7e319058a665b7479586bc2f1c6dee320ae8b53faa26b10a53b717f32c0686cf6f','admin@taskmanager.local','2026-10-22 20:13:58'),(26,'d2ff79bbbfd8c18da7257584e6c5a65480c184d60bce7bb9ff59b25d525f04b5f153e03830ab149f1094679c84c1a09890a6877bd7b1add270c0993236e86a76','admin@taskmanager.local','2026-10-22 20:14:13'),(27,'9a4593f59623ae01fa2b2eb41f2981da4e99d2f4f5284cb5e697f85352cefde52e4099a7b62abec106511e8b2ceca55b8aec4efdec60ffa35b866b385135ef7e','admin@taskmanager.local','2026-10-22 20:14:40'),(28,'32cc6e7dc6bf7355694b8f11ab1c5cb970b42213881c077d449d70e2ba31e8a22d946a1650434155edfeff611250f4abcf1f234dd00b75dab3e689e22ac8a4c8','admin@taskmanager.local','2026-10-22 20:15:49'),(29,'c987dbe41da6f9bd9cfb4b2aa1af006e59d8d927d435fcd3fc86fd5b3173654cfc8bdf0ca6ca4bee50c2a856b647d65feafb0b0bd03416ce1fad631cd2f8be8b','admin@taskmanager.local','2026-10-22 20:17:30'),(30,'f1db0899b09af433980c5abbd58ee8fa0b49045b9a540081d7148feabd97d80886c6786196be668a334faf10c4a14fef9448c1a64c039863a61c1e0c4ceadfd6','admin@taskmanager.local','2026-11-08 14:56:15'),(31,'c175fcada6e465238efdbd756921e8b39d413d60ae22cfde75993a6897795d8f3ea8da4c1c6d62efbf979ccf9f91c3186153ba3a913c427e9100cc7788a9cfc5','admin@taskmanager.local','2026-11-08 15:19:22'),(32,'d141ace7a60b3f0fdf5452be232d09a4c6f6a8ac7bd35fb8f3e45cb52e06652e1ae898d49de52d15751b8bf2d9102373920b8e9321fd7b09769202d13afd1b44','admin@taskmanager.local','2026-11-08 15:19:59'),(33,'a8d27ed34a427c15334886f9c08aafc32046947f97d744450c8a7008a2a886b7c5676ac6c1e12c9169d87c78fa42cec10c1cacc46cbc3f9cf600ecc16e8175ef','admin@taskmanager.local','2026-11-08 15:20:37'),(34,'63a12e2959d9b9e3da917fc62199a0f94371ec22613251abf51e35942ec6d95b4135592c2476159aa275ebc2a11c92f0652f62cd170ccd514e1ec24b19924b99','admin@taskmanager.local','2026-11-08 15:31:28'),(35,'fab69f3e3278fe4e54a49d8635c14b4df28d9b9dd1f460598e50310791b39c3f266bd621c761dac4967d3c38af5050d5959f39c11714824cc270561410be7cf4','admin@taskmanager.local','2026-11-08 15:32:08'),(36,'a395b9f6c707ba3e1db4fa3f3335ea999e3fdd13b96bceb8ef9125c10ade9063a3583aa19bf70c72df0656046b4cf0f4a1414db4b149c0565a4ef91ece3b3443','admin@taskmanager.local','2026-11-08 15:36:31'),(37,'149d33d7a022c22ffcb2a6ad59f875f37912ce44703555207b6a811d9032a22207ef2d4775c0f1f164a3fd8ea9827b935fa2071c98148e6935511976645ccace','admin@taskmanager.local','2026-11-08 15:37:01'),(38,'d61c67cdfb845fc36ebcd4cc71f87de79aed1260c42856e250fba0a4b7c87782ebdc2ed467617379bc64741d8aebecb69a7be35ded379dad9546034ebd81783e','admin@taskmanager.local','2026-11-08 15:37:36'),(39,'cf50c3e31e246ca9d8cbcb6d27c249c7f0f55a97a46270c09b334174a2e1280ed793cf130b0c7dd75250290aa3d04f9f644e4f44e00c0c01ccf3e9974149f946','admin@taskmanager.local','2026-11-08 15:38:01'),(40,'d3991fba69c758a4aff19434d5025e489bae9e20ec2ca2e38b6b623882f28730518acc22880e1a3a1eae5a1fa542f5ddc54a58398b4fe1efae9c0db1d9edaeac','admin@taskmanager.local','2026-11-08 15:39:58'),(41,'bbf580ea7b620eab95350ff01f0d175e8fd1a552774ad0335a5324670cf04ee9dda968869aec7c2a9c2703d88fd9bc69f463b9094022ff309fa96b8d6caf37db','admin@taskmanager.local','2026-11-08 15:41:12'),(42,'2d433a821de71c748c2afb60364fd2222d7179eced4a87a5e8918fb583d83e34fcf5d378c6e5fac4dfefdb21af8689f9c86583fa90dd6da72c57613e6df0bc97','admin@taskmanager.local','2026-11-08 15:46:48'),(43,'879672017af962ab95497f484111041f44c0a15d5d40ba9ae74c8f29d2dd1eb3d92ad255e52a9bc912011b70abb54a99e6d3558997be188f60d93a899fea06b8','admin@taskmanager.local','2026-11-08 15:48:19'),(44,'c7d442a6f04c440b6fc3d07b3f57a6e9a207ad30fffed10b7f0482c4264e60cee40f034209fbbb4a86e828a9a1cef730bddb7cf18c4aa15b2616ab457281431c','admin@taskmanager.local','2026-11-08 15:48:40'),(45,'2ae3d883fbe0f847d2cd10d052f4e370100dbd6e36efdc15c63928a73fd73897105d08995d353bc9a2a38afe6fc314181f730534ec274d6587bd3237cdee530c','admin@taskmanager.local','2026-11-08 15:50:26'),(46,'a3adc0cfd3772c86a0b5d8c8812ffbe97b3e194063fadc6fe5c2ba4106faf530ce65d05cf1ac24070876bc8c6ce05511dff623e893c7b33afcb63cf5570526e0','admin@taskmanager.local','2026-11-08 15:51:52'),(47,'d48a2033eded186e94cb34dcc900c3832b65b3b36ebeb677e818345bdd8ed063542fdf2de2a66c66bde2f0c284009f61b25c335d1cad27d72436ced995b7aaa2','admin@taskmanager.local','2026-11-08 15:52:24'),(48,'84b4d356f1c0a6c17506ef619482f0098edfceb68dfdffbedf96cb7e716f7e168fdfa6fbe697c128ea44f1a8019422551d3b3063f457161e7c880ebf9de47869','admin@taskmanager.local','2026-11-08 15:55:44'),(49,'ba41ab03bc6f99bf80dab07ec28f79a3fb8594192333023f94e22169f959913c3ae83b9ea421b8bc8025b4be08151d8a97696b959476d6dfb1eda73c2f3076b9','admin@taskmanager.local','2026-11-08 16:02:21'),(50,'6566f3cb58ef7933ea967d8e5966c43fc08e35f66cd654d0fa1bc14fdbe2cf712f7cb99cdf175a0907ca5ddc4e3947beb6298b8d27cba63e7e4021c25c7ad21c','camille@techstart.fr','2026-11-08 16:02:53'),(51,'9642d4ac8d376a05195f7f3e0193428015061d50bf8793f8da1c09fd8ad08e9af1c9e3b099f3d48696dc607bd94d73a17a8cb71230d769bb0e12b5db1e426834','admin@taskmanager.local','2026-11-08 16:15:23'),(52,'1beaa4b65159029dd6c73a338bd2694d94025f51975f3215d5f5974d2400c0e64f10e7dad29153bb93675c70e2ae1e375196b53be30a29d5cb1c107d6f8e8fe9','admin@taskmanager.local','2026-11-08 17:06:55'),(53,'efdac209733a043b1713baf7442e26342c51611d32d4530d81c9e6b8a7390c18afc2168bf11dee7a1ad0ee7aa896fadf67314674c1e1984cbd51a8678d70098e','admin@taskmanager.local','2026-11-08 17:07:15'),(54,'a59453a42f8e17b4e8ad167739123ec7b2f3fd7ac1b658129b44dbdbbf25cc4557360935f450051162c39822a97c1ccce51799024eff02d71313b538e5731c44','admin@taskmanager.local','2026-11-08 17:09:45'),(55,'2e668232d799a5fcebb70cf5949e571cd3e11c4220cd46d6c132500fec6424b6111d863943b6d39882d0071e13af47f0a40466aa540cb307640d59a8922103a4','admin@taskmanager.local','2026-11-08 17:30:14'),(56,'104cdaead290601c26ece547613c3fb7041e40679d61c8524daa015ac51b986c2d69c16cd50bde7bfa85de2591b367c28d6594743b88a6b03ba80bda3a098a06','admin@taskmanager.local','2026-11-08 17:30:21'),(57,'0fd6d59ed025cbd28ddd95adef240c37285b4fa28019257095a972e4b8412cd80430d212962d209ec6df4f6700e021a04b2e0be27f1217fafb7aee8e394f37b0','admin@taskmanager.local','2026-11-08 17:30:30'),(58,'837528e8f264cf08b7297a17a64dcc15ca04a8605460b7e1c6d2d40c2a21cbb12fb319d85dc1b87bbd0c413ae70f340e74204d3a4290707fd9a5aa02f95a5578','admin@taskmanager.local','2026-11-08 17:39:17'),(59,'259849cb69542c6f968be2cd90e0ff6593639776d774c5f6460d259834de90b451f52cfe5a30a5066f4dc0c5630affd5913a38ab6586ef60b8f0b79280c55593','admin@taskmanager.local','2026-11-08 17:39:37'),(60,'a688c1a5eda814aae6025b6d8635f611f8ddca6212bbed839f8e2fd4fd3da1b9912533efcbba51206c3d79a2d6d71c234ab844ea8bbcaccd21f60c49453d42a0','test-register-client@example.com','2026-11-08 17:39:47'),(61,'4737e0d9c93cd04f7fb08f9dc6b181d6646b29a9241bffcb32d3610f9cfac1ab00ae0d16dfc175924f89c14415b20d64ac1dc96e1b618e8abf9dc666e9879c5e','admin@taskmanager.local','2026-11-08 17:39:59'),(62,'3ce9003b657c5fa24da1c9711f52ab0c3db92376181b2b50feb550d72d6c434483670fcc633ec8529604422863aca4118e8d196f0bd74dff36bad45624a019cb','admin@taskmanager.local','2026-11-08 17:40:16'),(63,'21de59d1af04fce04e4589c3c662c93f6d8451646a3c546a4aef37e387e072963817d44a042a249362f54b2815bccf2b85508cd5cc3f36272de473297ab5ccc9','admin@taskmanager.local','2026-11-08 17:40:28'),(64,'d24284e267996e870b19caaefe8bb797e1dd928b4513e66f04be593f396d242532ed3eca7acb39eeb5f21c1cfc80b58f933b0aa64f8bc30f11325e79157f7d96','camille@techstart.fr','2026-11-08 17:40:41'),(65,'055129d8114a112ed07ab8135fb92892f28398d6bba9020f1b4993de4819f72b26af73fe32949087b87cd72edb1d2e447033ff7cc91b10ef642df35c23ffd6a7','admin@taskmanager.local','2026-11-08 17:40:43'),(66,'aa3e7c19d33b92ca51d5149886db92d5ba88077f48020af1a7400b7a34656179a0bc342af972eec1ab9886c6223fd76573334766815e9059cc6e6de12869ce2b','admin@taskmanager.local','2026-11-08 17:40:56'),(67,'8e8388371041202b59ae576f9433fcb5c7ded7c7006307ee36ac283acb479cfe2fba4f833a134ac44b221e23931385a1450b0d69e413ffb1bb5f7b500af01328','admin@taskmanager.local','2026-11-08 17:53:09'),(68,'39c2650f387ac0f6591ded1dea27c7acda2936fbf5de0be05f7aa54763e1547f9beb45939bfe019d352e633f21a680568590bc90f8ed0ee2131c2dd9ce53a990','admin@taskmanager.local','2026-11-08 17:54:05'),(69,'66ccd9d1ee75d1c52b6c09ed16a27743ea6da889c1e5bd3cc65849f0f2b6885bbc622d78104a6c4635bc82b12a0f9c0a14c1898f0bef0e8cddd650b70b21721c','admin@taskmanager.local','2026-11-08 17:56:04'),(70,'6a07cbecc7da6426854c0a4d375e29bbee88e187145874102db1947660f7c316191da54c6e8d322cf4a1d2b3524abadc9a4c161a004066018efd78a2d0183051','camille@techstart.fr','2026-11-08 17:57:25'),(71,'f9bda1f6ebfc24245147bd541b04582acc85654eb18bc9d2479e851ece9f8942e6f44ca0861b6e3c0f39040941f4399e95c8d12813a35fba72300f9173ed86e4','sophie.laurent@proflow.io','2026-11-08 17:57:45'),(72,'994079bbbe442f9a89e000c31a39db0ca8fac205f253fcd6db920c6e2a6276debcd2a2bb5289d76963c67ec8b068abe8fcd1e4137efc129f57a1bf81dc61724a','sophie.laurent@proflow.io','2026-11-08 17:58:35'),(73,'fe2712bfe4c5750cae9b1ade9d47527157e3020f3b61af170b8b47d562242df5f2ce9070a4b450d629a01a9110f74a4fd1406423795754d8d49582db4c4f7d90','admin@taskmanager.local','2026-11-08 18:07:10'),(74,'ab31fdb57060ff18975a40a19dd70c5a5ad04b414d5f6ba3869e69771f26f3d60a1366ac5a1e911d882f8094e529d48e035893890d83b8d5268e582e4213c93b','camille@techstart.fr','2026-11-08 20:46:12'),(75,'70f7e41104b71e957a1c5e490ea8056723a979b89c1a1263ad94e3f08243d983a98c3921fa4772b0757e8027828296649f883784a98890c30308621744111b16','camille@techstart.fr','2026-11-08 20:46:15'),(76,'16daa2c7db93395d2d8fc120a52b41fd6f36087a79421f62aa770ac709d9e46ec29b9201e8033016d2b3eda75c49b1730201a813f329f24b60c1d3175e40068c','camille@techstart.fr','2026-11-08 20:46:45'),(77,'292b609123355c932a8767d4a7c19a10e6e8d7a1d1db5120c2ce99d578c0c592cc7043756d05f7ffd9c775fedeac80721d9d02bd9b98fccc00ba3b9200c55ab0','camille@techstart.fr','2026-11-08 20:47:24'),(78,'4566e4d5b6ffab6088391a5af9c4f2533b2c03f73d5e8c043f9ec850d2079fb5176ac8b2a1da2b468c2e1ab333b1a906f4a3817b3277485fe3b6d57aab284540','admin@taskmanager.local','2026-11-08 20:48:28'),(79,'bf816333328e5619a4d21b7e5264d92d910e64446b86096bb23d05f64dfe58930ba1e67d7f02245fa764637e24198b965571e2b2e17d387593e14ced4261f004','admin@taskmanager.local','2026-11-08 20:48:45'),(80,'01ae133854a610cdc91ce614225554230356754e64ac60d99b896c2e4042917d0195a6bc433b0ce5a02034ba87574519cf6cf7ffbb869efe6afb2d2154e11054','camille@techstart.fr','2026-11-08 20:49:00'),(81,'1e4e348e4ac9e75610887f60ffbc4c811357be29911e145fe4b8ea63f60e95728793325f7c989832a788dfe20ca123da5bffc9487c9f09a0939dc02e03d9f5a7','admin@taskmanager.local','2026-11-08 20:49:47'),(82,'77fe72c5bf56b3c90f19845eaaf5e0cbfaa7a539bff52eb6b06e4f4ff039a91b04f6f89978f3cbfc4dd932bbec45c78aecf3a4bce048e02f7242849feb061a8f','sophie.laurent@proflow.io','2026-11-08 20:50:02'),(83,'f85f85c47403e5364e13c027c9a2b9fa51e21a78d7d02cffc854741cb4beff84fd0e5638504611f20033e2ece6a149a75333fbb049dd5a547a71644f9f61727c','sophie.laurent@proflow.io','2026-11-08 20:50:07'),(84,'492c0fac26dc2caf685e81abc9a50ee1ed4bf7cd88b8a5f9ac61ed7b7ef9eb5821b2ed36f6b124b94f2c5aa014ca6e5d3178181fdf53be63bc4508eb1878ec45','sophie.laurent@proflow.io','2026-11-08 20:50:22'),(85,'f8bb6d51de6fdd640b465024b0d5a50068b5f999fb073c295287d0be6a305adb24a97d90e96a02f04b01fb616437d0dd4cef636a19a9f1636ba3f1b3f4d9f51e','sophie.laurent@proflow.io','2026-11-08 20:50:41'),(86,'487186b0750bf88f25b7e1429fe6d3ea75250967d77ea259b60ecc152174842ecdfe5693f6c0c776b0167681b505f24c94c513e3ef1e16b93b157cefb0c8bc4d','karim.benali@proflow.io','2026-11-08 20:51:01'),(87,'bef9225ed303129e1d411bf086ea4f52a3f0304c865de837b4928e3b7a2aa34e2762b735dba9230c790743ad2bbd47da45dc8e12850947c788826607b59e943a','karim.benali@proflow.io','2026-11-08 20:51:07'),(88,'a0e151ab3e097910ab950129a7a9f3711201488cb67798029235095ddbdc098e2a6380a68cf16fe6b30dab0a371c5d7a5fa7a0bc7fce41f6b55f387186d7960a','thomas.dubois@proflow.io','2026-11-08 20:51:35'),(89,'d1fdd267e98a8bfc751e6bcb98d80d817d4ba9fabd6467e9e7ef9a2a33ccd046a5f8c540ed808dff4bd882ceaa9aaaca6d327adabf0132d3a896cbeff318f607','thomas.dubois@proflow.io','2026-11-08 20:51:38'),(90,'247ece7517cfa5cccde71e58f07386bdd7127ec16375b2354ca45c1147d1e903050f9c2131defd14fbc03913d78e1211ebfb87835a942813a423ab564e626c14','camille@techstart.fr','2026-11-08 20:51:49'),(91,'c9e387fc2967be4a81c4b554a8e0e0ae9aa72a95abbe9eefd0cdd6515e0c29b1592881c5b055b5561eea5fd44207b175d2f135e9b230e38a61252b913fef42ab','camille@techstart.fr','2026-11-08 20:51:55'),(92,'0a95ccbd3d594f6b58fd812fd15a76705090c2f8bc5db5b3d14aba752f943d394e51caedb9aab3ba54731dc7fcc9c0f9038f0ef54967238e178da9ae124eb0cf','admin@taskmanager.local','2026-11-08 20:52:35'),(93,'e094e6f2f9894bc39347d5031e4f3bb027f52d34ac43f0e9ba09dda84e882b73c057e278c9e76a3df12c885cbed1ae673b4e4522f595c62f561ce2c9d3ed3ac8','admin@taskmanager.local','2026-11-08 20:53:00'),(94,'677a94793a55cd2b5738a04003229e4926a2fa8545082120c918b16cb4a92ae7b06171b108b4034b4a167556e9ed048882a4b1565c3e51e2522aa74795f85940','admin@taskmanager.local','2026-11-08 20:53:29'),(95,'825e441160784a7c9487be14254f6b48b943fd4c9b0e2c974068aed1f791b45e716472b0b2433ab5c6d6d6c211c770eb6976c7ed78fce35167de1764fb599919','camille@techstart.fr','2026-11-08 20:53:45'),(96,'ec6eaa046cc12398035115ff44d74ca6080e6e123f4372ee80061374fcfd1091add55a26075f2f212f74031e51e9b470e6c06e76b533532cef47c79322f2902b','admin@taskmanager.local','2026-11-08 20:53:58'),(97,'f5a65e7a75957e41d7c259bdc78cf19743c5d701e6d3135d62fc8309188f41af9a0667b5beb0036c41d9b429a465d3f7258c3615fc1e0f6bb905627d070b4ccd','sophie.laurent@proflow.io','2026-11-08 20:56:12'),(98,'8a8647799050df1fefd00b957c64c5e51dbb804e85997f515d674001b1dd9b6911ac07385d42b33707991ad5dc6cc36a5bbc8688ec385743a4404af0c022a649','sophie.laurent@proflow.io','2026-11-08 20:56:26'),(99,'568bbde30a6381ae09ec8b85fe516af397b60e3e3bfc9b49d6f5ff1e8c0e07ba7554ea97858c74b7d7e84bbca2c3dccdc925f2c7c894d2aa3a592b76e2c4ffae','camille@techstart.fr','2026-11-08 20:57:55'),(100,'c8f174bf41868fc3eb2465fc963b3b5a6004c145d1164e0a574bcbbfbda48010dc55bf3da6b7712998bb67375387fd110ff944f1eafc866ce1119d3ce9bed8df','thomas.dubois@proflow.io','2026-11-08 21:01:30'),(101,'33e4a356bef90d0b8826ac607f5d35a24122c98aea5b7eca89341da1465cfa7eb59fce3ac83aba63ad9e94db993d91cb5ce443a5db794709113a55457168036a','thomas.dubois@proflow.io','2026-11-08 21:01:51'),(102,'2bb5df26af588fb3a96c3e9bdbc3b00c02afd714ce9226d69cc2804ed8fd7b32342cad66124873c0e5af3c523c999d9c73daacd8faeea6705f75de4630e1192d','sophie.laurent@proflow.io','2026-11-08 21:02:03'),(103,'6a4b1912f035778880e67a716d750254956b6b344ab4f0b4d944d27bca650855843e63347b95e61e41dd2bc9cd7bbf8bb247a34725d92fdd760a9a1b06d1077e','admin@example.com','2026-11-08 21:03:26'),(104,'b1b09b5c2390aeef66128733710693c53257cc576981779a17958ec1020f723a172f57d24b03e7fa55efa7f4c82226b661d88b71e488eeb0b26e034dc58878ac','karim.benali@proflow.io','2026-11-08 21:12:05'),(105,'c424fb6c325905ef811eb7b7dde515cbba26cf8461c2714f75127347f965186062efd38d81809d7ff3409393828aeb0d4ef4fb39f830d304c886ec14abd8e99d','admin@taskmanager.local','2026-11-08 21:12:23'),(106,'1b8ce559db3c2ebad8d12b866ad99824c0b72e8968ec2be4c851ace48af0162230947b5eadd1d7b87b1020a87603d48a8c11ddebb7e7c1e7767d8b8f4a00ad13','admin@example.com','2026-11-08 21:13:22'),(107,'408995fbbcd56195aab1c33ff212d2605d67a229b70773a0273fe2a65e5403395a3882557a54dc6890b4d1aad6538060ebcf5481fa8edef8c1493fb363832712','admin@taskmanager.local','2026-11-08 21:18:34'),(108,'bae70a6f8035b223e665b2495b523c7441496f1872bebcb11d4273476469035157ac479fc4389955c50f65edd4ed36477b2a4ce26623f4510fb9be981df5ffaf','admin@taskmanager.local','2026-11-08 21:19:14'),(109,'8b571777378920bfbd13f0dd0c111336c4933a2ee78c2148709268ae9c6b7a0c372a54a4d0216c0f6d930ead236cc4f61d6f4605f4b9e135e6bedf9f03a859a7','admin@taskmanager.local','2026-11-08 21:22:26'),(110,'912df4825dc0dd34eee06447a1178c8d97118688f1c408e0df581ac0ad04613bbb7514c746d9234571da2aec610bc422d99eaa3f746369d934c6b1ac6e049a72','admin@taskmanager.local','2026-11-08 21:30:19'),(111,'f0360a2eb9e88a1c2f6e83364ad9f9d7cf9bf980eb7ff734258c221a252f8b14d5d07dddbb985d4f5f5f4e2aeb7f4f21a0a2a1a3145b2bc517fed56ac7b257cf','admin@taskmanager.local','2026-11-08 21:39:56'),(112,'530869f1997788e9b98445df65bed7fe677710c13ee385717a6e62aa2bb62ee44f1754e50118cb1c57194c5793d878d691b378d8535a6a20e4315a98333a4a02','camille@techstart.fr','2026-11-08 21:52:09'),(113,'edf40b5ad3089b1067992434bee086396ae110e1d49b981979dbf859ef005676f2f8ddceb09f84fbb03a1f111eace5e5c17c8880e82d405a75e92b54f9e286e6','sophie.laurent@proflow.io','2026-11-09 03:49:52'),(114,'8b5fad24f4b850eca445b2628a4bc5f54fd53fbe0b986823c19fe552d4ef6fee6d2eeeba82b9db4f25c7ee7cdcc65419a7f2a7d3f44a55b7f777423aee7a7af1','sophie.laurent@proflow.io','2026-11-09 03:50:06'),(115,'b27f14ee36ccfc61c766a0199b0794081f22bfcc2d8faf539ef931343ec5a294d48a570fb5ea7ddc9c1c294e8a1f88fcd74e706f39028d9d32f49c280d264270','karim.benali@proflow.io','2026-11-09 03:50:13'),(116,'e8dcf32b71ca985816a7a7c383eabc81aa64d2432fead638023d806ab930155db468700918011135b764bd3e855aa4abbed9e48ac543d3df206c36806c729c70','thomas.dubois@proflow.io','2026-11-09 03:50:22');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requete`
--

DROP TABLE IF EXISTS `requete`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requete` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL,
  `responded_at` datetime DEFAULT NULL,
  `response` json DEFAULT NULL,
  `public_id` varchar(36) NOT NULL,
  `project_id` int NOT NULL,
  `subtask_id` int DEFAULT NULL,
  `created_by_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_1E6639AAB5B48B91` (`public_id`),
  KEY `IDX_1E6639AA166D1F9C` (`project_id`),
  KEY `IDX_1E6639AAC6D4A949` (`subtask_id`),
  KEY `IDX_1E6639AAB03A8386` (`created_by_id`),
  CONSTRAINT `FK_1E6639AA166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_1E6639AAB03A8386` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_1E6639AAC6D4A949` FOREIGN KEY (`subtask_id`) REFERENCES `subtask` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requete`
--

LOCK TABLES `requete` WRITE;
/*!40000 ALTER TABLE `requete` DISABLE KEYS */;
/*!40000 ALTER TABLE `requete` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subtask`
--

DROP TABLE IF EXISTS `subtask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subtask` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `status` varchar(20) NOT NULL,
  `priority` varchar(20) NOT NULL,
  `start_date` datetime NOT NULL,
  `due_date` datetime NOT NULL,
  `progress` int NOT NULL,
  `is_active` tinyint NOT NULL,
  `work_sessions` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `public_id` varchar(36) NOT NULL,
  `project_id` int NOT NULL,
  `assigned_to_id` int DEFAULT NULL,
  `depends_on_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_8BCBA9AEB5B48B91` (`public_id`),
  KEY `IDX_8BCBA9AE166D1F9C` (`project_id`),
  KEY `IDX_8BCBA9AEF4BD7827` (`assigned_to_id`),
  KEY `IDX_8BCBA9AE1E088F8` (`depends_on_id`),
  CONSTRAINT `FK_8BCBA9AE166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_8BCBA9AE1E088F8` FOREIGN KEY (`depends_on_id`) REFERENCES `subtask` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_8BCBA9AEF4BD7827` FOREIGN KEY (`assigned_to_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subtask`
--

LOCK TABLES `subtask` WRITE;
/*!40000 ALTER TABLE `subtask` DISABLE KEYS */;
INSERT INTO `subtask` VALUES (4,'Cadrage & analyse des besoins','Recueillir et documenter les besoins fonctionnels du client, valider le périmètre.','done','high','2026-06-01 00:00:00','2026-06-07 00:00:00',100,0,NULL,'2026-05-28 08:00:00','d542d2d5-de6e-4c8f-969c-dfefd8942fa1',2,9,NULL),(5,'Wireframes & maquettes','Créer les wireframes et maquettes haute fidélité de l\'interface.','done','high','2026-06-08 00:00:00','2026-06-20 00:00:00',100,0,NULL,'2026-05-28 08:00:00','98b62487-defe-4737-9263-53f896ea6134',2,7,NULL),(6,'Développement Frontend','Intégrer les maquettes en React/Next.js avec TailwindCSS.','in_progress','urgent','2026-06-21 00:00:00','2026-07-15 00:00:00',60,0,'[{\"end\": \"2026-10-09T21:30:15+00:00\", \"start\": \"2026-10-09T21:28:36+00:00\", \"duration\": 99}]','2026-05-28 08:00:00','c728099a-e7a6-4750-b088-a7bea92a9800',2,6,NULL),(7,'Développement Backend & API','Créer l\'API REST (Laravel) et la base de données MySQL.','in_progress','high','2026-06-10 00:00:00','2026-07-10 00:00:00',70,0,'[{\"end\": \"2026-10-09T21:30:16+00:00\", \"start\": \"2026-10-09T21:28:45+00:00\", \"duration\": 91}]','2026-05-28 08:00:00','69caa7f0-31fc-4c84-8cae-42105b15871e',2,8,NULL),(8,'Tests & QA','Rédiger et exécuter les scénarios de test, corriger les bugs.','review','medium','2026-07-16 00:00:00','2026-07-25 00:00:00',85,0,'[{\"end\": \"2026-10-09T21:30:21+00:00\", \"start\": \"2026-10-09T21:28:50+00:00\", \"duration\": 91}]','2026-05-28 08:00:00','da90eba8-120f-4b43-b954-0c850068dc1a',2,10,NULL),(9,'Déploiement & livraison','Déployer sur Netlify et remettre le projet au client.','review','high','2026-07-26 00:00:00','2026-07-31 00:00:00',85,0,'[{\"end\": \"2026-10-09T21:30:17+00:00\", \"start\": \"2026-10-09T21:28:48+00:00\", \"duration\": 89}]','2026-05-28 08:00:00','ebb16772-74a3-43a7-9fb8-e80511352b0a',2,NULL,NULL),(10,'Cadrage & audit UX existant','Analyser le site actuel et identifier les points de friction.','done','medium','2026-07-01 00:00:00','2026-07-05 00:00:00',100,0,NULL,'2026-06-28 08:00:00','ef75abbf-49c4-46a5-92ac-8c624a6dd1ef',3,7,NULL),(11,'Refonte visuelle','Nouvelle charte graphique et design system.','in_progress','high','2026-07-06 00:00:00','2026-07-18 00:00:00',85,0,'[{\"end\": \"2026-10-09T21:30:13+00:00\", \"start\": \"2026-10-09T21:28:54+00:00\", \"duration\": 79}]','2026-06-28 08:00:00','e36c6c8d-0358-45ed-b0e1-3580610fbb7c',3,7,NULL),(12,'Intégration nouvelle UI','Remplacer les anciens composants par les nouveaux.','in_progress','high','2026-07-19 00:00:00','2026-08-05 00:00:00',0,0,'[{\"end\": \"2026-10-09T21:30:14+00:00\", \"start\": \"2026-10-09T21:28:56+00:00\", \"duration\": 78}]','2026-06-28 08:00:00','c7b415ff-0b9e-466e-a4bb-2d88573114f9',3,6,NULL),(13,'Cadrage & architecture technique','Définir l\'architecture, le choix des technos et le schéma de base de données.','in_progress','high','2026-09-01 00:00:00','2026-09-07 00:00:00',0,0,'[{\"end\": \"2026-10-09T21:30:10+00:00\", \"start\": \"2026-10-09T21:29:01+00:00\", \"duration\": 69}]','2026-08-28 08:00:00','224427c8-756b-4c96-ac8c-eaa05f99bd1f',4,8,NULL),(14,'Design & prototypage','Maquettes et prototype interactif.','in_progress','medium','2026-09-01 00:00:00','2026-09-10 00:00:00',0,0,'[{\"end\": \"2026-10-09T21:51:24+00:00\", \"start\": \"2026-10-09T21:28:59+00:00\", \"duration\": 1345}]','2026-08-28 08:00:00','04c461ed-9ab0-4e43-ba39-fdd4df7264d2',4,7,NULL),(15,'Test 1','Test 1','review','medium','2026-10-10 00:00:00','2026-10-11 00:00:00',100,0,'[{\"end\": \"2026-10-09T21:30:07+00:00\", \"start\": \"2026-10-09T21:29:04+00:00\", \"duration\": 63}]','2026-10-09 21:06:18','25664c79-1881-4405-93d1-09d9ff61215f',9,9,NULL),(16,'Test 2','Test 2','done','medium','2026-10-11 00:00:00','2026-10-12 00:00:00',100,0,NULL,'2026-10-09 21:06:49','2d96cde7-85d9-4dfc-a42a-c43a10d3ebca',9,NULL,NULL),(17,'Test 3','Test 3','in_progress','medium','2026-10-12 00:00:00','2026-10-13 00:00:00',100,0,'[{\"end\": \"2026-10-09T21:30:09+00:00\", \"start\": \"2026-10-09T21:29:02+00:00\", \"duration\": 67}]','2026-10-09 21:08:28','8f5eac20-86d7-4a1b-bd90-36b19703940e',9,NULL,NULL);
/*!40000 ALTER TABLE `subtask` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subtask_comment`
--

DROP TABLE IF EXISTS `subtask_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subtask_comment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` longtext NOT NULL,
  `created_at` datetime NOT NULL,
  `public_id` varchar(36) NOT NULL,
  `subtask_id` int NOT NULL,
  `author_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_30D1BFE6B5B48B91` (`public_id`),
  KEY `IDX_30D1BFE6C6D4A949` (`subtask_id`),
  KEY `IDX_30D1BFE6F675F31B` (`author_id`),
  CONSTRAINT `FK_30D1BFE6C6D4A949` FOREIGN KEY (`subtask_id`) REFERENCES `subtask` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_30D1BFE6F675F31B` FOREIGN KEY (`author_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subtask_comment`
--

LOCK TABLES `subtask_comment` WRITE;
/*!40000 ALTER TABLE `subtask_comment` DISABLE KEYS */;
INSERT INTO `subtask_comment` VALUES (2,'Bonjour, n\'oubliez pas que le paiement Stripe est prioritaire.','2026-06-02 09:00:00','53d5f64d-243b-4a0b-823b-89e8a76a176f',4,11),(3,'C\'est noté. Le périmètre inclut la connexion Stripe et la gestion des devis.','2026-06-02 11:30:00','0ef4c7d4-893a-410a-b5a2-a96c7a006ad2',4,9),(4,'Les maquettes sont superbes, j\'aime beaucoup la direction visuelle !','2026-06-18 10:00:00','b5cee0df-90ba-42a1-a59c-f46e9a87fc22',5,11),(5,'Merci ! Prochaine étape : l\'intégration frontend.','2026-06-18 12:00:00','037553bd-cd52-407a-a97c-15220ff2fd84',5,7),(6,'La page catalogue est prête, je passe aux pages produit maintenant.','2026-06-28 14:00:00','6a415eae-b4aa-4e53-aecd-185dcede33e0',6,6),(7,'J\'ai ajouté le cache Redis pour optimiser les performances, en attente d\'approbation.','2026-06-30 09:00:00','1b47f6fd-0b24-48ab-b77b-ea5f3eee8b11',7,8),(8,'J\'ai validé la direction, il reste les variantes de boutons à finaliser.','2026-07-15 10:00:00','106112ea-bcab-4855-9769-b785f6630f71',11,5);
/*!40000 ALTER TABLE `subtask_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_request`
--

DROP TABLE IF EXISTS `task_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `priority` varchar(20) NOT NULL,
  `besoin_date` datetime DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `photo_name` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_note` longtext,
  `created_at` datetime NOT NULL,
  `public_id` varchar(36) NOT NULL,
  `project_id` int NOT NULL,
  `client_id` int NOT NULL,
  `reviewed_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_2476A575B5B48B91` (`public_id`),
  KEY `IDX_2476A575166D1F9C` (`project_id`),
  KEY `IDX_2476A57519EB6921` (`client_id`),
  KEY `IDX_2476A575FC6B21F1` (`reviewed_by_id`),
  CONSTRAINT `FK_2476A575166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `project` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_2476A57519EB6921` FOREIGN KEY (`client_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_2476A575FC6B21F1` FOREIGN KEY (`reviewed_by_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_request`
--

LOCK TABLES `task_request` WRITE;
/*!40000 ALTER TABLE `task_request` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(180) NOT NULL,
  `roles` json NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `bio` longtext,
  `member_specialty` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `public_id` char(36) NOT NULL,
  `account_status` varchar(20) NOT NULL DEFAULT 'active',
  `reset_code` varchar(6) DEFAULT NULL,
  `reset_code_expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_IDENTIFIER_EMAIL` (`email`),
  UNIQUE KEY `UNIQ_user_public_id` (`public_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin@example.com','[\"ROLE_ADMIN\"]','$2y$13$omqLqp0Ieq9O/MIZfK.uI.5OhphCHgJP5LPw/0oUUJLYEISbTNu9S','Admin Test','https://ui-avatars.com/api/?name=Admin+Test',NULL,NULL,NULL,NULL,NULL,'2026-09-22 18:24:59','a48e4a1d-4de9-47bd-bfdd-3115d0ed0958','active',NULL,NULL),(2,'admin@taskmanager.local','[\"ROLE_ADMIN\"]','$2y$13$xcL4IOLJDyzChV6UdGkKneGI6rZnDM3w7AN.IEK6obAyZtI9FAmeO','Administrateur','https://ui-avatars.com/api/?name=Admin',NULL,NULL,NULL,NULL,NULL,'2026-09-22 22:31:37','aab52039-9900-4c05-a010-fbb9c7dd1810','active',NULL,NULL),(3,'sophie.laurent@proflow.io','[\"ROLE_ADMIN\"]','$2y$13$/vzHt3H36Xl0e98Bvybx1.RhXE5DBOaUOf.hsDJSGn5RAG8xeM67K','Sophie Laurent','https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie&backgroundColor=b6e3f4','+33 6 12 34 56 78',NULL,'12 Rue de la Paix, 75002 Paris','Directrice générale de ProFlow. Passionnée par la gestion de projet et l\'innovation digitale.',NULL,'2026-01-15 08:00:00','2ccca684-53af-446b-9a84-5a363a7f099c','active',NULL,NULL),(4,'karim.benali@proflow.io','[\"ROLE_CHEF_DE_PROJET\"]','$2y$13$Zle/R7l7g36jIEZZk4iaQu.sa1tiD/N9IlkcW5SBA75xUYNoXV7vC','Karim Benali','https://api.dicebear.com/7.x/avataaars/svg?seed=Karim&backgroundColor=c0aede','+33 6 23 45 67 89',NULL,'45 Avenue Victor Hugo, 69006 Lyon','Chef de projet senior avec 8 ans d\'expérience en gestion de projets web et mobile.',NULL,'2026-02-01 08:00:00','7d5572a7-a1d4-4e27-bdde-036061542296','active',NULL,NULL),(5,'elodie.martin@proflow.io','[\"ROLE_CHEF_DE_PROJET\"]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Élodie Martin','https://api.dicebear.com/7.x/avataaars/svg?seed=Elodie&backgroundColor=d1f4e0','+33 6 34 56 78 90',NULL,'8 Rue des Lilas, 33000 Bordeaux','Chef de projet spécialisée en refonte UI/UX et design system.',NULL,'2026-02-10 08:00:00','bc5ba905-2ff6-411e-89b5-99631289ab62','active',NULL,NULL),(6,'thomas.dubois@proflow.io','[]','$2y$13$//d0ef1MSBxT3/gsIJ48uuAaQVyF2tyeLIF.cHX6geneULRucCXk6','Thomas Dubois','https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas&backgroundColor=ffd5dc','+33 6 45 67 89 01',NULL,'23 Rue du Commerce, 75015 Paris','Développeur React/Next.js avec une passion pour les interfaces performantes et accessibles.','Frontend','2026-03-01 08:00:00','bba0dca7-a256-4b81-bb05-396025f01dc6','active',NULL,NULL),(7,'lina.chen@proflow.io','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Lina Chen','https://api.dicebear.com/7.x/avataaars/svg?seed=Lina&backgroundColor=c4f0d0','+33 6 56 78 90 12',NULL,'15 Rue du Faubourg, 31000 Toulouse','Designer UI/UX créative, spécialisée dans la création de design systems et maquettes haute fidélité.','Designer','2026-03-05 08:00:00','7da62a03-6051-49a0-9140-ff3dc7b2161a','active',NULL,NULL),(8,'marco.rossi@proflow.io','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Marco Rossi','https://api.dicebear.com/7.x/avataaars/svg?seed=Marco&backgroundColor=ffdfbf','+33 6 67 89 01 23',NULL,'7 Boulevard Gambetta, 13001 Marseille','Développeur backend expert Laravel/PHP et architecte de bases de données MySQL.','Backend','2026-03-10 08:00:00','e516fd41-b87e-45cb-a119-93f2e431335a','active',NULL,NULL),(9,'aicha.diallo@proflow.io','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Aïcha Diallo','https://api.dicebear.com/7.x/avataaars/svg?seed=Aicha&backgroundColor=b6e3f4','+33 6 78 90 12 34',NULL,'31 Rue de Strasbourg, 44000 Nantes','Chef de projet junior motivée, spécialisée dans l\'analyse des besoins et la coordination d\'équipe.','Chef de projet junior','2026-03-15 08:00:00','f6740c29-b9df-4267-ba36-4758dcc27b26','active',NULL,NULL),(10,'jakub.nowak@proflow.io','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Jakub Nowak','https://api.dicebear.com/7.x/avataaars/svg?seed=Jakub&backgroundColor=c0aede','+33 6 89 01 23 45',NULL,'42 Rue de la République, 67000 Strasbourg','Ingénieur DevOps spécialisé dans les pipelines CI/CD et le déploiement cloud.','DevOps','2026-03-20 08:00:00','27da0080-a6eb-43b4-9b60-cf7eb71af578','active',NULL,NULL),(11,'camille@techstart.fr','[]','$2y$13$tuTezy0iqEaoCNrqL2RNku6AzO7JftJhezVBJpeHpOsunRBL4O7w2','Camille Rousseau','https://api.dicebear.com/7.x/avataaars/svg?seed=Camille&backgroundColor=ffd5dc','+33 7 11 22 33 44','TechStart SAS','56 Avenue des Champs-Élysées, 75008 Paris','Fondatrice de TechStart, startup spécialisée dans la vente en ligne de technologies innovantes.',NULL,'2026-04-01 08:00:00','f62b9ea6-8fb7-4c18-8db2-3b8f5634c614','active',NULL,NULL),(12,'olivier@ecoshop.com','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Olivier Lefèvre','https://api.dicebear.com/7.x/avataaars/svg?seed=Olivier&backgroundColor=d1f4e0','+33 7 22 33 44 55','EcoShop SARL','18 Rue du Marché, 69002 Lyon','Directeur d\'EcoShop, magasin en ligne de produits écologiques et durables.',NULL,'2026-04-05 08:00:00','4f18b777-3500-4aeb-813a-c3ee70bd75e6','active',NULL,NULL),(13,'nadia@urbanvibes.io','[]','$2y$10$bXVQ2m9hMKUJa7MtjdJlWOOiMGyuxV2khJ7hVw1jMttIMlxk1X7YK','Nadia Benali','https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia&backgroundColor=b6e3f4','+33 7 33 44 55 66','UrbanVibes','29 Rue de la République, 13001 Marseille','Gérante d\'UrbanVibes, marque de sport et bien-être urbain.',NULL,'2026-04-10 08:00:00','e6ab5be3-492d-4ce6-a674-a9c07eb2285a','active',NULL,NULL),(16,'kantofitiavan@gmail.com','[\"ROLE_CHEF_DE_PROJET\"]','$2y$13$PpuLtntmDYv8/IOZjK1COO/S0czfm5.RAOMp6HHvIZonul/DDxMPG','Dato','blob:http://localhost:3000/926a6dc3-f23f-4eea-9549-5e0121918358','',NULL,NULL,NULL,NULL,'2026-09-22 20:21:55','6c3c2d79-fa96-4a46-97a4-03f6bace8db3','active',NULL,NULL);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-10  6:53:00
