import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import authConfig from '../../config/auth';

export default async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Validando se o token foi informado no header
    if (!authHeader) {
        return res.status(401).json({ error: 'Token Não Informado' });
    }

    // Retirando o prefixo "Bearer" do token
    const [, token] = authHeader.split(' ');

    try {
        // Decodificando o token caso seja válido
        const decoded = await promisify(jwt.verify)(token, authConfig.secret);

        // Adicionando o id do usuário a requisição
        req.userId = decoded.id;

        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token Inválido' });
    }
};
