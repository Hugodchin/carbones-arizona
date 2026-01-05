# Script para corregir codificación UTF-8 corrupta
$file = "inicio-invitado.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Corregir todos los caracteres corruptos comunes
$replacements = @{
    'Ã³' = 'ó'
    'Ã±' = 'ñ'
    'Ã©' = 'é'
    'Ã­' = 'í'
    'Ã¡' = 'á'
    'Ãº' = 'ú'
    'Ã"' = 'Ó'
    'Ã‰' = 'É'
    'Ã' = 'Í'
    'Ã' = 'Á'
    'Ãš' = 'Ú'
    'Ã'' = 'Ñ'
    'Â¡' = '¡'
    'Â¿' = '¿'
    'Ã¡' = 'á'
    'Ã©' = 'é'
    'Ã­' = 'í'
    'Ã³' = 'ó'
    'Ãº' = 'ú'
    'ðŸ'‹' = '👋'
    'âœ"' = '✓'
    'â€¢' = '•'
    'Ã' = 'Á'
}

foreach ($key in $replacements.Keys) {
    $content = $content.Replace($key, $replacements[$key])
}

# Guardar con UTF-8 sin BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host "✅ Archivo corregido exitosamente" -ForegroundColor Green
