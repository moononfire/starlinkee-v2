-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql2.small.pl
-- Generation Time: Cze 14, 2026 at 12:15 AM
-- Wersja serwera: 8.0.43
-- Wersja PHP: 8.1.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Baza danych: `m2454_starlinkee-app-prod`
--
CREATE DATABASE IF NOT EXISTS `m2454_starlinkee-app-prod` DEFAULT CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci;
USE `m2454_starlinkee-app-prod`;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `admins`
--

CREATE TABLE `admins` (
  `id` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`) VALUES
(3, 'viktor', '$2y$10$VRczONg28GvZHJcU5mPctelmk3n7RzDh7cm01ZW8xZzikxY9vbc6G');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `customers`
--

CREATE TABLE `customers` (
  `customer_id` int NOT NULL,
  `customer_type` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `company_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `billing_address` text,
  `preferred_language` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source` varchar(255) DEFAULT NULL,
  `country` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `customers`
--

INSERT INTO `customers` (`customer_id`, `customer_type`, `company_name`, `tax_id`, `customer_name`, `email`, `phone`, `billing_address`, `preferred_language`, `created_at`, `updated_at`, `source`, `country`) VALUES
(37, 'individual', '', '', 'Temp_cust_1', 'contact.starlinkee@gmail.com', '000', '...', 'de', '2025-05-09 15:40:39', '2025-05-09 15:40:39', NULL, NULL),
(38, 'individual', '', '', 'Mała Czarna', 'vikbobinski@gmail.com', '000', 'Aleja Jana Pawła II 64/lokal 1, 47-232 Kędzierzyn-Koźle, Polska', 'pl', '2025-05-29 15:51:31', '2025-05-29 15:51:31', NULL, NULL),
(39, 'individual', '', '', 'Testowy Test', 'vikbobinski@gmail.com', '666', '666', 'de', '2025-06-28 11:26:45', '2025-06-28 11:26:45', 'Admin dashboard', 'Polska'),
(40, 'individual', '', '', 'Mariciozo Santiago', 'vikbobinski@gmail.com', '666666666', 'Italia', 'en', '2026-02-14 17:31:23', '2026-02-14 17:31:23', 'Admin dashboard', 'it'),
(41, 'individual', '', '', 'Safran Pizza - Kebap (missing info)', 'vikbobinski@gmail.com', '(missing)', '(missing)', 'de', '2026-02-15 11:42:10', '2026-02-15 11:42:10', 'Admin dashboard', 'Austria'),
(42, 'individual', '', '', 'Kasia Folgarida', 'info@hoteldalbracconiere.it', '+39 327 823 3452', 'Str. della Casina, 80, 38025 Folgarida TN, Włochy', 'en', '2026-02-18 17:20:02', '2026-02-18 17:20:02', 'Admin dashboard', 'Italy');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `customer_locations`
--

CREATE TABLE `customer_locations` (
  `location_id` int NOT NULL,
  `subscription_id` int DEFAULT NULL,
  `location_name` varchar(255) DEFAULT NULL,
  `google_business_name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `google_business_address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `google_review_link` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `google_places_id` varchar(255) NOT NULL,
  `support_email` varchar(100) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `logo_link` varchar(255) NOT NULL,
  `has_linktree_access` tinyint(1) NOT NULL,
  `customer_location_slug` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `customer_locations`
--

INSERT INTO `customer_locations` (`location_id`, `subscription_id`, `location_name`, `google_business_name`, `google_business_address`, `city`, `postal_code`, `country`, `google_review_link`, `google_places_id`, `support_email`, `logo_path`, `logo_link`, `has_linktree_access`, `customer_location_slug`, `created_at`, `updated_at`) VALUES
(63, 69, 'Kawiarnia Mała Czarna', 'Kawiarnia Mała Czarna', 'Kawiarnia Mała Czarna, Aleja Jana Pawła II, Kędzierzyn-Koźle, Polska', 'Aleja Jana Pawła II', '', 'Polska', 'https://search.google.com/local/writereview?placeid=ChIJVVUyvRYREUcR-t5LmayyAqQ', 'ChIJVVUyvRYREUcR-t5LmayyAqQ', 'vikbobinski@gmail.com', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/6964997577015_mc.jpg', 'https://app.starlinkee.com/app/uploads/logos/6964997577015_mc.jpg', 0, '', '2025-05-31 03:37:12', '2026-01-12 06:49:25'),
(64, 70, 'McDonald\'s Wien', 'McDonald\'s Wien', 'McDonald\'s Wien, Wagramer Straße, Wien, Österreich', 'Wagramer Straße', '', 'Österreich', 'https://search.google.com/local/writereview?placeid=ChIJw5_OV54HbUcRsz2lXbCCst4', 'ChIJw5_OV54HbUcRsz2lXbCCst4', 'vikbobinski@gmail.com', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/685fd7a22e759_1000005508.jpg', 'https://app.starlinkee.com/app/uploads/logos/685fd7a22e759_1000005508.jpg', 0, 'mcd_wien', '2025-06-28 11:53:06', '2026-02-16 17:31:58'),
(65, 71, 'Hotel draccoria', 'Active Hotel Garni dal Bracconiere', 'Active Hotel Garni dal Bracconiere, Strada della Casina, Folgarida, Trydent, Włochy', 'Strada della Casina', '', 'Włochy', 'https://search.google.com/local/writereview?placeid=ChIJ_YjZOXdfgkcRyMuU0G5PyA4', 'ChIJ_YjZOXdfgkcRyMuU0G5PyA4', 'vikbobinski@gmail.com', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/6990b253d4040_1000010624.jpg', 'https://app.starlinkee.com/app/uploads/logos/6990b253d4040_1000010624.jpg', 0, '', '2026-02-14 17:35:15', '2026-02-14 17:35:15'),
(66, 72, 'Maciej kursnerz', 'KEBAB - PIZZA \"u Karolka\"', 'KEBAB - PIZZA \"u Karolka\", Warszawska, Wola Rasztowska, Polska', 'Warszawska', '', 'Polska', 'https://search.google.com/local/writereview?placeid=ChIJFRi29s3cHkcR0JpPmf23zMI', 'ChIJFRi29s3cHkcR0JpPmf23zMI', 'vikbobinski@gmail.com', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/6990dac9e79ee_1000010663.png', 'https://app.starlinkee.com/app/uploads/logos/6990dac9e79ee_1000010663.png', 0, '', '2026-02-14 20:27:53', '2026-02-14 20:27:53'),
(67, 73, 'Safran Pizza - Kebap', 'Safran Pizza - Kebap', 'Safran Pizza - Kebap, Wagramer Straße, Wiedeń, Austria', 'Wagramer Straße', '', 'Austria', 'https://search.google.com/local/writereview?placeid=ChIJ2UWMl8YHbUcRAqBKVbz-Ddo', 'ChIJ2UWMl8YHbUcRAqBKVbz-Ddo', 'office@safran-pizzakebap.com', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/6991b1929d7ad_1000010684.png', 'https://app.starlinkee.com/app/uploads/logos/6991b1929d7ad_1000010684.png', 0, '', '2026-02-15 11:44:18', '2026-02-15 11:44:18'),
(68, 74, 'Active Hotel Garni dal Bracconiere', 'Active Hotel Garni dal Bracconiere', 'Active Hotel Garni dal Bracconiere, Strada della Casina, Folgarida, Trydent, Włochy', 'Strada della Casina', '', 'Włochy', 'https://search.google.com/local/writereview?placeid=ChIJ_YjZOXdfgkcRyMuU0G5PyA4', 'ChIJ_YjZOXdfgkcRyMuU0G5PyA4', 'info@hoteldalbracconiere.it', '/usr/home/googlenfc-prod/domains/app.starlinkee.com/public_html/app/uploads/logos/69970720a0fec_1000010898.jpg', 'https://app.starlinkee.com/app/uploads/logos/69970720a0fec_1000010898.jpg', 0, '', '2026-02-19 12:50:40', '2026-02-19 12:50:40');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `error_logs`
--

CREATE TABLE `error_logs` (
  `log_id` int NOT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `event_data` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `orders`
--

CREATE TABLE `orders` (
  `order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fulfilled_at` timestamp NULL DEFAULT NULL,
  `payment_method` enum('cash','card','bank_transfer','stripe') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `stripe_payment_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `internal_payment_reference` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `orders`
--

INSERT INTO `orders` (`order_id`, `customer_id`, `status`, `created_at`, `fulfilled_at`, `payment_method`, `stripe_payment_id`, `stripe_payment_intent_id`, `internal_payment_reference`) VALUES
(246, 38, 'paid', '2025-05-30 23:29:16', '2025-05-30 23:29:16', 'cash', NULL, NULL, '[none]'),
(247, 39, 'paid', '2025-06-28 11:28:05', '2025-06-28 11:28:05', 'cash', NULL, NULL, '000'),
(248, 40, 'paid', '2026-02-14 17:31:44', '2026-02-14 17:31:44', 'cash', NULL, NULL, '000'),
(249, 40, 'paid', '2026-02-14 20:26:31', '2026-02-14 20:26:31', 'cash', NULL, NULL, '000'),
(250, 41, 'paid', '2026-02-15 11:42:26', '2026-02-15 11:42:26', 'cash', NULL, NULL, '000'),
(251, 42, 'paid', '2026-02-18 17:20:38', '2026-02-18 17:20:38', 'cash', NULL, NULL, '000');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int NOT NULL,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `quantity`) VALUES
(90, 246, 0, 1),
(91, 246, 2, 1),
(92, 247, 0, 1),
(93, 247, 2, 1),
(94, 248, 0, 1),
(95, 248, 2, 2),
(96, 249, 0, 1),
(97, 249, 2, 1),
(98, 250, 0, 1),
(99, 250, 2, 1),
(100, 251, 0, 1),
(101, 251, 2, 2);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `order_status_history`
--

