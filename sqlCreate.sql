-- ---
-- Globals
-- ---

-- SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
-- SET FOREIGN_KEY_CHECKS=0;

-- ---
-- Table 'events_locations_tracks'
-- 
-- ---

DROP TABLE IF EXISTS `events_locations_tracks`;
		
CREATE TABLE `events_locations_tracks` (
  `eventId` TINYINT NOT NULL,
  `locationId` TINYINT NOT NULL,
  `trackId` SMALLINT NOT NULL,
  UNIQUE KEY (`eventId`, `locationId`, `trackId`)
);

-- ---
-- Table 'tracks'
-- 
-- ---

DROP TABLE IF EXISTS `tracks`;
		
CREATE TABLE `tracks` (
  `trackId` SMALLINT NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `fullPath` TEXT UNIQUE NOT NULL,
  `plays` SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`trackId`)
);

-- ---
-- Table 'tracks_artists'
-- 
-- ---

DROP TABLE IF EXISTS `tracks_artists`;
		
CREATE TABLE `tracks_artists` (
  `trackId` SMALLINT NOT NULL,
  `artistId` SMALLINT NOT NULL,
  UNIQUE KEY (`trackId`, `artistId`)
);

-- ---
-- Table 'events'
-- 
-- ---

DROP TABLE IF EXISTS `events`;
		
CREATE TABLE `events` (
  `eventId` TINYINT NOT NULL AUTO_INCREMENT,
  `eventName` VARCHAR(100) UNIQUE NOT NULL,
  `eventIcon` TEXT UNIQUE NULL DEFAULT NULL,
  `folderName` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`eventId`)
);

-- ---
-- Table 'locations'
-- 
-- ---

DROP TABLE IF EXISTS `locations`;
		
CREATE TABLE `locations` (
  `locationId` TINYINT NOT NULL AUTO_INCREMENT,
  `locationName` VARCHAR(255) UNIQUE NOT NULL,
  `folderName` VARCHAR(255) UNIQUE NOT NULL,
  PRIMARY KEY (`locationId`)
);

-- ---
-- Table 'artists'
-- 
-- ---

DROP TABLE IF EXISTS `artists`;
		
CREATE TABLE `artists` (
  `artistId` SMALLINT NOT NULL AUTO_INCREMENT,
  `artistName` VARCHAR(255) UNIQUE NOT NULL,
  `artistIcon` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`artistId`)
);

-- ---
-- Foreign Keys 
-- ---

ALTER TABLE `events_locations_tracks` ADD FOREIGN KEY (eventId) REFERENCES `events` (`eventId`);
ALTER TABLE `events_locations_tracks` ADD FOREIGN KEY (locationId) REFERENCES `locations` (`locationId`);
ALTER TABLE `events_locations_tracks` ADD FOREIGN KEY (trackId) REFERENCES `tracks` (`trackId`);
ALTER TABLE `tracks_artists` ADD FOREIGN KEY (trackId) REFERENCES `tracks` (`trackId`);
ALTER TABLE `tracks_artists` ADD FOREIGN KEY (artistId) REFERENCES `artists` (`artistId`);

-- ---
-- Table Properties
-- ---

-- ALTER TABLE `events_locations_tracks` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `tracks` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `tracks_artists` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `events` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `locations` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
-- ALTER TABLE `artists` ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- ---
-- Test Data
-- ---

-- INSERT INTO `events_locations_tracks` (`eventId`,`locationId`,`trackId`) VALUES
-- ('','','');
-- INSERT INTO `tracks` (`trackId`,`filename`,`date`,`fullPath`,`plays`) VALUES
-- ('','','','','');
-- INSERT INTO `tracks_artists` (`trackId`,`artistId`) VALUES
-- ('','');
-- INSERT INTO `events` (`eventId`,`eventName`,`eventIcon`,`folderName`) VALUES
-- ('','','','');
-- INSERT INTO `locations` (`locationId`,`locationName`,`folderName`) VALUES
-- ('','','');
-- INSERT INTO `artists` (`artistId`,`artistName`,`artistIcon`) VALUES
-- ('','','');