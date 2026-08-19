<?php
/**
 * API Bridge MySQL untuk Si@Kad Madrasah
 * Menghubungkan Aplikasi Web dengan Database MySQL / MariaDB di Hosting (Plesk / cPanel / DirectAdmin)
 */

if (!ob_start('ob_gzhandler')) {
    ob_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Muat Konfigurasi Database jika file db_config.php ada
if (file_exists(__DIR__ . '/db_config.php')) {
    include_once __DIR__ . '/db_config.php';
}

$db_host = trim(defined('DB_HOST') ? DB_HOST : 'localhost');
$db_name = trim(defined('DB_NAME') ? DB_NAME : 'jaenal_siakadmadrasah');
$db_user = trim(defined('DB_USER') ? DB_USER : 'jaenal_siakadmadrasah');
$db_pass = trim(defined('DB_PASS') ? DB_PASS : 'masbagus15');

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'error' => 'Koneksi Database MySQL Gagal. ' . $e->getMessage(),
        'hint' => 'Pastikan DB_NAME, DB_USER, dan DB_PASS pada file db_config.php di hosting sudah sesuai (tanpa spasi ekstra). Pastikan juga User Database telah diberi Hak Akses (User Permissions) ke Database di Plesk/cPanel.'
    ]);
    exit();
}

// Buat tabel site_settings secara otomatis jika belum ada
$pdo->exec("CREATE TABLE IF NOT EXISTS `site_settings` (
    `id` VARCHAR(191) NOT NULL PRIMARY KEY,
    `value` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Auto-seed default settings into MySQL database if table is empty
try {
    $countStmt = $pdo->query("SELECT COUNT(*) FROM `site_settings`");
    if ($countStmt && (int)$countStmt->fetchColumn() === 0) {
        $defaultData = [
            'general' => [
                'school_name' => 'Si@Kad',
                'tagline' => 'Sistem Informasi Akademik Modern',
                'address' => '',
                'phone' => '',
                'email' => '',
                'operational_hours' => 'Senin - Sabtu: 07:00 - 14:00 WIB',
                'headmaster_name' => '',
                'headmaster_title' => 'Kepala Madrasah',
                'maps_latitude' => '-7.517606',
                'maps_longitude' => '109.132984',
                'maps_zoom' => '16'
            ],
            'hero' => [
                'badge_text' => 'Eksklusif & Modern',
                'heading_line1' => 'Si@Kad',
                'heading_line2' => 'Madrasah',
                'description' => 'Selamat datang di institusi pendidikan yang memadukan kemuliaan akhlakul karimah dengan keunggulan akademik berbasis digital.',
                'cta_primary' => 'Daftar Sekarang',
                'cta_secondary' => 'Lihat Profil',
                'stats_students' => '150+',
                'stats_achievements' => '25+',
                'stats_teachers' => '15+',
                'stats_years' => '10+',
                'background_image' => '/og-cover.jpg',
                'right_image' => '/og-cover.jpg',
                'images' => [
                    ['url' => '/og-cover.jpg', 'title' => 'Pembiasaan', 'subtitle' => 'Terakreditasi & Berprestasi']
                ],
                'right_image_title' => 'Pembiasaan',
                'right_image_subtitle' => 'Terakreditasi & Berprestasi'
            ],
            'running_text' => [
                'enabled' => true,
                'text' => 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
                'direction' => 'right_to_left',
                'speed' => 'normal',
                'badge' => 'INFORMASI MADRASAH',
                'bg_color' => 'emerald',
                'link_url' => '/spmb',
                'link_label' => 'Lihat SPMB',
                'show_close_button' => true,
                'archive' => [
                    [
                        'id' => '1',
                        'text' => 'Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.',
                        'badge' => 'INFORMASI MADRASAH',
                        'direction' => 'right_to_left',
                        'speed' => 'normal',
                        'bg_color' => 'emerald',
                        'link_url' => '/spmb',
                        'link_label' => 'Lihat SPMB',
                        'created_at' => date('Y-m-d H:i:s'),
                        'is_active' => true
                    ]
                ]
            ],
            'seo' => [
                'title' => 'Si@Kad - Sistem Informasi Akademik Modern',
                'description' => 'Aplikasi Sistem Informasi Akademik Madrasah Modern untuk kelola data siswa, guru, jadwal KBM, nilai, dan SPMB secara digital.',
                'image_url' => '/og-cover.jpg',
                'og_image_url' => '/og-cover.jpg'
            ],
            'tahun_pelajaran' => [
                'active_year' => '2026/2027',
                'available_years' => ['2026/2027', '2025/2026', '2024/2025', '2023/2024'],
                'spmb_year' => '2026/2027',
                'semester' => 'Ganjil'
            ],
            'sticky_footer' => [
                'items' => [
                    ['icon_name' => 'Home', 'label' => 'Beranda', 'path' => '/'],
                    ['icon_name' => 'Brain', 'label' => 'Modul Ajar KBC', 'path' => '/ai-teaching'],
                    ['icon_name' => 'Link', 'label' => 'Tautan', 'path' => '/links'],
                    ['icon_name' => 'Users', 'label' => 'SPMB', 'path' => '/spmb'],
                    ['icon_name' => 'UserCircle', 'label' => 'Admin', 'path' => '/login']
                ]
            ]
        ];

        $seedStmt = $pdo->prepare("INSERT INTO `site_settings` (`id`, `value`) VALUES (?, ?)");
        foreach ($defaultData as $key => $val) {
            $seedStmt->execute([$key, json_encode($val, JSON_UNESCAPED_UNICODE)]);
        }
    }
} catch (Exception $e) {
    // Abaikan jika pemanggilan auto-seed terhambat
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'test_connection') {
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);
    
    $test_host = trim(!empty($payload['host']) ? $payload['host'] : $db_host);
    $test_port = trim(!empty($payload['port']) ? $payload['port'] : '3306');
    $test_name = trim(!empty($payload['database']) ? $payload['database'] : $db_name);
    $test_user = trim(!empty($payload['username']) ? $payload['username'] : $db_user);
    $test_pass = trim(isset($payload['password']) ? $payload['password'] : $db_pass);

    try {
        $testPdo = new PDO("mysql:host=$test_host;port=$test_port;dbname=$test_name;charset=utf8mb4", $test_user, $test_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 5
        ]);
        echo json_encode([
            'status' => 'success',
            'connected' => true,
            'message' => "Terhubung ke database MySQL Plesk ($test_name@$test_host:$test_port)!",
            'server_info' => $testPdo->getAttribute(PDO::ATTR_SERVER_INFO)
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'status' => 'error',
            'connected' => false,
            'message' => "Gagal terhubung ke MySQL Hosting: " . $e->getMessage()
        ]);
    }
    exit();
}

