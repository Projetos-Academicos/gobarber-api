import * as Yup from 'yup';
import User from '../models/User';

class UserController {
    async create(req, res) {
        // Configuração das validações no YUP
        const schema = Yup.object().shape({
            name: Yup.string().required(),
            email: Yup.string()
                .email()
                .required(),
            password: Yup.string()
                .required()
                .min(8),
        });

        // Validação dos campos pelo YUP
        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ error: 'Falha na validação dos campos' });
        }

        const userExists = await User.findOne({
            where: { email: req.body.email },
        });

        // Verificação unicidade do email
        if (userExists) {
            return res
                .status(400)
                .json({ error: 'Email Informado já Existe.' });
        }

        const { id, name, email, provider } = await User.create(req.body);

        return res.json({
            id,
            name,
            email,
            provider,
        });
    }

    async update(req, res) {
        // Configuração das validações no YUP
        const schema = Yup.object().shape({
            name: Yup.string(),
            email: Yup.string().email(),
            oldPassword: Yup.string(),
            password: Yup.string()
                .min(8)
                .when('oldPassword', (oldPassword, field) =>
                    oldPassword ? field.required() : field
                ),
            confirmPassword: Yup.string()
                .min(8)
                .when('password', (password, field) =>
                    password
                        ? field.required().oneOf([Yup.ref('password')])
                        : field
                ),
        });

        // Validação dos campos pelo YUP
        if (!(await schema.isValid(req.body))) {
            return res
                .status(400)
                .json({ error: 'Falha na validação dos campos' });
        }

        const { email, oldPassword } = req.body;

        const user = await User.findByPk(req.userId);

        // Verificando se ouve alteração do email
        if (email && email !== user.email) {
            const userExists = await User.findOne({
                where: { email },
            });

            // Verificando se o novo email já existe
            if (userExists) {
                return res
                    .status(400)
                    .json({ error: 'Email Informado já Existe.' });
            }
        }

        // Verificando se ouve alteração de senha e validando a senha antiga
        if (oldPassword && !(await user.checkPassword(oldPassword))) {
            return res.status(401).json({ error: 'Senha Incorreta.' });
        }

        // Atualizando usuário
        const { id, name, provider } = await user.update(req.body);

        return res.json({
            id,
            name,
            email,
            provider,
        });
    }
}

export default new UserController();
