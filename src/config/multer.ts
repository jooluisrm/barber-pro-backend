// src/config/multer.ts

import { Request } from 'express'; // <-- IMPORTAR O TIPO 'Request'
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');

export default {
    directory: uploadFolder,
    storage: multer.diskStorage({
        destination: uploadFolder,
        filename(request, file, callback) {
            const fileHash = crypto.randomBytes(16).toString('hex');
            const fileName = `${fileHash}-${file.originalname}`;
            callback(null, fileName);
        },
    }),

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 Megabytes
    },

    // 'fileFilter' permite controlar quais arquivos são aceitos.
    // 👇 TIPAGEM CORRETA APLICADA AQUI 👇
    fileFilter(
        request: Request,
        file: Express.Multer.File,
        callback: multer.FileFilterCallback
    ) {
        const allowedMimes = [
            'image/jpeg',
            'image/pjpeg', // Algumas versões antigas de navegadores usam este
            'image/png',
            'image/gif',
        ];

        if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error('Tipo de arquivo inválido.'));
        }
    },
};