if ($action === 'select') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT id, value, updated_at FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $row['value'] = json_decode($row['value'], true);
            echo json_encode(['data' => $row, 'error' => null]);
        } else {
            echo json_encode(['data' => null, 'error' => null]);
        }
    } else {
        $stmt = $pdo->prepare("SELECT id, value, updated_at FROM `$table`");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['value'] = json_decode($r['value'], true);
        }
        echo json_encode(['data' => $rows, 'error' => null]);
    }
    exit();
}

if ($action === 'upsert') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $raw_input = file_get_contents('php://input');
    $payload = json_decode($raw_input, true);

    if (!$payload) {
        echo json_encode(['error' => 'Payload JSON tidak valid']);
        exit();
    }

    $stmt = $pdo->prepare("INSERT INTO `$table` (id, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()");

    // Jika payload berupa array/list dari objek [{id, value}, ...]
    if (isset($payload[0]) && is_array($payload[0])) {
        $pdo->beginTransaction();
        try {
            foreach ($payload as $item) {
                $itemId = isset($item['id']) ? $item['id'] : null;
                $itemVal = isset($item['value']) ? json_encode($item['value'], JSON_UNESCAPED_UNICODE) : '{}';
                if ($itemId) {
                    $stmt->execute([$itemId, $itemVal]);
                }
            }
            $pdo->commit();
            echo json_encode(['data' => true, 'error' => null]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['error' => 'Gagal simpan batch ke MySQL: ' . $e->getMessage()]);
        }
        exit();
    }

    // Jika payload berupa tunggal {id, value}
    $id = isset($payload['id']) ? $payload['id'] : null;
    $val = isset($payload['value']) ? json_encode($payload['value'], JSON_UNESCAPED_UNICODE) : '{}';

    if (!$id) {
        echo json_encode(['error' => 'ID data wajib diisi']);
        exit();
    }

    $stmt->execute([$id, $val]);

    echo json_encode(['data' => ['id' => $id], 'error' => null]);
    exit();
}

