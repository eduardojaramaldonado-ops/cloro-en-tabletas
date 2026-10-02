<?php
/**
 * Formulario de /contacto/: envía el mensaje a contacto@cloroentabletas.cl
 * con Reply-To del visitante, para responderle directamente.
 *
 * Compatible con PHP 7.4+. Protecciones: solo POST, tamaño máximo, campo
 * trampa, límite por IP, validación estricta y texto escapado.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const DESTINO   = 'contacto@cloroentabletas.cl';
const REMITENTE = 'pedidos@cloroentabletas.cl';   // casilla existente del dominio
const MAX_POR_HORA = 5;
const MOTIVOS = ['Cotización', 'Consulta sobre un producto', 'Estado de mi pedido', 'Ventas por mayor', 'Otro'];

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function linea($valor, $max) {
    $v = is_string($valor) ? trim(preg_replace('/[\r\n\t]+/', ' ', $valor)) : '';
    return mb_substr($v, 0, $max, 'UTF-8');
}

function e($v) {
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'metodo']);
}

$d = json_decode(file_get_contents('php://input', false, null, 0, 12000), true);
if (!is_array($d)) {
    responder(400, ['ok' => false, 'error' => 'formato']);
}

// Campo trampa: las personas no lo ven, los robots lo rellenan
if (!empty($d['website'])) {
    responder(200, ['ok' => true]);
}

// Límite de envíos por IP
$archivoLimite = sys_get_temp_dir() . '/cloro_contacto_' . md5($_SERVER['REMOTE_ADDR'] ?? 'desconocida') . '.json';
$ahora = time();
$envios = is_file($archivoLimite) ? (json_decode((string) @file_get_contents($archivoLimite), true) ?: []) : [];
$envios = array_values(array_filter($envios, function ($t) use ($ahora) { return $ahora - (int) $t < 3600; }));
if (count($envios) >= MAX_POR_HORA) {
    responder(429, ['ok' => false, 'error' => 'limite']);
}

// Validación
$nombre   = linea($d['nombre'] ?? '', 80);
$email    = linea($d['email'] ?? '', 120);
$telefono = linea($d['telefono'] ?? '', 30);
$motivo   = linea($d['motivo'] ?? '', 40);
$mensaje  = is_string($d['mensaje'] ?? null) ? trim(mb_substr(str_replace("\r", '', $d['mensaje']), 0, 2000, 'UTF-8')) : '';

if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($motivo, MOTIVOS, true) || mb_strlen($mensaje, 'UTF-8') < 10) {
    responder(422, ['ok' => false, 'error' => 'datos']);
}

// Contenido
$asunto = 'Contacto web: ' . $motivo . ' - ' . $nombre;
$txt = "Nuevo mensaje desde el formulario de contacto de cloroentabletas.cl\n\n"
    . "Nombre: $nombre\nEmail: $email\n" . ($telefono !== '' ? "Teléfono: $telefono\n" : '')
    . "Motivo: $motivo\n\nMensaje:\n$mensaje\n\n(Responder este correo le escribe directamente a $email)";
$html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0a3a5f">'
    . '<div style="max-width:600px;margin:0 auto;padding:24px 16px">'
    . '<div style="background:#0a78c2;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-weight:800;font-size:18px">Cloro en Tabletas · Contacto web</div>'
    . '<div style="background:#fff;padding:24px 22px;border-radius:0 0 12px 12px;font-size:14px;line-height:1.6">'
    . '<p style="margin:0 0 4px"><strong>Nombre:</strong> ' . e($nombre) . '</p>'
    . '<p style="margin:0 0 4px"><strong>Email:</strong> ' . e($email) . '</p>'
    . ($telefono !== '' ? '<p style="margin:0 0 4px"><strong>Teléfono:</strong> ' . e($telefono) . '</p>' : '')
    . '<p style="margin:0 0 14px"><strong>Motivo:</strong> ' . e($motivo) . '</p>'
    . '<div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;white-space:pre-wrap">' . e($mensaje) . '</div>'
    . '<p style="font-size:13px;color:#6b7280;margin-top:16px">Responder este correo le escribe directamente a ' . e($email) . '.</p>'
    . '</div></div></body></html>';

// Envío
$limite = 'b' . bin2hex(random_bytes(8));
$cabeceras = implode("\r\n", [
    'From: ' . mb_encode_mimeheader('Cloro en Tabletas (web)', 'UTF-8') . ' <' . REMITENTE . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $limite . '"',
    'X-Mailer: cloroentabletas.cl',
]);
$cuerpo = "--$limite\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($txt))
    . "--$limite\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($html))
    . "--$limite--\r\n";
$asuntoCodificado = mb_encode_mimeheader($asunto, 'UTF-8', 'B');

// Prueba local: si existe la variable, el correo se guarda en un archivo en vez de enviarse
$volcado = getenv('PEDIDOS_MAIL_DUMP');
if ($volcado) {
    $ok = (bool) file_put_contents(rtrim($volcado, '/\\') . '/contacto.eml', "To: " . DESTINO . "\r\nSubject: $asuntoCodificado\r\n$cabeceras\r\n\r\n$cuerpo");
} else {
    $ok = mail(DESTINO, $asuntoCodificado, $cuerpo, $cabeceras, '-f' . REMITENTE);
}

$envios[] = $ahora;
@file_put_contents($archivoLimite, json_encode($envios));

responder($ok ? 200 : 500, ['ok' => $ok]);
