<?php
/**
 * Envía por correo el pedido confirmado en el checkout:
 *   - a la tienda (pedidos@cloroentabletas.cl), con los datos de despacho;
 *   - al cliente, con el detalle, el total y los datos para la transferencia.
 *
 * Recibe un POST con JSON desde checkout/index.html. Compatible con PHP 7.4+.
 * Protecciones: solo POST, tamaño máximo, campo trampa, límite por IP,
 * validación estricta y total recalculado en el servidor.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const TIENDA_EMAIL  = 'pedidos@cloroentabletas.cl';
const TIENDA_NOMBRE = 'Cloro en Tabletas';
const WHATSAPP      = '56992460216';
const MAX_POR_HORA  = 5;

function responder($codigo, $datos) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function texto($valor, $max) {
    $v = is_string($valor) ? trim(preg_replace('/[\r\n\t]+/', ' ', $valor)) : '';
    return mb_substr($v, 0, $max, 'UTF-8');
}

function e($v) {
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

function pesos($n) {
    return '$' . number_format($n, 0, ',', '.');
}

// ---------- Entrada ----------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responder(405, ['ok' => false, 'error' => 'metodo']);
}

$crudo = file_get_contents('php://input', false, null, 0, 20000);
$d = json_decode($crudo, true);
if (!is_array($d)) {
    responder(400, ['ok' => false, 'error' => 'formato']);
}

// Campo trampa: las personas no lo ven, los robots lo rellenan
if (!empty($d['website'])) {
    responder(200, ['ok' => true]);
}

// ---------- Límite de envíos por IP ----------

$ip = $_SERVER['REMOTE_ADDR'] ?? 'desconocida';
$archivoLimite = sys_get_temp_dir() . '/cloro_pedidos_' . md5($ip) . '.json';
$ahora = time();
$envios = [];
if (is_file($archivoLimite)) {
    $envios = json_decode((string) @file_get_contents($archivoLimite), true) ?: [];
}
$envios = array_values(array_filter($envios, function ($t) use ($ahora) { return $ahora - (int) $t < 3600; }));
if (count($envios) >= MAX_POR_HORA) {
    responder(429, ['ok' => false, 'error' => 'limite']);
}

// ---------- Validación ----------

$pedido = texto($d['pedido'] ?? '', 20);
$email  = texto($d['email'] ?? '', 120);
$nombre = texto(($d['nombre'] ?? '') . ' ' . ($d['apellido'] ?? ''), 120);

if (!preg_match('/^CT-\d{8}$/', $pedido) || !filter_var($email, FILTER_VALIDATE_EMAIL) || $nombre === '') {
    responder(422, ['ok' => false, 'error' => 'datos']);
}

$productos = [];
$subtotal = 0;
foreach (array_slice(is_array($d['productos'] ?? null) ? $d['productos'] : [], 0, 30) as $p) {
    $nombreP = texto($p['name'] ?? '', 120);
    $cantidad = (int) ($p['quantity'] ?? 0);
    $precio = (int) ($p['price'] ?? -1);
    if ($nombreP === '' || $cantidad < 1 || $cantidad > 99 || $precio < 0 || $precio > 2000000) {
        responder(422, ['ok' => false, 'error' => 'productos']);
    }
    $productos[] = ['nombre' => $nombreP, 'cantidad' => $cantidad, 'precio' => $precio];
    $subtotal += $cantidad * $precio;
}
if (!$productos) {
    responder(422, ['ok' => false, 'error' => 'productos']);
}

// El descuento se recalcula aquí a partir del código (mismos cupones que el checkout);
// un código desconocido no descuenta nada.
$cupones = [
    'VERANO10'  => ['tipo' => '%', 'valor' => 10],
    'PISCINA15' => ['tipo' => '%', 'valor' => 15],
    'CLORO5000' => ['tipo' => 'fijo', 'valor' => 5000],
];
$cupon = strtoupper(texto($d['cupon'] ?? '', 20));
$descuento = 0;
if (isset($cupones[$cupon])) {
    $c = $cupones[$cupon];
    $descuento = $c['tipo'] === '%' ? (int) round($subtotal * $c['valor'] / 100) : min($c['valor'], $subtotal);
} else {
    $cupon = '';
}
$total = $subtotal - $descuento;

$despacho = [
    'RUT'       => texto($d['rut'] ?? '', 20),
    'Teléfono'  => texto($d['telefono'] ?? '', 30),
    'Dirección' => texto(trim(($d['direccion'] ?? '') . ' ' . ($d['depto'] ?? '')), 160),
    'Comuna'    => texto($d['comuna'] ?? '', 60),
    'Ciudad'    => texto($d['ciudad'] ?? '', 60),
    'Región'    => texto($d['region'] ?? '', 60),
    'Notas'     => texto($d['notas'] ?? '', 300),
];

// ---------- Contenido ----------

$lineasTxt = [];
$filasHtml = '';
foreach ($productos as $p) {
    $linea = $p['cantidad'] * $p['precio'];
    $lineasTxt[] = '- ' . $p['cantidad'] . ' x ' . $p['nombre'] . ': ' . pesos($linea);
    $filasHtml .= '<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">' . $p['cantidad'] . ' &times; ' . e($p['nombre'])
        . '</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">' . pesos($linea) . '</td></tr>';
}

$resumenTxt = implode("\n", $lineasTxt) . "\n\nSubtotal: " . pesos($subtotal)
    . ($descuento ? "\nDescuento" . ($cupon ? " ($cupon)" : '') . ': -' . pesos($descuento) : '')
    . "\nTotal: " . pesos($total)
    . "\nEnvío: por pagar vía Starken (lo pagas al recibir o retirar)"
    . "\nPago: transferencia electrónica";

$resumenHtml = '<table style="width:100%;border-collapse:collapse;font-size:14px">' . $filasHtml
    . '<tr><td style="padding:8px 0">Subtotal</td><td style="padding:8px 0;text-align:right">' . pesos($subtotal) . '</td></tr>'
    . ($descuento ? '<tr><td style="padding:4px 0">Descuento' . ($cupon ? ' (' . e($cupon) . ')' : '') . '</td><td style="padding:4px 0;text-align:right">-' . pesos($descuento) . '</td></tr>' : '')
    . '<tr><td style="padding:10px 0;font-weight:800;font-size:16px">Total</td><td style="padding:10px 0;text-align:right;font-weight:800;font-size:16px;color:#0a78c2">' . pesos($total) . '</td></tr>'
    . '</table><p style="font-size:13px;color:#4b5563;margin:6px 0 0">Envío: <strong>por pagar vía Starken</strong> (lo pagas al recibir o retirar). Pago: transferencia electrónica.</p>';

$despachoTxt = 'Nombre: ' . $nombre . "\nEmail: " . $email;
$despachoHtml = '<p style="margin:0 0 4px;font-size:14px"><strong>Nombre:</strong> ' . e($nombre) . '</p><p style="margin:0 0 4px;font-size:14px"><strong>Email:</strong> ' . e($email) . '</p>';
foreach ($despacho as $etiqueta => $valor) {
    if ($valor === '') continue;
    $despachoTxt .= "\n$etiqueta: $valor";
    $despachoHtml .= '<p style="margin:0 0 4px;font-size:14px"><strong>' . $etiqueta . ':</strong> ' . e($valor) . '</p>';
}

$transferenciaTxt = "Banco Santander\nNombre: Eduardo Jara Maldonado\nRUT: 9.138.152-4\nCuenta Corriente N° 76133379\nCorreo: " . TIENDA_EMAIL;
$transferenciaHtml = '<p style="margin:0 0 4px;font-size:14px">Banco Santander</p><p style="margin:0 0 4px;font-size:14px">Nombre: Eduardo Jara Maldonado</p>'
    . '<p style="margin:0 0 4px;font-size:14px">RUT: 9.138.152-4</p><p style="margin:0 0 4px;font-size:14px">Cuenta Corriente N° 76133379</p><p style="margin:0">Correo: ' . TIENDA_EMAIL . '</p>';

$waUrl = 'https://wa.me/' . WHATSAPP . '?text=' . rawurlencode('Hola, te escribo por mi pedido ' . $pedido . '.');

function plantilla($titulo, $cuerpo) {
    return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0a3a5f">'
        . '<div style="max-width:600px;margin:0 auto;padding:24px 16px">'
        . '<div style="background:#0a78c2;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-weight:800;font-size:18px">Cloro en Tabletas</div>'
        . '<div style="background:#fff;padding:24px 22px;border-radius:0 0 12px 12px">'
        . '<h1 style="font-size:20px;margin:0 0 14px">' . $titulo . '</h1>' . $cuerpo . '</div>'
        . '<p style="font-size:12px;color:#6b7280;text-align:center;margin-top:14px">cloroentabletas.cl · Santiago, Chile · RUT 9.138.152-4</p>'
        . '</div></body></html>';
}

$seccion = function ($titulo, $html) {
    return '<h2 style="font-size:15px;margin:22px 0 8px;color:#0a78c2">' . $titulo . '</h2>' . $html;
};

// Correo al cliente
$asuntoCliente = 'Tu pedido ' . $pedido . ' en Cloro en Tabletas';
$txtCliente = "Hola $nombre,\n\nGracias por tu compra. Recibimos tu pedido $pedido:\n\n$resumenTxt\n\n"
    . "Para confirmar tu pedido, transfiere el total a:\n$transferenciaTxt\n\n"
    . "Y envíanos el comprobante por WhatsApp (+56 9 9246 0216) o respondiendo este correo.\n$waUrl\n\n"
    . "Datos de despacho:\n$despachoTxt\n\nCloro en Tabletas · cloroentabletas.cl";
$htmlCliente = plantilla('¡Gracias por tu compra, ' . e($nombre) . '!',
    '<p style="font-size:14px;line-height:1.6;margin:0 0 6px">Recibimos tu pedido <strong>' . $pedido . '</strong>. Este es el detalle:</p>'
    . $resumenHtml
    . $seccion('Datos para la transferencia', $transferenciaHtml)
    . '<p style="font-size:14px;line-height:1.6;margin:18px 0">Una vez hecha la transferencia, envíanos el comprobante por WhatsApp o respondiendo este correo, indicando tu número de pedido.</p>'
    . '<p style="text-align:center;margin:20px 0"><a href="' . e($waUrl) . '" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:30px">Escribir por WhatsApp</a></p>'
    . $seccion('Datos de despacho', $despachoHtml));

// Correo a la tienda
$asuntoTienda = 'Nuevo pedido ' . $pedido . ' - ' . pesos($total) . ' - ' . $nombre;
$txtTienda = "Nuevo pedido $pedido\n\n$resumenTxt\n\nCliente:\n$despachoTxt";
$htmlTienda = plantilla('Nuevo pedido ' . $pedido,
    $resumenHtml . $seccion('Cliente y despacho', $despachoHtml)
    . '<p style="font-size:13px;color:#6b7280;margin-top:18px">Responder este correo le escribe directamente al cliente.</p>');

// ---------- Envío ----------

function enviar($para, $asunto, $txt, $html, $responderA) {
    $limite = 'b' . bin2hex(random_bytes(8));
    $cabeceras = implode("\r\n", [
        'From: ' . mb_encode_mimeheader(TIENDA_NOMBRE, 'UTF-8') . ' <' . TIENDA_EMAIL . '>',
        'Reply-To: ' . $responderA,
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

    // Prueba local: si existe la variable, se guardan los correos en archivos en vez de enviarlos
    $volcado = getenv('PEDIDOS_MAIL_DUMP');
    if ($volcado) {
        $archivo = rtrim($volcado, '/\\') . '/' . preg_replace('/[^a-z0-9]+/i', '_', $para) . '.eml';
        return (bool) file_put_contents($archivo, "To: $para\r\nSubject: $asuntoCodificado\r\n$cabeceras\r\n\r\n$cuerpo");
    }
    return mail($para, $asuntoCodificado, $cuerpo, $cabeceras, '-f' . TIENDA_EMAIL);
}

$okTienda = enviar(TIENDA_EMAIL, $asuntoTienda, $txtTienda, $htmlTienda, $email);
$okCliente = enviar($email, $asuntoCliente, $txtCliente, $htmlCliente, TIENDA_EMAIL);

$envios[] = $ahora;
@file_put_contents($archivoLimite, json_encode($envios));

responder($okTienda || $okCliente ? 200 : 500, ['ok' => $okTienda && $okCliente, 'tienda' => $okTienda, 'cliente' => $okCliente, 'total' => $total]);