CREATE TABLE `order_status_history` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `old_status` enum('pending','paid','shipped','delivered','claimed','returned','cancelled') DEFAULT NULL,
  `new_status` enum('pending','paid','shipped','delivered','claimed','returned','cancelled') NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `changed_by` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `plates`
--

CREATE TABLE `plates` (
  `plate_id` int NOT NULL,
  `subscription_id` int DEFAULT NULL,
  `plate_number` varchar(10) DEFAULT NULL,
  `plate_language` varchar(10) DEFAULT NULL,
  `number_of_visits` int NOT NULL DEFAULT '0',
  `secret_key` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `plates`
--

INSERT INTO `plates` (`plate_id`, `subscription_id`, `plate_number`, `plate_language`, `number_of_visits`, `secret_key`, `created_at`, `updated_at`) VALUES
(1073, NULL, 'RYZHQV', 'de', 0, '1b6442cfc81437004c5d146d885a31e8', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1074, NULL, 'DTVRQI', 'de', 0, 'b5df153499c1c05031af96ace2415941', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1075, NULL, 'XFGUIJ', 'de', 0, '3fba420cfdc2fb15ef53aadfdf310a7b', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1076, NULL, 'FWISVN', 'de', 0, '5bb6134a0e4f04e815c867a516574e15', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1077, NULL, 'PMDGFQ', 'de', 0, '0c297fdb937615d187680dbc8dd1a8bd', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1078, NULL, 'RCFBXT', 'de', 0, '26903ee6e86700e98851b93ee56e25ad', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1079, NULL, 'QLTRAM', 'de', 0, '6c8cb92522a25fe262305950374216a5', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1080, NULL, 'JYTOIV', 'de', 0, '4d602bb2c83e0351a64efb8acb1e3b39', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1081, NULL, 'SJCYMV', 'de', 0, '985e359dd1e400b80f5d13061277f532', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1082, NULL, 'AGIBLS', 'de', 0, 'c9cbeff7237b71230374f696099a5910', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1083, NULL, 'BYXOPF', 'de', 0, '9dcede6240e8a3e1d2f8e4f476a4db26', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1084, NULL, 'ZMXEPL', 'de', 0, '7126230a1679e25cde1239984f8e632e', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1085, NULL, 'RCBPSQ', 'de', 0, '4018f28f33b5a9ec0fbfe70c78bb3643', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1086, 70, 'TJRUAO', 'de', 36, 'ba3e54f1eea72e7423e278f37040f619', '2025-03-15 17:51:10', '2025-07-11 18:13:53'),
(1087, NULL, 'VGXKYN', 'de', 0, '364630bc1c448b70ed0533a7435bf1b4', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1088, NULL, 'FTXWMU', 'de', 0, '2b1e04fa12c8785537c4813cc23e8323', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1089, NULL, 'QGUBYP', 'de', 0, 'c9db11a4da6f8dee08aee333997cf68a', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1090, NULL, 'ESUTQI', 'de', 0, '8da932a902a6d13be0446f421baeedec', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1091, NULL, 'FPYHJN', 'de', 0, 'bf46018081af0a948bcfc1c6ae885bf6', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1092, NULL, 'ULPVZB', 'de', 0, '017994e697ca7f5a3a830a36f53e6bf0', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1093, NULL, 'JYGXWB', 'de', 0, '72bf59d4db6ed51d6e4049f7cb546847', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1094, NULL, 'DLWUNV', 'de', 0, '6a6cd4785d6e80f97ea590a86aa7a95e', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1095, NULL, 'VCDTLR', 'de', 0, '81bd8e8e26ca49fc22a43d2e05dcc251', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1096, NULL, 'YVTAHM', 'de', 0, '6c27a18136001a646704f031367b9d89', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1097, NULL, 'CIXWSZ', 'de', 0, '1836e92e60aab6d79d449ff4e6c1297f', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1098, NULL, 'GITUXC', 'de', 0, '3eece4f22782cacb6b8f8f8fa88ca9cc', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1099, 71, 'WJRXQY', 'de', 2, 'c58e3bde2f5c975958f3d4c5d4acc17f', '2025-03-15 17:51:10', '2026-02-14 18:35:35'),
(1100, 70, 'WOKIDT', 'de', 2, '1b729afa3f222e483e8dd1e2db3526ec', '2025-03-15 17:51:10', '2026-02-14 21:03:29'),
(1101, NULL, 'WRVYUN', 'de', 0, '7b66556daf754dd61506b1c93e6a7169', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1102, NULL, 'BWVGFJ', 'de', 0, 'f140d2f2b4df4df4f594cda6935e71a3', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1103, NULL, 'DNWLZT', 'de', 0, 'cfac33376797b73dcff9a300ce98ea41', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1104, NULL, 'CVQFLA', 'de', 0, '9a08ec7be18e8d01dcca681fb072b918', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1105, NULL, 'VPKOJT', 'de', 0, '242d3622e930ad62af5f2ae4ff4071e0', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1106, NULL, 'GZEBKR', 'de', 0, 'a760f921bf98a2f8d84350e1843f7e92', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1107, NULL, 'OXYLAC', 'de', 0, '46622b65f8889c4611846c00f395d667', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1108, NULL, 'GYDNRT', 'de', 0, 'c8c63fd7ac8c34ac49f2bd42d5dcd688', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1109, NULL, 'LKEHBT', 'de', 0, '00be37c9f3aa1c5c935ccbc0bc2780a7', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1110, NULL, 'KYXOUJ', 'de', 0, '3e1a869953dcb834b6745f88a67bbf79', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1111, NULL, 'BFSTYD', 'de', 0, '1aedc34afa8d26349a59598c883dfa7c', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1112, NULL, 'NFPMCX', 'de', 0, 'cc461a6967d075ca76970d2aaad3dfeb', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1113, NULL, 'CHQIRP', 'de', 0, '777e05e09014a6bb30fec2a1dcb1dcc5', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1114, NULL, 'HYWAIU', 'de', 0, '6e43ef1d04d40497b621068fc01fc6cf', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1115, NULL, 'AERFMO', 'de', 0, '3f583ab9073fc183de8d9e61ae4fd74e', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1116, NULL, 'QJVNFA', 'de', 0, '66c25a12d120a094c8a1c3eb6a149711', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1117, NULL, 'ZYTPFQ', 'de', 0, '62fd9e72a5bbeb9a5017398849599b99', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1118, NULL, 'ZXCVMT', 'de', 0, '8814fcf92ac61137ff8f957056dc3fec', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1119, NULL, 'EPWFRZ', 'de', 0, 'b1c527755f7370c792af4d9fd3b7ceed', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1120, NULL, 'KTQFPN', 'de', 0, 'f90410473747da2f63dbf9ba5faa57a7', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1121, NULL, 'HFEZAM', 'de', 0, 'c676af2e5b6148b2e6d620f031e18bb3', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1122, NULL, 'NFRKQX', 'de', 0, '0157945ee6f76463f9aece703d01be96', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1123, NULL, 'SQWRKV', 'de', 0, '4d9c88840b367c16ba2d16fd9d6911b0', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1124, NULL, 'BDWQEP', 'de', 0, 'abc6a9115256d1d0483aa4bca3383875', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1125, NULL, 'VKRXIW', 'de', 0, 'f4584a6315172e7aafa0040e57615fe9', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1126, NULL, 'MGNYLH', 'de', 0, '72a0a3827d517a72987fd37a42ae3a2f', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1127, NULL, 'SILKCP', 'de', 0, 'd4288aef1fd18989bd9406099251b153', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1128, NULL, 'QBCNKL', 'de', 0, '1c81115e1ddbc2130d75d07db62fdde2', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1129, NULL, 'LDIWCB', 'de', 0, '15f59f26f25db0a2a62bd55bd7976663', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1130, NULL, 'YHXJQO', 'de', 0, '12f04ddd3c751f7339ab4e9e5ebab812', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1131, NULL, 'MXAQLG', 'de', 0, 'eb739d1c1833b852bffc6f7658244258', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1132, 73, 'WHYRGN', 'de', 2, '42440aaf956085c9cf27eb1b966999ee', '2025-03-15 17:51:10', '2026-02-15 12:44:37'),
(1133, NULL, 'HXCTZS', 'de', 0, '2791b69d2f6ae902331b51424fc92abb', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1134, NULL, 'DZLMJN', 'de', 0, '2c9ee3b50143b273231accf0e76cf259', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1135, NULL, 'HRPKEA', 'de', 0, '2ff0515fd871da6f162b3edf91304e11', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1136, NULL, 'DKBJVP', 'de', 0, 'e01410c0f8ac329282309ace2195a759', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1137, NULL, 'PBIFRX', 'de', 0, '3ba63543dcc67bec515d2223fc577246', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1138, NULL, 'AVFBKG', 'de', 0, '7897c6ad65d4663e4941652d8e4c7fab', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1139, NULL, 'GIBMON', 'de', 0, 'f23bfbec1383ed3bb432357281c02364', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1140, NULL, 'OVSYFH', 'de', 0, 'fd93bf66837305a5789ccf31ae858a38', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1141, NULL, 'BVJTAN', 'de', 0, '5868801c34e7173c44f2cdb57cbaec40', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1142, NULL, 'DLRVGU', 'de', 0, '8cc4af90bdc4034e0789960a14976fcc', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1143, NULL, 'NPFRBT', 'de', 0, '876918834443be13b130246a43c7dd9b', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1144, NULL, 'VAZSWT', 'de', 0, '73d0a12e9b7491411327dfba77a79982', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1145, NULL, 'XDIQPW', 'de', 0, '9491b2a946970a165c9dd933e458a82a', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1146, 72, 'MJZDUL', 'de', 2, '0ea1b48d8c202b0f62375d22f7339087', '2025-03-15 17:51:10', '2026-02-14 21:43:10'),
(1147, NULL, 'MQIULH', 'de', 0, 'dd8a8679936e6fb4b2fa3bdf7e4da9e0', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1148, NULL, 'LRZTMJ', 'de', 0, 'd137646330b3bae69ac1e6d66587caa3', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1149, NULL, 'ZARKUO', 'de', 0, 'b6305d8463dfb850d05d1ff0cdf7f44c', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1150, NULL, 'ICNTRE', 'de', 0, '24227d470ae50469b5678e24c95b7e06', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1151, NULL, 'CHWSJI', 'de', 0, '18b06d7c8430106f1a06c5437860c404', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1152, NULL, 'DKSCNE', 'de', 0, '2277a6f600d26d6fb846c731861fc193', '2025-03-15 17:51:10', '2025-03-15 17:51:10'),
(1153, NULL, 'JYIBQH', 'pl', 0, '96ffddaa3d0cd486cc32415172894c1d', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1154, NULL, 'MQEDSU', 'pl', 0, '9f8dafb9e7813eda89b723747061332b', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1155, NULL, 'WCFDTQ', 'pl', 0, '15c80355c8d76ee37f61a6ff70be7058', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1156, 74, 'KZSPLX', 'pl', 45, 'f55d17144065e73e414b355161fc8795', '2025-03-15 17:51:14', '2026-03-22 21:32:01'),
(1157, NULL, 'ZGTUAH', 'pl', 0, '9682ffc9effb0b0171e2f12e9f851348', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1158, NULL, 'VBDSNT', 'pl', 0, 'fc0dbc3ff61e9d43cf0618da63e85f02', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1159, 74, 'KHERCJ', 'pl', 116, '8ccdd5cda44422bfe802dce28bd79692', '2025-03-15 17:51:14', '2026-03-31 16:33:15'),
(1160, NULL, 'ETVMOD', 'pl', 0, 'df033c817b5aa7bc5329894a25ef1373', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1161, NULL, 'NYKJLQ', 'pl', 0, 'c0f3a9c76e5e57b313a505d5fa9a0baa', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1162, NULL, 'RCYZNS', 'pl', 0, 'bf49aa437576effc0e48f10659707b3a', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1163, NULL, 'CHGYSX', 'pl', 0, '954e60ba593e414e4977dd263737b93e', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1164, 69, 'ZDEQIT', 'pl', 155, '59893062f06cf95c0e187ee890f697e5', '2025-03-15 17:51:14', '2026-06-12 11:19:23'),
(1165, NULL, 'GJOIQB', 'pl', 0, '7eb7846a2cafbf7fa5f201e7287614f3', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1166, NULL, 'XZINBM', 'pl', 0, 'bc53b661b3d8192b1772d74297fa70c7', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1167, NULL, 'PLIARY', 'pl', 0, 'ddc0c3eb114380ac7df5ebfab5a54350', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1168, 71, 'HAOPDG', 'pl', 2, '9b93cb51df9d088a6fbe43c6d10acdd1', '2025-03-15 17:51:14', '2026-02-14 18:35:47'),
(1169, NULL, 'VGUKWO', 'pl', 0, '7f967469013f55ad633190aba3e07a46', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1170, NULL, 'CDKQSJ', 'pl', 0, 'd485602e2c4b0d6faff25d8aabb36a4e', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1171, NULL, 'BHCPMU', 'pl', 0, 'b5f9c448880e23d3023daf180e76bd88', '2025-03-15 17:51:14', '2025-03-15 17:51:14'),
(1172, NULL, 'PYNHJE', 'pl', 0, 'b71850d466d24b33b82c8843441e5aee', '2025-03-15 17:51:14', '2025-03-15 17:51:14');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `products`
--

CREATE TABLE `products` (
  `product_id` int NOT NULL,
  `category` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_free` tinyint(1) DEFAULT '0',
  `price` decimal(10,2) NOT NULL,
  `creation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `stripe_product_id` varchar(255) DEFAULT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `products`
--

INSERT INTO `products` (`product_id`, `category`, `name`, `description`, `is_free`, `price`, `creation_date`, `stripe_product_id`, `stripe_price_id`) VALUES
(0, 'subscription', '1_MONTH_SUB_FREE', '1 month free subscription', 1, 0.00, '2024-12-10 16:55:56', NULL, NULL),
(1, 'subscription', '1_YEAR_SUB', '370 days subscription for a single google business card and unlimited plates', 0, 99.90, '2024-12-03 12:06:25', NULL, NULL),
(2, 'plate', 'PLATE', 'A google review plate. Requires a subscription to work.', 0, 19.90, '2024-12-03 12:16:40', NULL, NULL),
(3, 'shipping', 'DOMESTIC_SHIPPING_AUSTRIA', NULL, 0, 9.90, '2025-02-01 14:02:29', NULL, NULL),
(4, 'shipping', 'INTERNATIONAL_SHIPPING_EUROPE', NULL, 0, 14.90, '2025-02-01 14:03:18', NULL, NULL);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `reviews`
--

CREATE TABLE `reviews` (
  `review_id` int NOT NULL,
  `plate_id` int NOT NULL,
  `scan_id` varchar(255) NOT NULL,
  `ip_address` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `scan_time` timestamp NOT NULL,
  `rating` int DEFAULT NULL,
  `rating_time` timestamp NULL DEFAULT NULL,
  `feedback_message` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `user_name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `feedback_time` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `reviews`
--

INSERT INTO `reviews` (`review_id`, `plate_id`, `scan_id`, `ip_address`, `scan_time`, `rating`, `rating_time`, `feedback_message`, `contact_email`, `contact_phone`, `user_name`, `feedback_time`, `created_at`, `updated_at`) VALUES
(126, 1164, '683a79822a114', NULL, '2025-05-31 03:37:38', 3, '2025-05-31 03:37:57', 'ccc', 'anonymous@anonymous.com', 'anonymous', 'Anonymous', '2025-05-31 05:38:03', '2025-05-31 03:37:38', '2025-05-31 03:38:03'),
(127, 1164, '683adcaf584d4', NULL, '2025-05-31 10:40:47', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:40:47', '2025-05-31 10:40:47'),
(128, 1164, '683adce9ed237', NULL, '2025-05-31 10:41:45', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:41:45', '2025-05-31 10:41:45'),
(129, 1164, '683add55cffe9', NULL, '2025-05-31 10:43:33', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:43:33', '2025-05-31 10:43:33'),
(130, 1164, '683ade3007612', NULL, '2025-05-31 10:47:12', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:47:12', '2025-05-31 10:47:12'),
(131, 1164, '683adf42a9956', NULL, '2025-05-31 10:51:46', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:51:46', '2025-05-31 10:51:46'),
(132, 1164, '683adf42a9dc9', NULL, '2025-05-31 10:51:46', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:51:46', '2025-05-31 10:51:46'),
(133, 1164, '683adf62c1f9c', NULL, '2025-05-31 10:52:18', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:52:18', '2025-05-31 10:52:18'),
(134, 1164, '683adf813448c', NULL, '2025-05-31 10:52:49', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 10:52:49', '2025-05-31 10:52:49'),
(135, 1164, '683af03a24ca1', NULL, '2025-05-31 12:04:10', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-05-31 12:04:10', '2025-05-31 12:04:10'),
(136, 1164, '683af2d7e6c6e', NULL, '2025-05-31 12:15:19', 3, '2025-05-31 12:15:23', 'dd', 'anonymous@anonymous.com', 'anonymous', 'Anonymous', '2025-05-31 14:18:11', '2025-05-31 12:15:19', '2025-05-31 12:18:11'),
(137, 1164, '683b2650c4732', NULL, '2025-05-31 15:54:56', 3, '2025-05-31 15:55:18', NULL, NULL, NULL, '', NULL, '2025-05-31 15:54:56', '2025-05-31 15:55:18'),
(138, 1164, '683b29af966d4', NULL, '2025-05-31 16:09:19', 5, '2025-05-31 16:09:24', NULL, NULL, NULL, '', NULL, '2025-05-31 16:09:19', '2025-05-31 16:09:24'),
(139, 1164, '683c426310cb3', NULL, '2025-06-01 12:06:59', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 12:06:59', '2025-06-01 12:06:59'),
(140, 1164, '683c432e0c33b', NULL, '2025-06-01 12:10:22', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 12:10:22', '2025-06-01 12:10:22'),
(141, 1164, '683c43f54b03b', NULL, '2025-06-01 12:13:41', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 12:13:41', '2025-06-01 12:13:41'),
(142, 1164, '683c4421a50f7', NULL, '2025-06-01 12:14:25', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 12:14:25', '2025-06-01 12:14:25'),
(143, 1164, '683c4fb70e9ef', NULL, '2025-06-01 13:03:51', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 13:03:51', '2025-06-01 13:03:51'),
(144, 1164, '683c505c2a1b2', NULL, '2025-06-01 13:06:36', 4, '2025-06-01 13:06:40', NULL, NULL, NULL, '', NULL, '2025-06-01 13:06:36', '2025-06-01 13:06:40'),
(145, 1164, '683c7623a86dc', NULL, '2025-06-01 15:47:47', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-01 15:47:47', '2025-06-01 15:47:47'),
(146, 1164, '683df4db645e0', NULL, '2025-06-02 19:00:43', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-02 19:00:43', '2025-06-02 19:00:43'),
(147, 1164, '683eb0bf77851', NULL, '2025-06-03 08:22:23', 5, '2025-06-03 08:22:33', NULL, NULL, NULL, '', NULL, '2025-06-03 08:22:23', '2025-06-03 08:22:33'),
(148, 1164, '683eb2c50f774', NULL, '2025-06-03 08:31:01', 3, '2025-06-03 08:31:09', NULL, NULL, NULL, '', NULL, '2025-06-03 08:31:01', '2025-06-03 08:31:09'),
(149, 1164, '68446bb05f235', NULL, '2025-06-07 16:41:20', 5, '2025-06-07 16:41:28', NULL, NULL, NULL, '', NULL, '2025-06-07 16:41:20', '2025-06-07 16:41:28'),
(150, 1164, '685d0a92c9bae', NULL, '2025-06-26 08:53:38', 5, '2025-06-26 08:53:47', NULL, NULL, NULL, '', NULL, '2025-06-26 08:53:38', '2025-06-26 08:53:47'),
(151, 1164, '685d17b935c8b', NULL, '2025-06-26 09:49:45', 1, '2025-06-26 09:49:50', NULL, NULL, NULL, '', NULL, '2025-06-26 09:49:45', '2025-06-26 09:49:50'),
(152, 1086, '685fd7bb44f07', NULL, '2025-06-28 11:53:31', 3, '2025-06-28 11:53:41', NULL, NULL, NULL, '', NULL, '2025-06-28 11:53:31', '2025-06-28 11:53:41'),
(153, 1086, '685fd7db24766', NULL, '2025-06-28 11:54:03', 4, '2025-06-28 11:54:05', NULL, NULL, NULL, '', NULL, '2025-06-28 11:54:03', '2025-06-28 11:54:05'),
(154, 1086, '685fd80e547ac', NULL, '2025-06-28 11:54:54', 1, '2025-06-28 11:54:55', NULL, NULL, NULL, '', NULL, '2025-06-28 11:54:54', '2025-06-28 11:54:55'),
(155, 1086, '685fdec14185f', NULL, '2025-06-28 12:23:29', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-28 12:23:29', '2025-06-28 12:23:29'),
(156, 1086, '685fe1c2ce950', NULL, '2025-06-28 12:36:18', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-28 12:36:18', '2025-06-28 12:36:18'),
(157, 1086, '685fe4b372ccd', NULL, '2025-06-28 12:48:51', 5, '2025-06-28 12:48:56', NULL, NULL, NULL, '', NULL, '2025-06-28 12:48:51', '2025-06-28 12:48:56'),
(158, 1086, '685fe5127cd1e', NULL, '2025-06-28 12:50:26', 1, '2025-06-28 12:50:31', NULL, NULL, NULL, '', NULL, '2025-06-28 12:50:26', '2025-06-28 12:50:31'),
(159, 1086, '685fe73b5c75a', NULL, '2025-06-28 12:59:39', 5, '2025-06-28 12:59:46', NULL, NULL, NULL, '', NULL, '2025-06-28 12:59:39', '2025-06-28 12:59:46'),
(160, 1086, '685fe9634dc8a', NULL, '2025-06-28 13:08:51', 5, '2025-06-28 13:08:53', NULL, NULL, NULL, '', NULL, '2025-06-28 13:08:51', '2025-06-28 13:08:53'),
(161, 1086, '685fedf7cdd2b', NULL, '2025-06-28 13:28:23', 5, '2025-06-28 13:28:37', NULL, NULL, NULL, '', NULL, '2025-06-28 13:28:23', '2025-06-28 13:28:37'),
(162, 1164, '68600b4dc331f', NULL, '2025-06-28 15:33:33', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-28 15:33:33', '2025-06-28 15:33:33'),
(163, 1100, '68603f946e86b', NULL, '2025-06-28 19:16:36', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-06-28 19:16:36', '2025-06-28 19:16:36'),
(164, 1086, '686d1c8fdea3d', NULL, '2025-07-08 13:26:39', 1, '2025-07-08 13:27:07', NULL, NULL, NULL, '', NULL, '2025-07-08 13:26:39', '2025-07-08 13:27:07'),
(165, 1086, '686d1d91db0ac', NULL, '2025-07-08 13:30:57', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-07-08 13:30:57', '2025-07-08 13:30:57'),
(166, 1086, '687137ed251f9', NULL, '2025-07-11 16:12:29', 1, '2025-07-11 16:12:39', NULL, NULL, NULL, '', NULL, '2025-07-11 16:12:29', '2025-07-11 16:12:39'),
(167, 1086, '6871384179dc1', NULL, '2025-07-11 16:13:53', 5, '2025-07-11 16:13:55', NULL, NULL, NULL, '', NULL, '2025-07-11 16:13:53', '2025-07-11 16:13:55'),
(168, 1164, '687d1a7915063', NULL, '2025-07-20 16:34:01', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-07-20 16:34:01', '2025-07-20 16:34:01'),
(169, 1164, '689372116f40d', NULL, '2025-08-06 15:17:37', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-06 15:17:37', '2025-08-06 15:17:37'),
(170, 1164, '68948f905cd60', NULL, '2025-08-07 11:35:44', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-07 11:35:44', '2025-08-07 11:35:44'),
(171, 1164, '68948f93baab4', NULL, '2025-08-07 11:35:47', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-07 11:35:47', '2025-08-07 11:35:47'),
(172, 1164, '689b241a43122', NULL, '2025-08-12 11:23:06', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-12 11:23:06', '2025-08-12 11:23:06'),
(173, 1164, '689b2431df533', NULL, '2025-08-12 11:23:29', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-12 11:23:29', '2025-08-12 11:23:29'),
(174, 1164, '68b1a4d41eeb4', NULL, '2025-08-29 13:02:12', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-29 13:02:12', '2025-08-29 13:02:12'),
(175, 1164, '68b1a4d57a668', NULL, '2025-08-29 13:02:13', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-29 13:02:13', '2025-08-29 13:02:13'),
(176, 1164, '68b1a5f8d6539', NULL, '2025-08-29 13:07:04', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-29 13:07:04', '2025-08-29 13:07:04'),
(177, 1164, '68b1a5fb65748', NULL, '2025-08-29 13:07:07', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-29 13:07:07', '2025-08-29 13:07:07'),
(178, 1164, '68b1a6053684a', NULL, '2025-08-29 13:07:17', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-08-29 13:07:17', '2025-08-29 13:07:17'),
(179, 1164, '68b6f83a5bc91', NULL, '2025-09-02 13:59:22', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-09-02 13:59:22', '2025-09-02 13:59:22'),
(180, 1164, '68d00dda158d9', NULL, '2025-09-21 14:38:18', 5, '2025-09-21 14:38:21', NULL, NULL, NULL, '', NULL, '2025-09-21 14:38:18', '2025-09-21 14:38:21'),
(181, 1164, '68dbc1a439f53', NULL, '2025-09-30 11:40:20', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-09-30 11:40:20', '2025-09-30 11:40:20'),
(182, 1164, '68dbc1d048883', NULL, '2025-09-30 11:41:04', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-09-30 11:41:04', '2025-09-30 11:41:04'),
(183, 1164, '68dbff0c55fd5', NULL, '2025-09-30 16:02:20', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-09-30 16:02:20', '2025-09-30 16:02:20'),
(184, 1164, '68f8da9ba543f', NULL, '2025-10-22 13:22:35', 5, '2025-10-22 13:23:04', NULL, NULL, NULL, '', NULL, '2025-10-22 13:22:35', '2025-10-22 13:23:04'),
(185, 1164, '68f8dace3f16a', NULL, '2025-10-22 13:23:26', 5, '2025-10-22 13:23:27', NULL, NULL, NULL, '', NULL, '2025-10-22 13:23:26', '2025-10-22 13:23:27'),
(186, 1164, '69073bfe5c57d', NULL, '2025-11-02 11:09:50', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-11-02 11:09:50', '2025-11-02 11:09:50'),
(187, 1164, '69137696cea4c', NULL, '2025-11-11 17:47:02', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-11-11 17:47:02', '2025-11-11 17:47:02'),
(188, 1164, '691376b7dba88', NULL, '2025-11-11 17:47:35', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-11-11 17:47:35', '2025-11-11 17:47:35'),
(189, 1164, '6915f122b12c6', NULL, '2025-11-13 14:54:26', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-11-13 14:54:26', '2025-11-13 14:54:26'),
(190, 1164, '69357ebb2ed3d', NULL, '2025-12-07 13:18:51', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-12-07 13:18:51', '2025-12-07 13:18:51'),
(191, 1164, '6953acb878998', NULL, '2025-12-30 10:43:04', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-12-30 10:43:04', '2025-12-30 10:43:04'),
(192, 1164, '6953da9ec5058', NULL, '2025-12-30 13:58:54', NULL, NULL, NULL, NULL, NULL, '', NULL, '2025-12-30 13:58:54', '2025-12-30 13:58:54'),
(193, 1164, '6957daf6192e0', NULL, '2026-01-02 14:49:26', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-02 14:49:26', '2026-01-02 14:49:26'),
(194, 1164, '6959190c32d9e', NULL, '2026-01-03 13:26:36', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-03 13:26:36', '2026-01-03 13:26:36'),
(195, 1164, '69591920d5d22', NULL, '2026-01-03 13:26:56', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-03 13:26:56', '2026-01-03 13:26:56'),
(196, 1164, '6959192df08e2', NULL, '2026-01-03 13:27:09', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-03 13:27:09', '2026-01-03 13:27:09'),
(197, 1164, '695919f85a2bd', NULL, '2026-01-03 13:30:32', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-03 13:30:32', '2026-01-03 13:30:32'),
(198, 1164, '696496bb8b3a8', NULL, '2026-01-12 06:37:47', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-12 06:37:47', '2026-01-12 06:37:47'),
(199, 1164, '6964997d788ed', NULL, '2026-01-12 06:49:33', 5, '2026-01-12 06:49:39', NULL, NULL, NULL, '', NULL, '2026-01-12 06:49:33', '2026-01-12 06:49:39'),
(200, 1164, '6964cc4ad4828', NULL, '2026-01-12 10:26:18', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-01-12 10:26:18', '2026-01-12 10:26:18'),
(201, 1164, '6966553f10e11', NULL, '2026-01-13 14:22:55', 5, '2026-01-13 14:22:59', NULL, NULL, NULL, '', NULL, '2026-01-13 14:22:55', '2026-01-13 14:22:59'),
(202, 1164, '6966554beeb11', NULL, '2026-01-13 14:23:07', 5, '2026-01-13 14:23:10', NULL, NULL, NULL, '', NULL, '2026-01-13 14:23:07', '2026-01-13 14:23:10'),
(203, 1164, '698df13b8ee0d', NULL, '2026-02-12 15:26:51', 5, '2026-02-12 15:26:59', NULL, NULL, NULL, '', NULL, '2026-02-12 15:26:51', '2026-02-12 15:26:59'),
(204, 1099, '6990b25d3ee42', NULL, '2026-02-14 17:35:25', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-14 17:35:25', '2026-02-14 17:35:25'),
(205, 1168, '6990b262aa30a', NULL, '2026-02-14 17:35:30', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-14 17:35:30', '2026-02-14 17:35:30'),
(206, 1099, '6990b267baff3', NULL, '2026-02-14 17:35:35', 2, '2026-02-14 17:35:37', 'Zzz', 'anonymous@anonymous.com', 'anonymous', 'Anonymous', '2026-02-14 18:35:42', '2026-02-14 17:35:35', '2026-02-14 17:35:42'),
(207, 1168, '6990b273a4ae0', NULL, '2026-02-14 17:35:47', 5, '2026-02-14 17:35:48', NULL, NULL, NULL, '', NULL, '2026-02-14 17:35:47', '2026-02-14 17:35:48'),
(208, 1100, '6990d511d1753', NULL, '2026-02-14 20:03:29', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-14 20:03:29', '2026-02-14 20:03:29'),
(209, 1146, '6990dace87faa', NULL, '2026-02-14 20:27:58', 5, '2026-02-14 20:28:03', NULL, NULL, NULL, '', NULL, '2026-02-14 20:27:58', '2026-02-14 20:28:03'),
(210, 1146, '6990de5e24ff0', NULL, '2026-02-14 20:43:10', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-14 20:43:10', '2026-02-14 20:43:10'),
(211, 1132, '6991b1972ca83', NULL, '2026-02-15 11:44:23', 2, '2026-02-15 11:44:30', NULL, NULL, NULL, '', NULL, '2026-02-15 11:44:23', '2026-02-15 11:44:30'),
(212, 1132, '6991b1a5076ac', NULL, '2026-02-15 11:44:37', 4, '2026-02-15 11:44:38', NULL, NULL, NULL, '', NULL, '2026-02-15 11:44:37', '2026-02-15 11:44:38'),
(213, 1159, '69970727d3792', NULL, '2026-02-19 12:50:47', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-19 12:50:47', '2026-02-19 12:50:47'),
(214, 1156, '699707336732f', NULL, '2026-02-19 12:50:59', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-19 12:50:59', '2026-02-19 12:50:59'),
(215, 1156, '6997073f62cff', NULL, '2026-02-19 12:51:11', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-19 12:51:11', '2026-02-19 12:51:11'),
(216, 1164, '6998a9281d335', NULL, '2026-02-20 18:34:16', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-20 18:34:16', '2026-02-20 18:34:16'),
(217, 1159, '699c74bf87868', NULL, '2026-02-23 15:39:43', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-23 15:39:43', '2026-02-23 15:39:43'),
(218, 1159, '699c74ca365d7', NULL, '2026-02-23 15:39:54', 5, '2026-02-23 15:39:56', NULL, NULL, NULL, '', NULL, '2026-02-23 15:39:54', '2026-02-23 15:39:56'),
(219, 1159, '699c74fdbf098', NULL, '2026-02-23 15:40:45', 5, '2026-02-23 15:40:47', NULL, NULL, NULL, '', NULL, '2026-02-23 15:40:45', '2026-02-23 15:40:47'),
(220, 1156, '699c750246e17', NULL, '2026-02-23 15:40:50', 5, '2026-02-23 15:40:52', NULL, NULL, NULL, '', NULL, '2026-02-23 15:40:50', '2026-02-23 15:40:52'),
(221, 1159, '699ca24f40cb7', NULL, '2026-02-23 18:54:07', 5, '2026-02-23 18:54:09', NULL, NULL, NULL, '', NULL, '2026-02-23 18:54:07', '2026-02-23 18:54:09'),
(222, 1159, '699ca25885155', NULL, '2026-02-23 18:54:16', 5, '2026-02-23 18:54:27', NULL, NULL, NULL, '', NULL, '2026-02-23 18:54:16', '2026-02-23 18:54:27'),
(223, 1159, '699ca260ccd0a', NULL, '2026-02-23 18:54:24', 5, '2026-02-23 18:54:28', NULL, NULL, NULL, '', NULL, '2026-02-23 18:54:24', '2026-02-23 18:54:28'),
(224, 1159, '699ca27a2f95d', NULL, '2026-02-23 18:54:50', 5, '2026-02-23 18:54:53', NULL, NULL, NULL, '', NULL, '2026-02-23 18:54:50', '2026-02-23 18:54:53'),
(225, 1159, '699ca2834caaa', NULL, '2026-02-23 18:54:59', 5, '2026-02-23 18:55:02', NULL, NULL, NULL, '', NULL, '2026-02-23 18:54:59', '2026-02-23 18:55:02'),
(226, 1159, '699ca2d7371b4', NULL, '2026-02-23 18:56:23', 5, '2026-02-23 18:56:24', NULL, NULL, NULL, '', NULL, '2026-02-23 18:56:23', '2026-02-23 18:56:24'),
(227, 1159, '699ca2f58af9e', NULL, '2026-02-23 18:56:53', 1, '2026-02-23 18:57:05', NULL, NULL, NULL, '', NULL, '2026-02-23 18:56:53', '2026-02-23 18:57:05'),
(228, 1159, '699ca316899f3', NULL, '2026-02-23 18:57:26', 1, '2026-02-23 18:57:51', NULL, NULL, NULL, '', NULL, '2026-02-23 18:57:26', '2026-02-23 18:57:51'),
(229, 1159, '699ca32fd58f9', NULL, '2026-02-23 18:57:51', 3, '2026-02-23 18:58:05', NULL, NULL, NULL, '', NULL, '2026-02-23 18:57:51', '2026-02-23 18:58:05'),
(230, 1159, '699ca33f6c149', NULL, '2026-02-23 18:58:07', 5, '2026-02-23 18:58:14', NULL, NULL, NULL, '', NULL, '2026-02-23 18:58:07', '2026-02-23 18:58:14'),
(231, 1159, '699ca34863713', NULL, '2026-02-23 18:58:16', 5, '2026-02-23 18:58:18', NULL, NULL, NULL, '', NULL, '2026-02-23 18:58:16', '2026-02-23 18:58:18'),
(232, 1159, '69a08795354f3', NULL, '2026-02-26 17:49:09', 5, '2026-02-26 17:49:35', NULL, NULL, NULL, '', NULL, '2026-02-26 17:49:09', '2026-02-26 17:49:35'),
(233, 1159, '69a08f4fc2a70', NULL, '2026-02-26 18:22:07', 1, '2026-02-26 18:22:50', NULL, NULL, NULL, '', NULL, '2026-02-26 18:22:07', '2026-02-26 18:22:50'),
(234, 1159, '69a08f795d84e', NULL, '2026-02-26 18:22:49', 5, '2026-02-26 18:22:58', NULL, NULL, NULL, '', NULL, '2026-02-26 18:22:49', '2026-02-26 18:22:58'),
(235, 1159, '69a08f809606d', NULL, '2026-02-26 18:22:56', 5, '2026-02-26 18:23:11', NULL, NULL, NULL, '', NULL, '2026-02-26 18:22:56', '2026-02-26 18:23:11'),
(236, 1159, '69a091d0c8cfa', NULL, '2026-02-26 18:32:48', 5, '2026-02-26 18:33:11', NULL, NULL, NULL, '', NULL, '2026-02-26 18:32:48', '2026-02-26 18:33:11'),
(237, 1159, '69a093d42206f', NULL, '2026-02-26 18:41:24', 5, '2026-02-26 18:42:28', NULL, NULL, NULL, '', NULL, '2026-02-26 18:41:24', '2026-02-26 18:42:28'),
(238, 1159, '69a094b83b295', NULL, '2026-02-26 18:45:12', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-26 18:45:12', '2026-02-26 18:45:12'),
(239, 1159, '69a09525a0d7a', NULL, '2026-02-26 18:47:01', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-26 18:47:01', '2026-02-26 18:47:01'),
(240, 1159, '69a09ad40d6d3', NULL, '2026-02-26 19:11:16', 5, '2026-02-26 19:12:26', NULL, NULL, NULL, '', NULL, '2026-02-26 19:11:16', '2026-02-26 19:12:26'),
(241, 1159, '69a09b2508c52', NULL, '2026-02-26 19:12:37', 5, '2026-02-26 19:12:50', NULL, NULL, NULL, '', NULL, '2026-02-26 19:12:37', '2026-02-26 19:12:50'),
(242, 1159, '69a143706b182', NULL, '2026-02-27 07:10:40', 5, '2026-02-27 07:10:44', NULL, NULL, NULL, '', NULL, '2026-02-27 07:10:40', '2026-02-27 07:10:44'),
(243, 1159, '69a14388af72c', NULL, '2026-02-27 07:11:04', 5, '2026-02-27 07:11:08', NULL, NULL, NULL, '', NULL, '2026-02-27 07:11:04', '2026-02-27 07:11:08'),
(244, 1159, '69a143a6075d6', NULL, '2026-02-27 07:11:34', 5, '2026-02-27 07:11:36', NULL, NULL, NULL, '', NULL, '2026-02-27 07:11:34', '2026-02-27 07:11:36'),
(245, 1159, '69a144a2abe5b', NULL, '2026-02-27 07:15:46', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 07:15:46', '2026-02-27 07:15:46'),
(246, 1156, '69a19ec13547a', NULL, '2026-02-27 13:40:17', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 13:40:17', '2026-02-27 13:40:17'),
(247, 1156, '69a19f655e4f5', NULL, '2026-02-27 13:43:01', 5, '2026-02-27 13:43:04', NULL, NULL, NULL, '', NULL, '2026-02-27 13:43:01', '2026-02-27 13:43:04'),
(248, 1156, '69a19f6f7f28b', NULL, '2026-02-27 13:43:11', 5, '2026-02-27 13:43:13', NULL, NULL, NULL, '', NULL, '2026-02-27 13:43:11', '2026-02-27 13:43:13'),
(249, 1159, '69a1dd5c9ccd9', NULL, '2026-02-27 18:07:24', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 18:07:24', '2026-02-27 18:07:24'),
(250, 1159, '69a1dd713ed22', NULL, '2026-02-27 18:07:45', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 18:07:45', '2026-02-27 18:07:45'),
(251, 1159, '69a1dd769d042', NULL, '2026-02-27 18:07:50', 5, '2026-02-27 18:22:49', NULL, NULL, NULL, '', NULL, '2026-02-27 18:07:50', '2026-02-27 18:22:49'),
(252, 1159, '69a1e034c7d84', NULL, '2026-02-27 18:19:32', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 18:19:32', '2026-02-27 18:19:32'),
(253, 1159, '69a1e2324625e', NULL, '2026-02-27 18:28:02', 5, '2026-02-27 18:28:04', NULL, NULL, NULL, '', NULL, '2026-02-27 18:28:02', '2026-02-27 18:28:04'),
(254, 1159, '69a1e51ba22c0', NULL, '2026-02-27 18:40:27', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 18:40:27', '2026-02-27 18:40:27'),
(255, 1159, '69a1ec307c389', NULL, '2026-02-27 19:10:40', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-27 19:10:40', '2026-02-27 19:10:40'),
(256, 1156, '69a29684e8d18', NULL, '2026-02-28 07:17:24', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-28 07:17:24', '2026-02-28 07:17:24'),
(257, 1159, '69a3447f90fa0', NULL, '2026-02-28 19:39:43', 5, '2026-02-28 19:39:53', NULL, NULL, NULL, '', NULL, '2026-02-28 19:39:43', '2026-02-28 19:39:53'),
(258, 1159, '69a3569af23c6', NULL, '2026-02-28 20:56:58', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-02-28 20:56:58', '2026-02-28 20:56:58'),
(259, 1159, '69a3f5e14997d', NULL, '2026-03-01 08:16:33', 5, '2026-03-01 08:16:36', NULL, NULL, NULL, '', NULL, '2026-03-01 08:16:33', '2026-03-01 08:16:36'),
(260, 1159, '69a3f5f0e4103', NULL, '2026-03-01 08:16:48', 5, '2026-03-01 08:17:03', NULL, NULL, NULL, '', NULL, '2026-03-01 08:16:48', '2026-03-01 08:17:03'),
(261, 1159, '69a3f78680ada', NULL, '2026-03-01 08:23:34', 5, '2026-03-01 08:23:36', NULL, NULL, NULL, '', NULL, '2026-03-01 08:23:34', '2026-03-01 08:23:36'),
(262, 1159, '69a3f8186a11d', NULL, '2026-03-01 08:26:00', 5, '2026-03-01 08:26:16', NULL, NULL, NULL, '', NULL, '2026-03-01 08:26:00', '2026-03-01 08:26:16'),
(263, 1159, '69a4733c34978', NULL, '2026-03-01 17:11:24', 5, '2026-03-01 17:12:41', NULL, NULL, NULL, '', NULL, '2026-03-01 17:11:24', '2026-03-01 17:12:41'),
(264, 1159, '69a4791a32d07', NULL, '2026-03-01 17:36:26', 1, '2026-03-01 17:36:36', NULL, NULL, NULL, '', NULL, '2026-03-01 17:36:26', '2026-03-01 17:36:36'),
(265, 1159, '69a47969c88a9', NULL, '2026-03-01 17:37:45', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-01 17:37:45', '2026-03-01 17:37:45'),
(266, 1159, '69a4798222dc6', NULL, '2026-03-01 17:38:10', 1, '2026-03-01 17:38:18', NULL, NULL, NULL, '', NULL, '2026-03-01 17:38:10', '2026-03-01 17:38:18'),
(267, 1159, '69a479af125bb', NULL, '2026-03-01 17:38:55', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-01 17:38:55', '2026-03-01 17:38:55'),
(268, 1159, '69a47c9223f84', NULL, '2026-03-01 17:51:14', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-01 17:51:14', '2026-03-01 17:51:14'),
(269, 1159, '69a47ccd6045a', NULL, '2026-03-01 17:52:13', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-01 17:52:13', '2026-03-01 17:52:13'),
(270, 1159, '69a47cda93726', NULL, '2026-03-01 17:52:26', 5, '2026-03-01 17:53:14', NULL, NULL, NULL, '', NULL, '2026-03-01 17:52:26', '2026-03-01 17:53:14'),
(271, 1159, '69a47ce2a4973', NULL, '2026-03-01 17:52:34', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-01 17:52:34', '2026-03-01 17:52:34'),
(272, 1159, '69a47ce583dff', NULL, '2026-03-01 17:52:37', 1, '2026-03-01 17:52:45', NULL, NULL, NULL, '', NULL, '2026-03-01 17:52:37', '2026-03-01 17:52:45'),
(273, 1159, '69a47d2235fa1', NULL, '2026-03-01 17:53:38', 5, '2026-03-01 17:53:44', NULL, NULL, NULL, '', NULL, '2026-03-01 17:53:38', '2026-03-01 17:53:44'),
(274, 1159, '69a47d42d2767', NULL, '2026-03-01 17:54:10', 5, '2026-03-01 17:54:15', NULL, NULL, NULL, '', NULL, '2026-03-01 17:54:10', '2026-03-01 17:54:15'),
(275, 1159, '69a47feba8162', NULL, '2026-03-01 18:05:31', 5, '2026-03-01 18:05:40', NULL, NULL, NULL, '', NULL, '2026-03-01 18:05:31', '2026-03-01 18:05:40'),
(276, 1159, '69a4800e612dd', NULL, '2026-03-01 18:06:06', 4, '2026-03-01 18:06:15', NULL, NULL, NULL, '', NULL, '2026-03-01 18:06:06', '2026-03-01 18:06:15'),
(277, 1159, '69a481d7aae47', NULL, '2026-03-01 18:13:43', 5, '2026-03-01 18:13:48', NULL, NULL, NULL, '', NULL, '2026-03-01 18:13:43', '2026-03-01 18:13:48'),
(278, 1159, '69a48a3ab7a17', NULL, '2026-03-01 18:49:30', 5, '2026-03-01 19:04:59', NULL, NULL, NULL, '', NULL, '2026-03-01 18:49:30', '2026-03-01 19:04:59'),
(279, 1159, '69a5c5f0ba7fa', NULL, '2026-03-02 17:16:32', 5, '2026-03-02 17:17:09', NULL, NULL, NULL, '', NULL, '2026-03-02 17:16:32', '2026-03-02 17:17:09'),
(280, 1159, '69a5dd6580370', NULL, '2026-03-02 18:56:37', 5, '2026-03-02 18:56:41', NULL, NULL, NULL, '', NULL, '2026-03-02 18:56:37', '2026-03-02 18:56:41'),
(281, 1159, '69a5ebe447951', NULL, '2026-03-02 19:58:28', 5, '2026-03-02 19:58:40', NULL, NULL, NULL, '', NULL, '2026-03-02 19:58:28', '2026-03-02 19:58:40'),
(282, 1159, '69a5ebe666b4f', NULL, '2026-03-02 19:58:30', 5, '2026-03-02 19:58:33', NULL, NULL, NULL, '', NULL, '2026-03-02 19:58:30', '2026-03-02 19:58:33'),
(283, 1156, '69a9d0c86bc82', NULL, '2026-03-05 18:51:52', 5, '2026-03-05 19:03:23', NULL, NULL, NULL, '', NULL, '2026-03-05 18:51:52', '2026-03-05 19:03:23'),
(284, 1159, '69a9d30e8093f', NULL, '2026-03-05 19:01:34', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-05 19:01:34', '2026-03-05 19:01:34'),
(285, 1159, '69a9db0973946', NULL, '2026-03-05 19:35:37', 5, '2026-03-05 19:35:45', NULL, NULL, NULL, '', NULL, '2026-03-05 19:35:37', '2026-03-05 19:35:45'),
(286, 1159, '69aa7a7ce41b2', NULL, '2026-03-06 06:55:56', 4, '2026-03-06 06:56:36', NULL, NULL, NULL, '', NULL, '2026-03-06 06:55:56', '2026-03-06 06:56:36'),
(287, 1159, '69aa7b772e255', NULL, '2026-03-06 07:00:07', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-06 07:00:07', '2026-03-06 07:00:07'),
(288, 1159, '69aa7f2515f70', NULL, '2026-03-06 07:15:49', 4, '2026-03-06 07:15:52', NULL, NULL, NULL, '', NULL, '2026-03-06 07:15:49', '2026-03-06 07:15:52'),
(289, 1159, '69ab1b454e8f4', NULL, '2026-03-06 18:21:57', 5, '2026-03-06 18:22:23', NULL, NULL, NULL, '', NULL, '2026-03-06 18:21:57', '2026-03-06 18:22:23'),
(290, 1159, '69ab2fe0ede6b', NULL, '2026-03-06 19:49:52', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-06 19:49:52', '2026-03-06 19:49:52'),
(291, 1156, '69b4257e15312', NULL, '2026-03-13 14:55:58', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-13 14:55:58', '2026-03-13 14:55:58'),
(292, 1156, '69b42b2d04a4b', NULL, '2026-03-13 15:20:13', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-13 15:20:13', '2026-03-13 15:20:13'),
(293, 1156, '69b42fe09b308', NULL, '2026-03-13 15:40:16', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-13 15:40:16', '2026-03-13 15:40:16'),
(294, 1156, '69b42fe13e3f6', NULL, '2026-03-13 15:40:17', 5, '2026-03-13 15:40:18', NULL, NULL, NULL, '', NULL, '2026-03-13 15:40:17', '2026-03-13 15:40:18'),
(295, 1156, '69b437676df49', NULL, '2026-03-13 16:12:23', 5, '2026-03-13 16:12:25', NULL, NULL, NULL, '', NULL, '2026-03-13 16:12:23', '2026-03-13 16:12:25'),
(296, 1156, '69b4968fcf04c', NULL, '2026-03-13 22:58:23', 5, '2026-03-13 22:58:27', NULL, NULL, NULL, '', NULL, '2026-03-13 22:58:23', '2026-03-13 22:58:27'),
(297, 1156, '69b4c2af7fa56', NULL, '2026-03-14 02:06:39', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-14 02:06:39', '2026-03-14 02:06:39'),
(298, 1159, '69b855fb6bf83', NULL, '2026-03-16 19:11:55', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-16 19:11:55', '2026-03-16 19:11:55'),
(299, 1159, '69baef3ab2382', NULL, '2026-03-18 18:30:18', 4, '2026-03-18 18:30:30', NULL, NULL, NULL, '', NULL, '2026-03-18 18:30:18', '2026-03-18 18:30:30'),
(300, 1159, '69baef4428e77', NULL, '2026-03-18 18:30:28', 5, '2026-03-18 18:40:07', NULL, NULL, NULL, '', NULL, '2026-03-18 18:30:28', '2026-03-18 18:40:07'),
(301, 1159, '69baef553153c', NULL, '2026-03-18 18:30:45', 5, '2026-03-18 18:31:22', NULL, NULL, NULL, '', NULL, '2026-03-18 18:30:45', '2026-03-18 18:31:22'),
(302, 1159, '69baf279d8b3d', NULL, '2026-03-18 18:44:09', 5, '2026-03-18 18:44:15', NULL, NULL, NULL, '', NULL, '2026-03-18 18:44:09', '2026-03-18 18:44:15'),
(303, 1159, '69baf3b684191', NULL, '2026-03-18 18:49:26', 5, '2026-03-18 18:49:31', NULL, NULL, NULL, '', NULL, '2026-03-18 18:49:26', '2026-03-18 18:49:31'),
(304, 1159, '69baf4422f054', NULL, '2026-03-18 18:51:46', 5, '2026-03-18 18:51:55', NULL, NULL, NULL, '', NULL, '2026-03-18 18:51:46', '2026-03-18 18:51:55'),
(305, 1159, '69baf4dd20f17', NULL, '2026-03-18 18:54:21', 5, '2026-03-18 18:56:54', NULL, NULL, NULL, '', NULL, '2026-03-18 18:54:21', '2026-03-18 18:56:54'),
(306, 1159, '69baf4fb2051d', NULL, '2026-03-18 18:54:51', 3, '2026-03-18 18:54:59', 'Pokoje nierówno wyposażone, w niektórych lodówka i balkon a w niektórych nie ma takich dogodności. Obsługa restauracji - Pani Asia cudowna, pomocna, profesjonalna, jednak są osoby jak pan Ragu bez doświadczenia w obsłudze co skutkowało uderzeniem dziecka w głowę szklaną butelką litrową wody spadającą z tacy podczas serowowania. Podczas nieobecności Pani Asi duży chaos, pomylki w zamówieniach, niepotrzebny stres gości na koniec dnia. ', 'anonymous@anonymous.com', 'anonymous', 'Anonymous', '2026-03-18 20:02:42', '2026-03-18 18:54:51', '2026-03-18 19:02:42'),
(307, 1159, '69baf5d7d828f', NULL, '2026-03-18 18:58:31', 5, '2026-03-18 18:59:06', NULL, NULL, NULL, '', NULL, '2026-03-18 18:58:31', '2026-03-18 18:59:06'),
(308, 1159, '69bafe224bc21', NULL, '2026-03-18 19:33:54', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-18 19:33:54', '2026-03-18 19:33:54'),
(309, 1156, '69bc4b5f57e31', NULL, '2026-03-19 19:15:43', 3, '2026-03-19 19:15:50', NULL, NULL, NULL, '', NULL, '2026-03-19 19:15:43', '2026-03-19 19:15:50'),
(310, 1156, '69bc4b6fc0177', NULL, '2026-03-19 19:15:59', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-19 19:15:59', '2026-03-19 19:15:59'),
(311, 1156, '69bc4b827a55c', NULL, '2026-03-19 19:16:18', 5, '2026-03-19 19:16:23', NULL, NULL, NULL, '', NULL, '2026-03-19 19:16:18', '2026-03-19 19:16:23'),
(312, 1156, '69bc4b827a55d', NULL, '2026-03-19 19:16:18', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-19 19:16:18', '2026-03-19 19:16:18'),
(313, 1156, '69bc4bba10ab2', NULL, '2026-03-19 19:17:14', 3, '2026-03-19 19:17:17', NULL, NULL, NULL, '', NULL, '2026-03-19 19:17:14', '2026-03-19 19:17:17'),
(314, 1156, '69bc4bc5accd3', NULL, '2026-03-19 19:17:25', 5, '2026-03-19 19:17:27', NULL, NULL, NULL, '', NULL, '2026-03-19 19:17:25', '2026-03-19 19:17:27'),
(315, 1156, '69bd0fb347d52', NULL, '2026-03-20 09:13:23', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-20 09:13:23', '2026-03-20 09:13:23'),
(316, 1156, '69bd94ff1c8bc', NULL, '2026-03-20 18:42:07', 5, '2026-03-20 18:42:14', NULL, NULL, NULL, '', NULL, '2026-03-20 18:42:07', '2026-03-20 18:42:14'),
(317, 1156, '69bda0f165479', NULL, '2026-03-20 19:33:05', 1, '2026-03-20 19:33:18', NULL, NULL, NULL, '', NULL, '2026-03-20 19:33:05', '2026-03-20 19:33:18'),
(318, 1156, '69bda11e3fabc', NULL, '2026-03-20 19:33:50', 5, '2026-03-20 19:33:55', NULL, NULL, NULL, '', NULL, '2026-03-20 19:33:50', '2026-03-20 19:33:55'),
(319, 1156, '69bda264b2998', NULL, '2026-03-20 19:39:16', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-20 19:39:16', '2026-03-20 19:39:16'),
(320, 1156, '69bda29ae6243', NULL, '2026-03-20 19:40:10', 5, '2026-03-20 19:45:49', NULL, NULL, NULL, '', NULL, '2026-03-20 19:40:10', '2026-03-20 19:45:49'),
(321, 1156, '69bda88f3a84e', NULL, '2026-03-20 20:05:35', 5, '2026-03-20 20:05:46', NULL, NULL, NULL, '', NULL, '2026-03-20 20:05:35', '2026-03-20 20:05:46'),
(322, 1156, '69bdaf33d05ec', NULL, '2026-03-20 20:33:55', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-20 20:33:55', '2026-03-20 20:33:55'),
(323, 1156, '69bdaf34376c1', NULL, '2026-03-20 20:33:56', 5, '2026-03-20 21:02:22', NULL, NULL, NULL, '', NULL, '2026-03-20 20:33:56', '2026-03-20 21:02:22'),
(324, 1156, '69be5580103ff', NULL, '2026-03-21 08:23:28', 5, '2026-03-21 09:19:26', NULL, NULL, NULL, '', NULL, '2026-03-21 08:23:28', '2026-03-21 09:19:26'),
(325, 1164, '69beca445f78e', NULL, '2026-03-21 16:41:40', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-21 16:41:40', '2026-03-21 16:41:40'),
(326, 1156, '69bef05d0c092', NULL, '2026-03-21 19:24:13', 5, '2026-03-22 20:32:04', NULL, NULL, NULL, '', NULL, '2026-03-21 19:24:13', '2026-03-22 20:32:04'),
(327, 1164, '69c9473b8bf0f', NULL, '2026-03-29 15:37:31', 5, '2026-03-29 15:37:39', NULL, NULL, NULL, '', NULL, '2026-03-29 15:37:31', '2026-03-29 15:37:39'),
(328, 1159, '69cbdb2be2e6c', NULL, '2026-03-31 14:33:15', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-03-31 14:33:15', '2026-03-31 14:33:15'),
(329, 1164, '69cd11145528c', NULL, '2026-04-01 12:35:32', 5, '2026-04-01 12:35:43', NULL, NULL, NULL, '', NULL, '2026-04-01 12:35:32', '2026-04-01 12:35:43'),
(330, 1164, '69ef1ffc65d5b', NULL, '2026-04-27 08:36:12', 5, '2026-04-27 08:36:28', NULL, NULL, NULL, '', NULL, '2026-04-27 08:36:12', '2026-04-27 08:36:28'),
(331, 1164, '69fc82f6d41f2', NULL, '2026-05-07 12:17:58', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-05-07 12:17:58', '2026-05-07 12:17:58'),
(332, 1164, '69fc838c5048a', NULL, '2026-05-07 12:20:28', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-05-07 12:20:28', '2026-05-07 12:20:28'),
(333, 1164, '69fc83b1f01e8', NULL, '2026-05-07 12:21:05', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-05-07 12:21:05', '2026-05-07 12:21:05'),
(334, 1164, '6a04469da7c62', NULL, '2026-05-13 09:38:37', 5, '2026-05-13 09:38:42', NULL, NULL, NULL, '', NULL, '2026-05-13 09:38:37', '2026-05-13 09:38:42'),
(335, 1164, '6a0446ef99f8e', NULL, '2026-05-13 09:39:59', 5, '2026-05-13 09:40:01', NULL, NULL, NULL, '', NULL, '2026-05-13 09:39:59', '2026-05-13 09:40:01'),
(336, 1164, '6a044c242c179', NULL, '2026-05-13 10:02:12', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-05-13 10:02:12', '2026-05-13 10:02:12'),
(337, 1164, '6a25673818e98', NULL, '2026-06-07 12:42:32', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-06-07 12:42:32', '2026-06-07 12:42:32'),
(338, 1164, '6a25674dc2477', NULL, '2026-06-07 12:42:53', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-06-07 12:42:53', '2026-06-07 12:42:53'),
(339, 1164, '6a25676e3aeda', NULL, '2026-06-07 12:43:26', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-06-07 12:43:26', '2026-06-07 12:43:26'),
(340, 1164, '6a2abe32467f8', NULL, '2026-06-11 13:54:58', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-06-11 13:54:58', '2026-06-11 13:54:58'),
(341, 1164, '6a2bcf1a06dc4', NULL, '2026-06-12 09:19:22', NULL, NULL, NULL, NULL, NULL, '', NULL, '2026-06-12 09:19:22', '2026-06-12 09:19:22');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `shipments`
--

CREATE TABLE `shipments` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `number_of_plates` int DEFAULT NULL,
  `tracking_number` varchar(255) DEFAULT NULL,
  `carrier` varchar(100) DEFAULT NULL,
  `shipping_status` enum('pending','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `recipient_name` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `recipient_phone` varchar(50) DEFAULT NULL,
  `shipping_address` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci,
  `recipient_city` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `recipient_postal_code` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `recipient_country` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `shipping_cost` decimal(10,2) DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `subscriptions`
--

CREATE TABLE `subscriptions` (
  `subscription_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `subscription_name` varchar(255) DEFAULT NULL,
  `duration_in_days` int NOT NULL,
  `is_free` tinyint(1) NOT NULL DEFAULT '0',
  `activation_datetime` datetime DEFAULT NULL,
  `expiration_datetime` datetime DEFAULT NULL,
  `status` enum('active','pending','inactive') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `subscriptions`
--

INSERT INTO `subscriptions` (`subscription_id`, `customer_id`, `subscription_name`, `duration_in_days`, `is_free`, `activation_datetime`, `expiration_datetime`, `status`, `created_at`, `updated_at`) VALUES
(69, 38, '1_MONTH_SUB_FREE', 30, 0, '2026-01-12 07:49:26', '2026-02-11 07:49:26', 'active', '2025-05-30 23:29:16', '2026-01-12 06:49:26'),
(70, 39, '1_MONTH_SUB_FREE', 30, 0, '2025-06-28 13:53:07', '2025-07-28 13:53:07', 'active', '2025-06-28 11:28:05', '2025-06-28 11:53:07'),
(71, 40, '1_MONTH_SUB_FREE', 30, 0, '2026-02-14 18:35:16', '2026-03-16 18:35:16', 'active', '2026-02-14 17:31:44', '2026-02-14 17:35:16'),
(72, 40, '1_MONTH_SUB_FREE', 30, 0, '2026-02-14 21:27:54', '2026-03-16 21:27:54', 'active', '2026-02-14 20:26:31', '2026-02-14 20:27:54'),
(73, 41, '1_MONTH_SUB_FREE', 30, 0, '2026-02-15 12:44:19', '2026-03-17 12:44:19', 'active', '2026-02-15 11:42:26', '2026-02-15 11:44:19'),
(74, 42, '1_MONTH_SUB_FREE', 30, 0, '2026-02-19 13:50:41', '2026-03-21 13:50:41', 'active', '2026-02-18 17:20:38', '2026-02-19 12:50:41');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `subscription_details`
--

CREATE TABLE `subscription_details` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `duration_in_days` int NOT NULL,
  `is_free` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Zrzut danych tabeli `subscription_details`
--

INSERT INTO `subscription_details` (`id`, `product_id`, `duration_in_days`, `is_free`) VALUES
(1, 0, 30, 1),
(2, 1, 370, 0);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `users_links`
--

CREATE TABLE `users_links` (
  `id` int NOT NULL,
  `customer_locations_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indeksy dla tabeli `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`);

--
-- Indeksy dla tabeli `customer_locations`
--
ALTER TABLE `customer_locations`
  ADD PRIMARY KEY (`location_id`),
  ADD UNIQUE KEY `subscription_id` (`subscription_id`);

--
-- Indeksy dla tabeli `error_logs`
--
ALTER TABLE `error_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indeksy dla tabeli `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `fk_orders_customer_id` (`customer_id`),
  ADD KEY `idx_payment_type` (`payment_method`);

--
-- Indeksy dla tabeli `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `fk_order_items_order` (`order_id`);

--
-- Indeksy dla tabeli `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indeksy dla tabeli `plates`
--
ALTER TABLE `plates`
  ADD PRIMARY KEY (`plate_id`),
  ADD KEY `fk_subscription` (`subscription_id`);

--
-- Indeksy dla tabeli `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`);

--
-- Indeksy dla tabeli `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `plate_id` (`plate_id`);

--
-- Indeksy dla tabeli `shipments`
--
ALTER TABLE `shipments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_shipments_orders` (`order_id`);

--
-- Indeksy dla tabeli `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`subscription_id`),
  ADD KEY `fk_subscriptions_customer_id` (`customer_id`);

--
-- Indeksy dla tabeli `subscription_details`
--
ALTER TABLE `subscription_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- AUTO_INCREMENT dla zrzuconych tabel
--

--
-- AUTO_INCREMENT dla tabeli `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT dla tabeli `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT dla tabeli `customer_locations`
--
ALTER TABLE `customer_locations`
  MODIFY `location_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT dla tabeli `error_logs`
--
ALTER TABLE `error_logs`
  MODIFY `log_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=252;

--
-- AUTO_INCREMENT dla tabeli `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT dla tabeli `order_status_history`
--
ALTER TABLE `order_status_history`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `plates`
--
ALTER TABLE `plates`
  MODIFY `plate_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1174;

--
-- AUTO_INCREMENT dla tabeli `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=342;

--
-- AUTO_INCREMENT dla tabeli `shipments`
--
ALTER TABLE `shipments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT dla tabeli `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `subscription_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT dla tabeli `subscription_details`
--
ALTER TABLE `subscription_details`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Ograniczenia dla zrzutów tabel
--

--
-- Ograniczenia dla tabeli `customer_locations`
--
ALTER TABLE `customer_locations`
  ADD CONSTRAINT `fk_customer_locations_subscriptions` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`subscription_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ograniczenia dla tabeli `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Ograniczenia dla tabeli `order_status_history`
--
ALTER TABLE `order_status_history`
  ADD CONSTRAINT `order_status_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`);

--
-- Ograniczenia dla tabeli `plates`
--
ALTER TABLE `plates`
  ADD CONSTRAINT `fk_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`subscription_id`);

--
-- Ograniczenia dla tabeli `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`plate_id`) REFERENCES `plates` (`plate_id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `shipments`
--
ALTER TABLE `shipments`
  ADD CONSTRAINT `fk_shipments_orders` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Ograniczenia dla tabeli `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_subscriptions_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`);

--
-- Ograniczenia dla tabeli `subscription_details`
--
ALTER TABLE `subscription_details`
  ADD CONSTRAINT `subscription_details_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