if ($action === 'delete') {
    $table = isset($_GET['table']) ? $_GET['table'] : 'site_settings';
    $id = isset($_GET['id']) ? $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
    }
    echo json_encode(['data' => true, 'error' => null]);
    exit();
}

if ($action === 'upload') {
    $uploadDir = __DIR__ . '/uploads/';
    if (!file_exists($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }
    if (file_exists($uploadDir)) {
        @chmod($uploadDir, 0777);
    }

    $fileUploaded = false;
    $fileName = '';
    $uploadedFileKey = null;

    if (!empty($_FILES)) {
        foreach ($_FILES as $key => $fileObj) {
            if (isset($fileObj['tmp_name']) && !empty($fileObj['tmp_name']) && $fileObj['error'] === UPLOAD_ERR_OK) {
                $uploadedFileKey = $key;
                break;
            }
        }
    }

    if ($uploadedFileKey !== null && isset($_FILES[$uploadedFileKey])) {
        $fileObj = $_FILES[$uploadedFileKey];
        $rawName = basename($fileObj['name']);
        $cleanName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $rawName);
        $fileName = time() . '_' . rand(100, 999) . '_' . $cleanName;
        $targetFile = $uploadDir . $fileName;

        if (@move_uploaded_file($fileObj['tmp_name'], $targetFile)) {
            $fileUploaded = true;
        }
    }

    // Secondary fallback: Base64 JSON payload
    if (!$fileUploaded) {
        $raw_input = file_get_contents('php://input');
        if ($raw_input) {
            $payload = json_decode($raw_input, true);
            $base64Data = null;
            if (isset($payload['base64'])) {
                $base64Data = $payload['base64'];
            } elseif (isset($payload['image'])) {
                $base64Data = $payload['image'];
            } elseif (isset($payload['file']) && is_string($payload['file']) && strpos($payload['file'], 'data:') === 0) {
                $base64Data = $payload['file'];
            }

            if ($base64Data && preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $dataStr = substr($base64Data, strpos($base64Data, ',') + 1);
                $ext = strtolower($type[1]);
                if ($ext === 'jpeg') $ext = 'jpg';
                $decoded = base64_decode($dataStr);
                if ($decoded !== false) {
                    $fileName = time() . '_' . rand(1000, 9999) . '.' . $ext;
                    $targetFile = $uploadDir . $fileName;
                    if (@file_put_contents($targetFile, $decoded) !== false) {
                        $fileUploaded = true;
                    }
                }
            }
        }
    }

    if ($fileUploaded && !empty($fileName)) {
        @chmod($uploadDir . $fileName, 0644);
        $isHttps = (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === '1')) || 
                   (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
                   (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') ||
                   (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == '443');
        $protocol = $isHttps ? 'https' : 'http';
        $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
        $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
        $dirPath = ($dir === '' || $dir === '.' || $dir === '/') ? '' : $dir;
        $relativePath = $dirPath . '/uploads/' . $fileName;
        $fileUrl = $protocol . '://' . $host . $relativePath;

        echo json_encode([
            'status' => 'success',
            'publicUrl' => !empty($host) ? $fileUrl : $relativePath,
            'fullUrl' => $fileUrl,
            'relativePath' => $relativePath,
            'path' => 'uploads/' . $fileName,
            'fileName' => $fileName,
            'error' => null
        ]);
        exit();
    }

    $fileErrNotice = '';
    if (!empty($_FILES)) {
        foreach ($_FILES as $k => $f) {
            if (isset($f['error']) && $f['error'] !== UPLOAD_ERR_OK) {
                $fileErrNotice .= ' Error ' . $k . ': ' . $f['error'];
            }
        }
    }

    echo json_encode([
        'status' => 'error',
        'error' => 'Gagal mengunggah berkas gambar.' . $fileErrNotice,
        'hint' => 'Pastikan folder "uploads" di direktori web hosting memiliki hak akses/permission 0755 atau 0777.'
    ]);
    exit();
}

echo json_encode(['status' => 'online', 'database' => 'MySQL/MariaDB', 'message' => 'API Backend Si@Kad Madrasah Aktif!']);
