<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpKernel\KernelInterface;

/**
 * Stores uploaded files under public/uploads/ (served directly by the web
 * server, same as any other file in public/) and returns a public URL.
 *
 * Replaces the front's previous behaviour of reading files with
 * FileReader() and keeping them as base64 data URLs in React state only --
 * never persisted, lost on refresh, and never actually "uploaded" anywhere.
 */
class FileUploadService
{
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
    private const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB, matches nginx client_max_body_size in docker/back

    public function __construct(private readonly KernelInterface $kernel)
    {
    }

    /**
     * @return array{url: string, fileName: string, fileType: string}
     */
    public function store(UploadedFile $file): array
    {
        if ($file->getSize() !== null && $file->getSize() > self::MAX_SIZE_BYTES) {
            throw new \InvalidArgumentException('Fichier trop volumineux (20 Mo maximum).');
        }

        $extension = strtolower($file->guessExtension() ?? $file->getClientOriginalExtension() ?? '');
        if ($extension === '' || !in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException('Type de fichier non autorisé.');
        }

        $uploadsDir = $this->kernel->getProjectDir() . '/public/uploads';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0775, true);
        }

        $storedName = bin2hex(random_bytes(16)) . '.' . $extension;
        $file->move($uploadsDir, $storedName);

        return [
            'url' => '/uploads/' . $storedName,
            'fileName' => $file->getClientOriginalName(),
            'fileType' => $file->getClientMimeType(),
        ];
    }
}
