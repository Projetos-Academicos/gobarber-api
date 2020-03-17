import jwt from 'jsonwebtoken';
import * as Yup from 'yup';

import User from '../models/User';
import authConfig from '../../config/auth';

class SessionController {
    async create(req, res) {
        // Configuração das validações no YUP
        const schema = Yup.object().shape({
            email: Yup.string()
                .email()
                .required(),
            password: Yup.string().required(),
        });

        // Validação dos campos pelo YUP
        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ error: 'Falha na validação dos campos' });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        if (!(await user.checkPassword(password))) {
            return res.status(401).json({ error: 'Senha Incorreta.' });
        }

        const { id, name } = user;

        return res.json({
            user: {
                id,
                name,
                email,
            },
            // Gerando token JWT
            token: jwt.sign({ id }, authConfig.secret, {
                expiresIn: authConfig.expiresIn,
            }),
        });
    }
}

export default new SessionController();
